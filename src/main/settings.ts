import { safeStorage } from 'electron'
import Store from 'electron-store'
import type {
  AudioFormat,
  CloudProvidersSettings,
  CloudProxySettings,
  PiperFallback,
  RoleVoiceSettings
} from '../shared/types'
import { ROLE_IDS, createDefaultCloudProviders, DEFAULT_CLOUD_PROXY } from '../shared/types'

export type { PiperFallback }

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
  /** Piper 离线兜底策略（默认 fallback：单段在线重试耗尽后自动离线合成） */
  piperFallback: PiperFallback
  /** 云服务商凭据（Google/讯飞/火山引擎；敏感字段经 safeStorage 加密后落盘） */
  cloudProviders: CloudProvidersSettings
  cloudProxy: CloudProxySettings
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
    updateSkippedVersion: '',
    piperFallback: 'fallback',
    cloudProviders: createDefaultCloudProviders(),
    cloudProxy: DEFAULT_CLOUD_PROXY
  }
})

/**
 * safeStorage 是否可用（Linux 需系统钥匙串，且需 app.ready 之后；单测中 electron 被 mock
 * 时 safeStorage 可能为 undefined）。不可用时回退为明文，保证功能不被阻断。
 */
function canEncrypt(): boolean {
  return !!(
    safeStorage &&
    typeof safeStorage.isEncryptionAvailable === 'function' &&
    safeStorage.isEncryptionAvailable()
  )
}

/** 加密单个凭据字段：空串不加密，保持默认值可读；加密失败回退明文 */
function encryptSecret(value: string): string {
  if (!value) return ''
  if (!canEncrypt()) return value
  try {
    return safeStorage.encryptString(value).toString('base64')
  } catch {
    return value
  }
}

/** 解密单个凭据字段：空串直接返回；解密失败视为历史明文数据，原样返回（兼容迁移） */
function decryptSecret(value: string): string {
  if (!value) return ''
  if (!canEncrypt()) return value
  try {
    return safeStorage.decryptString(Buffer.from(value, 'base64'))
  } catch {
    return value
  }
}

function encryptCloudProviders(cp: CloudProvidersSettings): CloudProvidersSettings {
  return {
    google: { enabled: cp.google.enabled, apiKey: encryptSecret(cp.google.apiKey) },
    xfyun: {
      enabled: cp.xfyun.enabled,
      appId: encryptSecret(cp.xfyun.appId),
      apiKey: encryptSecret(cp.xfyun.apiKey),
      apiSecret: encryptSecret(cp.xfyun.apiSecret)
    },
    volc: {
      enabled: cp.volc.enabled,
      appId: encryptSecret(cp.volc.appId),
      apiKey: encryptSecret(cp.volc.apiKey)
    }
  }
}

function decryptCloudProviders(cp: CloudProvidersSettings): CloudProvidersSettings {
  return {
    google: { enabled: cp.google.enabled, apiKey: decryptSecret(cp.google.apiKey) },
    xfyun: {
      enabled: cp.xfyun.enabled,
      appId: decryptSecret(cp.xfyun.appId),
      apiKey: decryptSecret(cp.xfyun.apiKey),
      apiSecret: decryptSecret(cp.xfyun.apiSecret)
    },
    volc: {
      enabled: cp.volc.enabled,
      appId: decryptSecret(cp.volc.appId),
      apiKey: decryptSecret(cp.volc.apiKey)
    }
  }
}

export function getSetting<K extends keyof SettingsSchema>(key: K): SettingsSchema[K] {
  const value = store.get(key)
  if (key === 'cloudProviders') {
    return decryptCloudProviders(value as CloudProvidersSettings) as SettingsSchema[K]
  }
  return value
}

export function setSetting<K extends keyof SettingsSchema>(key: K, value: SettingsSchema[K]): void {
  if (key === 'cloudProviders') {
    value = encryptCloudProviders(value as CloudProvidersSettings) as SettingsSchema[K]
  }
  store.set(key, value)
}
