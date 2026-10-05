/**
 * 轻量国际化核心（主进程 / 渲染进程共用，纯函数无 Electron 依赖）
 *
 * 与 zhy_en_copybook_electron 的 i18n 思路一致：
 * - zh* 语言归入中文包，其余语言无专属包时回退 en-US 基准包；
 * - 语言包为纯数据，新增语言只需新增 locales/<locale>.ts 并注册；
 * - createT() 返回的 t('group.key', vars) 支持 {var} 插值；
 * - 支持运行时切换语言（setLocale），供将来的语言设置界面使用。
 */
import enUS from './locales/en-US'
import zhCN from './locales/zh-CN'
import zhTW from './locales/zh-TW'
import frFR from './locales/fr-FR'
import deDE from './locales/de-DE'
import esES from './locales/es-ES'
import ruRU from './locales/ru-RU'
import jaJP from './locales/ja-JP'
import arSA from './locales/ar-SA'
import type { LocalePack, Messages, PartialLocalePack, VoiceNamespace } from './types'

/** 基准语言包（任何缺失 key 的最终兜底，必须包含全部 messages） */
const BASE_PACK: LocalePack = enUS

/** 已注册的完整语言包（新增语言在此登记） */
const LOCALE_PACKS: Record<string, LocalePack> = {
  'en-US': enUS,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'fr-FR': frFR,
  'de-DE': deDE,
  'es-ES': esES,
  'ru-RU': ruRU,
  'ja-JP': jaJP,
  'ar-SA': arSA
}

/**
 * 语言前缀（zh-CN / zh-TW / zh-HK 共享中文译名）→ 语言包。
 * zh-CN 与 zh-TW 已精确匹配；其余 zh-*（如 zh-HK、zh-MO）默认回退繁体（港澳台习惯）。
 */
const LANGUAGE_PREFIX_PACKS: Record<string, LocalePack> = {
  zh: zhTW,
  en: enUS,
  fr: frFR,
  de: deDE,
  es: esES,
  ru: ruRU,
  ja: jaJP,
  ar: arSA
}

/** 运行时动态注册的语言包（未来可从外部 JSON 加载语言文件） */
const dynamicPacks = new Map<string, LocalePack>()

let localeOverride: string | null = null

export type TranslateVars = Record<string, string | number>
export type Translator = (key: string, vars?: TranslateVars) => string

/** 判断是否为中文环境 */
export function isZhLocale(locale: string): boolean {
  return /^zh([-_]|$)/i.test(String(locale ?? ''))
}

/**
 * 检测当前环境语言：
 * 渲染进程用 navigator.language，主进程启动时调用 setLocale(app.getLocale())。
 */
export function detectLocale(): string {
  if (localeOverride) return localeOverride
  if (typeof navigator !== 'undefined' && navigator.language) return navigator.language
  return 'en-US'
}

/** 显式设置语言（主进程 app.getLocale 或语言设置界面调用） */
export function setLocale(locale: string): void {
  localeOverride = locale
}

/** 注册外部语言包（不重新构建即可扩展语言） */
export function registerLocalePack(locale: string, pack: LocalePack): void {
  dynamicPacks.set(normalizeLocale(locale), pack)
}

function normalizeLocale(locale: string): string {
  return String(locale ?? '').replace('_', '-')
}

/**
 * 解析语言包：精确匹配 → 动态注册包 → 语言前缀匹配 → en-US 基准包。
 */
export function resolvePack(locale = detectLocale()): LocalePack {
  const key = normalizeLocale(locale)
  return (
    LOCALE_PACKS[key] ??
    dynamicPacks.get(key) ??
    LANGUAGE_PREFIX_PACKS[key.split('-')[0] ?? ''] ??
    BASE_PACK
  )
}

/** 取音色命名空间（缺失条目与基准包合并） */
export function resolveVoicePack(locale = detectLocale()): VoiceNamespace {
  const pack = resolvePack(locale)
  return {
    voiceNames: { ...BASE_PACK.voices.voiceNames, ...pack.voices.voiceNames },
    localeNames: { ...BASE_PACK.voices.localeNames, ...pack.voices.localeNames },
    gender: { ...BASE_PACK.voices.gender, ...pack.voices.gender },
    displayPattern: pack.voices.displayPattern ?? BASE_PACK.voices.displayPattern
  }
}

function lookupRaw(table: unknown, dottedKey: string): string | undefined {
  const val = dottedKey
    .split('.')
    .reduce<unknown>(
      (obj, k) => (obj == null ? undefined : (obj as Record<string, unknown>)[k]),
      table
    )
  return typeof val === 'string' ? val : undefined
}

/** 点分 key 查找：当前语言包 → en-US 基准包 → key 本身（绝不返回 undefined） */
export function translate(key: string, vars?: TranslateVars, locale = detectLocale()): string {
  const pack = resolvePack(locale)
  let str = lookupRaw(pack.messages, key) ?? lookupRaw(BASE_PACK.messages, key) ?? key
  if (vars) {
    str = str.replace(/\{(\w+)\}/g, (m, name: string) =>
      vars[name] !== undefined ? String(vars[name]) : m
    )
  }
  return str
}

/**
 * 创建翻译函数：const t = createT(app.getLocale()); t('menu.file') / t('tts.roleNoVoice', { role })
 */
export function createT(locale = detectLocale()): Translator {
  return (key, vars) => translate(key, vars, locale)
}

/** 基准包中存在的全部点分 key（可用于校验语言包完整性） */
export function allMessageKeys(): string[] {
  return collectKeys(BASE_PACK.messages as unknown as Record<string, unknown>, '')
}

function collectKeys(obj: Record<string, unknown>, prefix: string): string[] {
  const keys: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object') keys.push(...collectKeys(v as Record<string, unknown>, path))
    else keys.push(path)
  }
  return keys
}

/** 当前已注册语言列表（供语言设置下拉框使用，label 为各语言母语自称） */
export function availableLocales(): Array<{ code: string; label: string }> {
  return [
    { code: 'zh-CN', label: '简体中文' },
    { code: 'zh-TW', label: '繁體中文' },
    { code: 'en-US', label: 'English' },
    { code: 'fr-FR', label: 'Français' },
    { code: 'de-DE', label: 'Deutsch' },
    { code: 'es-ES', label: 'Español' },
    { code: 'ru-RU', label: 'Русский' },
    { code: 'ja-JP', label: '日本語' },
    { code: 'ar-SA', label: 'العربية' }
  ]
}

/** 判断是否为从右到左（RTL）书写的语言（当前仅阿拉伯语） */
export function isRtlLocale(locale: string): boolean {
  return /^ar([-_]|$)/i.test(String(locale ?? ''))
}

export type { LocalePack, Messages, PartialLocalePack }
