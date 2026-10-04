import Store from 'electron-store'
import type { AudioFormat, RoleVoiceSettings } from '../shared/types'
import { ROLE_IDS } from '../shared/types'

export interface SettingsSchema {
  roleSettings: RoleVoiceSettings
  outputPath: string
  audioFormat: AudioFormat
}

const defaultRoleSettings = (): RoleVoiceSettings =>
  Object.fromEntries(
    ROLE_IDS.map((id) => [id, { voice: '', rate: 0, volume: 0, pitch: 0 }])
  ) as RoleVoiceSettings

/** 用户设置持久化（对应 PyQt6 版的设置自动保存） */
const store = new Store<SettingsSchema>({
  defaults: {
    roleSettings: defaultRoleSettings(),
    outputPath: '',
    audioFormat: 'wav'
  }
})

export function getSetting<K extends keyof SettingsSchema>(key: K): SettingsSchema[K] {
  return store.get(key)
}

export function setSetting<K extends keyof SettingsSchema>(key: K, value: SettingsSchema[K]): void {
  store.set(key, value)
}
