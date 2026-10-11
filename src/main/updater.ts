/**
 * 自动更新模块（Electron 集成层）
 *
 * 纯网络探测逻辑在 ./updateFeed.ts（可注入 mock 单测）；本文件负责：
 * - 惰性解析可用更新源并配置 electron-updater（默认 GitHub 主源 / GitCode 回退；
 *   简体中文系统反过来 GitCode 优先，见 updateFeed.ts）。解析在每次检查时执行
 *   （结果缓存 10 分钟），启动时双源不可达不再导致 IPC handler 缺失（v2.0.6 修复）；
 * - 转发更新事件到渲染进程；
 * - 区分“启动静默检查”与“用户手动检查”：静默检查失败只记日志零打扰，
 *   手动检查失败才提示「检查更新失败」（v2.0.6 修复）；
 * - 防御性兜底：electron-updater 在主源上检查失败时，换另一源重试一次再报失败。
 */
import { app, BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import { IpcChannels } from '../shared/ipc'
import { getSetting, setSetting } from './settings'
import { shouldPromptUpdate } from './updatePrompt'
import { getFeedFileName, prefersGitCodeFirst, resolveFeedUrl } from './updateFeed'

const FEED_FILE = getFeedFileName()

/** feed 解析结果缓存时长：期间不重复探测（网络恢复最迟一个 TTL 后生效） */
const FEED_TTL_MS = 10 * 60 * 1000

/** 本次检查是否由用户手动发起（决定失败/无更新时是否提示用户） */
let manualCheck = false

let cachedFeedUrl: string | null = null
let cachedAt = 0

/** 向主窗口转发更新事件（initAutoUpdater 时绑定窗口来源） */
let forward: ((event: string, payload?: unknown) => void) | null = null

function send(win: BrowserWindow | null, channel: string, payload?: unknown): void {
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, payload)
  }
}

/**
 * 解析可用 feed（带缓存）；excludeBase 用于主源检查失败后强制换源重试。
 * 解析成功时同步 setFeedURL 到 electron-updater。
 */
async function resolveFeed(force: boolean, excludeBase?: string): Promise<string | null> {
  if (!force && excludeBase === undefined && cachedFeedUrl && Date.now() - cachedAt < FEED_TTL_MS) {
    return cachedFeedUrl
  }
  const url = await resolveFeedUrl({
    feedFile: FEED_FILE,
    gitCodeFirst: prefersGitCodeFirst(app.getLocale()),
    ...(excludeBase ? { excludeBase } : {})
  }).catch(() => null)
  if (url) {
    cachedFeedUrl = url
    cachedAt = Date.now()
    // GitCode WAF 对带 ?noCache=<随机串> 的 GET 返回 404（对 HEAD 也一律 401），
    // 而 electron-updater 的 generic provider 默认在清单 URL 上追加 noCache 参数。
    // requestHeaders 含 private-token 键时其 isAddNoCacheQuery 返回 false、不再追加；
    // 空值头对 GitCode 无副作用（实测 302 正常）。GitHub 源不受影响。
    autoUpdater.requestHeaders = url.includes('gitcode.com') ? { 'Private-Token': '' } : {}
    autoUpdater.setFeedURL({ provider: 'generic', url })
  }
  return url
}

/** 检查失败收口：消费 manual 标志，仅手动检查提示渲染进程；静默失败零打扰 */
function reportCheckFailure(): void {
  const manual = manualCheck
  manualCheck = false
  if (manual) forward?.(IpcChannels.updateError, { manual: true })
}

/**
 * 执行一次检查：解析 feed → electron-updater 检查；
 * 主源上检查抛错时排除该源换另一源重试一次（防御性兜底），仍失败才收口报错。
 * 失败提示统一在重试结束后按 manual 标志决定，重试期间不提前弹窗。
 */
async function runCheck(): Promise<void> {
  const feedUrl = await resolveFeed(false)
  if (!feedUrl) {
    console.error('[updater] neither GitHub nor GitCode feed reachable')
    reportCheckFailure()
    return
  }
  try {
    await autoUpdater.checkForUpdates()
    return
  } catch (err) {
    console.error('[updater] check failed on primary source:', (err as Error)?.message ?? err)
  }
  const altUrl = await resolveFeed(true, feedUrl)
  if (altUrl) {
    try {
      await autoUpdater.checkForUpdates()
      return
    } catch (err) {
      console.error('[updater] check failed on fallback source:', (err as Error)?.message ?? err)
    }
  }
  reportCheckFailure()
}

