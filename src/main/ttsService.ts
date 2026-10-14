import { app, type BrowserWindow } from 'electron'
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
  mixPcm
} from './audioProcessor'
import type { StereoPcm } from './audioProcessor'
import { SegmentCache } from './tts/segmentCache'
import { SegmentSynthesizer, RunState, DEFAULT_MAX_ATTEMPTS, delay } from './tts/segmentSynthesizer'
import { createDefaultProvider } from './tts/provider'
import { PiperProvider } from './tts/provider/piperProvider'
import { PiperModelManager, resolvePiperVoiceId } from './tts/piper/models'
import { locatePiperBinary } from './tts/piper/locate'
import { getSetting } from './settings'
import { VoiceCatalog } from './tts/voiceCatalog'
import { buildSubtitleCues, detectSpeechRange, shiftCues, writeSubtitleFile } from './subtitles'
import type { SubtitleSource } from './subtitles'
import { isCuesDebugEnabled, debugLog } from './debug'

/**
 * TTS 生成服务（管线编排 + 进度上报）：
 *
 * 职责模块：
 * - {@link VoiceCatalog} 语音列表缓存
 * - {@link SegmentCache} 片段 PCM 磁盘缓存（断点续传 / LRU 淘汰）
 * - {@link SegmentSynthesizer} 单片段流式合成、重试与空闲看门狗（{@link RunState} 持有停止信号与段间冷却）
 *
 * 本类只负责完整合成 / 试听两条任务的步骤编排：
 * parseText 解析 → 逐片段合成 PCM → 拼接/静音/蜂鸣 → 附加音频混音 → 编码输出（WAV/MP3/OGG/FLAC）。
 */
export class TtsService {
  private readonly state = new RunState()
  private readonly voices = new VoiceCatalog()
  private readonly cache = new SegmentCache()
  private readonly synth = new SegmentSynthesizer(this.cache, this.state, createDefaultProvider())
  /** Piper 模型管理器（设置页 IPC 与合成兜底共用同一实例） */
  readonly piperModels = new PiperModelManager()
  /** piper 二进制定位缓存：null=不可用，undefined=未探测（首次兜底时惰性执行） */
  private piperBin: string | null | undefined

  /** 获取可用语音列表（带缓存） */
  async listVoices(): Promise<VoiceInfo[]> {
    return this.voices.list()
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
    this.state.requestStop()
  }

  get stopped(): boolean {
    return this.state.stopped
  }

