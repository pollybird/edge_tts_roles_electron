import { describe, expect, it, vi } from 'vitest'

// ttsService 顶层依赖 electron / ffmpeg-static，在纯 Node 测试环境需提前打桩
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: vi.fn(() => '/tmp')
  }
}))
vi.mock('ffmpeg-static', () => ({ default: '/usr/bin/ffmpeg' }))
vi.mock('edge-tts-universal', () => ({
  Communicate: vi.fn(),
  listVoices: vi.fn()
}))

import { TtsService } from '../src/main/ttsService'

// 仅描述测试要触达的私有成员；与 TtsService 直接相交会因 private 字段冲突被缩减为 never
interface PrivateService {
  retryBackoff(attempt: number): Promise<void>
  segmentCacheKey(
    text: string,
    settings: { voice: string; rate: number; volume: number; pitch: number }
  ): string
  stopRequested: boolean
  delay(ms: number): Promise<void>
}

function createService(): PrivateService {
  return new TtsService() as unknown as PrivateService
}

describe('retryBackoff', () => {
  const backoffTable = [
    1000, 2000, 3000, 5000, 8000, 10000, 12000, 15000, 18000, 20000, 22000, 25000, 28000, 30000
  ]

  it('每次调用实际等待总和在退避表 ±20% 范围内', async () => {
    const svc = createService()
    const delays: number[] = []
    vi.spyOn(svc, 'delay').mockImplementation(async (ms: number) => {
      delays.push(ms)
    })

    for (let attempt = 1; attempt <= backoffTable.length; attempt++) {
      delays.length = 0
      await svc.retryBackoff(attempt)
      const total = delays.reduce((s, d) => s + d, 0)
      const base = backoffTable[attempt - 1]
      expect(total).toBeGreaterThanOrEqual(base * 0.79)
      expect(total).toBeLessThanOrEqual(base * 1.21)
    }
  })

  it('stopRequested 为 true 时提前返回，不再继续等待', async () => {
    const svc = createService()
    const delays: number[] = []
    vi.spyOn(svc, 'delay').mockImplementation(async (ms: number) => {
      delays.push(ms)
      // 第一次 slice 执行后就置停止标志，模拟中途停止
      if (delays.length === 1) svc.stopRequested = true
    })
    await svc.retryBackoff(3) // base 3000，若无停止会有 15 个 200ms slice
    // 至少执行了 1 个 slice，但远少于完整 15 个
    expect(delays.length).toBeGreaterThanOrEqual(1)
    expect(delays.length).toBeLessThan(10)
  })

  it('已置 stopRequested 再调用 retryBackoff 则完全不等待', async () => {
    const svc = createService()
    svc.stopRequested = true
    const delays: number[] = []
    vi.spyOn(svc, 'delay').mockImplementation(async (ms: number) => {
      delays.push(ms)
    })
    await svc.retryBackoff(1)
    expect(delays).toHaveLength(0)
  })
})

describe('segmentCacheKey', () => {
  it('相同输入返回相同的 SHA-256 hex', () => {
    const svc = createService()
    const s = { voice: 'zh-CN-XiaoxiaoNeural', rate: 0, volume: 10, pitch: -5 }
    const k1 = svc.segmentCacheKey('你好', s)
    const k2 = svc.segmentCacheKey('你好', s)
    expect(k1).toBe(k2)
    expect(k1).toMatch(/^[a-f0-9]{64}$/)
  })

  it('不同文本返回不同键', () => {
    const svc = createService()
    const s = { voice: 'zh-CN-XiaoxiaoNeural', rate: 0, volume: 0, pitch: 0 }
    expect(svc.segmentCacheKey('A', s)).not.toBe(svc.segmentCacheKey('B', s))
  })

  it('不同 voice 返回不同键', () => {
    const svc = createService()
    const text = 'hello'
    expect(svc.segmentCacheKey(text, { voice: 'a', rate: 0, volume: 0, pitch: 0 })).not.toBe(
      svc.segmentCacheKey(text, { voice: 'b', rate: 0, volume: 0, pitch: 0 })
    )
  })

  it('不同参数（rate/volume/pitch）返回不同键', () => {
    const svc = createService()
    const base = { voice: 'a', rate: 0, volume: 0, pitch: 0 }
    expect(svc.segmentCacheKey('x', base)).not.toBe(svc.segmentCacheKey('x', { ...base, rate: 1 }))
    expect(svc.segmentCacheKey('x', base)).not.toBe(
      svc.segmentCacheKey('x', { ...base, volume: 1 })
    )
    expect(svc.segmentCacheKey('x', base)).not.toBe(svc.segmentCacheKey('x', { ...base, pitch: 1 }))
  })
})
