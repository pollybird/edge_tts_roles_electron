import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import { applyLocaleLocal } from './composables/useI18n'

/**
 * 启动前应用持久化的语言偏好（主进程“语言(L)”菜单所选），
 * 未设置或读取失败时保持 detectLocale() 的系统语言，避免界面先闪一次系统语言。
 */
async function bootstrap(): Promise<void> {
  try {
    const savedLocale = await window.api.getSetting<string>('locale')
    if (savedLocale) applyLocaleLocal(savedLocale)
  } catch {
    // 非 Electron 环境或设置读取失败：保持跟随系统语言
  }
  createApp(App).mount('#app')
}

void bootstrap()
