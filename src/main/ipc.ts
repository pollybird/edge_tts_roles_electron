import { app, dialog, ipcMain } from 'electron'
import type { BrowserWindow } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import { extname, join } from 'path'
import { IpcChannels } from '../shared/ipc'
import { createT } from '../shared/i18n'
import { ROLE_IDS } from '../shared/types'
import type {
  AudioFormat,
  GenerateRequest,
  PreviewRequest,
  RoleId,
  RoleVoiceSettings
} from '../shared/types'
import { getSetting, setSetting } from './settings'
import type { SettingsSchema } from './settings'
import { ttsService } from './ttsService'

/** 允许读取的音频扩展名（与文件选择对话框保持一致） */
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'opus', 'wma'])

/** 注册全部 IPC handler（在 app ready 后调用一次） */
export function registerIpcHandlers(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle(IpcChannels.listVoices, () => ttsService.listVoices())

  ipcMain.handle(IpcChannels.generate, async (_e, req: GenerateRequest) => {
    const win = getWindow()
    if (win) await ttsService.generate(win, req)
  })

  ipcMain.handle(IpcChannels.preview, async (_e, req: PreviewRequest) => {
    const win = getWindow()
    if (win) await ttsService.preview(win, req)
  })

  ipcMain.handle(IpcChannels.stop, () => ttsService.stop())

  ipcMain.handle(IpcChannels.settingsGet, (_e, key: string) =>
    getSetting(key as keyof SettingsSchema)
  )

  ipcMain.handle(IpcChannels.settingsSet, (_e, key: string, value: unknown) => {
    setSetting(key as keyof SettingsSchema, value as SettingsSchema[keyof SettingsSchema])
  })

  ipcMain.handle(IpcChannels.dialogOpenTextFile, async () => {
    const win = getWindow()
    if (!win) return null
    const t = createT()
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      filters: [{ name: t('dialog.textFilter'), extensions: ['txt'] }],
      properties: ['openFile']
    })
    if (canceled || filePaths.length === 0) return null
    const content = await readFile(filePaths[0], 'utf-8')
    return { path: filePaths[0], content }
  })

  ipcMain.handle(IpcChannels.dialogSaveTextFile, async (_e, content: string) => {
    const win = getWindow()
    if (!win) return null
    const t = createT()
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      filters: [{ name: t('dialog.textFilter'), extensions: ['txt'] }]
    })
    if (canceled || !filePath) return null
    await writeFile(filePath, content, 'utf-8')
    return filePath
  })

  ipcMain.handle(IpcChannels.dialogSaveAudioFile, async (_e, format: AudioFormat) => {
    const win = getWindow()
    if (!win) return null
    const t = createT()
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      defaultPath: join(app.getPath('music'), `output.${format}`),
      filters: [{ name: t('dialog.audioFilter'), extensions: [format] }]
    })
    return canceled ? null : filePath
  })

  ipcMain.handle(IpcChannels.dialogPickAudioFile, async () => {
    const win = getWindow()
    if (!win) return null
    const t = createT()
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      filters: [
        {
          name: t('dialog.audioFilter'),
          extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'opus', 'wma']
        }
      ],
      properties: ['openFile']
    })
    if (canceled || filePaths.length === 0) return null
    return filePaths[0]
  })

  ipcMain.handle(IpcChannels.readAudioFile, async (_e, filePath: string) => {
    // 仅允许读取常见音频扩展名，避免渲染进程借该通道读取任意文件
    const ext = extname(filePath).slice(1).toLowerCase()
    if (!AUDIO_EXTENSIONS.has(ext)) {
      throw new Error(createT()('dialog.unsupportedAudioExt', { ext }))
    }
    const buf = await readFile(filePath)
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
  })

  ipcMain.handle(IpcChannels.configSaveRoleSettings, async (_e, settings: RoleVoiceSettings) => {
    const win = getWindow()
    if (!win) return null
    const t = createT()
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      defaultPath: join(app.getPath('documents'), t('dialog.configDefaultName')),
      filters: [{ name: t('dialog.configFilter'), extensions: ['json'] }]
    })
    if (canceled || !filePath) return null
    const payload = {
      app: 'edge-tts-roles',
      version: 1,
      savedAt: new Date().toISOString(),
      roleSettings: settings
    }
    await writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8')
    return filePath
  })

  ipcMain.handle(IpcChannels.configLoadRoleSettings, async () => {
    const win = getWindow()
    if (!win) return null
    const t = createT()
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      filters: [{ name: t('dialog.configFilter'), extensions: ['json'] }],
      properties: ['openFile']
    })
    if (canceled || filePaths.length === 0) return null

    let parsed: unknown
    try {
      parsed = JSON.parse(await readFile(filePaths[0], 'utf-8'))
    } catch {
      throw new Error(t('dialog.invalidJson'))
    }
    return normalizeRoleSettings(parsed)
  })
}

/**
 * 校验并规范化角色语音配置。
 * 兼容两种文件形态：包装版 { roleSettings: {...} } 与裸 RoleVoiceSettings。
 * 缺失角色补默认值，数值字段取整并夹取到 -100~100，voice 强制为字符串。
 */
function normalizeRoleSettings(input: unknown): RoleVoiceSettings {
  const source = (input ?? {}) as Record<string, unknown>
  const rawSettings =
    typeof source['roleSettings'] === 'object' && source['roleSettings'] !== null
      ? (source['roleSettings'] as Record<string, unknown>)
      : source

  const clamp = (v: unknown): number => {
    const n = typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : 0
    return Math.max(-100, Math.min(100, n))
  }

  const result = {} as RoleVoiceSettings
  for (const id of ROLE_IDS) {
    const entry = (rawSettings[id] ?? {}) as Record<string, unknown>
    result[id as RoleId] = {
      voice: typeof entry.voice === 'string' ? entry.voice : '',
      rate: clamp(entry.rate),
      volume: clamp(entry.volume),
      pitch: clamp(entry.pitch)
    }
  }

  // 至少有一个角色选择了发音人才视为有效配置
  const anyVoice = ROLE_IDS.some((id) => result[id].voice !== '')
  if (!anyVoice) throw new Error(createT()('dialog.noVoiceInConfig'))
  return result
}
