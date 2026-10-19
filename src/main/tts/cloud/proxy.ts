import { Agent, ProxyAgent, fetch as undiciFetch } from 'undici'
import type { Dispatcher, RequestInit as UndiciRequestInit } from 'undici'
import tls from 'node:tls'
import { SocksClient } from 'socks'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { SocksProxyAgent } from 'socks-proxy-agent'
import type { Agent as HttpAgent } from 'node:http'
import { DEFAULT_CLOUD_PROXY } from '../../../shared/types'
import type { CloudProxySettings } from '../../../shared/types'

/**
 * 云服务商网络代理（设置→语音服务 对话框「网络代理」区块维护）：
 * - direct：不经过代理（全局 fetch / 裸 WebSocket）；
 * - system：经 Electron session.resolveProxy 探测系统代理并解析 PAC 结果
 *   （PROXY → HTTP 代理；SOCKS/SOCKS5 → SOCKS5 代理）；
 * - custom：用户自定义 SOCKS5 / HTTP 代理服务器。
 *
 * HTTP 请求（Google REST、火山 v3 POST）经 undici dispatcher 走代理；
 * WebSocket（讯飞）经 node http Agent（https-proxy-agent / socks-proxy-agent）走代理。
 * 解析结果按设置内容做 30 秒缓存，避免每个语音分段都重复探测系统代理。
 */

/** 缓存有效期内复用的解析结果（键为设置 JSON 快照） */
const CACHE_TTL_MS = 30_000
let cache: { key: string; dispatcher?: Dispatcher; wsAgent?: HttpAgent; at: number } | null = null

/**
 * 解析 Electron resolveProxy 的 PAC 结果串（如 "PROXY 127.0.0.1:1081; DIRECT"）：
 * 取第一个非 DIRECT 条目；PROXY/HTTPS → http 代理，SOCKS/SOCKS5 → socks5 代理。
 * 无代理条目返回 null。此函数为纯函数，便于单元测试。
 */
export function parseSystemProxyString(
  pacResult: string
): { protocol: 'http' | 'socks5'; host: string; port: number } | null {
  for (const entry of pacResult.split(';')) {
    const m = entry.trim().match(/^(PROXY|HTTPS|SOCKS5?|DIRECT)\s+([\w.[\]-]+):(\d+)$/i)
    if (!m) continue
    const scheme = m[1]?.toUpperCase()
    if (scheme === 'DIRECT') continue
    return {
      protocol: scheme === 'PROXY' || scheme === 'HTTPS' ? 'http' : 'socks5',
      host: m[2] ?? '',
      port: Number(m[3])
    }
  }
  return null
}

/** 读取代理设置（缺省/损坏时回退默认值） */
async function readProxySettings(): Promise<CloudProxySettings> {
  try {
    const { getSetting } = await import('../../settings')
    const saved = getSetting('cloudProxy') as Partial<CloudProxySettings> | undefined
    if (!saved || typeof saved !== 'object') return DEFAULT_CLOUD_PROXY
    return {
      mode: saved.mode === 'system' || saved.mode === 'custom' ? saved.mode : 'direct',
      protocol: saved.protocol === 'http' ? 'http' : 'socks5',
      host: typeof saved.host === 'string' ? saved.host : '',
      port:
        Number.isInteger(saved.port) && (saved.port as number) > 0 ? (saved.port as number) : 1080
    }
  } catch {
    return DEFAULT_CLOUD_PROXY
  }
}

/** system 模式：经 Electron 会话探测系统代理（无 PAC / 直连环境返回 null） */
async function resolveSystemProxy(): Promise<{
  protocol: 'http' | 'socks5'
  host: string
  port: number
} | null> {
  try {
    const electron = (await import('electron')) as unknown as {
      session: { defaultSession: { resolveProxy: (url: string) => Promise<string> } }
    }
    const pac = await electron.session.defaultSession.resolveProxy(
      'https://tts.cloud-check.invalid/'
    )
    return parseSystemProxyString(pac)
  } catch {
    return null
  }
}

/** 计算生效的代理配置（direct → null；system → 探测；custom → 设置值，host 为空视为直连） */
async function resolveEffectiveProxy(): Promise<{
  protocol: 'http' | 'socks5'
  host: string
  port: number
} | null> {
  const settings = await readProxySettings()
  if (settings.mode === 'direct') return null
  if (settings.mode === 'system') return resolveSystemProxy()
  if (!settings.host.trim()) return null
  return { protocol: settings.protocol, host: settings.host.trim(), port: settings.port }
}

