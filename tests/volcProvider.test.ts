import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { gzipSync } from 'node:zlib'
import { VolcProvider } from '../src/main/tts/cloud/volcProvider'
import type {
  RawSynthesisResult,
  TtsSegmentRequest,
  TtsSynthesisHooks
} from '../src/main/tts/provider/types'

vi.mock('../src/shared/i18n', () => ({
  createT: () => (k: string, p?: Record<string, unknown>) => (p?.msg ? `${k}:${p.msg}` : k)
}))

/** 捕获落盘的 WAV 数据 */
const fsCapture = vi.hoisted(() => ({
  writes: [] as Array<{ path: string; data: Buffer }>
}))

vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue(''),
  writeFile: vi.fn(async (path: string, data: Buffer) => {
    fsCapture.writes.push({ path, data: Buffer.from(data) })
  })
}))

/** 捕获 fetch 的请求信息与模拟响应 */
const fetchCapture = vi.hoisted(() => ({
  init: null as { url: string; init?: RequestInit } | null,
  /** 测试用例预设的响应（ok/status/分块字节流/文本错误体），beforeEach 重置 */
  respond: null as ((req: Uint8Array) => Response) | null
}))

vi.stubGlobal('fetch', (url: string | URL, init?: RequestInit): Promise<Response> => {
  fetchCapture.init = { url: String(url), init }
  const body = new TextEncoder().encode(String(init?.body))
  const respond = fetchCapture.respond
  if (!respond) throw new Error('no respond preset')
  return Promise.resolve(respond(body))
})

/** 按火山 v3 HTTP 响应帧格式追加一帧：头4 + [seq4] + 长度4 + payload */
function pushFrame(
  chunks: Uint8Array[],
  messageType: number,
  flags: number,
  isGzip: boolean,
  payload: Buffer,
  sequence?: number
): void {
  const header = Buffer.alloc(4)
  header[0] = (0b0001 << 4) | 0b0001
  header[1] = (messageType << 4) | flags | (sequence !== undefined ? 0b0001 : 0b0000)
  header[2] = (0b0001 << 4) | (isGzip ? 0b0001 : 0b0000)
  header[3] = 0x00
  chunks.push(new Uint8Array(header))
  if (sequence !== undefined) {
    const seq = Buffer.alloc(4)
    seq.writeUInt32BE(sequence, 0)
    chunks.push(new Uint8Array(seq))
  }
  const len = Buffer.alloc(4)
  len.writeUInt32BE(payload.length, 0)
  chunks.push(new Uint8Array(len))
  chunks.push(new Uint8Array(payload))
}

/** 用帧字节序列构造 Response（body 为可分块读取的流） */
function makeResponse(chunks: Uint8Array[], ok = true, status = 200): Response {
  let i = 0
  const body = {
    getReader: (): ReadableStreamDefaultReader<Uint8Array> => {
      const inner = {
        read: async (): Promise<ReadableStreamReadResult<Uint8Array>> =>
          i < chunks.length ? { done: false, value: chunks[i++] } : { done: true, value: undefined }
      }
      return inner as unknown as ReadableStreamDefaultReader<Uint8Array>
    }
  }
  return {
    ok,
    status,
    body,
    text: async () => Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8')
  } as unknown as Response
}

/** 请求体 JSON 结构（与火山 v3 官方文档一致） */
interface VolcRequestBody {
  user: { uid: string }
  req_params: {
    text: string
    speaker: string
    audio_params: {
      format: string
      sample_rate: number
      speech_rate: number
      loudness_rate: number
    }
  }
}

const BASE_REQ: TtsSegmentRequest = {
  text: '你好世界',
  voice: 'irrelevant',
  rate: 0,
  volume: 0,
  pitch: 0
}

function createProvider(): VolcProvider {
  return new VolcProvider({
    appId: 'test-app-id',
    apiKey: 'test-api-key',
    voiceType: 'zh_female_test'
  })
}

function startRaw(
  provider: VolcProvider,
  req: TtsSegmentRequest,
  hooks: TtsSynthesisHooks = {}
): Promise<RawSynthesisResult> {
  return provider.synthesizeRaw(req, hooks, () => false)
}

