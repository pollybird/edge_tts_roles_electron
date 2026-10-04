/**
 * 基于 ICU Intl.DisplayNames 生成指定语言的「语言（国家/地区）」名称表。
 *
 * 设计考虑：
 * - Edge TTS 共 142 个 locale，各语言逐个手写译名成本高且难维护；
 *   CLDR（Intl.DisplayNames）提供各语种母语者习惯的标准译名（如 fr 环境 en-US → « anglais (États-Unis) »）。
 * - Electron 内置完整 ICU，主进程（Node）与渲染进程（Chromium）均可直接使用。
 * - locale 码清单以 zh-CN 语言包已收录的 142 个 Edge locale 为基准，保证覆盖范围一致。
 * - 个别 Intl 无法本地化的 Edge 私有扩展码（如 zh-CN-liaoning / zh-CN-shaanxi）
 *   由各语言包通过 overrides 人工补齐；其余无法识别的条目跳过，
 *   voiceDisplay 会自动回退到 Edge 接口返回的英文名。
 */
import zhCN from './locales/zh-CN'

/** Edge TTS 接口的全部 locale 码（zh-CN 包为首个全量译名包，以此为准） */
const EDGE_LOCALE_CODES = Object.keys(zhCN.voices.localeNames)

export function buildLocaleNames(
  locale: string,
  overrides: Record<string, string> = {}
): Record<string, string> {
  const display = new Intl.DisplayNames([locale, 'en'], { type: 'language' })
  const result: Record<string, string> = {}
  for (const code of EDGE_LOCALE_CODES) {
    const override = overrides[code]
    if (override) {
      result[code] = override
      continue
    }
    const name = display.of(code)
    // Intl 不识别时通常原样返回 code，此类条目跳过以触发上层英文回退
    if (name && name !== code) result[code] = name
  }
  return result
}
