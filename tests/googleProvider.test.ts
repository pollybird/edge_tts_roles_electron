import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { writeFile } from 'fs/promises'
import { GoogleProvider } from '../src/main/tts/cloud/googleProvider'
import type { TtsSegmentRequest } from '../src/main/tts/provider/types'

vi.mock('fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined)
}))

// i18n mock：t 直接返回 key 本身，断言错误 message 含键名即可，不断言翻译文案
vi.mock('../src/shared/i18n', () => ({
  createT: () => (k: string) => k
}))

const writeFileMock = vi.mocked(writeFile)

/** 请求体结构（与 Google text:synthesize REST 协议一致） */
interface SynthesizeBody {
  input: { text: string }
  voice: { languageCode: string; name: string }
  audioConfig: {
    audioEncoding: string
    speakingRate: number
    pitch: number
    volumeGainDb: number
  }
}

const makeProvider = (): GoogleProvider =>
  new GoogleProvider({
    apiKey: 'test-key',
    voiceName: 'cmn-CN-Wavenet-A',
    languageCode: 'cmn-CN'
  })

const baseReq = (over: Partial<TtsSegmentRequest> = {}): TtsSegmentRequest => ({
  text: '你好世界',
  voice: 'ignored-by-google',
  rate: 0,
  volume: 0,
  pitch: 0,
  ...over
})

/** 解析最近一次 fetch 请求的第二参数 body */
function lastBody(): SynthesizeBody {
  const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls as Array<
    [string, RequestInit]
  >
  const last = calls[calls.length - 1]
  expect(last).toBeDefined()
  return JSON.parse(String(last[1].body)) as SynthesizeBody
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ audioContent: Buffer.from('fakewav').toString('base64') })
    }))
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('GoogleProvider synthesizeSegment 参数映射', () => {
  it('rate 映射：0→speakingRate 1、50→1.5、-90→夹取 0.25', async () => {
    const provider = makeProvider()
    await provider.synthesizeSegment(baseReq({ rate: 0 }), '/tmp/out.wav', {}, () => false)
    expect(lastBody().audioConfig.speakingRate).toBe(1)

    await provider.synthesizeSegment(baseReq({ rate: 50 }), '/tmp/out.wav', {}, () => false)
    expect(lastBody().audioConfig.speakingRate).toBe(1.5)

    // (100-90)/100 = 0.1，低于官方下限 0.25，夹取
    await provider.synthesizeSegment(baseReq({ rate: -90 }), '/tmp/out.wav', {}, () => false)
    expect(lastBody().audioConfig.speakingRate).toBe(0.25)
  })

  it('pitch 映射：100→6 半音、-500→夹取 -20', async () => {
    const provider = makeProvider()
    await provider.synthesizeSegment(baseReq({ pitch: 100 }), '/tmp/out.wav', {}, () => false)
    expect(lastBody().audioConfig.pitch).toBeCloseTo(6, 10)

    // -500 * 0.06 = -30，超出官方下限 -20 半音，夹取
    await provider.synthesizeSegment(baseReq({ pitch: -500 }), '/tmp/out.wav', {}, () => false)
    expect(lastBody().audioConfig.pitch).toBe(-20)
  })

  it('volume 映射：100→+6.02dB、-100→-96（不产生 NaN/Infinity）', async () => {
    const provider = makeProvider()
    await provider.synthesizeSegment(baseReq({ volume: 100 }), '/tmp/out.wav', {}, () => false)
    const gainDb = lastBody().audioConfig.volumeGainDb
    expect(gainDb).toBeCloseTo(20 * Math.log10(2), 10)
    expect(Number.isFinite(gainDb)).toBe(true)

    // log10(0) 为 -Infinity，特殊分支直接取 -96
    await provider.synthesizeSegment(baseReq({ volume: -100 }), '/tmp/out.wav', {}, () => false)
    const mutedDb = lastBody().audioConfig.volumeGainDb
    expect(mutedDb).toBe(-96)
    expect(Number.isFinite(mutedDb)).toBe(true)
  })

  it('请求体结构与 URL：input.text、voice 固定为构造参数、audioEncoding 为 LINEAR16', async () => {
    const provider = makeProvider()
    await provider.synthesizeSegment(baseReq(), '/tmp/out.wav', {}, () => false)

    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls as Array<
      [string, RequestInit]
    >
    const [url, init] = calls[0]
    expect(String(url)).toBe('https://texttospeech.googleapis.com/v1/text:synthesize?key=test-key')
    expect(init.method).toBe('POST')

    const body = lastBody()
    expect(body.input.text).toBe('你好世界')
    expect(body.voice).toEqual({ languageCode: 'cmn-CN', name: 'cmn-CN-Wavenet-A' })
    expect(body.audioConfig.audioEncoding).toBe('LINEAR16')
  })
})

describe('GoogleProvider synthesizeSegment 结果与错误处理', () => {
  it('成功时 writeFile 收到 base64 解码后的 Buffer，并返回 complete outcome', async () => {
    const provider = makeProvider()
    const outcome = await provider.synthesizeSegment(
      baseReq(),
      '/tmp/google-out.wav',
      {},
      () => false
    )
    expect(writeFileMock).toHaveBeenCalledExactlyOnceWith(
      '/tmp/google-out.wav',
      Buffer.from('fakewav')
    )
    // 云端一次性返回完整音频：恒 complete、无服务端终点、无词边界
    expect(outcome).toEqual({ complete: true, serverEndMs: -1, spokenTail: '' })
  })

  it('HTTP 500 → 抛错且错误信息含 cloud.googleFailed 键名', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error'
    })
    const provider = makeProvider()
    await expect(
      provider.synthesizeSegment(baseReq(), '/tmp/out.wav', {}, () => false)
    ).rejects.toThrow('cloud.googleFailed')
  })

  it('isStopped() 为 true 时直接抛 stopped，且未发起 fetch 请求', async () => {
    const provider = makeProvider()
    await expect(
      provider.synthesizeSegment(baseReq(), '/tmp/out.wav', {}, () => true)
    ).rejects.toThrow('stopped')
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })
})
