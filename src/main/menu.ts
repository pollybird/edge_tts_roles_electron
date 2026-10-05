import { app, dialog, Menu, shell } from 'electron'
import type { BrowserWindow } from 'electron'
import { IpcChannels } from '../shared/ipc'
import { createT } from '../shared/i18n'
import { checkForUpdates } from './updater'

/** 菜单动作 id（渲染进程据此分发） */
export type MenuActionId =
  'open-text' | 'save-text' | 'load-config' | 'save-config' | 'find' | 'replace'

const WEBSITE_URL = 'https://www.tzzhy.cn/'

/**
 * 随应用分发/构建使用的开源软件署名（“关于”对话框展示）。
 * 注意：edge-tts-universal 为 AGPL-3.0，ffmpeg-static 随附的 FFmpeg 为
 * GPL-3.0-or-later，本应用整体据此按 AGPL-3.0 发布。
 */
const OPEN_SOURCE_SOFTWARE: string[] = [
  'Electron (MIT) - https://www.electronjs.org/',
  'Vue.js (MIT) - https://vuejs.org/',
  'edge-tts-universal (AGPL-3.0) - https://www.npmjs.com/package/edge-tts-universal',
  'FFmpeg / ffmpeg-static (GPL-3.0-or-later) - https://ffmpeg.org/',
  'electron-store (MIT) - https://github.com/sindresorhus/electron-store',
  '@electron-toolkit/* (MIT) - https://github.com/alex8088/electron-toolkit',
  'TypeScript (Apache-2.0) - https://www.typescriptlang.org/',
  'Vite / electron-vite (MIT) - https://electron-vite.org/'
]

/**
 * 构建应用主菜单：文件 / 编辑 / 帮助。文案全部取自 i18n 语言包，
 * 助记符也随语言走（中文“文件(F)(&F)”，英文“&File”）。
 */
export function buildMenu(getWindow: () => BrowserWindow | null): void {
  const t = createT()

  const send = (id: MenuActionId) => (): void => {
    const win = getWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send(IpcChannels.menuAction, id)
    }
  }

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: t('menu.file'),
      submenu: [
        { label: t('menu.openText'), accelerator: 'CmdOrCtrl+O', click: send('open-text') },
        { label: t('menu.saveText'), accelerator: 'CmdOrCtrl+S', click: send('save-text') },
        { type: 'separator' },
        {
          label: t('menu.openConfig'),
          accelerator: 'CmdOrCtrl+Shift+O',
          click: send('load-config')
        },
        {
          label: t('menu.saveConfig'),
          accelerator: 'CmdOrCtrl+Shift+S',
          click: send('save-config')
        },
        { type: 'separator' },
        { role: 'quit', label: t('menu.quit'), accelerator: 'Alt+F4' }
      ]
    },
    {
      label: t('menu.edit'),
      submenu: [
        { role: 'undo', label: t('menu.undo'), accelerator: 'CmdOrCtrl+Z' },
        { role: 'redo', label: t('menu.redo'), accelerator: 'CmdOrCtrl+Y' },
        { type: 'separator' },
        { role: 'cut', label: t('menu.cut'), accelerator: 'CmdOrCtrl+X' },
        { role: 'copy', label: t('menu.copy'), accelerator: 'CmdOrCtrl+C' },
        { role: 'paste', label: t('menu.paste'), accelerator: 'CmdOrCtrl+V' },
        { type: 'separator' },
        { label: t('menu.find'), accelerator: 'CmdOrCtrl+F', click: send('find') },
        { label: t('menu.replace'), accelerator: 'CmdOrCtrl+H', click: send('replace') }
      ]
    },
    {
      label: t('menu.help'),
      submenu: [
        {
          label: t('menu.helpItem'),
          accelerator: 'F1',
          click: () => showHelp(getWindow())
        },
        { label: t('menu.agreement'), click: () => showAgreement(getWindow()) },
        { label: t('menu.checkUpdate'), click: () => checkForUpdates() },
        { type: 'separator' },
        { label: t('menu.website'), click: () => void shell.openExternal(WEBSITE_URL) },
        { label: t('menu.about'), click: () => showAbout(getWindow()) }
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function showHelp(win: BrowserWindow | null): void {
  const t = createT()
  dialog.showMessageBoxSync(win ?? undefined!, {
    type: 'info',
    title: t('help.title'),
    message: t('help.message'),
    detail: t('help.body'),
    buttons: [t('dialog.ok')]
  })
}

function showAgreement(win: BrowserWindow | null): void {
  const t = createT()
  dialog.showMessageBoxSync(win ?? undefined!, {
    type: 'info',
    title: t('agreement.title'),
    message: t('agreement.message'),
    detail: t('agreement.body'),
    buttons: [t('dialog.ok')]
  })
}

function showAbout(win: BrowserWindow | null): void {
  const t = createT()
  dialog.showMessageBoxSync(win ?? undefined!, {
    type: 'info',
    title: t('about.title'),
    message: t('about.message'),
    detail: [
      t('about.version', { version: app.getVersion() }),
      t('about.tech'),
      '',
      t('about.license'),
      t('about.copyright'),
      t('about.website'),
      '',
      t('about.opensource'),
      ...OPEN_SOURCE_SOFTWARE.map((s) => `- ${s}`)
    ].join('\n'),
    buttons: [t('dialog.ok')]
  })
}
