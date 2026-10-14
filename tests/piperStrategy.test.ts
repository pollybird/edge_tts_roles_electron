/**
 * Piper 策略集成测试（假 Provider，纯 Node 环境）：
 *
 * 用 mock TTSProvider 验证 SegmentSynthesizer 的重试编排与 Piper 语义差异分支：
 * - Piper-like 语义（complete:true / serverEndMs:-1 / spokenTail:''）maxAttempts=1 时单次成功
 * - Piper-like 不可用时 maxAttempts=1 不重试，立即抛出
 * - Edge 语义 incomplete 时 maxAttempts=15 重试后成功
 * - 缓存键引擎维度隔离：'piper:<modelId>' 与 'edge' 不互串
 * - 缓存命中：同键第二次调用不再请求 Provider
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// --- 模块级 mock（必须在 import 之前声明） ---

vi.mock('electron', () => ({
  app: { isPackaged: false, getPath: vi.fn(() => '/tmp') }
}))
vi.mock('ffmpeg-static', () => ({ default: '/usr/bin/ffmpeg' }))
vi.mock('edge-tts-universal', () => ({
  Communicate: vi.fn(),
  listVoices: vi.fn()
}))

/** vi.hoisted 将变量提升到 vi.mock 之前，避免 ReferenceError */
const mocks = vi.hoisted(() => {
  const cacheStore = new Map<
    string,
    { left: Float32Array; right: Float32Array; sampleRate: number }
  >()
  const mockPcm = {
    left: new Float32Array([0.1, 0.2, 0.3, 0.4]),
    right: new Float32Array([0.1, 0.2, 0.3, 0.4]),
    sampleRate: 24000
  }
  return { cacheStore, mockPcm }
})

vi.mock('../src/main/audioProcessor', () => ({
  decodeAudioToPcm: vi.fn().mockResolvedValue(mocks.mockPcm),
  tempPath: vi.fn().mockReturnValue('/tmp/mock-segment.mp3'),
  readPcmCache: vi
    .fn()
    .mockImplementation(async (path: string) => mocks.cacheStore.get(path) ?? null),
  writePcmCache: vi.fn().mockImplementation(async (pcm: typeof mocks.mockPcm, path: string) => {
    mocks.cacheStore.set(path, pcm)
  })
}))

// 注：不可通过 vi.mock 替换 segmentSynthesizer 内部的 interruptibleWait ——
// ES 模块内部引用绑定不会被 export 级 mock 覆盖。改用 fake timers + runAllTimersAsync。

import { SegmentCache } from '../src/main/tts/segmentCache'
import { SegmentSynthesizer, RunState } from '../src/main/tts/segmentSynthesizer'
import type { TTSProvider, SynthesisOutcome } from '../src/main/tts/provider/types'
import type { SegmentVoiceSettings } from '../src/main/tts/segmentCache'

// --- 测试辅助 ---

const defaultSettings: SegmentVoiceSettings = {
  voice: 'zh-CN-XiaoxiaoNeural',
  rate: 0,
  volume: 0,
  pitch: 0
}

/** Piper 语义 outcome：complete=true / serverEndMs=-1 / spokenTail='' */
const piperOutcome: SynthesisOutcome = { complete: true, serverEndMs: -1, spokenTail: '' }

/** Edge 不完整 outcome：流提前断开 */
const incompleteOutcome: SynthesisOutcome = { complete: false, serverEndMs: -1, spokenTail: '' }

