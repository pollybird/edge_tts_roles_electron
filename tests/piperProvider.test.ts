import { describe, expect, it } from 'vitest'
import {
  applyGainS16,
  buildWav,
  rateToLengthScale,
  volumeToGain
} from '../src/main/tts/provider/piperProvider'

describe('rateToLengthScale', () => {
  it('rate 0 → 原速 1.0', () => {
    expect(rateToLengthScale(0)).toBe(1)
  })

  it('正 rate 加速（length_scale 变小）', () => {
    expect(rateToLengthScale(100)).toBeCloseTo(0.5, 10)
    expect(rateToLengthScale(50)).toBeCloseTo(2 / 3, 10)
    expect(rateToLengthScale(100)).toBeLessThan(rateToLengthScale(0))
  })

  it('负 rate 减速（length_scale 变大），深度减速夹取到上限 4', () => {
    expect(rateToLengthScale(-50)).toBe(2)
    expect(rateToLengthScale(-99)).toBe(4)
    expect(rateToLengthScale(-50)).toBeGreaterThan(rateToLengthScale(0))
  })

  it('超范围输入先夹取再计算：rate 上限 100 → 0.5', () => {
    expect(rateToLengthScale(-200)).toBe(4)
    expect(rateToLengthScale(300)).toBe(0.5)
  })
})

describe('volumeToGain', () => {
  it('volume 0 → 增益 1', () => {
    expect(volumeToGain(0)).toBe(1)
  })

  it('volume -100 → 静音', () => {
    expect(volumeToGain(-100)).toBe(0)
  })

  it('volume +100 → 增益 2（上限夹取）', () => {
    expect(volumeToGain(100)).toBe(2)
  })

  it('超范围夹取', () => {
    expect(volumeToGain(-200)).toBe(0)
    expect(volumeToGain(300)).toBe(2)
  })
})

describe('applyGainS16', () => {
  it('gain=1 原样返回（引用相等，零拷贝）', () => {
    const pcm = Buffer.from([0x01, 0x00, 0xff, 0x7f])
    expect(applyGainS16(pcm, 1)).toBe(pcm)
  })

  it('增益 2 倍且饱和处理防溢出', () => {
    // 20000 * 2 = 40000 → 饱和 32767
    const pcm = Buffer.alloc(4)
    pcm.writeInt16LE(20000, 0)
    pcm.writeInt16LE(-20000, 2)
    const out = applyGainS16(pcm, 2)
    expect(out.readInt16LE(0)).toBe(32767)
    expect(out.readInt16LE(2)).toBe(-32768)
  })

  it('gain=0 静音', () => {
    const pcm = Buffer.alloc(2)
    pcm.writeInt16LE(12345, 0)
    expect(applyGainS16(pcm, 0).readInt16LE(0)).toBe(0)
  })
})

describe('buildWav', () => {
  it('生成合法的 44 字节头单声道 16-bit WAV', () => {
    const pcm = Buffer.from([1, 0, 2, 0, 3, 0])
    const wav = buildWav(pcm, 22050)
    expect(wav.length).toBe(44 + pcm.length)
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF')
    expect(wav.toString('ascii', 8, 12)).toBe('WAVE')
    expect(wav.toString('ascii', 12, 16)).toBe('fmt ')
    expect(wav.readUInt32LE(16)).toBe(16) // fmt chunk 大小
    expect(wav.readUInt16LE(20)).toBe(1) // PCM
    expect(wav.readUInt16LE(22)).toBe(1) // 单声道
    expect(wav.readUInt32LE(24)).toBe(22050)
    expect(wav.readUInt32LE(28)).toBe(22050 * 2) // byteRate
    expect(wav.readUInt16LE(32)).toBe(2) // blockAlign
    expect(wav.readUInt16LE(34)).toBe(16) // bits
    expect(wav.toString('ascii', 36, 40)).toBe('data')
    expect(wav.readUInt32LE(40)).toBe(pcm.length)
    expect(wav.readUInt32LE(4)).toBe(36 + pcm.length) // RIFF size
  })
})
