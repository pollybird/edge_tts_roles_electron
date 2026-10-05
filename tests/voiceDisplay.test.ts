import { describe, expect, it } from 'vitest'
import {
  getVoiceDisplayName,
  getVoiceRegionName,
  nativeRegion,
  personName
} from '../src/shared/voiceDisplay'
import type { VoiceInfo } from '../src/shared/types'

/** 构造音色条目的便捷工厂（字段与 Edge TTS 接口一致） */
function voice(partial: Partial<VoiceInfo> & Pick<VoiceInfo, 'shortName'>): VoiceInfo {
  return {
    friendlyName: '',
    locale: 'zh-CN',
    gender: 'Female',
    ...partial
  }
}

const xiaoxiao = voice({
  shortName: 'zh-CN-XiaoxiaoNeural',
  friendlyName: 'Microsoft Xiaoxiao - Chinese (Mandarin, Simplified)',
  locale: 'zh-CN',
  gender: 'Female'
})

const aria = voice({
  shortName: 'en-US-AriaNeural',
  friendlyName: 'Microsoft Aria - English (United States)',
  locale: 'en-US',
  gender: 'Female'
})

describe('personName', () => {
  it('剥离 locale 前缀与 Neural 后缀', () => {
    expect(personName(xiaoxiao)).toBe('Xiaoxiao')
    expect(personName(aria)).toBe('Aria')
  })

  it('剥离 MultilingualNeural 后缀', () => {
    expect(personName(voice({ shortName: 'en-US-AvaMultilingualNeural', locale: 'en-US' }))).toBe(
      'Ava'
    )
  })

  it('shortName 与 locale 前缀不匹配时退化为最后一段', () => {
    expect(personName(voice({ shortName: 'xx-YY-ZzzNeural', locale: 'aa-BB' }))).toBe('Zzz')
  })
})

describe('nativeRegion', () => {
  it('从 friendlyName 提取 " - " 之后的英文地区名', () => {
    expect(nativeRegion(aria)).toBe('English (United States)')
  })

  it('地区名中再含 " - " 时保留其余全部内容', () => {
    const v = voice({
      shortName: 'sw-KE-ZzNeural',
      friendlyName: 'Microsoft Zz - Kiswahili - Kenya',
      locale: 'sw-KE'
    })
    expect(nativeRegion(v)).toBe('Kiswahili - Kenya')
  })

  it('friendlyName 无 " - " 时回退为 locale', () => {
    const v = voice({ shortName: 'sw-KE-ZzNeural', friendlyName: '无分隔符', locale: 'sw-KE' })
    expect(nativeRegion(v)).toBe('sw-KE')
  })
})

describe('getVoiceRegionName', () => {
  it('中文环境命中语言包译名', () => {
    expect(getVoiceRegionName(xiaoxiao, 'zh-CN')).toBe('中文（普通话，中国大陆）')
    expect(getVoiceRegionName(aria, 'zh-CN')).toBe('英语（美国）')
  })

  it('英文环境 localeNames 为空，回退接口英文地区名', () => {
    expect(getVoiceRegionName(aria, 'en-US')).toBe('English (United States)')
  })

  it('语言包未覆盖的 locale 回退 friendlyName 地区名', () => {
    const v = voice({
      shortName: 'xx-YY-ZzNeural',
      friendlyName: 'Microsoft Zz - Kiswahili (Kenya)',
      locale: 'xx-YY'
    })
    expect(getVoiceRegionName(v, 'zh-CN')).toBe('Kiswahili (Kenya)')
  })
})

describe('getVoiceDisplayName', () => {
  it('中文环境：译名人名 + 译名地区 + 中文性别词', () => {
    expect(getVoiceDisplayName(xiaoxiao, 'zh-CN')).toBe('晓晓 - 中文（普通话，中国大陆） - 女')
  })

  it('英文环境：语言包无人名译名，回退接口原名与英文性别词', () => {
    expect(getVoiceDisplayName(aria, 'en-US')).toBe('Aria - English (United States) - Female')
  })

  it('性别词大小写不敏感；语言包未命中时保留接口原文', () => {
    const v = voice({
      shortName: 'xx-YY-ZzNeural',
      friendlyName: 'Microsoft Zz - Kiswahili (Kenya)',
      locale: 'xx-YY',
      gender: 'Male'
    })
    expect(getVoiceDisplayName(v, 'zh-CN')).toBe('Zz - Kiswahili (Kenya) - 男')
    // 非常见性别值（如中性音色）按原文透传
    const neutral = voice({ ...v, gender: 'Neutral' })
    expect(getVoiceDisplayName(neutral, 'zh-CN')).toBe('Zz - Kiswahili (Kenya) - Neutral')
  })
})