  /** 核心生成管线（generate / preview 共用） */
  private async runPipeline(
    win: BrowserWindow,
    req: GenerateRequest | PreviewRequest,
    isPreview: boolean
  ): Promise<void> {
    this.state.reset()
    // 后台清理过期片段缓存，不阻塞本次生成
    void this.cache.prune()
    const kind = isPreview ? 'preview' : 'generate'
    // 主进程语言在 app ready 时由 setLocale(app.getLocale()) 设定
    const t = createT()
    const progress = (percent: number, message: string): void => {
      win.webContents.send(IpcChannels.progress, { percent, message })
    }
    // 用户停止：必须通知渲染进程复位界面（否则生成按钮不会恢复），而非静默返回
    const abortIfStopped = (): boolean => {
      if (!this.state.stopped) return false
      win.webContents.send(IpcChannels.taskStopped, { kind })
      return true
    }

    try {
      progress(0, isPreview ? t('tts.parsingPreview') : t('tts.parsing'))
      const segments = parseText(req.text)
      if (segments.length === 0) {
        this.sendError(win, kind, t('tts.noValidText'))
        return
      }

      const audioSegments: StereoPcm[] = []
      // 字幕素材：语音段在旁白时间轴上的起止（样本计数推进，停顿/蜂鸣不产出 cue）
      const cueSources: SubtitleSource[] = []
      // 字幕对齐调试（isCuesDebugEnabled 时落盘 /tmp/cues-debug.json）
      const cueDebug: Array<Record<string, unknown>> = []
      const sampleRate = 24000
      let sampleCursor = 0
      let segIndex = 0

      for (const seg of segments) {
        if (abortIfStopped()) return

        const percent = Math.floor((segIndex / segments.length) * 90) + 5
        segIndex++

        if (seg.type === 'text') {
          const settings = req.roleSettings[seg.role] ?? req.roleSettings.A
          if (!settings.voice) {
            this.sendError(win, kind, t('tts.roleNoVoice', { role: seg.role }))
            return
          }

          // 网络刚经历过重试时，段间冷却，避免连续快速请求再次触发断流
          if (this.state.cooldownMs > 0 && !this.state.stopped) {
            progress(percent, t('tts.cooldown', { sec: (this.state.cooldownMs / 1000).toFixed(1) }))
            await delay(this.state.cooldownMs)
            if (abortIfStopped()) return
          }

          progress(
            percent,
            t('tts.generatingRole', {
              role: seg.role,
              index: segIndex,
              total: segments.length
            })
          )
          const synthHooks = {
            onRetry: (attempt: number, reason: string) => {
              progress(
                percent,
                t('tts.retrying', {
                  role: seg.role,
                  reason,
                  attempt,
                  max: DEFAULT_MAX_ATTEMPTS
                })
              )
            },
            onCacheHit: () => {
              progress(
                percent,
                t('tts.cacheHit', { role: seg.role, index: segIndex, total: segments.length })
              )
            }
          }
          // Piper 策略：fallback 在线优先（失败时单段离线兜底）；off 仅在线；
          // prefer 仅离线——强制本地模型，失败不回退在线，避免违背用户预期把文本外发
          const strategy = getSetting('piperFallback')
          let pcm: StereoPcm | null
          let pcmSource = 'edge'
          if (strategy === 'prefer') {
            const piper = this.tryCreatePiperSynth(settings.voice)
            if (!piper) {
              throw new Error(t('tts.piperUnavailable', { role: seg.role }))
            }
            progress(percent, t('tts.piperOffline', { role: seg.role }))
            pcm = await piper.synthesize(seg.text, settings, synthHooks)
            pcmSource = 'piper'
          } else {
            try {
              pcm = await this.synth.synthesize(seg.text, settings, synthHooks)
            } catch (err) {
              const piper =
                strategy === 'fallback' ? this.tryCreatePiperSynth(settings.voice) : null
              if (!piper) throw err
              progress(percent, t('tts.piperFallback', { role: seg.role }))
              pcm = await piper.synthesize(seg.text, settings)
              pcmSource = 'piper'
            }
          }
          debugLog(
            'segment',
            `seg ${segIndex}/${segments.length} role ${seg.role} source ${pcmSource} samples ${pcm?.left.length ?? 0}`
          )
          if (abortIfStopped()) return
          if (pcm) {
            audioSegments.push(pcm)
            // cue 边界按语音活动标定：剔除段内编码器延迟/帧补齐静音，
            // 使字幕起点/终点对齐实际发声（检测失败回退流边界）
            const range = detectSpeechRange(pcm.left, sampleRate)
            const startSample = range ? range.startSample : 0
            const endSample = range ? range.endSample : pcm.left.length
            cueSources.push({
              role: seg.role,
              text: seg.text,
              startMs: ((sampleCursor + startSample) / sampleRate) * 1000,
              endMs: ((sampleCursor + endSample) / sampleRate) * 1000
            })
            if (isCuesDebugEnabled()) {
              cueDebug.push({
                type: 'text',
                role: seg.role,
                textPreview: seg.text.slice(0, 30),
                segStartMs: (sampleCursor / sampleRate) * 1000,
                segLenMs: (pcm.left.length / sampleRate) * 1000,
                detectStartMs: range ? (startSample / sampleRate) * 1000 : null,
                detectEndMs: range ? (endSample / sampleRate) * 1000 : null,
                sampleRate
              })
            }
            sampleCursor += pcm.left.length
          }
        } else if (seg.type === 'pause') {
          progress(percent, t('tts.pauseAdded', { ms: seg.durationMs }))
          const silence = createSilence(seg.durationMs, sampleRate)
          audioSegments.push(silence)
          if (isCuesDebugEnabled()) {
            cueDebug.push({
              type: 'pause',
              durationMs: seg.durationMs,
              segStartMs: (sampleCursor / sampleRate) * 1000
            })
          }
          sampleCursor += silence.left.length
        } else if (seg.type === 'beep') {
          progress(percent, t('tts.beepAdded'))
          const beep = createBeep(500, 1000, sampleRate)
          audioSegments.push(beep)
          if (isCuesDebugEnabled()) {
            cueDebug.push({
              type: 'beep',
              segStartMs: (sampleCursor / sampleRate) * 1000,
              segLenMs: (beep.left.length / sampleRate) * 1000
            })
          }
          sampleCursor += beep.left.length
        }
      }

      if (abortIfStopped()) return
      if (audioSegments.length === 0) {
        this.sendError(win, kind, t('tts.noAudio'))
        return
      }

      // 字幕对齐调试：逐段记录样本游标/段长/检测结果，用于排查字幕与音频的时间偏差
      if (isCuesDebugEnabled()) {
        const { appendFileSync } = await import('fs')
        appendFileSync('/tmp/cues-debug.json', JSON.stringify(cueDebug) + '\n')
      }

      progress(95, t('tts.merging'))
      let finalPcm = concatenate(audioSegments)

      // 前奏 / 尾声 / 背景音乐：任一路选择了文件才参与合成
      const extras = req.extras
      let introOffsetMs = 0
      const hasExtras =
        !!extras && (!!extras.intro.path || !!extras.outro.path || !!extras.bgm.path)
      if (hasExtras && extras) {
        if (abortIfStopped()) return
        progress(96, t('tts.mixingExtras'))
        const mixed = await this.attachExtras(finalPcm, extras)
        finalPcm = mixed.pcm
        // 前奏将整条语音右移，字幕时间轴同步偏移
        introOffsetMs = (mixed.introSamples / sampleRate) * 1000
      }

      // 结尾统一补 1 秒静音：部分播放器/蓝牙音频链路会在文件播完前提前关闭设备，
      // 截掉末尾数百毫秒语音（表现为“最后几个字丢失”）；补静音后被截的只是静音
      finalPcm = concatenate([finalPcm, createSilence(1000, sampleRate)])

      let outputPath: string
      let subtitlePath = ''
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

        // 字幕同步生成：时间戳来自 PCM 样本计数，与输出音频严格对齐；仅正式生成触发
        const fmt = genReq.subtitleFormat
        if (fmt === 'lrc' || fmt === 'srt') {
          const cues = shiftCues(buildSubtitleCues(cueSources), introOffsetMs)
          subtitlePath = await writeSubtitleFile(outputPath, fmt, cues)
        }
      }

      if (abortIfStopped()) return

      progress(100, isPreview ? t('tts.previewDone') : t('tts.done'))
      win.webContents.send(IpcChannels.finished, {
        kind,
        filePath: outputPath,
        subtitlePath: subtitlePath || undefined
      })
    } catch (err) {
      if (abortIfStopped()) return
      const msg = err instanceof Error ? err.message : String(err)
      this.sendError(win, kind, msg)
    }
  }

  /**
   * 将前奏 / 背景音乐 / 尾声合成进语音 PCM：
   * 背景音乐按语音长度循环（超长则截断）后与语音叠加；前奏前置、尾声后置。
   * 各路独立应用 0~100% 音量；文件缺失或解码失败时抛本地化错误。
   * 返回最终 PCM 与前奏样本数（供字幕时间轴偏移计算）。
   */
  private async attachExtras(
    narration: StereoPcm,
    extras: AudioExtras
  ): Promise<{ pcm: StereoPcm; introSamples: number }> {
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
    let introSamples = 0
    if (extras.intro.path) {
      const intro = await loadTrack(extras.intro.path, extras.intro.volume)
      introSamples = intro.left.length
      parts.push(intro)
    }
    parts.push(body)
    if (extras.outro.path) parts.push(await loadTrack(extras.outro.path, extras.outro.volume))
    return { pcm: concatenate(parts), introSamples }
  }

  /**
   * 为指定发音人构造 Piper 离线合成器（策略触发时使用）：
   * 发音人值已是离线模型 ID（仅离线模式的发音人列表）时直接采用，
   * 否则按 Edge 音色语言前缀解析模型；不可用（无二进制 / 无匹配模型 / 未下载）返回 null。
   * 本地合成一次即成（无网络重试概念），maxAttempts=1；缓存键带引擎与模型维度。
   */
  private tryCreatePiperSynth(voice: string): SegmentSynthesizer | null {
    if (this.piperBin === undefined) {
      try {
        const located = locatePiperBinary(app?.isPackaged ?? false, app?.getAppPath?.() ?? '')
        this.piperBin = located?.bin ?? null
      } catch {
        this.piperBin = null
      }
    }
    if (!this.piperBin) return null
    const voiceDef = this.piperModels.byId(voice)
    const voiceId = voiceDef?.id ?? resolvePiperVoiceId(voice)
    if (!voiceId || !this.piperModels.isDownloadedSync(voiceId)) return null
    const provider = new PiperProvider({
      piperBin: this.piperBin,
      modelPath: this.piperModels.modelPath(voiceId),
      configPath: this.piperModels.configPath(voiceId),
      numSpeakers: voiceDef?.numSpeakers
    })
    return new SegmentSynthesizer(this.cache, this.state, provider, 1, `piper:${voiceId}`)
  }

  private sendError(win: BrowserWindow, kind: string, message: string): void {
    win.webContents.send(IpcChannels.taskError, { kind, message })
  }
}

export const ttsService = new TtsService()
