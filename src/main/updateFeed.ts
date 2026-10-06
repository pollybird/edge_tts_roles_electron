/**
 * 更新源探测（纯网络逻辑，不依赖 electron / electron-updater，可注入 mock fetch 单测）
 *
 * 更新源策略：GitHub Releases 为主，GitCode Release 附件为回退
 *（GitHub 在国内访问不稳定，需要可达的镜像源）。
 *
 * 1. 按当前平台生成对应的 latest*.yml 文件名
 *    （win=latest.yml, mac=latest-mac.yml, linux=latest-linux.yml）
 * 2. 探测 GitHub Releases 的 /releases/latest/download/{file}，短超时
 * 3. 探测失败 → 调 GitCode 公开 API 取最新 Release 的 tag，
 *    再以 /releases/download/{tag}/ 作为 generic feed base（GitCode 不支持 latest 别名，
 *    且其仓库 raw 地址对缺失/受限文件返回 HTML 页面，不能直接用作 feed）
 * 4. updater.ts 把解析出的 base URL 交给 electron-updater generic provider
 *
 * 发版时需把安装包与 latest*.yml 同时作为附件上传到两个平台的 Release
 *（附件 yml 中文件名为相对路径，相对 feed base 解析）。
 */

/** 可注入的最小 fetch 抽象（全局 fetch 结构上兼容） */
export interface FetchResponseLike {
  ok: boolean
  status: number
  headers: { get(name: string): string | null }
  json(): Promise<unknown>
}

export interface FetchInitLike {
  method?: string
  headers?: Record<string, string>
  signal?: AbortSignal
}

export type FetchLike = (url: string, init?: FetchInitLike) => Promise<FetchResponseLike>

/** 更新源端点集中定义（测试可整体替换） */
export interface FeedEndpoints {
  githubBase: string
  gitcodeApiLatest: string
  gitcodeDownloadBase: string
}

export const DEFAULT_ENDPOINTS: FeedEndpoints = {
  githubBase: 'https://github.com/pollybird/edge_tts_roles_electron/releases/latest/download/',
  gitcodeApiLatest:
    'https://api.gitcode.com/api/v5/repos/pollybird/edge_tts_roles_electron/releases/latest',
  gitcodeDownloadBase: 'https://gitcode.com/pollybird/edge_tts_roles_electron/releases/download/'
}

export const DEFAULT_TIMEOUT_MS = 3500

/** 当前平台对应的更新清单文件名 */
export function getFeedFileName(platform: string = process.platform): string {
  switch (platform) {
    case 'darwin':
      return 'latest-mac.yml'
    case 'linux':
      return 'latest-linux.yml'
    default:
      return 'latest.yml'
  }
}

export interface ResolveFeedOptions {
  /** 当前平台的清单文件名（getFeedFileName()） */
  feedFile: string
  /** 注入 fetch（默认用全局 fetch）；单测传入 mock 即可模拟各源响应 */
  fetchImpl?: FetchLike
  /** 覆盖默认端点（测试用） */
  endpoints?: Partial<FeedEndpoints>
  /** 单次探测超时（毫秒） */
  timeoutMs?: number
  /** 诊断日志（默认 console.log） */
  log?: (message: string) => void
}

interface FeedContext {
  feedFile: string
  fetchImpl: FetchLike
  endpoints: FeedEndpoints
  timeoutMs: number
  log: (message: string) => void
}

function buildContext(options: ResolveFeedOptions): FeedContext {
  return {
    feedFile: options.feedFile,
    fetchImpl: options.fetchImpl ?? ((url, init) => fetch(url, init as RequestInit)),
    endpoints: { ...DEFAULT_ENDPOINTS, ...options.endpoints },
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    log: options.log ?? ((msg) => console.log(msg))
  }
}

/** 探测 URL 是否可达且返回的是 YAML 而非 HTML 错误页 */
export async function probeUrl(
  url: string,
  fetchImpl: FetchLike,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<boolean> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetchImpl(url, {
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
export async function resolveGitCodeFeedUrl(options: ResolveFeedOptions): Promise<string | null> {
  const ctx = buildContext(options)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ctx.timeoutMs)
  let tag: string | undefined
  try {
    const res = await ctx.fetchImpl(ctx.endpoints.gitcodeApiLatest, {
      signal: controller.signal
    })
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

  const base = `${ctx.endpoints.gitcodeDownloadBase}${tag}/`
  const ok = await probeUrl(base + ctx.feedFile, ctx.fetchImpl, ctx.timeoutMs)
  if (ok) {
    ctx.log(`[updater] GitHub feed unreachable, falling back to GitCode: ${base}`)
    return base
  }
  return null
}

/**
 * 选择可用的更新源：优先 GitHub Releases，失败回退 GitCode Release 附件。
 * 返回 electron-updater generic provider 需要的 base URL；若两者均不可达返回 null。
 */
export async function resolveFeedUrl(options: ResolveFeedOptions): Promise<string | null> {
  const ctx = buildContext(options)
  const githubFeed = ctx.endpoints.githubBase + ctx.feedFile
  const githubOk = await probeUrl(githubFeed, ctx.fetchImpl, ctx.timeoutMs)
  if (githubOk) {
    ctx.log(`[updater] using GitHub feed: ${ctx.endpoints.githubBase}`)
    return ctx.endpoints.githubBase
  }
  const gitcodeBase = await resolveGitCodeFeedUrl(options)
  if (gitcodeBase) return gitcodeBase
  ctx.log('[updater] neither GitHub nor GitCode feed reachable, skipping update check')
  return null
}
