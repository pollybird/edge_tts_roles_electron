import { describe, expect, it, vi } from 'vitest'
import {
  getFeedFileName,
  prefersGitCodeFirst,
  probeUrl,
  resolveFeedUrl,
  resolveGitCodeFeedUrl,
  type FetchLike
} from '../src/main/updateFeed'

/* ----------------------------- mock fetch 工具 ----------------------------- */

interface MockResponseSpec {
  status?: number
  ok?: boolean
  contentType?: string
  json?: unknown
}

type RouteValue = MockResponseSpec | Error

/** 按 URL 包含的关键片段路由的 mock fetch；同时记录全部请求 URL 供断言 */
function mockFetch(routes: Record<string, RouteValue>): {
  fetchImpl: FetchLike
  urls: string[]
} {
  const urls: string[] = []
  const fetchImpl: FetchLike = async (url) => {
    urls.push(url)
    for (const [key, spec] of Object.entries(routes)) {
      if (!url.includes(key)) continue
      if (spec instanceof Error) throw spec
      const status = spec.status ?? 200
      return {
        ok: spec.ok ?? (status >= 200 && status < 300),
        status,
        headers: {
          get: (name: string) =>
            name.toLowerCase() === 'content-type'
              ? (spec.contentType ?? 'application/octet-stream')
              : null
        },
        json: async () => spec.json
      }
    }
    throw new Error(`unexpected URL in mock fetch: ${url}`)
  }
  return { fetchImpl, urls }
}

/** 用互不混淆的测试端点，避免 github/gitcode 域名片段互相匹配 */
const TEST_ENDPOINTS = {
  githubBase: 'https://gh.test/latest/',
  gitcodeApiLatest: 'https://api.gc.test/releases/latest',
  gitcodeDownloadBase: 'https://dl.gc.test/releases/download/'
}

const silentLog = vi.fn()

describe('getFeedFileName', () => {
  it('按平台返回对应清单文件名，未知平台按 Windows 处理', () => {
    expect(getFeedFileName('win32')).toBe('latest.yml')
    expect(getFeedFileName('darwin')).toBe('latest-mac.yml')
    expect(getFeedFileName('linux')).toBe('latest-linux.yml')
    expect(getFeedFileName('aix')).toBe('latest.yml')
  })
})

describe('probeUrl', () => {
  it('200 且非 HTML 内容视为可达', async () => {
    const { fetchImpl } = mockFetch({ 'gh.test': { contentType: 'application/octet-stream' } })
    expect(await probeUrl('https://gh.test/latest.yml', fetchImpl, 1000)).toBe(true)
  })

  it('206 / 416（Range 探测常见响应）视为可达', async () => {
    const ok206 = mockFetch({ x: { status: 206 } })
    const ok416 = mockFetch({ x: { status: 416, ok: false } })
    expect(await probeUrl('https://x.test/a', ok206.fetchImpl, 1000)).toBe(true)
    expect(await probeUrl('https://x.test/a', ok416.fetchImpl, 1000)).toBe(true)
  })

  it('404 / 5xx 视为不可达', async () => {
    const notFound = mockFetch({ x: { status: 404, ok: false } })
    const serverError = mockFetch({ x: { status: 500, ok: false } })
    expect(await probeUrl('https://x.test/a', notFound.fetchImpl, 1000)).toBe(false)
    expect(await probeUrl('https://x.test/a', serverError.fetchImpl, 1000)).toBe(false)
  })

  it('200 + text/html（站点错误页/登录页）视为不可达', async () => {
    const html = mockFetch({ x: { contentType: 'text/html; charset=utf-8' } })
    expect(await probeUrl('https://x.test/a', html.fetchImpl, 1000)).toBe(false)
  })

  it('网络异常（拒绝连接/超时）视为不可达', async () => {
    const broken = mockFetch({ x: new Error('network down') })
    expect(await probeUrl('https://x.test/a', broken.fetchImpl, 1000)).toBe(false)
  })
})

describe('resolveFeedUrl - 路径一：GitHub 优先', () => {
  it('GitHub 清单可达时直接使用 GitHub，且完全不访问 GitCode', async () => {
    const { fetchImpl, urls } = mockFetch({
      'gh.test': { contentType: 'application/octet-stream' },
      'gc.test': { status: 500, ok: false }
    })
    const base = await resolveFeedUrl({
      feedFile: 'latest.yml',
      fetchImpl,
      endpoints: TEST_ENDPOINTS,
      timeoutMs: 1000,
      log: silentLog
    })
    expect(base).toBe(TEST_ENDPOINTS.githubBase)
    expect(urls).toEqual(['https://gh.test/latest/latest.yml'])
    expect(urls.some((u) => u.includes('gc.test'))).toBe(false)
  })
})

