import { Communicate } from 'edge-tts-universal'
import { unlink } from 'fs/promises'
import { createT } from '../../shared/i18n'
import { decodeAudioToPcm, tempPath } from '../audioProcessor'
import type { StereoPcm } from '../audioProcessor'
import type { SegmentCache, SegmentVoiceSettings } from './segmentCache'

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
/** 两次音频数据包之间的默认最大间隔，超时视为连接僵死并重试 */
export const DEFAULT_IDLE_TIMEOUT_MS = 15000

export interface RetryHooks {
  /** 即将进行第 nextAttempt 次尝试（nextAttempt 从 2 开始） */
  onRetry?: (nextAttempt: number, reason: string) => void
  /** 该片段命中磁盘缓存，无需请求网络 */
  onCacheHit?: () => void
}

/**
 * 单个文本片段合成器：edge-tts 流式合成（MP3）→ ffmpeg 解码 PCM。
 * 流被提前断开 / 连接僵死 / 服务端 50x 时自动重试，成功片段落盘缓存可断点续传。
 */
export class SegmentSynthesizer {
  /** 单片段最大合成尝试次数（含首次） */
  private readonly maxAttempts: number
  /** 两次音频数据包之间的最大间隔，超时视为连接僵死并重试 */
  private readonly idleTimeoutMs: number

  constructor(
    private readonly cache: SegmentCache,
    private readonly state: RunState,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    idleTimeoutMs = DEFAULT_IDLE_TIMEOUT_MS
  ) {
    this.maxAttempts = maxAttempts
    this.idleTimeoutMs = idleTimeoutMs
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
      const communicate = new Communicate(trimmed, {
        voice: settings.voice,
        rate: `${settings.rate >= 0 ? '+' : ''}${settings.rate}%`,
        volume: `${settings.volume >= 0 ? '+' : ''}${settings.volume}%`,
        pitch: `${settings.pitch >= 0 ? '+' : ''}${settings.pitch}Hz`
      })

      try {
        // 流式写入临时 MP3 文件，支持中途停止
        const complete = await this.writeCommunicateToFile(communicate, mp3Path)
        if (this.state.stopped) return null

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
        if (this.state.stopped) {
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
}
