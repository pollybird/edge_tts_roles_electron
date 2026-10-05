import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IpcChannels } from '../shared/ipc'
import type {
  AudioFormat,
  ErrorPayload,
  FinishedPayload,
  GenerateRequest,
  PreviewRequest,
  ProgressPayload,
  RoleVoiceSettings,
  VoiceInfo
} from '../shared/types'

function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_e: Electron.IpcRendererEvent, payload: T): void => cb(payload)
  ipcRenderer.on(channel, listener)
  return () => {
    ipcRenderer.removeListener(channel, listener)
  }
}

/** 暴露给渲染进程的 API（类型见 src/preload/index.d.ts） */
const api = {
  // TTS
  listVoices: (): Promise<VoiceInfo[]> => ipcRenderer.invoke(IpcChannels.listVoices),
  generate: (req: GenerateRequest): Promise<void> => ipcRenderer.invoke(IpcChannels.generate, req),
  preview: (req: PreviewRequest): Promise<void> => ipcRenderer.invoke(IpcChannels.preview, req),
  stop: (): Promise<void> => ipcRenderer.invoke(IpcChannels.stop),

  // 设置持久化
  getSetting: <T = unknown>(key: string): Promise<T> =>
    ipcRenderer.invoke(IpcChannels.settingsGet, key),
  setSetting: (key: string, value: unknown): Promise<void> =>
    ipcRenderer.invoke(IpcChannels.settingsSet, key, value),

  // 文件对话框
  openTextFile: (): Promise<{ path: string; content: string } | null> =>
    ipcRenderer.invoke(IpcChannels.dialogOpenTextFile),
  saveTextFile: (content: string): Promise<string | null> =>
    ipcRenderer.invoke(IpcChannels.dialogSaveTextFile, content),
  saveAudioFile: (format: AudioFormat): Promise<string | null> =>
    ipcRenderer.invoke(IpcChannels.dialogSaveAudioFile, format),
  pickAudioFile: (): Promise<string | null> => ipcRenderer.invoke(IpcChannels.dialogPickAudioFile),
  readAudioFile: (filePath: string): Promise<Uint8Array> =>
    ipcRenderer.invoke(IpcChannels.readAudioFile, filePath),

  // 角色语音配置文件
  saveRoleSettings: (settings: RoleVoiceSettings): Promise<string | null> =>
    ipcRenderer.invoke(IpcChannels.configSaveRoleSettings, settings),
  loadRoleSettings: (): Promise<RoleVoiceSettings | null> =>
    ipcRenderer.invoke(IpcChannels.configLoadRoleSettings),

  // 界面语言切换
  setLocale: (code: string): Promise<void> => ipcRenderer.invoke(IpcChannels.localeSet, code),

  // 主菜单动作
  onMenuAction: (cb: (actionId: string) => void): (() => void) =>
    subscribe(IpcChannels.menuAction, cb),

  // 事件订阅（返回取消订阅函数）
  onProgress: (cb: (payload: ProgressPayload) => void): (() => void) =>
    subscribe(IpcChannels.progress, cb),
  onFinished: (cb: (payload: FinishedPayload) => void): (() => void) =>
    subscribe(IpcChannels.finished, cb),
  onError: (cb: (payload: ErrorPayload) => void): (() => void) =>
    subscribe(IpcChannels.taskError, cb)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