describe('resolveFeedUrl - 路径二：GitHub 失败回退 GitCode', () => {
  it('GitHub 404 → GitCode API 取 tag → 附件清单可达，返回带 tag 的 feed base', async () => {
    const { fetchImpl, urls } = mockFetch({
      'gh.test': { status: 404, ok: false },
      'api.gc.test': { json: { tag_name: 'v9.9.9' } },
      'dl.gc.test': { contentType: 'application/octet-stream' }
    })
    const base = await resolveFeedUrl({
      feedFile: 'latest-mac.yml',
      fetchImpl,
      endpoints: TEST_ENDPOINTS,
      timeoutMs: 1000,
      log: silentLog
    })
    expect(base).toBe('https://dl.gc.test/releases/download/v9.9.9/')
    expect(urls).toEqual([
      'https://gh.test/latest/latest-mac.yml',
      'https://api.gc.test/releases/latest',
      'https://dl.gc.test/releases/download/v9.9.9/latest-mac.yml'
    ])
  })

  it('GitHub 返回 HTML 错误页时同样回退到 GitCode', async () => {
    const { fetchImpl } = mockFetch({
      'gh.test': { contentType: 'text/html; charset=UTF-8' },
      'api.gc.test': { json: { tag_name: 'v2.0.2' } },
      'dl.gc.test': {}
    })
    const base = await resolveFeedUrl({
      feedFile: 'latest-linux.yml',
      fetchImpl,
      endpoints: TEST_ENDPOINTS,
      timeoutMs: 1000,
      log: silentLog
    })
    expect(base).toBe('https://dl.gc.test/releases/download/v2.0.2/')
  })

  it('resolveGitCodeFeedUrl 可单独调用', async () => {
    const { fetchImpl } = mockFetch({
      'api.gc.test': { json: { tag_name: 'v1.2.3' } },
      'dl.gc.test': {}
    })
    const base = await resolveGitCodeFeedUrl({
      feedFile: 'latest.yml',
      fetchImpl,
      endpoints: TEST_ENDPOINTS,
      timeoutMs: 1000,
      log: silentLog
    })
    expect(base).toBe('https://dl.gc.test/releases/download/v1.2.3/')
  })
})

describe('resolveFeedUrl - 路径三：双源均失败', () => {
  it('GitHub 404 且 GitCode API 5xx → null', async () => {
    const { fetchImpl } = mockFetch({
      'gh.test': { status: 404, ok: false },
      'api.gc.test': { status: 500, ok: false }
    })
    expect(
      await resolveFeedUrl({
        feedFile: 'latest.yml',
        fetchImpl,
        endpoints: TEST_ENDPOINTS,
        timeoutMs: 1000,
        log: silentLog
      })
    ).toBeNull()
  })

  it('GitHub 404 且 GitCode API 抛网络异常 → null', async () => {
    const { fetchImpl } = mockFetch({
      'gh.test': { status: 404, ok: false },
      'api.gc.test': new Error('connect ETIMEDOUT')
    })
    expect(
      await resolveFeedUrl({
        feedFile: 'latest.yml',
        fetchImpl,
        endpoints: TEST_ENDPOINTS,
        timeoutMs: 1000,
        log: silentLog
      })
    ).toBeNull()
  })

  it('GitCode API 返回中没有 tag_name → null', async () => {
    const { fetchImpl, urls } = mockFetch({
      'gh.test': { status: 404, ok: false },
      'api.gc.test': { json: {} }
    })
    expect(
      await resolveFeedUrl({
        feedFile: 'latest.yml',
        fetchImpl,
        endpoints: TEST_ENDPOINTS,
        timeoutMs: 1000,
        log: silentLog
      })
    ).toBeNull()
    // 无 tag 时不应继续探测附件
    expect(urls.some((u) => u.includes('dl.gc.test'))).toBe(false)
  })

  it('API 拿到 tag 但附件清单 404 → null', async () => {
    const { fetchImpl } = mockFetch({
      'gh.test': { status: 404, ok: false },
      'api.gc.test': { json: { tag_name: 'v9.9.9' } },
      'dl.gc.test': { status: 404, ok: false }
    })
    expect(
      await resolveFeedUrl({
        feedFile: 'latest.yml',
        fetchImpl,
        endpoints: TEST_ENDPOINTS,
        timeoutMs: 1000,
        log: silentLog
      })
    ).toBeNull()
  })

  it('API 拿到 tag 但附件地址返回 HTML 页面 → null', async () => {
    const { fetchImpl } = mockFetch({
      'gh.test': { status: 404, ok: false },
      'api.gc.test': { json: { tag_name: 'v9.9.9' } },
      'dl.gc.test': { contentType: 'text/html' }
    })
    expect(
      await resolveFeedUrl({
        feedFile: 'latest.yml',
        fetchImpl,
        endpoints: TEST_ENDPOINTS,
        timeoutMs: 1000,
        log: silentLog
      })
    ).toBeNull()
  })
})