/**
 * 初始化自动更新：注册事件与 IPC handler、启动时静默检查一次。
 * 开发环境（isPackaged=false）不执行更新检查，避免干扰调试。
 */
export async function initAutoUpdater(getMainWindow: () => BrowserWindow | null): Promise<void> {
  if (!app.isPackaged) {
    console.log('[updater] dev mode, skipping auto-update')
    return
  }

  // electron-updater 全量日志进主进程控制台（GitCode 源真机排查用）
  autoUpdater.logger = console
  // 关闭自动下载：发现新版本先经渲染进程弹窗确认，用户选择“立即安装”后才下载
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // 绑定事件转发出口（后续静默/手动检查共用）
  forward = (event, payload) => send(getMainWindow(), event, payload)

  autoUpdater.on('checking-for-update', () => forward?.(IpcChannels.updateChecking))
  autoUpdater.on('update-available', (info) => {
    const manual = manualCheck
    manualCheck = false
    // “不再提示”的版本在启动静默检查中直接跳过（不发事件，渲染进程无感知）；手动检查不受影响
    const skipped = getSetting('updateSkippedVersion')
    if (
      !shouldPromptUpdate({
        skippedVersion: skipped,
        newVersion: info.version,
        isManualCheck: manual
      })
    ) {
      console.log(`[updater] update ${info.version} skipped by user preference`)
      return
    }
    forward?.(IpcChannels.updateAvailable, { version: info.version, releaseDate: info.releaseDate })
  })
  autoUpdater.on('update-not-available', (info) => {
    const manual = manualCheck
    manualCheck = false
    forward?.(IpcChannels.updateNotAvailable, { version: info.version, manual })
  })
  autoUpdater.on('download-progress', (progress) =>
    forward?.(IpcChannels.updateDownloadProgress, {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      total: progress.total,
      transferred: progress.transferred
    })
  )
  autoUpdater.on('update-downloaded', (info) =>
    forward?.(IpcChannels.updateDownloaded, { version: info.version })
  )
  // 错误仅记录日志：electron-updater 失败时 error 事件与 Promise 拒绝双通道都会触发，
  // 在此转发会造成连弹两次；提示统一由 runCheck / updateDownload 的收口逻辑按 manual 标志决定。
  // 不向渲染进程转发原始信息（可能含 HTML/堆栈），渲染进程收到 updateError 后显示通用提示。
  autoUpdater.on('error', (err) => {
    console.error('[updater] error:', err?.message ?? String(err))
  })

  // 手动检查更新（渲染进程入口）。feed 解析已惰性化，双源暂不可达时 handler 依然存在，
  // 渲染进程能收到明确的失败事件而非 "No handler registered" 异常。
  ipcMain.handle(IpcChannels.updateCheck, () => {
    manualCheck = true
    return runCheck().then(() => null)
  })
  // 立即安装并重启（下载完成后由用户触发）
  ipcMain.handle(IpcChannels.updateInstall, () => {
    autoUpdater.quitAndInstall(false, true)
  })
  // 下载更新（autoDownload 已关闭，由用户在确认弹窗中选择“立即安装”后触发）
  ipcMain.handle(IpcChannels.updateDownload, () => {
    return autoUpdater.downloadUpdate().catch((err: Error) => {
      console.error('[updater] downloadUpdate failed:', err.message)
      // 下载必然由用户触发，失败直接提示
      forward?.(IpcChannels.updateError, { manual: true })
    })
  })
  // “不再提示”：按版本号持久化，仅影响启动静默检查；更高版本仍会弹出
  ipcMain.handle(IpcChannels.updateSkipVersion, (_e, version: string) => {
    setSetting('updateSkippedVersion', String(version))
  })

  // 启动后延迟静默检查一次（等窗口就绪，避免干扰首屏；manualCheck 保持 false）
  setTimeout(() => {
    void runCheck()
  }, 5000)
}

/** 手动触发更新检查（供主菜单调用） */
export function checkForUpdates(): void {
  if (!app.isPackaged) return
  manualCheck = true
  void runCheck()
}
