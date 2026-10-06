import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerIpcHandlers } from './ipc'
import { buildMenu } from './menu'
import { setLocale } from '../shared/i18n'
import { getSetting } from './settings'
import { initAutoUpdater } from './updater'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    show: false,
    // 显示系统主菜单（文件/编辑/帮助）
    autoHideMenuBar: false,
    // PNG 图标 Electron 全平台支持；Windows 打包后的 exe/任务栏图标由 build/icon.ico 决定
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    // 程序打开时默认最大化（在 show 前调用，避免先显示小窗再放大的闪烁）
    mainWindow?.maximize()
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  buildMenu(() => mainWindow)
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('cn.tzzhy.edge-tts-roles')
  // i18n：优先应用用户在“语言”菜单中持久化的选择；从未选择时跟随系统语言
  setLocale(getSetting('locale') || app.getLocale())

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpcHandlers(() => mainWindow)

  createWindow()

  // 自动更新：GitHub Releases 主源 + GitCode 回退（开发环境跳过）
  void initAutoUpdater(() => mainWindow)

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
