/**
 * 发音人列表的分组与排序（纯逻辑，主/渲染进程共用）。
 *
 * 规则：
 * 1. 按语言分组：locale 的语言码相同的音色归入一组（zh-CN / zh-TW / zh-HK 同属“中文”，
 *    ar-AE/ar-SA 等同属“阿拉伯语”），组名取本地化语言名；
 * 2. 组顺序：系统默认语言置顶 → 英语第二 → 其余语言按本地字母序（中文环境按拼音）；
 * 3. 组内音色：按 locale 码、再按 shortName 稳定排序。
 */
import { detectLocale } from './i18n'
import { getVoiceRegionName } from './voiceDisplay'
import type { VoiceInfo } from './types'

export interface VoiceGroup {
  /** 语言码，如 zh / en / ar */
  lang: string
  /** 本地化组名，如 中文 / 英语 / 阿拉伯语 */
  label: string
  voices: VoiceInfo[]
}

/** locale → 语言码（zh-CN-liaoning → zh；en-US → en） */
function langCode(locale: string): string {
  return locale.split('-')[0] ?? ''
}

/**
 * 从本地化地区名提取语言名：
 * “中文（普通话，中国大陆）” → “中文”；“English (United States)” → “English”
 */
function languageNameOf(regionName: string): string {
  return (regionName.split(/[（(]/)[0] ?? regionName).trim()
}

export function groupVoices(
  voices: VoiceInfo[],
  locale: string = detectLocale()
): VoiceGroup[] {
  const defaultLang = langCode(locale)
  // 中文环境按拼音、英文环境按字母，排序规则跟随当前语言
  const labelCollator = new Intl.Collator(locale, { sensitivity: 'accent' })
  const codeCollator = new Intl.Collator('en', { sensitivity: 'base' })

  // 1. 按语言码聚合
  const byLang = new Map<string, VoiceInfo[]>()
  for (const v of voices) {
    const lang = langCode(v.locale)
    const bucket = byLang.get(lang)
    if (bucket) bucket.push(v)
    else byLang.set(lang, [v])
  }

  // 2. 组内排序 + 组名
  const groups: VoiceGroup[] = []
  for (const [lang, list] of byLang) {
    list.sort(
      (a, b) =>
        codeCollator.compare(a.locale, b.locale) ||
        codeCollator.compare(a.shortName, b.shortName)
    )
    const label = languageNameOf(getVoiceRegionName(list[0], locale))
    groups.push({ lang, label, voices: list })
  }

  // 3. 组排序：默认语言 → 英语 → 其余本地化字母序
  const rank = (lang: string): number => {
    if (lang === defaultLang) return 0
    if (lang === 'en') return 1
    return 2
  }
  groups.sort((a, b) => {
    const ra = rank(a.lang)
    const rb = rank(b.lang)
    if (ra !== rb) return ra - rb
    // 同一档内（理论上置顶两档各只有一组）按语言名排序，语言名相同再比语言码，保证稳定
    return labelCollator.compare(a.label, b.label) || codeCollator.compare(a.lang, b.lang)
  })

  return groups
}
