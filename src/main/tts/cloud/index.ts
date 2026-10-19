import { rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { createT } from '../../../shared/i18n'
import { CLOUD_PROVIDER_IDS, createDefaultCloudProviders } from '../../../shared/types'
import type {
  CloudProviderId,
  CloudProvidersSettings,
  CloudTestResult,
  CloudVoiceInfo,
  CloudVoicesPayload,
  GoogleProviderSettings,
  VolcProviderSettings,
  XfyunProviderSettings
} from '../../../shared/types'
import type { TTSProvider } from '../provider/types'
import { getSetting } from '../../settings'
import { GoogleProvider } from './googleProvider'
import { VolcProvider } from './volcProvider'
import { VOLC_VOICES } from './volcCatalog'
import { XfyunProvider } from './xfyunProvider'
import { XFYUN_VOICES } from './xfyunCatalog'
import { cloudFetch, cloudWsAgent } from './proxy'

/** 云服务商 HTTP 请求统一走代理感知实现（直连模式下等价于全局 fetch） */
const proxiedFetch = (url: string, init?: RequestInit): Promise<Response> => cloudFetch(url, init)

/** 云服务商合成重试次数（付费 API，不像 Edge 免费服务那样激进重试） */
export const CLOUD_MAX_ATTEMPTS = 3

/**
 * 解析云音色 id（`google:<name>` / `xfyun:<vcn>` / `volc:<voiceType>` 前缀命名，
 * 与 piper:<modelId> 同构）；非云前缀返回 null，由 Edge/Piper 路径处理。
 */
export function parseCloudVoice(
  voice: string
): { provider: CloudProviderId; bareId: string } | null {
  const idx = voice.indexOf(':')
  if (idx <= 0) return null
  const provider = voice.slice(0, idx)
  if (!CLOUD_PROVIDER_IDS.includes(provider as CloudProviderId)) return null
  return { provider: provider as CloudProviderId, bareId: voice.slice(idx + 1) }
}

/** 按服务商与裸音色 id 构造 provider 实例；未启用或凭据不完整返回 null */
export function createCloudSynth(
  provider: CloudProviderId,
  bareId: string,
  creds: CloudProvidersSettings = getCloudProviders()
): TTSProvider | null {
  const conf = creds[provider]
  if (!conf?.enabled) return null
  switch (provider) {
    case 'google': {
      const g = conf as GoogleProviderSettings
      if (!g.apiKey || !bareId) return null
      // languageCode 取音色名前两段（en-US-Studio-O → en-US）
      const languageCode = bareId.split('-').slice(0, 2).join('-')
      return new GoogleProvider({
        apiKey: g.apiKey,
        voiceName: bareId,
        languageCode,
        fetchImpl: proxiedFetch
      })
    }
    case 'xfyun': {
      const x = conf as XfyunProviderSettings
      if (!x.appId || !x.apiKey || !x.apiSecret || !bareId) return null
      return new XfyunProvider({
        appId: x.appId,
        apiKey: x.apiKey,
        apiSecret: x.apiSecret,
        vcn: bareId,
        wsAgentProvider: cloudWsAgent
      })
    }
    case 'volc': {
      const v = conf as VolcProviderSettings
      if (!v.appId || !v.apiKey || !bareId) return null
      return new VolcProvider({
        appId: v.appId,
        apiKey: v.apiKey,
        voiceType: bareId,
        fetchImpl: proxiedFetch
      })
    }
  }
}

/** 读取云服务商设置（缺省时返回默认值，保证老配置文件平滑升级） */
function getCloudProviders(): CloudProvidersSettings {
  try {
    const saved = getSetting('cloudProviders')
    if (saved) return saved
  } catch {
    // 设置存储不可用时按未配置处理
  }
  return createDefaultCloudProviders()
}

/**
 * Google 音色清单运行时拉取（/v1/voices，10 秒超时）；
 * 讯飞/火山为静态目录（见 xfyunCatalog / volcCatalog）。
 */
async function fetchGoogleVoices(apiKey: string): Promise<CloudVoiceInfo[]> {
  const res = await proxiedFetch(
    `https://texttospeech.googleapis.com/v1/voices?key=${encodeURIComponent(apiKey)}`,
    { signal: AbortSignal.timeout(10_000) }
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = (await res.json()) as {
    voices?: { name: string; languageCodes?: string[]; ssmlGender?: string }[]
  }
  return (data.voices ?? []).map((v) => ({
    id: v.name,
    voiceName: v.name,
    langName: v.languageCodes?.[0] ?? '',
    gender: v.ssmlGender === 'FEMALE' ? 'female' : v.ssmlGender === 'MALE' ? 'male' : undefined
  }))
}

/** 汇总各云服务商可用音色；未启用 / 凭据不完整 / 拉取失败的服务商为 null（下拉不显示该分组） */
export async function getCloudVoices(): Promise<CloudVoicesPayload> {
  const creds = getCloudProviders()
  const payload: CloudVoicesPayload = { google: null, xfyun: null, volc: null }
  const g = creds.google
  if (g.enabled && g.apiKey) {
    try {
      const voices = await fetchGoogleVoices(g.apiKey)
      if (voices.length > 0) payload.google = voices
    } catch {
      payload.google = null
    }
  }
  const x = creds.xfyun
  if (x.enabled && x.appId && x.apiKey && x.apiSecret) payload.xfyun = XFYUN_VOICES
  const v = creds.volc
  if (v.enabled && v.appId && v.apiKey) payload.volc = VOLC_VOICES
  return payload
}

/** 连接测试用的微型合成文本 */
const TEST_TEXT = '你好'

/** 连接测试：用首个目录音色做一次微型合成（音频落临时文件后丢弃） */
export async function testCloudProvider(provider: CloudProviderId): Promise<CloudTestResult> {
  const t = createT()
  const creds = getCloudProviders()
  const conf = creds[provider]
  if (!conf?.enabled) return { ok: false, error: t('cloud.notConfigured') }
  const synth = createCloudSynth(provider, await firstBareVoice(provider), creds)
  if (!synth) return { ok: false, error: t('cloud.notConfigured') }
  const tmpPath = join(tmpdir(), `edge-tts-cloud-test-${process.pid}-${Date.now()}.wav`)
  try {
    await synth.synthesizeSegment(
      { text: TEST_TEXT, voice: '', rate: 0, volume: 0, pitch: 0 },
      tmpPath,
      {},
      () => false
    )
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  } finally {
    await rm(tmpPath, { force: true })
  }
}

/** 连接测试用的首个音色：讯飞/火山取静态目录首项，Google 取运行时清单首项（拉取失败回退常用音色） */
async function firstBareVoice(provider: CloudProviderId): Promise<string> {
  if (provider === 'xfyun') return XFYUN_VOICES[0]?.id ?? 'xiaoyan'
  if (provider === 'volc') return VOLC_VOICES[0]?.id ?? 'BV001_streaming'
  try {
    const g = getCloudProviders().google
    if (g?.apiKey) {
      const voices = await fetchGoogleVoices(g.apiKey)
      if (voices[0]?.id) return voices[0].id
    }
  } catch {
    // 清单拉取失败时用回退音色继续测试
  }
  return 'en-US-Standard-A'
}
