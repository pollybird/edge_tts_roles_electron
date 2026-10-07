import { Communicate } from 'edge-tts-universal'
import { createT } from '../../../shared/i18n'
import type { SynthesisOutcome, TTSProvider, TtsSegmentRequest, TtsSynthesisHooks } from './types'

/** 两次音频数据包之间的默认最大间隔，超时视为连接僵死并按不完整处理 */
export const DEFAULT_IDLE_TIMEOUT_MS = 15000

/**
 * 默认 TTS Provider：基于 edge-tts-universal 的在线流式合成。
 *
 * 职责：构造 Communicate 请求 → 消费音频流写入文件（含空闲看门狗与停止响应）
 * → 依据服务端 offsetCompensation 判定流完整性 → 包装传输层错误。
 */
export class EdgeTTSProvider implements TTSProvider {
  readonly name = 'edge-tts-universal'
  private readonly idleTimeoutMs: number

  constructor(idleTimeoutMs = DEFAULT_IDLE_TIMEOUT_MS) {
    this.idleTimeoutMs = idleTimeoutMs
  }

  async synthesizeSegment(
    req: TtsSegmentRequest,
    outPath: string,
    hooks: TtsSynthesisHooks,
    isStopped: () => boolean
  ): Promise<SynthesisOutcome> {
    const communicate = new Communicate(req.text, {
      voice: req.voice,
      rate: `${req.rate >= 0 ? '+' : ''}${req.rate}%`,
      volume: `${req.volume >= 0 ? '+' : ''}${req.volume}%`,
      pitch: `${req.pitch >= 0 ? '+' : ''}${req.pitch}Hz`
    })
    return this.writeCommunicateToFile(communicate, outPath, hooks, isStopped)
  }

  /**
   * 将 Communicate 的音频流写入文件（支持中途停止）。
   *
   * 返回 complete=false 表示流不完整：edge-tts-universal 在 WebSocket 中途断开时，
   * 只要收到过任意一包音频就会正常结束迭代（不抛错），此时落盘的是截断 MP3，
   * ffmpeg 解码退出码仍为 0，表现为“音频尾部缺失但无任何报错”。
   * 正常流程服务端会先推送 turn.end，库据此把 state.offsetCompensation
   * 从初始值 0 改写为 lastDurationOffset + 8750000（100ns tick），以此判定完整性。
   *
   * 另返回 serverEndMs（服务端宣告的语音终点 = offsetCompensation - 8750000），
   * 供调用方校验“流正常结束但音频数据被服务端提前收尾截断”的情形。
   */
  private async writeCommunicateToFile(
    communicate: InstanceType<typeof Communicate>,
    filePath: string,
    hooks: TtsSynthesisHooks,
    isStopped: () => boolean
  ): Promise<SynthesisOutcome> {
    const INCOMPLETE: SynthesisOutcome = { complete: false, serverEndMs: -1 }
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
        if (result === 'timeout') return INCOMPLETE
        if (isStopped()) {
          ws.destroy()
          return INCOMPLETE
        }
        if (result.done) break
        const chunk = result.value
        if (chunk.type === 'audio' && chunk.data) {
          ws.write(Buffer.from(chunk.data))
          resetIdle?.()
          hooks.onAudioChunk?.()
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
      if (!state || typeof state.offsetCompensation !== 'number') {
        return { complete: true, serverEndMs: -1 }
      }
      const comp = state.offsetCompensation
      if (comp <= 0) return INCOMPLETE
      // turn.end 时 offsetCompensation = 最后一个字终点 + 8750000 tick（875ms）
      const serverEndMs = comp > 875e4 ? (comp - 875e4) / 10000 : -1
      return { complete: true, serverEndMs }
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
