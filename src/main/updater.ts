/**
 * 自动更新模块（Electron 集成层）
 *
 * 纯网络探测逻辑在 ./updateFeed.ts（可注入 mock 单测）；本文件负责：
 * - 启动时解析可用更新源（GitHub 主源 / GitCode 回退）并配置 electron-updater
 * - 转发更新事件到渲染进程
 * - 区分“启动静默检查”与“用户手动检查”：手动检查且无新版本时提示“已是最新版本”
 */
import { app, BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import { IpcChannels } from '../shared/ipc'
import { getFeedFileName, resolveFeedUrl } from './updateFeed'

const FEED_FILE = getFeedFileName()

/** 本次检查是否由用户手动发起（决定 not-available 时是否提示用户） */
let manualCheck = false

/** 向渲染进程推送更新状态事件 */
function send(win: BrowserWindow | null, channel: string, payload?: unknown): void {
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, payload)
  }
}

/**
 * 初始化自动更新：探测可用源、注册事件、启动时静默检查一次。
 * 开发环境（isPackaged=false）不执行更新检查，避免干扰调试。
 */
export async function initAutoUpdater(getMainWindow: () => BrowserWindow | null): Promise<void> {
  if (!app.isPackaged) {
    console.log('[updater] dev mode, skipping auto-update')
    return
  }

  const feedUrl = await resolveFeedUrl({ feedFile: FEED_FILE }).catch(() => null)
  if (!feedUrl) {
    // 两个更新源均不可达：不注册更新检查，避免向无效地址请求导致解析错误
    return
  }

  // electron-updater 的 generic provider 直接用 base URL 拼接 latest*.yml
  autoUpdater.setFeedURL({ provider: 'generic', url: feedUrl })
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  // 转发事件到渲染进程
  const forward = (event: string, payload?: unknown): void => send(getMainWindow(), event, payload)

  autoUpdater.on('checking-for-update', () => forward(IpcChannels.updateChecking))
  autoUpdater.on('update-available', (info) => {
    manualCheck = false
    forward(IpcChannels.updateAvailable, { version: info.version, releaseDate: info.releaseDate })
  })
  autoUpdater.on('update-not-available', (info) => {
    const manual = manualCheck
    manualCheck = false
    forward(IpcChannels.updateNotAvailable, { version: info.version, manual })
  })
  autoUpdater.on('download-progress', (progress) =>
    forward(IpcChannels.updateDownloadProgress, {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      total: progress.total,
      transferred: progress.transferred
    })
  )
  autoUpdater.on('update-downloaded', (info) =>
    forward(IpcChannels.updateDownloaded, { version: info.version })
  )
  // 错误不向渲染进程转发原始信息（可能含 HTML/堆栈），仅在主进程日志记录；
  // 渲染进程通过 updateError 事件收到空载荷后自行显示通用"检查更新失败"提示。
  autoUpdater.on('error', (err) => {
    manualCheck = false
    console.error('[updater] error:', err?.message ?? String(err))
    forward(IpcChannels.updateError)
  })

  // 手动检查更新（渲染进程入口）
  ipcMain.handle(IpcChannels.updateCheck, () => {
    manualCheck = true
    return autoUpdater.checkForUpdates().catch((err: Error) => {
      console.error('[updater] manual check error:', err.message)
      manualCheck = false
      forward(IpcChannels.updateError)
      return null
    })
  })
  // 立即安装并重启（下载完成后由用户触发）
  ipcMain.handle(IpcChannels.updateInstall, () => {
    autoUpdater.quitAndInstall(false, true)
  })

  // 启动后延迟静默检查一次（等窗口就绪，避免干扰首屏；manualCheck 保持 false）
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err: Error) => {
      console.error('[updater] checkForUpdates failed:', err.message)
    })
  }, 5000)
}

/** 手动触发更新检查（供主菜单调用） */
export function checkForUpdates(): void {
  if (!app.isPackaged) return
  manualCheck = true
  autoUpdater.checkForUpdates().catch((err: Error) => {
    manualCheck = false
    console.error('[updater] manual check failed:', err.message)
  })
}
