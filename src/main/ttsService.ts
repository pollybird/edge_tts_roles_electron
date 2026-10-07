import type { BrowserWindow } from 'electron'
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
import { VoiceCatalog } from './tts/voiceCatalog'
import { buildSubtitleCues, detectSpeechRange, shiftCues, writeSubtitleFile } from './subtitles'
import type { SubtitleSource } from './subtitles'

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
          const pcm = await this.synth.synthesize(seg.text, settings, {
            onRetry: (attempt, reason) => {
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
          })
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
            sampleCursor += pcm.left.length
          }
        } else if (seg.type === 'pause') {
          progress(percent, t('tts.pauseAdded', { ms: seg.durationMs }))
          const silence = createSilence(seg.durationMs, sampleRate)
          audioSegments.push(silence)
          sampleCursor += silence.left.length
        } else if (seg.type === 'beep') {
          progress(percent, t('tts.beepAdded'))
          const beep = createBeep(500, 1000, sampleRate)
          audioSegments.push(beep)
          sampleCursor += beep.left.length
        }
      }

      if (abortIfStopped()) return
      if (audioSegments.length === 0) {
        this.sendError(win, kind, t('tts.noAudio'))
        return
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

  private sendError(win: BrowserWindow, kind: string, message: string): void {
    win.webContents.send(IpcChannels.taskError, { kind, message })
  }
}

export const ttsService = new TtsService()
