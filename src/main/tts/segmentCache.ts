import { app } from 'electron'
import { createHash } from 'crypto'
import { mkdir, readdir, stat, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { readPcmCache, writePcmCache } from '../audioProcessor'
import type { StereoPcm } from '../audioProcessor'

/** 参与片段合成与缓存键计算的语音参数（发音人 + 语速 + 音量 + 音调） */
export interface SegmentVoiceSettings {
  voice: string
  rate: number
  volume: number
  pitch: number
}

/**
 * 片段 PCM 磁盘缓存（断点续传）：
 * 同文本 + 同语音参数的片段只合成一次，任务失败重跑时直接读缓存，不再请求网络。
 * 条目超量时按修改时间淘汰最旧片段（LRU 近似）。
 */
export class SegmentCache {
  /** 缓存目录（依赖 app.getPath，必须延迟到首次使用时计算，不能在模块顶层初始化） */
  private dir: string | null = null
  /** 缓存条目数超过该值时触发清理 */
  private readonly maxEntries: number
  /** 清理后保留的条目数 */
  private readonly pruneTo: number

  constructor(maxEntries = 300, pruneTo = 200) {
    this.maxEntries = maxEntries
    this.pruneTo = pruneTo
  }

  /** 缓存目录：Electron 下用 userData，纯 Node 环境（测试）退化为 tmpdir */
  cacheDir(): string {
    if (this.dir) return this.dir
    try {
      if (app && typeof app.getPath === 'function') {
        this.dir = join(app.getPath('userData'), 'tts-segment-cache')
        return this.dir
      }
    } catch {
      // 非 Electron 运行时
    }
    this.dir = join(tmpdir(), 'edge-tts-segment-cache')
    return this.dir
  }

  /** 由文本与语音参数计算稳定缓存键，任一参数变化都会得到不同片段 */
  keyFor(text: string, settings: SegmentVoiceSettings): string {
    // v3：尾部对齐完整性校验（spokenTail）上线后版本化缓存键。
    // 每当合成完整性判定逻辑升级，必须 bump 该版本前缀，
    // 使历史（可能被服务端提前收尾截断且已落盘的）条目全部失效重新合成，
    // 否则重跑任务会直接命中缓存中的截断片段，校验代码无从介入。
    const raw = `v3|${settings.voice}|${settings.rate}|${settings.volume}|${settings.pitch}|${text}`
    return createHash('sha256').update(raw, 'utf8').digest('hex')
  }

  /** 读取缓存片段；不存在或损坏时返回 null（调用方转而请求网络） */
  async read(key: string): Promise<StereoPcm | null> {
    return readPcmCache(join(this.cacheDir(), `${key}.pcm`))
  }

  /** 写入缓存片段（自动确保目录存在） */
  async write(key: string, pcm: StereoPcm): Promise<void> {
    await mkdir(this.cacheDir(), { recursive: true })
    await writePcmCache(pcm, join(this.cacheDir(), `${key}.pcm`))
  }

  /** 缓存超量时按修改时间淘汰最旧片段（LRU 近似）；任何失败都静默，不影响生成 */
  async prune(): Promise<void> {
    try {
      const dir = this.cacheDir()
      await mkdir(dir, { recursive: true })
      const files = (await readdir(dir)).filter((f) => f.endsWith('.pcm'))
      if (files.length <= this.maxEntries) return
      const entries = await Promise.all(
        files.map(async (f) => ({ f, mtime: (await stat(join(dir, f))).mtimeMs }))
      )
      entries.sort((a, b) => a.mtime - b.mtime)
      for (const e of entries.slice(0, files.length - this.pruneTo)) {
        await unlink(join(dir, e.f)).catch(() => {})
      }
    } catch {
      // 缓存清理失败不影响生成
    }
  }
}
