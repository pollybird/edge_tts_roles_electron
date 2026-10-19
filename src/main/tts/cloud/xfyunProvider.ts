import { createHmac } from 'node:crypto'
import { writeFile } from 'fs/promises'
import type { IncomingMessage } from 'node:http'
import WebSocket from 'ws'
import { createT } from '../../../shared/i18n'
import { buildWav } from '../provider/piperProvider'
import type {
  RawSynthesisResult,
  SynthesisOutcome,
  TTSProvider,
  TtsSegmentRequest,
  TtsSynthesisHooks
} from '../provider/types'

/** 讯飞在线语音合成服务主机名（v2 接口，细节以讯飞官方文档为准） */
const TTS_HOST = 'tts-api.xfyun.cn'
/** 讯飞在线语音合成请求路径 */
const TTS_PATH = '/v2/tts'
/** 输出音频格式：aue=raw 时为裸 PCM，采样率由 auf 固定为 16kHz */
const SAMPLE_RATE = 16000
/** 整体看门狗：连接 + 收流全流程上限，防异常挂起 */
const OVERALL_TIMEOUT_MS = 30_000
/** 空闲看门狗：相邻音频帧最大间隔，超过判定连接僵死 */
const IDLE_TIMEOUT_MS = 15_000
/** 停止信号轮询间隔 */
const STOP_POLL_MS = 200

/** 讯飞返回帧结构（data.audio 为 base64 PCM 分片，status=2 表示音频推送结束） */
interface XfyunFrame {
  code?: number
  message?: string
  data?: { audio?: string; status?: number }
}

/**
 * 讯飞 speed/volume/pitch 与 Edge 偏移量的换算：
 * 讯飞官方范围为 0~100（默认 50），Edge 侧为 -100~+100 的百分比偏移，
 * 线性映射为 50 + offset/2 后夹取到 0~100。
 */
function toXfyunParam(offset: number): number {
  return Math.min(100, Math.max(0, 50 + offset / 2))
}

/**
 * 科大讯飞在线语音合成 Provider（WebSocket API v2）：
 * 鉴权后单帧发送整段文本（status=2），持续接收 base64 PCM 分片，
 * 收到 data.status=2 结束帧后拼接为完整 s16le / 单声道 / 16kHz PCM。
 *
 * 与在线 Edge Provider 的语义差异（调用方 SegmentSynthesizer 已天然兼容）：
 * - 讯飞无「服务端提前收尾截断」信号，complete 恒为 true、serverEndMs 为 -1；
 * - 无逐词边界元数据，spokenTail 为空字符串（尾部对齐判据对空流直接通过）。
 */
export class XfyunProvider implements TTSProvider {
  readonly name = 'xfyun'

