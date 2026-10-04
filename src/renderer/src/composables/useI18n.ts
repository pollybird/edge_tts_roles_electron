/**
 * 渲染进程 i18n 组合式函数。
 *
 * 语言在应用启动时由系统语言决定（navigator.language），因此 t 为普通函数即可；
 * 将来加入应用内语言切换时，把 locale 改成 ref 并让 t 依赖它即可平滑升级。
 */
import { createT, detectLocale } from '../../../shared/i18n'

export function useI18n(): { locale: string; t: ReturnType<typeof createT> } {
  const locale = detectLocale()
  return { locale, t: createT(locale) }
}
