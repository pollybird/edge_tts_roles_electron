import { createHmac } from 'node:crypto'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { XfyunProvider } from '../src/main/tts/cloud/xfyunProvider'
import type { RawSynthesisResult, TtsSegmentRequest } from '../src/main/tts/provider/types'

/** 测试凭据（内容随意，仅用于断言透传） */
const creds = {
  appId: 'test-app-id',
  apiKey: 'test-api-key',
  apiSecret: 'test-api-secret',
  vcn: 'xiaoyan'
}

const baseReq: TtsSegmentRequest = {
  text: '你好世界',
  voice: 'xiaoyan',
  rate: 0,
  volume: 0,
  pitch: 0
}

/** 假 WebSocket 实例的观测面（测试手动 emit 驱动时序） */
interface FakeWs {
  url: string
  sent: string[]
  closed: boolean
  emit: (event: string, ...args: unknown[]) => void
}

/**
 * vi.hoisted 将假 WebSocket 类与捕获容器提升到 vi.mock 工厂之前初始化：
 * vitest 4 会把 vi.mock 调用提升到模块导入之前求值，工厂闭包若引用
 * import 绑定（如 EventEmitter）会在其初始化前求值而抛 TDZ ReferenceError，
 * 因此 FakeWebSocket 必须在此自包含（不依赖任何 import），仅实现 provider
 * 用到的 on/emit/close/send 最小接口。
 */
const { FakeWebSocket, captures, writeFileCapture } = vi.hoisted(() => {
  /** 捕获测试期间创建的假 WebSocket 实例（按创建顺序排列） */
  const captures = { instances: [] as FakeWs[] }
  /** 捕获 synthesizeSegment 落盘的 WAV */
  const writeFileCapture = { path: '', data: null as Buffer | null }

  /** 极简事件发射器（同步派发，够 provider 使用即可） */
  class FakeEmitter {
    private handlers = new Map<string, Array<(...args: unknown[]) => void>>()

    on(event: string, cb: (...args: unknown[]) => void): void {
      const list = this.handlers.get(event) ?? []
      list.push(cb)
      this.handlers.set(event, list)
    }

    emit(event: string, ...args: unknown[]): void {
      for (const cb of [...(this.handlers.get(event) ?? [])]) cb(...args)
    }
  }

  /** 假 WebSocket：记录构造 URL 与发送的每一帧 */
  class FakeWebSocket extends FakeEmitter implements FakeWs {
    url: string
    sent: string[] = []
    closed = false

    constructor(url: string) {
      super()
      this.url = url
      captures.instances.push(this)
    }

    send(data: unknown): void {
      this.sent.push(String(data))
    }

    close(): void {
      this.closed = true
    }
  }

  return { FakeWebSocket, captures, writeFileCapture }
})

vi.mock('ws', () => ({ default: FakeWebSocket }))

vi.mock('fs/promises', () => ({
  writeFile: vi.fn(async (path: string, data: Buffer) => {
    writeFileCapture.path = path
    writeFileCapture.data = data
  })
}))

// i18n mock：按真实 i18n 的行为插值 {msg}，便于断言组合后的完整错误信息
vi.mock('../src/shared/i18n', () => ({
  createT: () => (k: string, params?: Record<string, unknown>) =>
    params && 'msg' in params ? `${k}:${String(params.msg)}` : k
}))

/** 取最近创建的假 WebSocket 实例 */
function lastWs(): FakeWs {
  const ws = captures.instances[captures.instances.length - 1]
  if (!ws) throw new Error('WebSocket 未被创建')
  return ws
}

/** 构造讯飞返回 JSON 帧 */
function frameJson(payload: Record<string, unknown>): Buffer {
  return Buffer.from(JSON.stringify(payload))
}

/** 构造一帧音频返回（audio 为 base64 PCM，status=2 表示结束） */
function audioFrame(pcm: Buffer, status: number): Buffer {
  return frameJson({ code: 0, message: 'success', data: { audio: pcm.toString('base64'), status } })
}

/**
 * 发起 synthesizeRaw 并在同一 tick 内驱动假 WS 时序（open → 逐帧 message），
 * 避免真实定时器介入：所有事件同步派发，promise 随即落定。
 */
