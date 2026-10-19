import { writeFile } from 'fs/promises'
import { createT } from '../../../shared/i18n'
import type {
  SynthesisOutcome,
  TTSProvider,
  TtsSegmentRequest,
  TtsSynthesisHooks
} from '../provider/types'

/** 数值夹取到 [min, max] */
function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

/**
 * Google Cloud Text-to-Speech Provider（REST text:synthesize 接口）：
 * 服务端一次性返回 base64 编码的完整 WAV（LINEAR16 / 24kHz），解码后
 * 直接写入 outPath，由调用方走现有 decodeAudioToPcm 路径解码，
 * 因此不实现 synthesizeRaw 直通模式。
 *
 * 与 Edge / Piper Provider 的语义差异（调用方 SegmentSynthesizer 已天然兼容）：
 * - 云端一次性返回完整音频，不存在「服务端提前截断」，
 *   complete 恒为 true、serverEndMs 为 -1、spokenTail 为空字符串；
 * - 发音人由构造参数固定（voiceName + languageCode），忽略 req.voice；
 * - rate / pitch / volume 按下方映射换算为 Google 的物理单位。
 */
export class GoogleProvider implements TTSProvider {
  readonly name = 'google'

  constructor(
    private readonly options: {
      /** Google Cloud API Key（query 参数 key 传递） */
      apiKey: string
      /** 发音人全名，如 en-US-Studio-O、cmn-CN-Wavenet-A */
      voiceName: string
      /** 语言代码（须与 voiceName 匹配），如 en-US */
      languageCode: string
      /** HTTP 请求实现（工厂注入 cloudFetch 以支持代理；缺省用全局 fetch） */
      fetchImpl?: (url: string, init?: RequestInit) => Promise<Response>
    }
  ) {}

  async synthesizeSegment(
    req: TtsSegmentRequest,
    outPath: string,
    _hooks: TtsSynthesisHooks,
    isStopped: () => boolean
  ): Promise<SynthesisOutcome> {
    // 用户已点停止时不再发起请求
    if (isStopped()) throw new Error('stopped')

    // ── 参数映射（本应用的 Edge 风格偏移量 → Google 物理单位）──
    // rate 百分比偏移 -100~+100 → speakingRate 倍率，官方允许 0.25~4
    const speakingRate = clamp((100 + req.rate) / 100, 0.25, 4)
    // Google 官方 pitch 单位是半音（semitone），本应用音调偏移是 Hz，
    // 0.06 为 Hz → 半音的近似换算系数，夹取到官方允许范围 ±20 半音
    const pitch = clamp(req.pitch * 0.06, -20, 20)
    // volume 百分比偏移 → 增益分贝 20*log10((100+v)/100)，官方允许 -96~16 dB；
    // v <= -99 时直接取 -96：log10(0) 为 -Infinity，需防止产生非法值
    let volumeGainDb: number
    if (req.volume <= -99) {
      volumeGainDb = -96
    } else {
      volumeGainDb = clamp(20 * Math.log10((100 + req.volume) / 100), -96, 16)
    }

    const response = await (this.options.fetchImpl ?? fetch)(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.options.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: req.text },
          voice: {
            languageCode: this.options.languageCode,
            name: this.options.voiceName
          },
          audioConfig: {
            audioEncoding: 'LINEAR16',
            speakingRate,
            pitch,
            volumeGainDb
          }
        }),
        // 30 秒硬超时，防网络挂起阻塞合成队列
        signal: AbortSignal.timeout(30_000)
      }
    )

    if (!response.ok) {
      // 错误正文截断 200 字符，避免超长 HTML 错误页刷屏日志
      const body = (await response.text().catch(() => '')).slice(0, 200)
      throw new Error(createT()('cloud.googleFailed', { msg: `${response.status} ${body}` }))
    }

    // audioContent 为 base64 编码的完整 WAV 文件
    const data = (await response.json()) as { audioContent?: string }
    const wav = Buffer.from(data.audioContent ?? '', 'base64')
    await writeFile(outPath, wav)
    return { complete: true, serverEndMs: -1, spokenTail: '' }
  }
}
