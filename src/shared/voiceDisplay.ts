/**
 * Edge TTS 音色显示名生成 —— 纯逻辑层，不含任何写死的译名数据。
 *
 * 所有译名来自 i18n 语言包（见 shared/i18n/），按当前语言解析：
 * - 人名：语言包 voiceNames[shortName]，未命中则从 shortName 剥离 locale/Neural 得接口原名；
 * - 地区：语言包 localeNames[locale]，未命中则取 friendlyName 中的英文地区名，再退 locale；
 * - 性别：语言包 gender 译词，未命中保留接口原文（Female/Male）；
 * - 语序与分隔符：语言包 displayPattern（{name}/{region}/{gender}）。
 */
import { resolveVoicePack } from './i18n'
import type { VoiceInfo } from './types'

/** 从 shortName 剥离 locale 前缀与 Neural 后缀，得到接口原人名（如 en-US-AriaNeural → Aria） */
export function personName(voice: VoiceInfo): string {
  const prefix = `${voice.locale}-`
  let person = voice.shortName.startsWith(prefix)
    ? voice.shortName.slice(prefix.length)
    : (voice.shortName.split('-').pop() ?? voice.shortName)
  person = person.replace(/MultilingualNeural$/, '').replace(/Neural$/, '')
  return person
}

/** 从 friendlyName 提取接口英文地区名（"Microsoft Aria ... - English (US)" → "English (US)"） */
export function nativeRegion(voice: VoiceInfo): string {
  const parts = voice.friendlyName.split(' - ')
  return parts.length > 1 ? (parts.slice(1).join(' - ') ?? voice.locale) : voice.locale
}

/** 本地化“语言（国家/地区）”名；语言包未命中时回退接口英文地区名 */
export function getVoiceRegionName(voice: VoiceInfo, locale?: string): string {
  const pack = resolveVoicePack(locale)
  return pack.localeNames[voice.locale] ?? nativeRegion(voice)
}

/**
 * 音色显示名。
 * @param locale 可选；默认取当前语言（渲染进程 navigator.language，或主进程 setLocale 设定值）
 */
export function getVoiceDisplayName(voice: VoiceInfo, locale?: string): string {
  const pack = resolveVoicePack(locale)

  const name = pack.voiceNames[voice.shortName] ?? personName(voice)
  const region = pack.localeNames[voice.locale] ?? nativeRegion(voice)
  const gender = pack.gender[voice.gender.toLowerCase() as 'female' | 'male'] ?? voice.gender

  return pack.displayPattern
    .replace('{name}', name)
    .replace('{region}', region)
    .replace('{gender}', gender)
}