async function synthesizeWith(
  provider: XfyunProvider,
  req: TtsSegmentRequest,
  frames: Buffer[]
): Promise<RawSynthesisResult> {
  const pending = provider.synthesizeRaw(req, {}, () => false)
  const ws = lastWs()
  ws.emit('open')
  for (const frame of frames) ws.emit('message', frame)
  return pending
}

beforeEach(() => {
  captures.instances.length = 0
  writeFileCapture.path = ''
  writeFileCapture.data = null
})

describe('XfyunProvider 鉴权与请求帧', () => {
  it('鉴权 URL 含 authorization/date/host 查询参数，host 为 tts-api.xfyun.cn', async () => {
    const provider = new XfyunProvider(creds)
    await synthesizeWith(provider, baseReq, [audioFrame(Buffer.alloc(2), 2)])
    const url = new URL(lastWs().url)
    expect(`${url.protocol}//${url.host}${url.pathname}`).toBe('wss://tts-api.xfyun.cn/v2/tts')
    expect(url.searchParams.get('host')).toBe('tts-api.xfyun.cn')
    expect(url.searchParams.get('authorization')).toBeTruthy()
    // authorization 为 base64 编码的鉴权原文，解码后应包含 api_key 声明
    const auth = Buffer.from(url.searchParams.get('authorization') ?? '', 'base64').toString('utf8')
    expect(auth).toContain('api_key="test-api-key"')
    expect(auth).toContain('hmac-sha256')
    // date 为 RFC1123 GMT 时间字符串
    expect(Number.isNaN(Date.parse(url.searchParams.get('date') ?? ''))).toBe(false)
  })

  it('authorization 内的 signature 可用 apiSecret 对 host/date/请求行原文重算并比对', async () => {
    const provider = new XfyunProvider(creds)
    await synthesizeWith(provider, baseReq, [audioFrame(Buffer.alloc(2), 2)])
    const url = new URL(lastWs().url)
    const date = url.searchParams.get('date') ?? ''
    const auth = Buffer.from(url.searchParams.get('authorization') ?? '', 'base64').toString('utf8')
    const signature = /signature="([^"]+)"/.exec(auth)?.[1] ?? ''
    // 签名原文三行：host 头 + date 头 + 请求行，与讯飞官方鉴权协议一致
    const origin = `host: tts-api.xfyun.cn\ndate: ${date}\nGET /v2/tts HTTP/1.1`
    const expected = createHmac('sha256', 'test-api-secret').update(origin).digest('base64')
    expect(signature).toBe(expected)
  })

  it('首帧 business 参数映射：rate 0/100/-100 → speed 50/100/0，aue=raw，text 为 base64', async () => {
    const provider = new XfyunProvider(creds)
    for (const [rate, speed] of [
      [0, 50],
      [100, 100],
      [-100, 0]
    ] as const) {
      await synthesizeWith(provider, { ...baseReq, rate }, [audioFrame(Buffer.alloc(2), 2)])
      const sent = JSON.parse(lastWs().sent[0]) as {
        common: { app_id: string }
        business: Record<string, unknown>
        data: { status: number; text: string }
      }
      expect(sent.business.speed).toBe(speed)
      expect(sent.business.aue).toBe('raw')
      expect(sent.business.tte).toBe('UTF8')
      expect(sent.business.vcn).toBe('xiaoyan')
      expect(sent.business.volume).toBe(50)
      expect(sent.business.pitch).toBe(50)
      expect(sent.common.app_id).toBe('test-app-id')
      expect(sent.data.status).toBe(2)
      expect(sent.data.text).toBe(Buffer.from('你好世界', 'utf8').toString('base64'))
    }
  })
})