/** 构造假 Provider：可控制返回值、抛错次数与成功时机 */
function createMockProvider(opts: {
  name?: string
  /** 返回此 outcome；默认 Piper 语义 */
  outcome?: SynthesisOutcome
  /** 前 N 次返回 incomplete（模拟流中断），之后返回 outcome */
  failIncompleteBefore?: number
  /** 前 N 次抛错，之后返回 outcome */
  throwBefore?: number
  /** 直接抛此错误（永远失败） */
  alwaysThrow?: Error
}): TTSProvider & { synthesizeSegment: ReturnType<typeof vi.fn> } {
  let calls = 0
  return {
    name: opts.name ?? 'mock',
    synthesizeSegment: vi.fn(async (): Promise<SynthesisOutcome> => {
      calls++
      if (opts.alwaysThrow) throw opts.alwaysThrow
      if (opts.failIncompleteBefore && calls <= opts.failIncompleteBefore) {
        return incompleteOutcome
      }
      if (opts.throwBefore && calls <= opts.throwBefore) {
        throw new Error(`mock error attempt ${calls}`)
      }
      return opts.outcome ?? piperOutcome
    })
  }
}

// --- 测试用例 ---

describe('Piper 语义 Provider（maxAttempts=1）', () => {
  let cache: SegmentCache
  let state: RunState

  beforeEach(() => {
    mocks.cacheStore.clear()
    cache = new SegmentCache()
    state = new RunState()
  })

  it('单次成功合成并落盘缓存（complete=true / serverEndMs=-1 / spokenTail=""）', async () => {
    const provider = createMockProvider({ outcome: piperOutcome })
    const synth = new SegmentSynthesizer(cache, state, provider, 1, 'piper:zh_CN-huayan-medium')

    const pcm = await synth.synthesize('你好', defaultSettings)

    expect(pcm).not.toBeNull()
    expect(pcm!.left.length).toBe(4)
    expect(provider.synthesizeSegment).toHaveBeenCalledTimes(1)
  })

  it('不可用时立即抛出，不重试', async () => {
    const provider = createMockProvider({ alwaysThrow: new Error('piper spawn failed') })
    const synth = new SegmentSynthesizer(cache, state, provider, 1, 'piper:zh_CN-huayan-medium')

    await expect(synth.synthesize('你好', defaultSettings)).rejects.toThrow()
    expect(provider.synthesizeSegment).toHaveBeenCalledTimes(1)
  })

  it('incomplete 也不重试（maxAttempts=1 覆盖流中断场景）', async () => {
    const provider = createMockProvider({ outcome: piperOutcome, failIncompleteBefore: 1 })
    const synth = new SegmentSynthesizer(cache, state, provider, 1, 'piper:zh_CN-huayan-medium')

    await expect(synth.synthesize('你好', defaultSettings)).rejects.toThrow()
    expect(provider.synthesizeSegment).toHaveBeenCalledTimes(1)
  })
})