  constructor(
    private readonly options: {
      /** 讯飞开放平台应用 ID（控制台创建应用获得） */
      appId: string
      /** 服务接口认证信息 APIKey（控制台应用详情页获得） */
      apiKey: string
      /** 服务接口认证信息 APISecret（控制台应用详情页获得） */
      apiSecret: string
      /** 发音人代号，如 xiaoyan（讯飞发音人列表） */
      vcn: string
      /** WebSocket 代理 agent 提供器（工厂注入 cloudWsAgent 以支持代理；缺省直连） */
      wsAgentProvider?: () => Promise<import('node:http').Agent | undefined>
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

  /**
   * 构造带鉴权参数的 WebSocket URL（细节以讯飞官方文档为准）：
   * - date：RFC1123 格式的 GMT 时间（toUTCString）；
   * - signature：以 apiSecret 为密钥对「host/date/请求行」三行原文做 HMAC-SHA256 后 base64；
   * - authorization：api_key/algorithm/headers/signature 键值对原文整体再 base64。
   */
  private buildAuthUrl(): string {
    const { apiKey, apiSecret } = this.options
    const date = new Date().toUTCString()
    // 签名原文：请求行固定为 GET /v2/tts HTTP/1.1
    const signatureOrigin = `host: ${TTS_HOST}\ndate: ${date}\nGET ${TTS_PATH} HTTP/1.1`
    const signature = createHmac('sha256', apiSecret).update(signatureOrigin).digest('base64')
    const authorizationOrigin =
      `api_key="${apiKey}", algorithm="hmac-sha256", ` +
      `headers="host date request-line", signature="${signature}"`
    const authorization = Buffer.from(authorizationOrigin, 'utf8').toString('base64')
    return (
      `wss://${TTS_HOST}${TTS_PATH}` +
      `?authorization=${encodeURIComponent(authorization)}` +
      `&date=${encodeURIComponent(date)}` +
      `&host=${TTS_HOST}`
    )
  }

  /** 建立鉴权连接，单帧发送整段文本并收集服务端推送的 PCM 分片 */
  private async requestAudio(
    req: TtsSegmentRequest,
    hooks: TtsSynthesisHooks,
    isStopped: () => boolean
  ): Promise<Buffer> {
    // 代理 agent（直连为 undefined）；无代理钩子时不引入 await，
    // 保证 WebSocket 在 Promise 执行器内同步构造（测试依赖此同步性）
    const agentProvider = this.options.wsAgentProvider
    const agent = agentProvider ? await agentProvider() : undefined
    return await new Promise((resolve, reject) => {
      const ws = new WebSocket(this.buildAuthUrl(), agent ? { agent } : undefined)
      const frames: Buffer[] = []
      let settled = false
      let idleTimer: NodeJS.Timeout | undefined

      // 停止信号轮询：用户点停止后立即断开并以 stopped 结束
      const stopPoller = setInterval(() => {
        if (isStopped()) finish(new Error('stopped'))
      }, STOP_POLL_MS)

      // 整体看门狗：全流程 30s 上限
      const overallTimer = setTimeout(() => fail('timeout'), OVERALL_TIMEOUT_MS)

      const finish = (err?: Error, value?: Buffer): void => {
        if (settled) return
        settled = true
        clearTimeout(overallTimer)
        if (idleTimer) clearTimeout(idleTimer)
        clearInterval(stopPoller)
        ws.close()
        if (err) reject(err)
        else resolve(value as Buffer)
      }

      const fail = (msg: string): void => {
        finish(new Error(createT()('cloud.xfyunFailed', { msg })))
      }

      // 空闲看门狗：每收到音频帧重置，间隔超限判定连接僵死
      const armIdle = (): void => {
        if (idleTimer) clearTimeout(idleTimer)
        idleTimer = setTimeout(() => fail('timeout'), IDLE_TIMEOUT_MS)
      }

      ws.on('open', () => {
        // 首帧即携带完整文本：data.status=2 表示文本一次发完，无需分片续传
        const request = {
          common: { app_id: this.options.appId },
          business: {
            aue: 'raw',
            auf: 'audio/L16;rate=16000',
            vcn: this.options.vcn,
            tte: 'UTF8',
            speed: toXfyunParam(req.rate),
            volume: toXfyunParam(req.volume),
            pitch: toXfyunParam(req.pitch)
          },
          data: { status: 2, text: Buffer.from(req.text, 'utf8').toString('base64') }
        }
        ws.send(JSON.stringify(request))
        armIdle()
      })

      ws.on('message', (data: unknown) => {
        let frame: XfyunFrame
        try {
          frame = JSON.parse(String(data)) as XfyunFrame
        } catch (err) {
          fail(err instanceof Error ? err.message : String(err))
          return
        }
        // 业务错误帧（如 10043 参数非法、10105 鉴权失败）：关闭连接并抛出
        if (typeof frame.code === 'number' && frame.code !== 0) {
          fail(`${frame.code} ${frame.message ?? ''}`.trim())
          return
        }
        const audio = frame.data?.audio
        if (audio) {
          frames.push(Buffer.from(audio, 'base64'))
          armIdle()
          hooks.onAudioChunk?.()
        }
        // status=2 表示音频推送结束
        if (frame.data?.status === 2) {
          finish(undefined, Buffer.concat(frames))
        }
      })

      // 无监听 error 事件会触发未捕获异常，必须兜底
      ws.on('error', (err: Error) => fail(err.message))
      // 握手被服务端拒绝（如 401 鉴权失败）：读取响应体中的讯飞错误码给出具体原因。
      // ws 库在存在 unexpected-response 监听器时不再重复发 error 事件，由本处全权处理。
      ws.on('unexpected-response', (_req: unknown, res: IncomingMessage) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)))
        res.on('error', () => fail(`HTTP ${res.statusCode ?? '?'}`))
        res.on('end', () =>
          fail(describeUpgradeFailure(res.statusCode, Buffer.concat(chunks).toString('utf8')))
        )
      })
      // 提前断开（未收到 status=2）按失败收尾；正常结束后 close 事件被 settled 忽略
      ws.on('close', () => {
        if (!settled) fail('closed')
      })
    })
  }
}

/**
 * 提取握手失败的具体原因：401/403 响应体通常是
 * {"header":{"code":10110,"message":"..."}} 格式的 JSON，优先展示其中的
 * 讯飞错误码与消息；非 JSON 时截断展示原文。401 额外附加密钥来源提示。
 */
function describeUpgradeFailure(statusCode: number | undefined, body: string): string {
  let detail = body.trim()
  try {
    const parsed = JSON.parse(body) as { header?: { code?: number; message?: string } }
    if (parsed.header?.message) {
      detail = `${parsed.header.code ?? ''} ${parsed.header.message}`.trim()
    }
  } catch {
    if (detail.length > 200) detail = `${detail.slice(0, 200)}…`
  }
  const base = `HTTP ${statusCode ?? '?'}${detail ? `：${detail}` : ''}`
  return statusCode === 401 ? `${base}。${createT()('cloud.xfyunAuthHint')}` : base
}
