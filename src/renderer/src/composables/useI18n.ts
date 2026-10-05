/**
 * 渲染进程 i18n 组合式函数。
 *
 * locale 为模块级共享 ref：启动时取系统语言（detectLocale），App 挂载后若存在
 * 用户保存的语言设置则应用之；用户可在编辑器头部手动切换（switchLocale）。
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

/** 仅切换渲染进程语言（voiceDisplay / voiceGroups 的默认 detectLocale 同步跟随） */
export function applyLocaleLocal(code: string): void {
  localeRef.value = code
  setLocale(code)
  syncDir(code)
}

/** 切换语言并通知主进程（重建原生菜单；仅本次会话生效，不持久化） */
export async function switchLocale(code: string): Promise<void> {
  applyLocaleLocal(code)
  await window.api.setLocale(code)
}
