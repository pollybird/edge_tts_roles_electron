import Store from 'electron-store'
import type { AudioFormat, RoleVoiceSettings } from '../shared/types'
import { ROLE_IDS } from '../shared/types'

export interface SettingsSchema {
  roleSettings: RoleVoiceSettings
  outputPath: string
  audioFormat: AudioFormat
  /** 界面语言偏好（'' = 跟随系统语言） */
  locale: string
  /** 用户是否已同意用户协议（首次运行为 false，必须在协议弹窗中同意后才能使用） */
  agreementAccepted: boolean
  /** 用户选择“不再提示”的更新版本号（'' = 未跳过任何版本；更高版本仍会弹出更新确认） */
  updateSkippedVersion: string
}

const defaultRoleSettings = (): RoleVoiceSettings =>
  Object.fromEntries(
    ROLE_IDS.map((id) => [id, { voice: '', rate: 0, volume: 0, pitch: 0 }])
  ) as RoleVoiceSettings

/** 用户设置持久化（基于 electron-store，字段写入后自动落盘） */
const store = new Store<SettingsSchema>({
  defaults: {
    roleSettings: defaultRoleSettings(),
    outputPath: '',
    audioFormat: 'wav',
    locale: '',
    agreementAccepted: false,
    updateSkippedVersion: ''
  }
})

export function getSetting<K extends keyof SettingsSchema>(key: K): SettingsSchema[K] {
  return store.get(key)
}

export function setSetting<K extends keyof SettingsSchema>(key: K, value: SettingsSchema[K]): void {
  store.set(key, value)
}
