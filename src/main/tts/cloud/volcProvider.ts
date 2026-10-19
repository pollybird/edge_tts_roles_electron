import { randomUUID } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import { writeFile } from 'fs/promises'
import { createT } from '../../../shared/i18n'
import { buildWav } from '../provider/piperProvider'
import type {
  RawSynthesisResult,
  SynthesisOutcome,
  TTSProvider,
  TtsSegmentRequest,
  TtsSynthesisHooks
} from '../provider/types'

/**
 * 火山引擎大模型语音合成（豆包语音）v3 单向流式端点（HTTP POST，流式返回二进制帧）：
 * 鉴权为 App ID + API Key 双凭据（新版控制台签发的 API Key 替代旧版 Access Token，
 * 经 X-Api-App-Key / X-Api-Access-Key 头携带；细节以火山官方文档为准）。
 */
const HTTP_URL = 'https://openspeech.bytedance.com/api/v3/tts/unidirectional'
/** 大模型语音合成服务资源 ID */
const RESOURCE_ID = 'volcano_tts'
/** 输出音频格式：encoding=pcm，采样率固定 24kHz */
const SAMPLE_RATE = 24000
/** 整体看门狗：请求 + 收流全流程上限，防异常挂起 */
const OVERALL_TIMEOUT_MS = 30_000
/** 空闲看门狗：相邻响应数据块最大间隔，超过判定连接僵死 */
const IDLE_TIMEOUT_MS = 15_000
/** 停止信号轮询间隔 */
const STOP_POLL_MS = 200

/** 服务端消息类型（响应帧 byte1 高 4 位） */
const MSG_FULL_SERVER_JSON = 0b1001
const MSG_AUDIO_ONLY = 0b1011
const MSG_ERROR = 0b1111

/** 压缩方式（响应帧 byte2 低 4 位）：0b0001 表示 gzip */
const COMPRESSION_GZIP = 0b0001
/** flags 位：0b0001 表示头部后有 4 字节 sequence；0b0010 表示最后一帧 */
const FLAG_HAS_SEQUENCE = 0b0001
const FLAG_LAST_FRAME = 0b0010

/** 火山错误响应 JSON 结构（HTTP 层错误与错误帧 payload 均兼容） */
interface VolcErrorPayload {
  header?: { code?: number; message?: string }
  message?: string
}

/**
 * Edge 偏移量 → 火山 v3 audio_params 换算：
 * v3 的 speech_rate / loudness_rate 为 -50~100 的整数（百分比增减），
 * Edge 侧为 -100~+100 的百分比偏移，线性折半后夹取到 v3 范围。
 * v3 大模型不提供音调参数，pitch 偏移不生效（缓存键仍包含 pitch，不影响正确性）。
 */
function toVolcPercent(offset: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(offset / 2)))
}

/**
 * 火山引擎在线语音合成 Provider（v3 单向流式 HTTP POST + 二进制帧响应）：
 * POST JSON 请求体后持续读取响应流，按「4 字节协议头 + 可选 4 字节 sequence +
 * 4 字节 payload 长度 + payload（可选 gzip）」逐帧解析；JSON 元数据帧（0b1001）
 * 仅作信息帧忽略，纯音频帧（0b1011）累积拼接，收到最后一帧标志位后输出完整
 * s16le / 单声道 / 24kHz PCM。
 *
 * 与在线 Edge Provider 的语义差异（调用方 SegmentSynthesizer 已天然兼容）：
 * - 火山无「服务端提前收尾截断」信号，complete 恒为 true、serverEndMs 为 -1；
 * - 无逐词边界元数据，spokenTail 为空字符串（尾部对齐判据对空流直接通过）；
 * - 连接断开 / 帧间隔超时 / 错误帧一律抛错，由调用方统一重试。
 */
export class VolcProvider implements TTSProvider {
  readonly name = 'volc'

  constructor(
    private readonly options: {
      /** 火山引擎语音控制台应用 App ID */
      appId: string
      /** 火山引擎语音控制台「API Key 管理」签发的 API Key（替代旧版 Access Token） */
      apiKey: string
      /** 音色代号 voice_type，如 zh_female_cancan_mars_bigtts */
      voiceType: string
      /** HTTP 请求实现（工厂注入 cloudFetch 以支持代理；缺省用全局 fetch） */
      fetchImpl?: (url: string, init?: RequestInit) => Promise<Response>
    }
  ) {}

  async synthesizeSegment(
    req: TtsSegmentRequest,
    outPath: string,
    hooks: TtsSynthesisHooks,
    isStopped: () => boolean
  ): Promise<SynthesisOutcome> {
    const raw = await this.synthesizeRaw(req, hooks, isStopped)
    await writeFile(outPath, buildWav(raw.rawPcm, SAMPLE_RATE))
    return raw.outcome
  }

  /**
   * 直通模式：返回原始 s16le PCM，由调用方直接转 StereoPcm，
   * 省去 buildWav → writeFile → readFile → decodeAudioToPcm 的往返开销。
   */
  async synthesizeRaw(
    req: TtsSegmentRequest,
    hooks: TtsSynthesisHooks,
    isStopped: () => boolean
  ): Promise<RawSynthesisResult> {
    if (isStopped()) throw new Error('stopped')
    const rawPcm = await this.requestAudio(req, hooks, isStopped)
    return {
      outcome: { complete: true, serverEndMs: -1, spokenTail: '' },
      rawPcm,
      sampleRate: SAMPLE_RATE,
      channels: 1
    }
  }