/** 构造「单帧收尾」的标准响应（一帧空音频带最后帧标志） */
function lastEmptyAudioResponse(): Response {
  const chunks: Uint8Array[] = []
  pushFrame(chunks, 0b1011, 0b0010, false, Buffer.alloc(2))
  return makeResponse(chunks)
}

beforeEach(() => {
  fetchCapture.init = null
  fetchCapture.respond = null
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.stubGlobal('fetch', (url: string | URL, init?: RequestInit): Promise<Response> => {
    fetchCapture.init = { url: String(url), init }
    const body = new TextEncoder().encode(String(init?.body))
    const respond = fetchCapture.respond
    if (!respond) throw new Error('no respond preset')
    return Promise.resolve(respond(body))
  })
})

describe('VolcProvider 连接与请求', () => {
  it('POST 火山 v3 端点并携带 App ID + API Key 鉴权与资源请求头', async () => {
    fetchCapture.respond = () => lastEmptyAudioResponse()
    const promise = startRaw(createProvider(), BASE_REQ)
    expect(fetchCapture.init?.url).toBe(
      'https://openspeech.bytedance.com/api/v3/tts/unidirectional'
    )
    const headers = fetchCapture.init?.init?.headers as Record<string, string>
    expect(headers['X-Api-App-Key']).toBe('test-app-id')
    expect(headers['X-Api-Access-Key']).toBe('test-api-key')
    expect(headers['X-Api-Resource-Id']).toBe('volcano_tts')
    expect(headers['X-Api-Request-Id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    )
    expect(headers['Content-Type']).toBe('application/json')
    await promise
  })

  it('请求体 JSON 结构与默认参数一致', async () => {
    fetchCapture.respond = () => lastEmptyAudioResponse()
    await startRaw(createProvider(), BASE_REQ)
    const body = JSON.parse(String(fetchCapture.init?.init?.body)) as VolcRequestBody
    expect(body.user).toEqual({ uid: 'edge-tts-roles' })
    expect(body.req_params.text).toBe('你好世界')
    expect(body.req_params.speaker).toBe('zh_female_test')
    expect(body.req_params.audio_params).toEqual({
      format: 'pcm',
      sample_rate: 24000,
      speech_rate: 0,
      loudness_rate: 0
    })
  })

  it('参数映射：rate/volume 偏移折半为 -50~100 并夹取，pitch 不生效', async () => {
    fetchCapture.respond = () => lastEmptyAudioResponse()
    const provider = createProvider()
    const runAndGetAudio = async (
      over: Partial<TtsSegmentRequest>
    ): Promise<VolcRequestBody['req_params']['audio_params']> => {
      await startRaw(provider, { ...BASE_REQ, ...over })
      return (JSON.parse(String(fetchCapture.init?.init?.body)) as VolcRequestBody).req_params
        .audio_params
    }
    expect((await runAndGetAudio({})).speech_rate).toBe(0)
    expect((await runAndGetAudio({ rate: -80 })).speech_rate).toBe(-40)
    expect((await runAndGetAudio({ rate: -100 })).speech_rate).toBe(-50)
    expect((await runAndGetAudio({ rate: 300 })).speech_rate).toBe(100) // 超范围夹取上限
    expect((await runAndGetAudio({ volume: 100 })).loudness_rate).toBe(50)
    expect((await runAndGetAudio({ volume: -200 })).loudness_rate).toBe(-50) // 夹取下限
    expect('pitch' in (await runAndGetAudio({ pitch: 50 }))).toBe(false) // v3 无音调参数
  })
})

describe('VolcProvider 响应帧解码', () => {
  it('信息 JSON 帧（0b1001）忽略、纯音频帧与 gzip 帧解码累积、带 sequence 帧正确剥离、最后一帧收尾', async () => {
    const onAudioChunk = vi.fn()
    const a1 = Buffer.from([1, 2, 3, 4])
    const a2 = Buffer.from([5, 6, 7, 8])
    const a3 = Buffer.from([9, 10, 11, 12])
    const chunks: Uint8Array[] = []
    pushFrame(chunks, 0b1001, 0b0001, false, Buffer.from('{"event":1}'), 1)
    pushFrame(chunks, 0b1011, 0, false, a1, 2)
    pushFrame(chunks, 0b1011, 0, false, a2)
    pushFrame(chunks, 0b1011, 0b0010, true, gzipSync(a3))
    fetchCapture.respond = () => makeResponse(chunks)
    const result = await startRaw(createProvider(), BASE_REQ, { onAudioChunk })
    expect(result.rawPcm.equals(Buffer.concat([a1, a2, a3]))).toBe(true)
    expect(result.sampleRate).toBe(24000)
    expect(result.channels).toBe(1)
    expect(result.outcome).toEqual({ complete: true, serverEndMs: -1, spokenTail: '' })
    expect(onAudioChunk).toHaveBeenCalledTimes(3)
  })

  it('错误帧（0b1111）抛出含服务端 message 的本地化错误', async () => {
    const chunks: Uint8Array[] = []
    pushFrame(
      chunks,
      0b1111,
      0,
      false,
      Buffer.from(JSON.stringify({ event: 3001, message: 'quota exceeded' }))
    )
    fetchCapture.respond = () => makeResponse(chunks)
    await expect(startRaw(createProvider(), BASE_REQ)).rejects.toThrow(
      'cloud.volcFailed:quota exceeded'
    )
  })

  it('gzip 压缩错误帧（code/message 形式）同样解码并抛错', async () => {
    const chunks: Uint8Array[] = []
    pushFrame(
      chunks,
      0b1111,
      0,
      true,
      gzipSync(Buffer.from(JSON.stringify({ code: 45000001, message: 'invalid api key' })))
    )
    fetchCapture.respond = () => makeResponse(chunks)
    await expect(startRaw(createProvider(), BASE_REQ)).rejects.toThrow('invalid api key')
  })

  it('HTTP 层错误（如 401）上报状态码与响应体', async () => {
    fetchCapture.respond = () =>
      makeResponse([new Uint8Array(Buffer.from('invalid api key'))], false, 401)
    await expect(startRaw(createProvider(), BASE_REQ)).rejects.toThrow('HTTP 401')
    await expect(startRaw(createProvider(), BASE_REQ)).rejects.toThrow('invalid api key')
  })

  it('未收到最后一帧即流结束时抛错，不静默返回截断音频', async () => {
    const chunks: Uint8Array[] = []
    pushFrame(chunks, 0b1011, 0, false, Buffer.alloc(4))
    fetchCapture.respond = () => makeResponse(chunks)
    await expect(startRaw(createProvider(), BASE_REQ)).rejects.toThrow('closed before last frame')
  })

  it('开始前已停止时抛错且不发起请求', async () => {
    const provider = createProvider()
    await expect(provider.synthesizeRaw(BASE_REQ, {}, () => true)).rejects.toThrow('stopped')
    expect(fetchCapture.init).toBeNull()
  })
})

describe('VolcProvider synthesizeSegment', () => {
  it('将累积 PCM 打包为 RIFF WAV 落盘', async () => {
    const pcm = Buffer.from([1, 0, 2, 0, 3, 0])
    const chunks: Uint8Array[] = []
    pushFrame(chunks, 0b1011, 0b0010, false, pcm)
    fetchCapture.respond = () => makeResponse(chunks)
    fsCapture.writes.length = 0
    await createProvider().synthesizeSegment(BASE_REQ, '/fake/out.wav', {}, () => false)
    expect(fsCapture.writes).toHaveLength(1)
    expect(fsCapture.writes[0]?.path).toBe('/fake/out.wav')
    const wav = fsCapture.writes[0]?.data ?? Buffer.alloc(0)
    expect(wav.subarray(0, 4).toString('ascii')).toBe('RIFF')
    expect(wav.length).toBe(44 + pcm.length)
    expect(wav.readUInt32LE(24)).toBe(24000) // 采样率 24kHz
    expect(wav.subarray(44).equals(pcm)).toBe(true) // data 段即原始 PCM
  })
})
