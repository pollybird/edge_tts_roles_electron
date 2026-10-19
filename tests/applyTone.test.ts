import { describe, expect, it } from 'vitest'
import { applyTone, TONE_IDS, TONE_PROSODY } from '../src/shared/types'
import type { VoiceSettings } from '../src/shared/types'

const base: VoiceSettings = { voice: 'zh-CN-XiaoxiaoNeural', rate: 10, volume: 20, pitch: 5 }

describe('TONE_PROSODY', () => {
  it('覆盖全部六种语气', () => {
    expect(Object.keys(TONE_PROSODY).sort()).toEqual([...TONE_IDS].sort())
  })

  it('所有偏移都落在滑块可叠加的合理范围（±25）', () => {
    for (const tone of TONE_IDS) {
      const { rate, volume, pitch } = TONE_PROSODY[tone]
      for (const v of [rate, volume, pitch]) {
        expect(Math.abs(v)).toBeLessThanOrEqual(25)
      }
    }
  })
})

describe('applyTone', () => {
  it('tone 为 null 时原样返回同一对象', () => {
    expect(applyTone(base, null)).toBe(base)
  })

  it('叠加语气偏移生成新对象', () => {
    const result = applyTone(base, 'happy')
    expect(result).toEqual({
      voice: 'zh-CN-XiaoxiaoNeural',
      rate: 10 + TONE_PROSODY.happy.rate,
      volume: 20 + TONE_PROSODY.happy.volume,
      pitch: 5 + TONE_PROSODY.happy.pitch
    })
    expect(result).not.toBe(base)
  })

  it('不修改入参对象', () => {
    const snapshot = { ...base }
    applyTone(base, 'angry')
    expect(base).toEqual(snapshot)
  })

  it('正向 clamp 到 +100', () => {
    const high: VoiceSettings = { voice: 'v', rate: 95, volume: 100, pitch: 90 }
    const result = applyTone(high, 'excited')
    expect(result.rate).toBe(100)
    expect(result.volume).toBe(100)
    expect(result.pitch).toBe(100)
  })

  it('负向 clamp 到 -100', () => {
    const low: VoiceSettings = { voice: 'v', rate: -95, volume: -100, pitch: -90 }
    const result = applyTone(low, 'sad')
    expect(result.rate).toBe(-100)
    expect(result.volume).toBe(-100)
    expect(result.pitch).toBe(-100)
  })

  it('voice 字段保持不变', () => {
    expect(applyTone(base, 'calm').voice).toBe(base.voice)
  })
})
