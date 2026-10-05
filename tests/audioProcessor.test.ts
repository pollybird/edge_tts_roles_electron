import { describe, expect, it, vi } from 'vitest'

// audioProcessor 模块加载时会经 ffmpegResolver 访问 electron.app，纯 Node 环境下不存在，打桩为未打包状态
vi.mock('electron', () => ({ app: { isPackaged: false } }))

import {
  applyGain,
  concatenate,
  createBeep,
  createSilence,
  loopToLength,
  mixPcm,
  type StereoPcm
} from '../src/main/audioProcessor'

/** 由给定采样值构造双声道相同的 StereoPcm */
function pcmOf(values: number[], sampleRate = 24000): StereoPcm {
  return {
    left: Float32Array.from(values),
    right: Float32Array.from(values),
    sampleRate
  }
}

describe('createSilence', () => {
  it('按采样率生成全零双声道', () => {
    const s = createSilence(1000, 24000)
    expect(s.left.length).toBe(24000)
    expect(s.right.length).toBe(24000)
    expect(s.sampleRate).toBe(24000)
    expect(Array.from(s.left)).toEqual(new Array(24000).fill(0))
    expect(Array.from(s.right)).toEqual(new Array(24000).fill(0))
  })

  it('不足整采样数时向下取整', () => {
    const s = createSilence(1, 24000)
    expect(s.left.length).toBe(24)
    expect(createSilence(0).left.length).toBe(0)
  })
})

describe('createBeep', () => {
  it('默认 500ms / 24000Hz 采样率 → 12000 采样，左右声道内容一致', () => {
    const b = createBeep()
    expect(b.left.length).toBe(12000)
    expect(b.sampleRate).toBe(24000)
    expect(Array.from(b.left)).toEqual(Array.from(b.right))
    // 左右声道是独立数组（slice 拷贝），互不共享内存
    expect(b.left.buffer).not.toBe(b.right.buffer)
  })

  it('波形为 1000Hz 正弦，幅度约 0.3', () => {
    const b = createBeep(500, 1000, 24000)
    // 过零点：i=0 处 sin(0)=0
    expect(b.left[0]).toBe(0)
    // 满幅度区（淡入淡出 1200 采样之外）：1/4 周期峰值为 0.3*sin(π/2)=0.3
    // 峰值位于 i = 6 + 24k（周期 24 采样），取 k=100 处的 i=2406 已远离淡入区
    expect(b.left[2406]).toBeCloseTo(0.3, 5)
    // 全局不超过 0.3
    for (const v of b.left) expect(Math.abs(v)).toBeLessThanOrEqual(0.3 + 1e-6)
  })

  it('首尾存在淡入淡出（端点处幅度被压低）', () => {
    const b = createBeep(500, 1000, 24000)
    // 淡入区内幅度随 i 线性上升：比较同一正弦相位点在淡入区内外的比例
    // 直接验证末端最后一个采样被衰减到接近 0（fade 内 i=0 乘 0）
    expect(Math.abs(b.left[b.left.length - 1])).toBeLessThan(0.05)
  })

  it('极短时长时淡入淡出窗口收缩为采样数的 1/4，不产生越界', () => {
    const b = createBeep(1, 1000, 24000) // 24 采样 < 2 * 1200
    expect(b.left.length).toBe(24)
    for (const v of b.left) expect(Number.isFinite(v)).toBe(true)
  })
})

describe('concatenate', () => {
  it('顺序拼接多段，采样率取首段', () => {
    const a = pcmOf([0.1, 0.2])
    const b = pcmOf([0.3, 0.4, 0.5])
    const out = concatenate([a, b])
    expect(out.left.length).toBe(5)
    // Float32 存储有精度损失，逐点近似比较
    ;[0.1, 0.2, 0.3, 0.4, 0.5].forEach((v, i) => {
      expect(out.left[i]).toBeCloseTo(v, 6)
      expect(out.right[i]).toBeCloseTo(v, 6)
    })
    expect(out.sampleRate).toBe(24000)
  })

  it('空数组抛错', () => {
    expect(() => concatenate([])).toThrow()
  })
})

describe('applyGain', () => {
  it('gain 为 1 时原样返回（同一对象）', () => {
    const p = pcmOf([0.5])
    expect(applyGain(p, 1)).toBe(p)
  })

  it('线性缩放左右声道', () => {
    const out = applyGain(pcmOf([0.4, -0.4]), 0.5)
    expect(out.left[0]).toBeCloseTo(0.2, 6)
    expect(out.left[1]).toBeCloseTo(-0.2, 6)
  })

  it('超界结果削波到 ±1.0', () => {
    const out = applyGain(pcmOf([0.8, -0.8]), 2)
    expect(out.left[0]).toBe(1)
    expect(out.right[0]).toBe(1)
    expect(out.left[1]).toBe(-1)
    expect(out.right[1]).toBe(-1)
  })

  it('不修改输入，返回新对象', () => {
    const p = pcmOf([0.5])
    applyGain(p, 0.5)
    expect(p.left[0]).toBe(0.5)
  })
})

describe('loopToLength', () => {
  it('长度不足时循环铺满', () => {
    const out = loopToLength(pcmOf([1, 2, 3]), 7)
    expect(Array.from(out.left)).toEqual([1, 2, 3, 1, 2, 3, 1])
    expect(Array.from(out.right)).toEqual([1, 2, 3, 1, 2, 3, 1])
  })

  it('长度超出时截断', () => {
    const out = loopToLength(pcmOf([1, 2, 3, 4, 5]), 2)
    expect(Array.from(out.left)).toEqual([1, 2])
  })

  it('长度相等时原样返回（同一对象）', () => {
    const p = pcmOf([1, 2])
    expect(loopToLength(p, 2)).toBe(p)
  })

  it('源为空时返回空数组', () => {
    const out = loopToLength(pcmOf([]), 10)
    expect(out.left.length).toBe(0)
    expect(out.right.length).toBe(0)
  })
})

describe('mixPcm', () => {
  it('两路等长叠加', () => {
    const out = mixPcm(pcmOf([0.2, 0.3]), pcmOf([0.1, -0.1]))
    expect(out.left[0]).toBeCloseTo(0.3, 6)
    expect(out.left[1]).toBeCloseTo(0.2, 6)
  })

  it('叠加结果削波到 ±1.0', () => {
    const out = mixPcm(pcmOf([0.9, -0.9]), pcmOf([0.5, -0.5]))
    expect(out.left[0]).toBe(1)
    expect(out.left[1]).toBe(-1)
    expect(out.right[0]).toBe(1)
  })

  it('长度不一致时以较长者为准，缺失部分视为静音', () => {
    const out = mixPcm(pcmOf([0.1]), pcmOf([0.5, 0.6, 0.7]))
    expect(out.left.length).toBe(3)
    expect(out.left[0]).toBeCloseTo(0.6, 6)
    expect(out.left[1]).toBeCloseTo(0.6, 6)
    expect(out.left[2]).toBeCloseTo(0.7, 6)
  })

  it('采样率取 base 一侧', () => {
    const out = mixPcm(pcmOf([0], 16000), pcmOf([0], 48000))
    expect(out.sampleRate).toBe(16000)
  })
})
