import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// tts 子模块顶层间接依赖 electron / ffmpeg-static，在纯 Node 测试环境需提前打桩
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

import { SegmentCache } from '../src/main/tts/segmentCache'
import {
  BACKOFF_TABLE_MS,
  RunState,
  backoffDelayMs,
  interruptibleWait
} from '../src/main/tts/segmentSynthesizer'

// 重构后 retryBackoff 拆为纯函数 backoffDelayMs（查表+抖动）与 interruptibleWait（分片可中断等待）
describe('backoffDelayMs', () => {
  it('每一档退避都在退避表 ±20% 范围内', () => {
    for (let attempt = 1; attempt <= BACKOFF_TABLE_MS.length; attempt++) {
      const v = backoffDelayMs(attempt)
      const base = BACKOFF_TABLE_MS[attempt - 1]
      expect(v).toBeGreaterThanOrEqual(Math.round(base * 0.8))
      expect(v).toBeLessThanOrEqual(Math.round(base * 1.2))
    }
  })

  it('超出退避表长度的 attempt 按最后一档封顶', () => {
    for (const attempt of [BACKOFF_TABLE_MS.length + 1, 99]) {
      const v = backoffDelayMs(attempt)
      const cap = BACKOFF_TABLE_MS[BACKOFF_TABLE_MS.length - 1]
      expect(v).toBeGreaterThanOrEqual(Math.round(cap * 0.8))
      expect(v).toBeLessThanOrEqual(Math.round(cap * 1.2))
    }
  })
})

describe('interruptibleWait（retryBackoff 的等待部分）', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('未收到停止信号时等待完整时长', async () => {
    const p = interruptibleWait(800, () => false, 200)
    await vi.advanceTimersByTimeAsync(800)
    await expect(p).resolves.toBeUndefined()
  })

  it('调用前已置停止信号则完全不等待', async () => {
    await expect(interruptibleWait(3000, () => true, 200)).resolves.toBeUndefined()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('等待途中收到停止信号时提前结束（远早于总时长）', async () => {
    let stopped = false
    const p = interruptibleWait(3000, () => stopped, 200)
    // 经过一个分片后在第二次检查处停止：总推进仅约 400ms
    await vi.advanceTimersByTimeAsync(200)
    stopped = true
    await vi.advanceTimersByTimeAsync(200)
    await expect(p).resolves.toBeUndefined()
  })
})

describe('RunState 段间冷却状态', () => {
  it('reset 清零停止信号与冷却', () => {
    const s = new RunState()
    s.requestStop()
    s.recordAttempt(3)
    expect(s.stopped).toBe(true)
    expect(s.cooldownMs).toBeGreaterThan(0)
    s.reset()
    expect(s.stopped).toBe(false)
    expect(s.cooldownMs).toBe(0)
  })

  it('经历重试后冷却随尝试深度加深并在 2s 封顶', () => {
    const s = new RunState()
    s.recordAttempt(2)
    expect(s.cooldownMs).toBe(1000)
    s.recordAttempt(5)
    expect(s.cooldownMs).toBe(2000)
    s.recordAttempt(99)
    expect(s.cooldownMs).toBe(2000)
  })

  it('连续两段一次成功后解除冷却', () => {
    const s = new RunState()
    s.recordAttempt(4)
    expect(s.cooldownMs).toBe(2000)
    s.recordAttempt(1)
    expect(s.cooldownMs).toBe(2000)
    s.recordAttempt(1)
    expect(s.cooldownMs).toBe(0)
  })
})

describe('SegmentCache.keyFor', () => {
  it('相同输入返回相同的 SHA-256 hex', () => {
    const cache = new SegmentCache()
    const s = { voice: 'zh-CN-XiaoxiaoNeural', rate: 0, volume: 10, pitch: -5 }
    const k1 = cache.keyFor('你好', s)
    const k2 = cache.keyFor('你好', s)
    expect(k1).toBe(k2)
    expect(k1).toMatch(/^[a-f0-9]{64}$/)
  })

  it('不同文本返回不同键', () => {
    const cache = new SegmentCache()
    const s = { voice: 'zh-CN-XiaoxiaoNeural', rate: 0, volume: 0, pitch: 0 }
    expect(cache.keyFor('A', s)).not.toBe(cache.keyFor('B', s))
  })

  it('不同 voice 返回不同键', () => {
    const cache = new SegmentCache()
    const text = 'hello'
    expect(cache.keyFor(text, { voice: 'a', rate: 0, volume: 0, pitch: 0 })).not.toBe(
      cache.keyFor(text, { voice: 'b', rate: 0, volume: 0, pitch: 0 })
    )
  })

  it('不同参数（rate/volume/pitch）返回不同键', () => {
    const cache = new SegmentCache()
    const base = { voice: 'a', rate: 0, volume: 0, pitch: 0 }
    expect(cache.keyFor('x', base)).not.toBe(cache.keyFor('x', { ...base, rate: 1 }))
    expect(cache.keyFor('x', base)).not.toBe(cache.keyFor('x', { ...base, volume: 1 }))
    expect(cache.keyFor('x', base)).not.toBe(cache.keyFor('x', { ...base, pitch: 1 }))
  })
})
