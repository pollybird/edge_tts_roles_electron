import { app } from 'electron'
import { createReadStream, createWriteStream, statSync } from 'fs'
import { mkdir, open, readFile, rename, rm, stat } from 'fs/promises'
import { createHash } from 'crypto'
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
  /** 本次是否为断点续传（true 表示检测到 .part 残留并从断点继续下载） */
  resuming?: boolean
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
   * 支持断点续传（.part 残留 + Range 请求）与完整性校验（md5Digest 优先、
   * 体积+魔数/JSON 首尾回退）。完成后原子改名 .part → 最终文件名。
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
    // 落盘目标：modelPath/configPath 已含扩展名，不得再拼 suffix（回归：曾写成 <id>.onnx.onnx
    // 导致 isDownloaded 检查的 <id>.onnx 永远不存在，界面始终显示未下载）
    const finalPath = suffix === '.onnx' ? this.modelPath(voice.id) : this.configPath(voice.id)
    const partPath = `${finalPath}.part`
    let lastErr: unknown
    for (const mirror of PIPER_MIRRORS) {
      try {
        // 续传起点：读取已存在的 .part 残留大小
        let existing = 0
        try {
          existing = (await stat(partPath)).size
        } catch {
          // 无残留，全新下载
        }
        const url = voiceDownloadUrl(mirror, voice, suffix)
        const res =
          existing > 0
            ? await fetch(url, { headers: { Range: `bytes=${existing}-` } })
            : await fetch(url)
        if (!res.ok || !res.body) {
          // 416 Range Not Satisfiable：镜像不支持或 .part 已是完整文件，删 .part 全量重试
          if (res.status === 416) {
            await rm(partPath, { force: true })
          }
          throw new Error(`HTTP ${res.status} from ${mirror}`)
        }
        let received = 0
        let total = 0
        let writeFlags: 'a' | 'w' = 'w'
        if (res.status === 206) {
          // 续传成功：追加写，received 从断点起算
          received = existing
          const range = res.headers.get('content-range')
          const m = range ? /\/(\d+)$/.exec(range) : null
          const remaining = Number(res.headers.get('content-length') ?? 0)
          total = m ? Number(m[1]) : existing + remaining
          writeFlags = 'a'
        } else {
          // 200：镜像不支持 Range 或本就无残留，全量覆盖
          total = Number(res.headers.get('content-length') ?? 0)
          writeFlags = 'w'
        }
        onProgress?.({ received, total, resuming: writeFlags === 'a' })
        const counter = new Transform({
          transform(chunk: Buffer, _enc, cb) {
            received += chunk.length
            onProgress?.({ received, total, resuming: writeFlags === 'a' })
            cb(null, chunk)
          }
        })
        await pipeline(
          Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]),
          counter,
          createWriteStream(partPath, { flags: writeFlags })
        )
        // 完整性校验：体积 + md5（优先）/ 魔数·JSON 首尾（回退）
        await this.verifyFile(partPath, suffix, voice, total)
        // 原子改名 .part → 最终文件名
        await rename(partPath, finalPath)
        return
      } catch (err) {
        lastErr = err
      }
    }
    throw new Error(
      `piper voice download failed: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`
    )
  }

  /**
   * 完整性校验：响应提供 total 时体积必须精确匹配；下限兜底拒绝镜像错误页；
   * 有 md5Digest（来自 voices.json）做 MD5 强校验，否则回退魔数/JSON 首尾弱校验。
   */
  private async verifyFile(
    path: string,
    suffix: '.onnx' | '.onnx.json',
    voice: PiperVoiceDef,
    expectedTotal: number
  ): Promise<void> {
    const info = await stat(path)
    if (expectedTotal > 0 && info.size !== expectedTotal) {
      throw new Error(`${suffix} size mismatch: ${info.size} / ${expectedTotal}`)
    }
    const minBytes = suffix === '.onnx' ? (voice.sizeMB / 2) * 1024 * 1024 : 1024
    if (info.size < minBytes) throw new Error(`${suffix} too small: ${info.size} bytes`)
    if (suffix === '.onnx') {
      if (voice.md5Digest) {
        const sum = await md5File(path)
        if (sum !== voice.md5Digest) throw new Error(`onnx md5 mismatch: ${sum}`)
      } else {
        // ONNX 为 protobuf 序列化，首字节通常 0x08（ir_version 字段）；
        // 无 md5 时弱校验：至少不能全 0 / 全 FF（截断或错误页）
        const fd = await open(path, 'r')
        const buf = Buffer.alloc(4)
        await fd.read(buf, 0, 4, 0)
        await fd.close()
        if (buf.every((b) => b === 0) || buf.every((b) => b === 0xff))
          throw new Error('invalid onnx header (all-zero/all-ff)')
      }
    } else {
      if (voice.md5Digest) {
        const sum = await md5File(path)
        if (sum !== voice.md5Digest) throw new Error(`config md5 mismatch: ${sum}`)
      } else {
        const txt = (await readFile(path, 'utf8')).trim()
        if (!txt.startsWith('{') || !txt.endsWith('}'))
          throw new Error('invalid json config')
      }
    }
  }

  async remove(id: string): Promise<void> {
    await rm(this.modelPath(id), { force: true })
    await rm(this.configPath(id), { force: true })
    // 清理断点续传可能残留的 .part 文件（中断后未完成的下载）
    await rm(`${this.modelPath(id)}.part`, { force: true })
    await rm(`${this.configPath(id)}.part`, { force: true })
  }
}

/** 流式计算文件 MD5 摘要（大 .onnx 模型不整体读入内存） */
async function md5File(path: string): Promise<string> {
  const hash = createHash('md5')
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer)
  return hash.digest('hex')
}
