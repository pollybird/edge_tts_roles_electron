import { describe, expect, it } from 'vitest'
import { groupVoices } from '../src/shared/voiceGroups'
import type { VoiceInfo } from '../src/shared/types'

/** 测试用音色：friendlyName 决定英文环境回退地区名（" - " 后部分） */
const zhCN = (shortName: string, gender = 'Female'): VoiceInfo => ({
  shortName,
  friendlyName: `Microsoft ${shortName} - Chinese (Mandarin, Simplified)`,
  locale: 'zh-CN',
  gender
})
const zhTW: VoiceInfo = {
  shortName: 'zh-TW-HsiaoYuNeural',
  friendlyName: 'Microsoft HsiaoYu - Chinese (Taiwanese Mandarin)',
  locale: 'zh-TW',
  gender: 'Female'
}
const enUS: VoiceInfo = {
  shortName: 'en-US-AriaNeural',
  friendlyName: 'Microsoft Aria - English (United States)',
  locale: 'en-US',
  gender: 'Female'
}
const arSA: VoiceInfo = {
  shortName: 'ar-SA-HamedNeural',
  friendlyName: 'Microsoft Hamed - Arabic (Saudi Arabia)',
  locale: 'ar-SA',
  gender: 'Male'
}

describe('groupVoices', () => {
  it('空列表返回空数组', () => {
    expect(groupVoices([], 'zh-CN')).toEqual([])
  })

  it('中文环境：中文组置顶、英语第二、其余按本地化语言名排序', () => {
    const groups = groupVoices([arSA, enUS, zhTW, zhCN('zh-CN-XiaoxiaoNeural')], 'zh-CN')
    expect(groups.map((g) => g.lang)).toEqual(['zh', 'en', 'ar'])
    // 组名取本地化语言名（去括号地区部分）
    expect(groups.map((g) => g.label)).toEqual(['中文', '英语', '阿拉伯语'])
  })

  it('英文环境：英语组置顶，其余按英文地区名字母序', () => {
    const groups = groupVoices([zhCN('zh-CN-XiaoxiaoNeural'), arSA, enUS], 'en-US')
    expect(groups.map((g) => g.lang)).toEqual(['en', 'ar', 'zh'])
    expect(groups.map((g) => g.label)).toEqual(['English', 'Arabic', 'Chinese'])
  })

  it('同语言的不同 locale 归入同一组（zh-CN / zh-TW 同属中文）', () => {
    const groups = groupVoices([zhTW, zhCN('zh-CN-XiaoxiaoNeural')], 'zh-CN')
    expect(groups).toHaveLength(1)
    expect(groups[0].lang).toBe('zh')
    expect(groups[0].voices.map((v) => v.locale)).toEqual(['zh-CN', 'zh-TW'])
  })

  it('组内按 locale 再按 shortName 稳定排序', () => {
    const groups = groupVoices(
      [zhCN('zh-CN-YunyangNeural', 'Male'), zhTW, zhCN('zh-CN-XiaoxiaoNeural')],
      'zh-CN'
    )
    expect(groups[0].voices.map((v) => v.shortName)).toEqual([
      'zh-CN-XiaoxiaoNeural',
      'zh-CN-YunyangNeural',
      'zh-TW-HsiaoYuNeural'
    ])
  })

  it('默认语言为其他语言时该语言组置顶', () => {
    const groups = groupVoices([zhCN('zh-CN-XiaoxiaoNeural'), enUS, arSA], 'ar-SA')
    expect(groups[0].lang).toBe('ar')
    expect(groups[1].lang).toBe('en')
  })
})
