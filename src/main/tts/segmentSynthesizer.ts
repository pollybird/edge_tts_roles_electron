import { unlink } from 'fs/promises'
import { createT } from '../../shared/i18n'
import { decodeAudioToPcm, tempPath } from '../audioProcessor'
import type { StereoPcm } from '../audioProcessor'
import type { SegmentCache, SegmentVoiceSettings } from './segmentCache'
import type { TTSProvider } from './provider/types'

/** 一次生成任务的运行态：停止信号 + 段间自适应冷却，由编排器在每次任务前 reset */
export class RunState {
  private stopRequested = false
  /** 段间冷却：某段经历过重试后，下一段发起前等待，降低再次被断流的概率 */
  cooldownMs = 0
  /** 连续一次成功的段数，用于逐步解除冷却 */
  private cleanStreak = 0

  reset(): void {
    this.stopRequested = false
    this.cooldownMs = 0
    this.cleanStreak = 0
  }

  requestStop(): void {
    this.stopRequested = true
  }

  get stopped(): boolean {
    return this.stopRequested
  }

  /**
   * 根据某片段的尝试结果更新冷却状态：
   * 经历过重试时按重试深度设置冷却（0.5s→2s），越深越保守；
   * 连续两段一次成功则解除冷却。
   */
  recordAttempt(attempt: number): void {
    if (attempt > 1) {
      this.cooldownMs = Math.min(500 * attempt, 2000)
      this.cleanStreak = 0
    } else {
      this.cleanStreak++
      if (this.cleanStreak >= 2) this.cooldownMs = 0
    }
  }
}

/**
 * 退避表（第 attempt 次失败后的等待毫秒基数）：
 * 1s → 2s → 3s → 5s → 8s → 10s → 12s → 15s → 18s → 20s → 22s → 25s → 28s → 30s。
 * 前两次快速重试覆盖瞬时抖动，后续长等待覆盖持续性网络故障。
 */
export const BACKOFF_TABLE_MS = [
  1000, 2000, 3000, 5000, 8000, 10000, 12000, 15000, 18000, 20000, 22000, 25000, 28000, 30000
]

/** 计算第 attempt 次失败后的实际退避毫秒：查表封顶，另加 ±20% 随机抖动 */
export function backoffDelayMs(attempt: number): number {
  const base = BACKOFF_TABLE_MS[Math.min(attempt - 1, BACKOFF_TABLE_MS.length - 1)]
  const jitter = base * 0.2 * (Math.random() * 2 - 1)
  return Math.max(0, Math.round(base + jitter))
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 可中断的分片等待：每 sliceMs 检查一次停止信号，
 * 保证用户点“停止”最迟一个分片（默认 0.2s）内生效。
 */
export async function interruptibleWait(
  totalMs: number,
  isStopped: () => boolean,
  sliceMs = 200
): Promise<void> {
  for (let waited = 0; waited < totalMs; waited += sliceMs) {
    if (isStopped()) return
    await delay(Math.min(sliceMs, totalMs - waited))
  }
}

/** 单片段默认最大合成尝试次数（含首次） */
export const DEFAULT_MAX_ATTEMPTS = 15

export interface RetryHooks {
  /** 即将进行第 nextAttempt 次尝试（nextAttempt 从 2 开始） */
  onRetry?: (nextAttempt: number, reason: string) => void
  /** 该片段命中磁盘缓存，无需请求网络 */
  onCacheHit?: () => void
}

/**
 * 单个文本片段合成器：编排重试与缓存，传输实现由注入的 {@link TTSProvider} 完成。
 * 流被提前断开 / 连接僵死 / 服务端 50x 时自动重试，成功片段落盘缓存可断点续传。
 */
export class SegmentSynthesizer {
  /** 单片段最大合成尝试次数（含首次） */
  private readonly maxAttempts: number

  constructor(
    private readonly cache: SegmentCache,
    private readonly state: RunState,
    private readonly provider: TTSProvider,
    maxAttempts = DEFAULT_MAX_ATTEMPTS
  ) {
    this.maxAttempts = maxAttempts
  }

  /** 合成单个文本片段为 PCM；空白文本返回 null */
  async synthesize(
    text: string,
    settings: SegmentVoiceSettings,
    hooks: RetryHooks = {}
  ): Promise<StereoPcm | null> {
    const t = createT()
    const trimmed = text.trim()
    if (!trimmed) return null

    // 断点续传：同文本 + 同语音参数的片段直接读缓存，不再请求网络
    const key = this.cache.keyFor(trimmed, settings)
    const cached = await this.cache.read(key)
    if (cached) {
      hooks.onCacheHit?.()
      return cached
    }

    let lastErr: unknown
    let failReason = t('tts.unknownError')

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      if (this.state.stopped) return null

      const mp3Path = tempPath('.mp3')
      const request = {
        text: trimmed,
        voice: settings.voice,
        rate: settings.rate,
        volume: settings.volume,
        pitch: settings.pitch
      }

      try {
        // 传输实现（edge-tts 在线流式）写入临时 MP3 文件，支持中途停止
        const outcome = await this.provider.synthesizeSegment(
          request,
          mp3Path,
          {},
          () => this.state.stopped
        )
        if (this.state.stopped) return null

        if (!outcome.complete) {
          // 连接在收到服务端 turn.end 前断开（或数据间隔超时），MP3 尾部被截断
          lastErr = new Error(t('tts.streamInterrupted'))
          failReason = t('tts.connClosedEarly')
        } else {
          const pcm = await decodeAudioToPcm(mp3Path)
          if (pcm.left.length === 0) {
            lastErr = new Error(t('tts.emptyAudio'))
            failReason = t('tts.emptyAudio')
          } else if (
            outcome.serverEndMs > 0 &&
            (pcm.left.length / pcm.sampleRate) * 1000 < outcome.serverEndMs - 200
          ) {
            // 流正常收尾但音频时长明显短于服务端宣告的语音终点：
            // 服务端提前 turn.end 丢掉尾部音频，按不完整处理触发重试，
            // 防止截断片段落盘缓存后永久复现“结尾几秒语音丢失”
            lastErr = new Error(t('tts.audioTruncated'))
            failReason = t('tts.connClosedEarly')
          } else {
            this.state.recordAttempt(attempt)
            // 落盘缓存，后续重跑（即使本次整体失败）该片段无需再请求网络
            await this.cache.write(key, pcm)
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
      if (attempt < this.maxAttempts && !this.state.stopped) {
        hooks.onRetry?.(attempt + 1, failReason)
        await this.retryBackoff(attempt)
      }
    }

    const msg = lastErr instanceof Error ? lastErr.message : String(lastErr)
    throw new Error(t('tts.failFinal', { max: this.maxAttempts, msg }))
  }

  private retryBackoff(attempt: number): Promise<void> {
    return interruptibleWait(backoffDelayMs(attempt), () => this.state.stopped)
  }
}