  /** POST JSON 请求并流式解析二进制响应帧，拼接全部音频 */
  private requestAudio(
    req: TtsSegmentRequest,
    hooks: TtsSynthesisHooks,
    isStopped: () => boolean
  ): Promise<Buffer> {
    const requestId = randomUUID()
    const body = JSON.stringify({
      user: { uid: 'edge-tts-roles' },
      req_params: {
        text: req.text,
        speaker: this.options.voiceType,
        audio_params: {
          format: 'pcm',
          sample_rate: SAMPLE_RATE,
          speech_rate: toVolcPercent(req.rate, -50, 100),
          loudness_rate: toVolcPercent(req.volume, -50, 100)
        }
      }
    })

    return new Promise((resolve, reject) => {
      const controller = new AbortController()
      const frames: Buffer[] = []
      let settled = false
      let idleTimer: NodeJS.Timeout | undefined
      const overallTimer = setTimeout(() => fail('timeout'), OVERALL_TIMEOUT_MS)
      // 停止信号轮询：用户点停止后立即中断请求并以 stopped 结束
      const stopPoller = setInterval(() => {
        if (isStopped()) finish(new Error('stopped'))
      }, STOP_POLL_MS)

      const finish = (err?: Error, value?: Buffer): void => {
        if (settled) return
        settled = true
        if (idleTimer) clearTimeout(idleTimer)
        clearTimeout(overallTimer)
        clearInterval(stopPoller)
        controller.abort() // 中断仍在进行的请求/读取，fetch 端 Promise 静默退出
        if (err) reject(err)
        else resolve(value as Buffer)
      }

      const fail = (msg: string): void => {
        finish(new Error(createT()('cloud.volcFailed', { msg })))
      }

      // 空闲看门狗：每收到响应数据块重置，间隔超限判定连接僵死
      const armIdle = (): void => {
        if (idleTimer) clearTimeout(idleTimer)
        idleTimer = setTimeout(() => fail('timeout'), IDLE_TIMEOUT_MS)
      }

      void (async () => {
        try {
          const res = await (this.options.fetchImpl ?? fetch)(HTTP_URL, {
            method: 'POST',
            headers: {
              // App ID 标识应用，API Key 经 X-Api-Access-Key 携带（网关不读 Authorization 头）
              'X-Api-App-Key': this.options.appId,
              'X-Api-Access-Key': this.options.apiKey,
              'X-Api-Resource-Id': RESOURCE_ID,
              'X-Api-Request-Id': requestId,
              'Content-Type': 'application/json'
            },
            body,
            signal: controller.signal
          })
          if (!res.ok || !res.body) {
            const text = await res.text().catch(() => '')
            fail(`HTTP ${res.status} ${text.slice(0, 200)}`.trim())
            return
          }
          armIdle()

          const reader = res.body.getReader()
          let buf = Buffer.alloc(0)
          for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            buf = Buffer.concat([buf, Buffer.from(value)])
            armIdle()
            // 尽力消费缓冲区内所有完整帧（帧：头4 + [seq4] + 长度4 + payload）
            for (;;) {
              if (buf.length < 4) break
              const headerSize = Math.max((buf[0] & 0x0f) * 4, 4)
              const messageType = buf[1] >> 4
              const flags = buf[1] & 0x0f
              const compression = buf[2] & 0x0f
              const offset = headerSize + ((flags & FLAG_HAS_SEQUENCE) !== 0 ? 4 : 0)
              if (buf.length < offset + 4) break
              const size = buf.readUInt32BE(offset)
              if (buf.length < offset + 4 + size) break
              let payload = buf.subarray(offset + 4, offset + 4 + size)
              buf = buf.subarray(offset + 4 + size)
              try {
                if (compression === COMPRESSION_GZIP) payload = gunzipSync(payload)
              } catch (err) {
                fail(err instanceof Error ? err.message : String(err))
                return
              }

              if (messageType === MSG_ERROR) {
                try {
                  const info = JSON.parse(payload.toString('utf8')) as VolcErrorPayload
                  fail(
                    info.header?.message ?? info.message ?? `HTTP 层错误 ${info.header?.code ?? ''}`
                  )
                } catch {
                  fail(payload.toString('utf8').slice(0, 200))
                }
                return
              }
              if (messageType === MSG_FULL_SERVER_JSON) {
                // JSON 元数据帧（连接/收尾事件信息），非音频，忽略等待后续帧
                continue
              }
              if (messageType !== MSG_AUDIO_ONLY) {
                continue // 未知消息类型，忽略等待后续帧
              }
              if (payload.length > 0) {
                frames.push(payload)
                hooks.onAudioChunk?.()
              }
              // flags 中 0b0010 位表示最后一帧，据此判定音频推送结束
              if ((flags & FLAG_LAST_FRAME) !== 0) {
                finish(undefined, Buffer.concat(frames))
                return
              }
            }
          }
          // 响应流结束仍未收到最后一帧，按失败收尾，不静默返回截断音频
          if (!settled) fail('closed before last frame')
        } catch (err) {
          // finish 内的 abort 触发 AbortError 时已 settle，此处仅兜底未 settle 的异常
          if (settled) return
          if (err instanceof Error && err.name === 'AbortError') fail('timeout')
          else fail(err instanceof Error ? err.message : String(err))
        }
      })()
    })
  }
}
