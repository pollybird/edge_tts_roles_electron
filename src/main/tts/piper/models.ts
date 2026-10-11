import { app } from 'electron'
import { createWriteStream } from 'fs'
import { mkdir, rm, stat } from 'fs/promises'
import { statSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { Readable, Transform } from 'stream'
import { pipeline } from 'stream/promises'

/** Piper 语音模型定义（见 catalog.ts：官方 voices.json 多语言精选目录） */
export type { PiperVoiceDef } from './catalog'
export { PIPER_VOICES } from './catalog'
import { PIPER_VOICES, type PiperVoiceDef } from './catalog'

/** 模型下载镜像（按序尝试；hf-mirror.com 为大陆可达镜像，官方 HF 回退） */
export const PIPER_MIRRORS = ['https://hf-mirror.com', 'https://huggingface.co']

const VOICES_REPO = '/rhasspy/piper-voices/resolve/main/'

/** 构造模型/配置在指定镜像上的下载地址 */
export function voiceDownloadUrl(
  mirror: string,
  voice: PiperVoiceDef,
  suffix: '.onnx' | '.onnx.json'
): string {
  return `${mirror}${VOICES_REPO}${voice.path}${suffix}`
}

/** Edge 音色代号 → Piper 模型 ID（按 edgePrefixes 前缀匹配，长前缀优先） */
export function resolvePiperVoiceId(edgeVoice: string): string | null {
  if (!edgeVoice) return null
  const candidates = PIPER_VOICES.filter((v) =>
    v.edgePrefixes.some((p) => edgeVoice.startsWith(p))
  ).sort(
    (a, b) =>
      Math.max(...b.edgePrefixes.map((p) => p.length)) -
      Math.max(...a.edgePrefixes.map((p) => p.length))
  )
  return candidates[0]?.id ?? null
}

export interface DownloadProgress {
  /** 已下载字节数 */
  received: number
  /** 总字节数（响应未提供 content-length 时为 0） */
  total: number
}

/**
 * Piper 模型管理器：模型目录定位、下载（镜像回退 + 进度）、删除。
 * 模型目录在 Electron 下为 userData/piper-voices，纯 Node（测试）为注入目录或 tmpdir。
 */
export class PiperModelManager {
  private dir: string | null = null

  constructor(private readonly baseDir?: string) {}

  modelDir(): string {
    if (this.dir) return this.dir
    if (this.baseDir) {
      this.dir = this.baseDir
      return this.dir
    }
    try {
      // 纯 Node（测试）环境下 electron 顶层 import 退化为路径字符串，app 为 undefined
      if (app && typeof app.getPath === 'function') {
        this.dir = join(app.getPath('userData'), 'piper-voices')
        return this.dir
      }
    } catch {
      // 非 Electron 运行时
    }
    this.dir = join(tmpdir(), 'edge-tts-piper-voices')
    return this.dir
  }

  byId(id: string): PiperVoiceDef | null {
    return PIPER_VOICES.find((v) => v.id === id) ?? null
  }

  modelPath(id: string): string {
    return join(this.modelDir(), `${id}.onnx`)
  }

  configPath(id: string): string {
    return join(this.modelDir(), `${id}.onnx.json`)
  }

  async isDownloaded(id: string): Promise<boolean> {
    try {
      await stat(this.modelPath(id))
      return true
    } catch {
      return false
    }
  }

  /** 同步版 isDownloaded（合成路径触发兜底时使用，一次 stat 开销可忽略） */
  isDownloadedSync(id: string): boolean {
    try {
      statSync(this.modelPath(id))
      return true
    } catch {
      return false
    }
  }

  /**
   * 下载模型（.onnx + .onnx.json）：按镜像顺序尝试，任一镜像成功即完成。
   * 下限校验：.onnx 小于声明体积的一半视为无效响应（镜像错误页）。
   */
  async download(id: string, onProgress?: (p: DownloadProgress) => void): Promise<void> {
    const voice = this.byId(id)
    if (!voice) throw new Error(`unknown piper voice: ${id}`)
    await mkdir(this.modelDir(), { recursive: true })
    await this.downloadFile(voice, '.onnx.json', onProgress)
    await this.downloadFile(voice, '.onnx', onProgress)
  }

  private async downloadFile(
    voice: PiperVoiceDef,
    suffix: '.onnx' | '.onnx.json',
    onProgress?: (p: DownloadProgress) => void
  ): Promise<void> {
    let lastErr: unknown
    for (const mirror of PIPER_MIRRORS) {
      try {
        const res = await fetch(voiceDownloadUrl(mirror, voice, suffix))
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} from ${mirror}`)
        const expectedMin = suffix === '.onnx' ? (voice.sizeMB / 2) * 1024 * 1024 : 1024
        const total = Number(res.headers.get('content-length') ?? 0)
        let received = 0
        const counter = new Transform({
          transform(chunk: Buffer, _enc, cb) {
            received += chunk.length
            onProgress?.({ received, total })
            cb(null, chunk)
          }
        })
        // 落盘目标：modelPath/configPath 已含扩展名，不得再拼 suffix（回归：曾写成 <id>.onnx.onnx
        // 导致 isDownloaded 检查的 <id>.onnx 永远不存在，界面始终显示未下载）
        const target = suffix === '.onnx' ? this.modelPath(voice.id) : this.configPath(voice.id)
        await pipeline(
          Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]),
          counter,
          createWriteStream(target)
        )
        const info = await stat(target)
        if (info.size < expectedMin) throw new Error(`file too small: ${info.size} bytes`)
        return
      } catch (err) {
        lastErr = err
      }
    }
    throw new Error(
      `piper voice download failed: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`
    )
  }

  async remove(id: string): Promise<void> {
    await rm(this.modelPath(id), { force: true })
    await rm(this.configPath(id), { force: true })
  }
}