describe('Edge 语义 Provider（maxAttempts=15）重试编排', () => {
  let cache: SegmentCache
  let state: RunState

  beforeEach(() => {
    // 将 setTimeout 替换为微任务，使 interruptibleWait 的退避等待即时完成
    // （fake timers 的 runAllTimersAsync/advanceTimersByTimeAsync 无法处理
    //   interruptibleWait 内 for 循环递归创建 setTimeout 的模式）
    vi.stubGlobal('setTimeout', (cb: (...args: unknown[]) => void) => {
      queueMicrotask(() => cb())
      return 0 as unknown as NodeJS.Timeout
    })
    mocks.cacheStore.clear()
    cache = new SegmentCache()
    state = new RunState()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('前两次 incomplete 第三次成功 → 重试后返回 PCM', async () => {
    const provider = createMockProvider({ outcome: piperOutcome, failIncompleteBefore: 2 })
    const synth = new SegmentSynthesizer(cache, state, provider, 15, 'edge')

    const pcm = await synth.synthesize('你好', defaultSettings, { onRetry: vi.fn() })

    expect(pcm).not.toBeNull()
    expect(provider.synthesizeSegment).toHaveBeenCalledTimes(3)
  })

  it('前两次抛错第三次成功 → 重试后返回 PCM', async () => {
    const provider = createMockProvider({ outcome: piperOutcome, throwBefore: 2 })
    const synth = new SegmentSynthesizer(cache, state, provider, 15, 'edge')

    const pcm = await synth.synthesize('你好', defaultSettings)

    expect(pcm).not.toBeNull()
    expect(provider.synthesizeSegment).toHaveBeenCalledTimes(3)
  })

  it('持续 incomplete → 重试 15 次后抛出最终失败', async () => {
    const provider = createMockProvider({ outcome: incompleteOutcome, failIncompleteBefore: 99 })
    const synth = new SegmentSynthesizer(cache, state, provider, 15, 'edge')

    await expect(synth.synthesize('你好', defaultSettings)).rejects.toThrow()
    expect(provider.synthesizeSegment).toHaveBeenCalledTimes(15)
  })
})

describe('缓存键引擎维度隔离', () => {
  let cache: SegmentCache

  beforeEach(() => {
    mocks.cacheStore.clear()
    cache = new SegmentCache()
  })

  it('piper:<modelId> 与 edge 对同一文本+语音参数产生不同键', () => {
    const text = '你好世界'
    const s = { voice: 'zh-CN-XiaoxiaoNeural', rate: 0, volume: 0, pitch: 0 }

    const edgeKey = cache.keyFor(text, s, 'edge')
    const piperKey = cache.keyFor(text, s, 'piper:zh_CN-huayan-medium')

    expect(edgeKey).not.toBe(piperKey)
    expect(edgeKey).toMatch(/^[a-f0-9]{64}$/)
    expect(piperKey).toMatch(/^[a-f0-9]{64}$/)
  })

  it('不同 piper 模型键互异', () => {
    const text = 'hello'
    const s = { voice: 'en_US-lessac-medium', rate: 0, volume: 0, pitch: 0 }

    const k1 = cache.keyFor(text, s, 'piper:en_US-lessac-medium')
    const k2 = cache.keyFor(text, s, 'piper:de_DE-thorsten-medium')

    expect(k1).not.toBe(k2)
  })
})

describe('缓存命中（断点续传）', () => {
  let cache: SegmentCache
  let state: RunState

  beforeEach(() => {
    mocks.cacheStore.clear()
    cache = new SegmentCache()
    state = new RunState()
  })

  it('同键第二次调用直接命中缓存，不再请求 Provider', async () => {
    const provider = createMockProvider({ outcome: piperOutcome })
    const synth = new SegmentSynthesizer(cache, state, provider, 1, 'piper:zh_CN-huayan-medium')

    const onCacheHit = vi.fn()

    // 第一次：Provider 合成 → 落盘缓存
    const pcm1 = await synth.synthesize('你好', defaultSettings)
    expect(pcm1).not.toBeNull()
    expect(provider.synthesizeSegment).toHaveBeenCalledTimes(1)

    // 第二次：同文本+同参数+同引擎 → 命中缓存
    const pcm2 = await synth.synthesize('你好', defaultSettings, { onCacheHit })
    expect(pcm2).not.toBeNull()
    expect(provider.synthesizeSegment).toHaveBeenCalledTimes(1) // 未增加
    expect(onCacheHit).toHaveBeenCalledTimes(1)
  })

  it('Piper 与 Edge 缓存不互串：Piper 先写缓存，Edge 不命中', async () => {
    const piperProvider = createMockProvider({ outcome: piperOutcome })
    const edgeProvider = createMockProvider({ outcome: piperOutcome })
    const piperSynth = new SegmentSynthesizer(
      cache,
      state,
      piperProvider,
      1,
      'piper:zh_CN-huayan-medium'
    )
    const edgeSynth = new SegmentSynthesizer(cache, state, edgeProvider, 15, 'edge')

    // Piper 先合成 → 写入 piper 缓存键
    await piperSynth.synthesize('你好', defaultSettings)
    expect(piperProvider.synthesizeSegment).toHaveBeenCalledTimes(1)

    // Edge 用相同文本+语音 → 不同键 → 不命中 piper 缓存 → 请求 Edge Provider
    await edgeSynth.synthesize('你好', defaultSettings)
    expect(edgeProvider.synthesizeSegment).toHaveBeenCalledTimes(1)
  })
})
