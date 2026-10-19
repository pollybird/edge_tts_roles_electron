import { describe, expect, it } from 'vitest'
import { parseSystemProxyString } from '../src/main/tts/cloud/proxy'

describe('parseSystemProxyString（系统代理 PAC 结果解析）', () => {
  it('PROXY 条目解析为 http 代理', () => {
    expect(parseSystemProxyString('PROXY 127.0.0.1:1081')).toEqual({
      protocol: 'http',
      host: '127.0.0.1',
      port: 1081
    })
  })

  it('SOCKS5 与 SOCKS 条目解析为 socks5 代理', () => {
    expect(parseSystemProxyString('SOCKS5 192.168.1.1:1080')).toEqual({
      protocol: 'socks5',
      host: '192.168.1.1',
      port: 1080
    })
    expect(parseSystemProxyString('SOCKS proxy.local:7890')).toEqual({
      protocol: 'socks5',
      host: 'proxy.local',
      port: 7890
    })
  })

  it('HTTPS 条目按 http 代理处理', () => {
    expect(parseSystemProxyString('HTTPS secure.proxy:8443')).toEqual({
      protocol: 'http',
      host: 'secure.proxy',
      port: 8443
    })
  })

  it('多条目取第一个非 DIRECT 条目（大小写不敏感）', () => {
    expect(parseSystemProxyString('DIRECT; PROXY proxy.local:8080; DIRECT')).toEqual({
      protocol: 'http',
      host: 'proxy.local',
      port: 8080
    })
    expect(parseSystemProxyString('direct; SOCKS5 127.0.0.1:1080')).toEqual({
      protocol: 'socks5',
      host: '127.0.0.1',
      port: 1080
    })
  })

  it('纯 DIRECT 或空串或畸形条目返回 null（视为直连）', () => {
    expect(parseSystemProxyString('DIRECT')).toBeNull()
    expect(parseSystemProxyString('')).toBeNull()
    expect(parseSystemProxyString('PROXY no-port')).toBeNull()
    expect(parseSystemProxyString('PROXY :8080')).toBeNull()
  })
})