describe('XfyunProvider 音频收集', () => {
  it('两帧 audio + status=2 结束帧 → rawPcm 为两段解码后拼接，采样率 16k 单声道', async () => {
    const provider = new XfyunProvider(creds)
    const pcmA = Buffer.from([1, 2, 3, 4])
    const pcmB = Buffer.from([5, 6, 7, 8])
    const result = await synthesizeWith(provider, baseReq, [
      audioFrame(pcmA, 1),
      audioFrame(pcmB, 2)
    ])
    expect(result.rawPcm.equals(Buffer.concat([pcmA, pcmB]))).toBe(true)
    expect(result.sampleRate).toBe(16000)
    expect(result.channels).toBe(1)
    expect(result.outcome).toEqual({ complete: true, serverEndMs: -1, spokenTail: '' })
  })

  it('code=10043 错误帧 → 抛错 message 含 cloud.xfyunFailed 键名并关闭连接', async () => {
    const provider = new XfyunProvider(creds)
    const pending = provider.synthesizeRaw(baseReq, {}, () => false)
    const ws = lastWs()
    ws.emit('open')
    ws.emit('message', frameJson({ code: 10043, message: 'invalid param', data: { status: 2 } }))
    await expect(pending).rejects.toThrow('cloud.xfyunFailed')
    expect(ws.closed).toBe(true)
  })

  it('开始前 isStopped 为 true → 立即抛 stopped 且不建立连接', async () => {
    const provider = new XfyunProvider(creds)
    await expect(provider.synthesizeRaw(baseReq, {}, () => true)).rejects.toThrow('stopped')
    expect(captures.instances).toHaveLength(0)
  })
})

describe('XfyunProvider synthesizeSegment', () => {
  it('落盘的 WAV 以 RIFF 开头（buildWav 正确调用，采样率 16000）', async () => {
    const provider = new XfyunProvider(creds)
    const pcm = Buffer.from([1, 0, 2, 0, 3, 0])
    const pending = provider.synthesizeSegment(baseReq, '/fake/out.wav', {}, () => false)
    const ws = lastWs()
    ws.emit('open')
    ws.emit('message', audioFrame(pcm, 2))
    const outcome = await pending
    expect(outcome).toEqual({ complete: true, serverEndMs: -1, spokenTail: '' })
    expect(writeFileCapture.path).toBe('/fake/out.wav')
    const wav = writeFileCapture.data as Buffer
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF')
    expect(wav.readUInt32LE(24)).toBe(16000)
    expect(wav.length).toBe(44 + pcm.length)
  })
})

/** 假 http.IncomingMessage：支持流式注册 data/error/end 并手动触发 */
function makeUpgradeRes(statusCode: number): {
  statusCode: number
  on: (event: string, cb: (...args: unknown[]) => void) => void
  fire: (event: string, arg?: unknown) => void
} {
  const handlers = new Map<string, Array<(...args: unknown[]) => void>>()
  return {
    statusCode,
    on(event, cb) {
      const list = handlers.get(event) ?? []
      list.push(cb)
      handlers.set(event, list)
    },
    fire(event, arg) {
      for (const cb of [...(handlers.get(event) ?? [])]) cb(arg)
    }
  }
}

describe('XfyunProvider 握手被拒（unexpected-response）', () => {
  it('401 + JSON 响应体 → 报错含 HTTP 401、讯飞错误码与 401 密钥提示，并关闭连接', async () => {
    const provider = new XfyunProvider(creds)
    const pending = provider.synthesizeRaw(baseReq, {}, () => false)
    const ws = lastWs()
    const res = makeUpgradeRes(401)
    ws.emit('unexpected-response', {}, res)
    res.fire(
      'data',
      Buffer.from(
        JSON.stringify({ header: { code: 10110, message: 'appid 未授权或未开通该服务' } })
      )
    )
    res.fire('end')
    await expect(pending).rejects.toThrow('HTTP 401')
    await expect(pending).rejects.toThrow('10110 appid 未授权或未开通该服务')
    await expect(pending).rejects.toThrow('cloud.xfyunAuthHint')
    expect(ws.closed).toBe(true)
  })

  it('403 + 非 JSON 响应体 → 截断展示原文，不附加 401 提示', async () => {
    const provider = new XfyunProvider(creds)
    const pending = provider.synthesizeRaw(baseReq, {}, () => false)
    const ws = lastWs()
    const res = makeUpgradeRes(403)
    ws.emit('unexpected-response', {}, res)
    res.fire('data', Buffer.from('Forbidden'))
    res.fire('end')
    await expect(pending).rejects.toThrow('HTTP 403：Forbidden')
    await expect(pending).rejects.not.toThrow('cloud.xfyunAuthHint')
    expect(ws.closed).toBe(true)
  })
})