/** 构造 undici dispatcher：HTTP 代理用 ProxyAgent，SOCKS5 用自定义 connect（socks 握手 + TLS 升级） */
function buildDispatcher(p: {
  protocol: 'http' | 'socks5'
  host: string
  port: number
}): Dispatcher {
  if (p.protocol === 'http') {
    return new ProxyAgent(`http://${p.host}:${p.port}`)
  }
  return new Agent({
    // undici connector 回调签名为 ([Error, null] | [null, Socket]) 元组，
    // 此处为可读性用自定义签名实现，整函数按 undici 期望类型断言接入
    connect: makeSocksTunnelConnector(p) as unknown as NonNullable<Agent.Options['connect']>
  })
}

/** SOCKS5 隧道连接器工厂：闭包持有代理配置，握手后按目标协议决定是否 TLS 升级 */
function makeSocksTunnelConnector(p: {
  protocol: 'http' | 'socks5'
  host: string
  port: number
}): (
  opts: { hostname: string; port: number | string; protocol: string },
  callback: (err: Error | null, socket?: unknown) => void
) => void {
  return (opts, callback) => {
    void (async () => {
      try {
        const { socket } = await SocksClient.createConnection({
          proxy: { host: p.host, port: p.port, type: 5 },
          command: 'connect',
          destination: { host: opts.hostname, port: Number(opts.port) }
        })
        // https 目标需在 SOCKS 隧道之上手动完成 TLS 握手（servername 取目标主机名）
        if (opts.protocol === 'https:') {
          const tlsSocket = tls.connect({ socket, servername: opts.hostname }, () =>
            callback(null, tlsSocket)
          )
          tlsSocket.once('error', (err: Error) => callback(err))
        } else {
          callback(null, socket)
        }
      } catch (err) {
        callback(err instanceof Error ? err : new Error(String(err)))
      }
    })()
  }
}

/** 构造 WebSocket（node http）代理 agent：HTTP 代理与 SOCKS5 各用对应实现 */
function buildWsAgent(p: { protocol: 'http' | 'socks5'; host: string; port: number }): HttpAgent {
  return p.protocol === 'http'
    ? (new HttpsProxyAgent(`http://${p.host}:${p.port}`) as unknown as HttpAgent)
    : (new SocksProxyAgent(`socks5://${p.host}:${p.port}`) as unknown as HttpAgent)
}

/** 取（带缓存的）代理派发对象与 WebSocket agent；直连时两者均为 undefined */
async function resolveProxies(): Promise<{ dispatcher?: Dispatcher; wsAgent?: HttpAgent }> {
  const settings = await readProxySettings()
  const key = JSON.stringify(settings)
  if (cache && cache.key === key && Date.now() - cache.at < CACHE_TTL_MS) {
    return { dispatcher: cache.dispatcher, wsAgent: cache.wsAgent }
  }
  const effective = await resolveEffectiveProxy()
  cache = {
    key,
    dispatcher: effective ? buildDispatcher(effective) : undefined,
    wsAgent: effective ? buildWsAgent(effective) : undefined,
    at: Date.now()
  }
  return { dispatcher: cache.dispatcher, wsAgent: cache.wsAgent }
}

/**
 * 云服务商 HTTP 请求统一入口：签名与全局 fetch 一致。
 * 有代理时经 undici fetch + dispatcher 走代理，直连时直接用全局 fetch
 * （保持与各 Provider 测试里 stub 的全局 fetch 行为一致）。
 */
export async function cloudFetch(url: string, init?: RequestInit): Promise<Response> {
  const { dispatcher } = await resolveProxies()
  if (!dispatcher) return fetch(url, init)
  const res = await undiciFetch(url, {
    ...(init as UndiciRequestInit),
    dispatcher
  } as UndiciRequestInit)
  return res as unknown as Response
}

/** 云服务商 WebSocket 连接的代理 agent（直连返回 undefined，ws 不传 agent 选项） */
export async function cloudWsAgent(): Promise<HttpAgent | undefined> {
  const { wsAgent } = await resolveProxies()
  return wsAgent
}

/** 仅供测试：清空代理解析缓存 */
export function resetProxyCacheForTest(): void {
  cache = null
}
