import { Communicate, listVoices as edgeListVoices } from 'edge-tts-universal'
import { app } from 'electron'
import type { BrowserWindow } from 'electron'
import { createHash } from 'crypto'
import { mkdir, readdir, stat, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { basename, join } from 'path'
import { IpcChannels } from '../shared/ipc'
import { createT } from '../shared/i18n'
import { parseText } from '../shared/textParser'
import type { AudioExtras, GenerateRequest, PreviewRequest, VoiceInfo } from '../shared/types'
import {
  applyGain,
  concatenate,
  createBeep,
  createSilence,
  decodeAudioToPcm,
  encodeWav,
  encodeWithFfmpeg,
  loopToLength,
  mixPcm,
  readPcmCache,
  tempPath,
  writePcmCache
} from './audioProcessor'
import type { StereoPcm } from './audioProcessor'

/**
 * TTS 生成服务（对应 PyQt6 版 tts_workers.py 的 TTSWorker / PreviewWorker）。
 *
 * 管线：parseText 解析 → 逐片段 edge-tts 流式合成（MP3）→
 * ffmpeg 解码 PCM → 拼接/静音/蜂鸣 → 编码输出（WAV/MP3/OGG/FLAC）。
 */
export class TtsService {
  private stopRequested = false
  private voiceCache: VoiceInfo[] | null = null
  /** 单片段最大合成尝试次数（含首次） */
  private readonly maxAttempts = 15
  /** 两次音频数据包之间的最大间隔，超时视为连接僵死并重试 */
  private readonly idleTimeoutMs = 15000
  /** 段间冷却：某段经历过重试后，下一段发起前等待，降低再次被断流的概率 */
  private cooldownMs = 0
  /** 连续一次成功的段数，用于逐步解除冷却 */
  private cleanStreak = 0
  /** 片段 PCM 缓存目录（断点续传），延迟初始化 */
  private cacheDir: string | null = null
  /** 缓存条目数超过该值时，清理最旧的片段 */
  private readonly cacheMaxEntries = 300
  private readonly cachePruneTo = 200

  /** 获取可用语音列表（带缓存） */
  async listVoices(): Promise<VoiceInfo[]> {
    if (this.voiceCache) return this.voiceCache
    const voices = await edgeListVoices()
    this.voiceCache = voices.map((v) => ({
      shortName: v.ShortName,
      friendlyName: v.FriendlyName,
      locale: v.Locale,
      gender: v.Gender
    }))
    return this.voiceCache
  }

  /** 生成完整音频文件 */
  async generate(win: BrowserWindow, req: GenerateRequest): Promise<void> {
    await this.runPipeline(win, req, false)
  }

  /** 生成试听音频（输出临时 WAV，供渲染进程 <audio> 播放） */
  async preview(win: BrowserWindow, req: PreviewRequest): Promise<void> {
    await this.runPipeline(win, req, true)
  }

  /** 请求停止当前任务 */
  stop(): void {
    this.stopRequested = true
  }

  get stopped(): boolean {
    return this.stopRequested
  }

  /** 核心生成管线（generate / preview 共用） */
  private async runPipeline(
    win: BrowserWindow,
    req: GenerateRequest | PreviewRequest,
    isPreview: boolean
  ): Promise<void> {
    this.stopRequested = false
    this.cooldownMs = 0
    this.cleanStreak = 0
    // 后台清理过期片段缓存，不阻塞本次生成
    void this.pruneCache()
    const kind = isPreview ? 'preview' : 'generate'
    // 主进程语言在 app ready 时由 setLocale(app.getLocale()) 设定
    const t = createT()
    const progress = (percent: number, message: string): void => {
      win.webContents.send(IpcChannels.progress, { percent, message })
    }

    try {
      progress(0, isPreview ? t('tts.parsingPreview') : t('tts.parsing'))
      const segments = parseText(req.text)
      if (segments.length === 0) {
        this.sendError(win, kind, t('tts.noValidText'))
        return
      }

      const audioSegments: StereoPcm[] = []
      const sampleRate = 24000
      let segIndex = 0

      for (const seg of segments) {
        if (this.stopRequested) return

        const percent = Math.floor((segIndex / segments.length) * 90) + 5
        segIndex++

        if (seg.type === 'text') {
          const settings = req.roleSettings[seg.role] ?? req.roleSettings.A
          if (!settings.voice) {
            this.sendError(win, kind, t('tts.roleNoVoice', { role: seg.role }))
            return
          }

          // 网络刚经历过重试时，段间冷却，避免连续快速请求再次触发断流
          if (this.cooldownMs > 0 && !this.stopRequested) {
            progress(percent, t('tts.cooldown', { sec: (this.cooldownMs / 1000).toFixed(1) }))
            await this.delay(this.cooldownMs)
            if (this.stopRequested) return
          }

          progress(
            percent,
            t('tts.generatingRole', {
              role: seg.role,
              index: segIndex,
              total: segments.length
            })
          )
          const pcm = await this.synthesizeSegment(
            seg.text,
            settings,
            (attempt, reason) => {
              progress(
                percent,
                t('tts.retrying', {
                  role: seg.role,
                  reason,
                  attempt,
                  max: this.maxAttempts
                })
              )
            },
            () => {
              progress(
                percent,
                t('tts.cacheHit', { role: seg.role, index: segIndex, total: segments.length })
              )
            }
          )
          if (this.stopRequested) return
          if (pcm) audioSegments.push(pcm)
        } else if (seg.type === 'pause') {
          progress(percent, t('tts.pauseAdded', { ms: seg.durationMs }))
          audioSegments.push(createSilence(seg.durationMs, sampleRate))
        } else if (seg.type === 'beep') {
          progress(percent, t('tts.beepAdded'))
          audioSegments.push(createBeep(500, 1000, sampleRate))
        }
      }

      if (this.stopRequested) return
      if (audioSegments.length === 0) {
        this.sendError(win, kind, t('tts.noAudio'))
        return
      }

      progress(95, t('tts.merging'))
      let finalPcm = concatenate(audioSegments)

      // 前奏 / 尾声 / 背景音乐：任一路选择了文件才参与合成
      const extras = req.extras
      const hasExtras =
        !!extras && (!!extras.intro.path || !!extras.outro.path || !!extras.bgm.path)
      if (hasExtras && extras) {
        if (this.stopRequested) return
        progress(96, t('tts.mixingExtras'))
        finalPcm = await this.attachExtras(finalPcm, extras)
      }

      let outputPath: string
      if (isPreview) {
        outputPath = join(tmpdir(), `edge-tts-preview-${Date.now()}.wav`)
        await encodeWav(finalPcm, outputPath)
      } else {
        const genReq = req as GenerateRequest
        outputPath = genReq.outputPath
        const format = genReq.format
        if (format === 'wav') {
          await encodeWav(finalPcm, outputPath)
        } else {
          progress(97, t('tts.encoding', { format: format.toUpperCase() }))
          await encodeWithFfmpeg(finalPcm, outputPath, format)
        }
      }

      if (this.stopRequested) return

      progress(100, isPreview ? t('tts.previewDone') : t('tts.done'))
      win.webContents.send(IpcChannels.finished, { kind, filePath: outputPath })
    } catch (err) {
      if (this.stopRequested) return
      const msg = err instanceof Error ? err.message : String(err)
      this.sendError(win, kind, msg)
    }
  }

  /** 合成单个文本片段为 PCM（流被提前断开时自动重试，成功片段磁盘缓存可断点续传） */
  private async synthesizeSegment(
    text: string,
    settings: { voice: string; rate: number; volume: number; pitch: number },
    onRetry?: (nextAttempt: number, reason: string) => void,
    onCacheHit?: () => void
  ): Promise<StereoPcm | null> {
    const t = createT()
    const trimmed = text.trim()
    if (!trimmed) return null

    // 断点续传：同文本 + 同语音参数的片段直接读缓存，不再请求网络
    const cachePath = join(this.getCacheDir(), `${this.segmentCacheKey(trimmed, settings)}.pcm`)
    const cached = await readPcmCache(cachePath)
    if (cached) {
      onCacheHit?.()
      return cached
    }

    let lastErr: unknown
    let failReason = t('tts.unknownError')

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      if (this.stopRequested) return null

      const mp3Path = tempPath('.mp3')
      const communicate = new Communicate(trimmed, {
        voice: settings.voice,
        rate: `${settings.rate >= 0 ? '+' : ''}${settings.rate}%`,
        volume: `${settings.volume >= 0 ? '+' : ''}${settings.volume}%`,
        pitch: `${settings.pitch >= 0 ? '+' : ''}${settings.pitch}Hz`
      })

      try {
        // 流式写入临时 MP3 文件，支持中途停止
        const complete = await this.writeCommunicateToFile(communicate, mp3Path)
        if (this.stopRequested) return null

        if (!complete) {
          // 连接在收到服务端 turn.end 前断开（或数据间隔超时），MP3 尾部被截断
          lastErr = new Error(t('tts.streamInterrupted'))
          failReason = t('tts.connClosedEarly')
        } else {
          const pcm = await decodeAudioToPcm(mp3Path)
          if (pcm.left.length === 0) {
            lastErr = new Error(t('tts.emptyAudio'))
            failReason = t('tts.emptyAudio')
          } else {
            // 成功：若经历过重试，按重试深度设置段间冷却（0.5s→2s），越深越保守
            if (attempt > 1) {
              this.cooldownMs = Math.min(500 * attempt, 2000)
              this.cleanStreak = 0
            } else {
              this.cleanStreak++
              if (this.cleanStreak >= 2) this.cooldownMs = 0
            }
            // 落盘缓存，后续重跑（即使本次整体失败）该片段无需再请求网络
            await mkdir(this.getCacheDir(), { recursive: true })
            await writePcmCache(pcm, cachePath)
            return pcm
          }
        }
      } catch (err) {
        lastErr = err
        failReason = err instanceof Error ? err.message : String(err)
      } finally {
        await unlink(mp3Path).catch(() => {})
      }

      // 本次尝试失败
      if (attempt < this.maxAttempts && !this.stopRequested) {
        onRetry?.(attempt + 1, failReason)
        await this.retryBackoff(attempt)
      }
    }

    const msg = lastErr instanceof Error ? lastErr.message : String(lastErr)
    throw new Error(t('tts.failFinal', { max: this.maxAttempts, msg }))
  }

  /**
   * 将前奏 / 背景音乐 / 尾声合成进语音 PCM：
   * 背景音乐按语音长度循环（超长则截断）后与语音叠加；前奏前置、尾声后置。
   * 各路独立应用 0~100% 音量；文件缺失或解码失败时抛本地化错误。
   */
  private async attachExtras(narration: StereoPcm, extras: AudioExtras): Promise<StereoPcm> {
    const t = createT()
    const sampleRate = narration.sampleRate

    /** 解码一路附加音频并按音量百分比缩放 */
    const loadTrack = async (filePath: string, volume: number): Promise<StereoPcm> => {
      try {
        const pcm = await decodeAudioToPcm(filePath, sampleRate)
        const gain = Math.min(100, Math.max(0, volume)) / 100
        return applyGain(pcm, gain)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        throw new Error(t('tts.extrasLoadFailed', { file: basename(filePath), msg }))
      }
    }

    // 背景音乐铺满语音段并叠加
    let body = narration
    if (extras.bgm.path) {
      const bgm = await loadTrack(extras.bgm.path, extras.bgm.volume)
      body = mixPcm(narration, loopToLength(bgm, narration.left.length))
    }

    // 前奏 + 语音（含背景音乐）+ 尾声顺序拼接
    const parts: StereoPcm[] = []
    if (extras.intro.path) parts.push(await loadTrack(extras.intro.path, extras.intro.volume))
    parts.push(body)
    if (extras.outro.path) parts.push(await loadTrack(extras.outro.path, extras.outro.volume))
    return concatenate(parts)
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * 退避表（第 attempt 次失败后的等待毫秒）：
   * 1s → 2s → 3s → 5s → 8s → 10s → 12s → 15s → 18s → 20s → 22s → 25s → 28s → 30s，
   * 另加 ±20% 随机抖动。前两次快速重试覆盖瞬时抖动，后续长等待覆盖持续性网络故障。
   * 等待期间用户点“停止”会立即中断。
   */
  private async retryBackoff(attempt: number): Promise<void> {
    const table = [
      1000, 2000, 3000, 5000, 8000, 10000, 12000, 15000, 18000, 20000, 22000, 25000, 28000, 30000
    ]
    const base = table[Math.min(attempt - 1, table.length - 1)]
    const jitter = base * 0.2 * (Math.random() * 2 - 1)
    const total = Math.max(0, Math.round(base + jitter))
    // 200ms 分片等待，保证停止指令最迟 0.2s 生效
    const slice = 200
    for (let waited = 0; waited < total; waited += slice) {
      if (this.stopRequested) return
      await this.delay(Math.min(slice, total - waited))
    }
  }

  /** 片段缓存目录：Electron 下用 userData，纯 Node 环境（测试）退化为 tmpdir */
  private getCacheDir(): string {
    if (this.cacheDir) return this.cacheDir
    try {
      if (app && typeof app.getPath === 'function') {
        this.cacheDir = join(app.getPath('userData'), 'tts-segment-cache')
        return this.cacheDir
      }
    } catch {
      // 非 Electron 运行时
    }
    this.cacheDir = join(tmpdir(), 'edge-tts-segment-cache')
    return this.cacheDir
  }

  /** 由文本与语音参数计算稳定缓存键，任一参数变化都会得到不同片段 */
  private segmentCacheKey(
    text: string,
    settings: { voice: string; rate: number; volume: number; pitch: number }
  ): string {
    const raw = `${settings.voice}|${settings.rate}|${settings.volume}|${settings.pitch}|${text}`
    return createHash('sha256').update(raw, 'utf8').digest('hex')
  }

  /** 缓存超量时按修改时间淘汰最旧片段（LRU 近似） */
  private async pruneCache(): Promise<void> {
    try {
      const dir = this.getCacheDir()
      const { mkdir } = await import('fs/promises')
      await mkdir(dir, { recursive: true })
      const files = (await readdir(dir)).filter((f) => f.endsWith('.pcm'))
      if (files.length <= this.cacheMaxEntries) return
      const entries = await Promise.all(
        files.map(async (f) => ({ f, mtime: (await stat(join(dir, f))).mtimeMs }))
      )
      entries.sort((a, b) => a.mtime - b.mtime)
      for (const e of entries.slice(0, files.length - this.cachePruneTo)) {
        await unlink(join(dir, e.f)).catch(() => {})
      }
    } catch {
      // 缓存清理失败不影响生成
    }
  }

  /**
   * 将 Communicate 的音频流写入文件（支持中途停止）。
   *
   * 返回 false 表示流不完整：edge-tts-universal 在 WebSocket 中途断开时，
   * 只要收到过任意一包音频就会正常结束迭代（不抛错），此时落盘的是截断 MP3，
   * ffmpeg 解码退出码仍为 0，表现为“音频尾部缺失但无任何报错”。
   * 正常流程服务端会先推送 turn.end，库据此把 state.offsetCompensation
   * 从初始值 0 改写为 lastDurationOffset + 8750000，以此判定完整性。
   */
  private async writeCommunicateToFile(
    communicate: InstanceType<typeof Communicate>,
    filePath: string
  ): Promise<boolean> {
    const { createWriteStream } = await import('fs')
    const ws = createWriteStream(filePath)
    let timer: NodeJS.Timeout | undefined
    let resetIdle: (() => void) | undefined
    try {
      const iterator = communicate.stream()[Symbol.asyncIterator]()

      // 空闲看门狗：每收到一包音频就重置；超过 idleTimeoutMs 无数据判定连接僵死。
      // 此时停止消费迭代器并按不完整处理（触发上层重试），避免任务永久挂起。
      const idle = new Promise<'timeout'>((resolve) => {
        const arm = (): void => {
          if (timer) clearTimeout(timer)
          timer = setTimeout(() => resolve('timeout'), this.idleTimeoutMs)
        }
        resetIdle = arm
        arm()
      })

      while (true) {
        const result = await Promise.race([iterator.next(), idle])
        if (result === 'timeout') return false
        if (this.stopRequested) {
          ws.destroy()
          return false
        }
        if (result.done) break
        const chunk = result.value
        if (chunk.type === 'audio' && chunk.data) {
          ws.write(Buffer.from(chunk.data))
          resetIdle?.()
        }
      }
      if (timer) clearTimeout(timer)

      await new Promise<void>((resolve, reject) => {
        ws.end(() => resolve())
        ws.on('error', reject)
      })

      const state = (
        communicate as unknown as {
          state?: { offsetCompensation?: number }
        }
      ).state
      // 库升级后若该内部字段消失，退化为信任流正常结束（旧行为），避免误判
      if (!state || typeof state.offsetCompensation !== 'number') return true
      return state.offsetCompensation > 0
    } catch (err) {
      if (timer) clearTimeout(timer)
      ws.destroy()
      const msg = err instanceof Error ? err.message : String(err)
      // Edge TTS 服务器 50x 错误
      if (/50\d/.test(msg) && /Server|Error|HTTP/i.test(msg)) {
        throw new Error(createT()('tts.edge50x', { msg }))
      }
      throw new Error(createT()('tts.segmentFailed', { msg }))
    }
  }

  private sendError(win: BrowserWindow, kind: string, message: string): void {
    win.webContents.send(IpcChannels.taskError, { kind, message })
  }
}

export const ttsService = new TtsService()
