import { listVoices as edgeListVoices } from 'edge-tts-universal'
import type { VoiceInfo } from '../../shared/types'

/**
 * Edge TTS 可用语音目录：从服务端拉取一次后在进程内缓存，
 * 只暴露 UI 需要的四个字段（shortName / friendlyName / locale / gender）。
 */
export class VoiceCatalog {
  private cache: VoiceInfo[] | null = null

  async list(): Promise<VoiceInfo[]> {
    if (this.cache) return this.cache
    const voices = await edgeListVoices()
    this.cache = voices.map((v) => ({
      shortName: v.ShortName,
      friendlyName: v.FriendlyName,
      locale: v.Locale,
      gender: v.Gender
    }))
    return this.cache
  }
}