describe('prefersGitCodeFirst', () => {
  it('简体中文区域返回 true（zh-CN / zh-Hans*，大小写不敏感）', () => {
    expect(prefersGitCodeFirst('zh-CN')).toBe(true)
    expect(prefersGitCodeFirst('ZH-CN')).toBe(true)
    expect(prefersGitCodeFirst('zh-Hans-CN')).toBe(true)
    expect(prefersGitCodeFirst('zh-hans')).toBe(true)
  })

  it('繁体区域与非中文语言返回 false', () => {
    expect(prefersGitCodeFirst('zh-TW')).toBe(false)
    expect(prefersGitCodeFirst('zh-HK')).toBe(false)
    expect(prefersGitCodeFirst('zh-MO')).toBe(false)
    expect(prefersGitCodeFirst('zh-Hant-TW')).toBe(false)
    expect(prefersGitCodeFirst('en-US')).toBe(false)
    expect(prefersGitCodeFirst('ja-JP')).toBe(false)
    expect(prefersGitCodeFirst('')).toBe(false)
  })
})

describe('resolveFeedUrl - gitCodeFirst：GitCode 优先', () => {
  it('GitCode 可达时直接使用 GitCode，且完全不访问 GitHub', async () => {
    const { fetchImpl, urls } = mockFetch({
      'gh.test': { status: 500, ok: false },
      'api.gc.test': { json: { tag_name: 'v2.0.5' } },
      'dl.gc.test': { contentType: 'application/octet-stream' }
    })
    const base = await resolveFeedUrl({
      feedFile: 'latest.yml',
      fetchImpl,
      endpoints: TEST_ENDPOINTS,
      timeoutMs: 1000,
      gitCodeFirst: true,
      log: silentLog
    })
    expect(base).toBe('https://dl.gc.test/releases/download/v2.0.5/')
    expect(urls).toEqual([
      'https://api.gc.test/releases/latest',
      'https://dl.gc.test/releases/download/v2.0.5/latest.yml'
    ])
  })

  it('GitCode 优先但不可达时回退 GitHub', async () => {
    const { fetchImpl, urls } = mockFetch({
      'gh.test': { contentType: 'application/octet-stream' },
      'api.gc.test': { status: 500, ok: false }
    })
    const base = await resolveFeedUrl({
      feedFile: 'latest.yml',
      fetchImpl,
      endpoints: TEST_ENDPOINTS,
      timeoutMs: 1000,
      gitCodeFirst: true,
      log: silentLog
    })
    expect(base).toBe(TEST_ENDPOINTS.githubBase)
    expect(urls).toEqual([
      'https://api.gc.test/releases/latest',
      'https://gh.test/latest/latest.yml'
    ])
  })

  it('GitCode 优先且附件清单为 HTML 错误页 → 回退 GitHub', async () => {
    const { fetchImpl, urls } = mockFetch({
      'gh.test': { contentType: 'application/octet-stream' },
      'api.gc.test': { json: { tag_name: 'v2.0.5' } },
      'dl.gc.test': { contentType: 'text/html; charset=utf-8' }
    })
    const base = await resolveFeedUrl({
      feedFile: 'latest.yml',
      fetchImpl,
      endpoints: TEST_ENDPOINTS,
      timeoutMs: 1000,
      gitCodeFirst: true,
      log: silentLog
    })
    expect(base).toBe(TEST_ENDPOINTS.githubBase)
    expect(urls).toEqual([
      'https://api.gc.test/releases/latest',
      'https://dl.gc.test/releases/download/v2.0.5/latest.yml',
      'https://gh.test/latest/latest.yml'
    ])
  })
})
