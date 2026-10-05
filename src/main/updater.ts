/**
 * 自动更新模块
 *
 * 更新源策略：GitHub Releases 为主，GitCode Release 附件为回退。
 * 原因：GitHub 在国内访问不稳定，需要一个可达的镜像源。
 *
 * 实现方式：
 * 1. 按当前平台生成对应的 latest*.yml 文件名（win=latest.yml, mac=latest-mac.yml, linux=latest-linux.yml）
 * 2. 用 fetch 探测 GitHub Releases 的 /releases/latest/download/{file}，设短超时
 * 3. 探测失败 → 调用 GitCode 公开 API 获取最新 Release 的 tag，
 *    再以 /releases/download/{tag}/ 作为 generic feed base（GitCode 不支持 latest 别名，
 *    且其仓库 raw 地址对缺失/受限文件返回 HTML 页面，不能直接用作 feed）
 * 4. 调用 electron-updater 的 autoUpdater.setFeedURL 指向选定的 generic 源
 *
 * 发版时需把安装包与 latest*.yml 同时作为附件上传到两个平台的 Release
 *（附件 yml 中文件名为相对路径，相对 feed base 解析）。
 */
import { app, BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import { IpcChannels } from '../shared/ipc'

/** 当前平台对应的更新清单文件名 */
function getFeedFileName(): string {
  switch (process.platform) {
    case 'darwin':
      return 'latest-mac.yml'
    case 'linux':
      return 'latest-linux.yml'
    default:
      return 'latest.yml'
  }
}

const FEED_FILE = getFeedFileName()
const GITHUB_LATEST_BASE =
  'https://github.com/pollybird/edge_tts_roles_electron/releases/latest/download/'
const GITCODE_API_LATEST =
  'https://api.gitcode.com/api/v5/repos/pollybird/edge_tts_roles_electron/releases/latest'
const GITCODE_DOWNLOAD_BASE = 'https://gitcode.com/pollybird/edge_tts_roles_electron/releases/download/'

/** 探测 URL 是否可达且返回的是 YAML 而非 HTML 错误页 */
async function probeUrl(url: string, timeoutMs: number): Promise<boolean> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Range: 'bytes=0-0' }
    })
    const ok = res.ok || res.status === 206 || res.status === 416
    if (!ok) return false
    // GitCode 等站点在文件不存在时会返回 200 + HTML 页面，需排除
    const ct = res.headers.get('content-type') ?? ''
    if (ct.includes('text/html')) return false
    return true
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 解析 GitCode 回退源：
 * GitCode 不支持 GitHub 的 /releases/latest/download/ 别名，需先通过公开 API
 * 获取最新 Release 的 tag，再拼出该版本附件所在的 generic feed base。
 */
async function resolveGitCodeFeedUrl(): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 3500)
  let tag: string | undefined
  try {
    const res = await fetch(GITCODE_API_LATEST, { signal: controller.signal })
    if (res.ok) {
      const info = (await res.json()) as { tag_name?: string }
      tag = info.tag_name
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
  if (!tag) return null

  const base = `${GITCODE_DOWNLOAD_BASE}${tag}/`
  const ok = await probeUrl(base + FEED_FILE, 3500)
  if (ok) {
    console.log(`[updater] GitHub feed unreachable, falling back to GitCode: ${base}`)
    return base
  }
  return null
}

/**
 * 选择可用的更新源：优先 GitHub Releases，失败回退 GitCode Release 附件。
 * 返回 electron-updater generic provider 需要的 base URL；若两者均不可达返回 null。
 */
async function resolveFeedUrl(): Promise<string | null> {
  const githubOk = await probeUrl(GITHUB_LATEST_BASE + FEED_FILE, 3500)
  if (githubOk) {
    console.log(`[updater] using GitHub feed: ${GITHUB_LATEST_BASE}`)
    return GITHUB_LATEST_BASE
  }
  const gitcodeBase = await resolveGitCodeFeedUrl()
  if (gitcodeBase) return gitcodeBase
  console.log('[updater] neither GitHub nor GitCode feed reachable, skipping update check')
  return null
}

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

  const feedUrl = await resolveFeedUrl().catch(() => null)
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
  autoUpdater.on('update-available', (info) =>
    forward(IpcChannels.updateAvailable, { version: info.version, releaseDate: info.releaseDate })
  )
  autoUpdater.on('update-not-available', (info) =>
    forward(IpcChannels.updateNotAvailable, { version: info.version })
  )
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
    console.error('[updater] error:', err?.message ?? String(err))
    forward(IpcChannels.updateError)
  })

  // 手动检查更新
  ipcMain.handle(IpcChannels.updateCheck, () => {
    return autoUpdater.checkForUpdates().catch((err: Error) => {
      console.error('[updater] manual check error:', err.message)
      forward(IpcChannels.updateError)
      return null
    })
  })
  // 立即安装并重启（下载完成后由用户触发）
  ipcMain.handle(IpcChannels.updateInstall, () => {
    autoUpdater.quitAndInstall(false, true)
  })

  // 启动后延迟静默检查一次（等窗口就绪，避免干扰首屏）
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err: Error) => {
      console.error('[updater] checkForUpdates failed:', err.message)
    })
  }, 5000)
}

/** 手动触发更新检查（供菜单等调用） */
export function checkForUpdates(): void {
  if (!app.isPackaged) return
  autoUpdater.checkForUpdates().catch((err: Error) => {
    console.error('[updater] manual check failed:', err.message)
  })
}
