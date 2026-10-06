/**
 * 渲染进程 i18n 组合式函数。
 *
 * locale 为模块级共享 ref：启动时取系统语言（detectLocale），挂载前若存在
 * 用户持久化的语言偏好则应用之；语言切换入口在主进程“语言(L)”菜单，
 * 主进程通过 locale:changed 广播到渲染进程（applyLocaleLocal）。
 * t 为普通函数但内部读取 localeRef，模板渲染时会被 Vue 依赖追踪，
 * 因此切换语言后界面文本自动重渲。
 */
import { ref } from 'vue'
import type { Ref } from 'vue'
import { createT, detectLocale, isRtlLocale, setLocale } from '../../../shared/i18n'
import type { Translator } from '../../../shared/i18n'

/** 当前界面语言（全应用共享） */
const localeRef = ref(detectLocale())

/** 同步 <html dir>：RTL 语言（阿拉伯语）时整页从右到左排布 */
function syncDir(code: string): void {
  document.documentElement.dir = isRtlLocale(code) ? 'rtl' : 'ltr'
  document.documentElement.lang = code
}

syncDir(localeRef.value)

export function useI18n(): { locale: Ref<string>; t: Translator } {
  const t: Translator = (key, vars) => createT(localeRef.value)(key, vars)
  return { locale: localeRef, t }
}

/**
 * 应用语言到渲染进程（voiceDisplay / voiceGroups 的默认 detectLocale 同步跟随）。
 * 空字符串表示恢复跟随系统语言（navigator.language）。
 */
export function applyLocaleLocal(code: string): void {
  const resolved = code || detectLocale()
  localeRef.value = resolved
  setLocale(resolved)
  syncDir(resolved)
}
