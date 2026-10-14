/**
 * 诊断信息收集：版本、平台、引擎路径、缓存占用、已下载模型。
 * 「帮助 → 诊断信息」展示，一键复制到剪贴板，大幅降低用户报障成本。
 */

import { app, clipboard } from 'electron'
import { readdir, stat } from 'fs/promises'
import { join } from 'path'
import { resolveFfmpegPath } from './ffmpegResolver'
import { locatePiperBinary } from './tts/piper/locate'
import { PIPER_VOICES } from './tts/piper/catalog'
import { PiperModelManager } from './tts/piper/models'
import { SegmentCache } from './tts/segmentCache'

/** 格式化字节数为人类可读（MB 或 GB） */
function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(2)} GB`
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} KB`
  return `${bytes} B`
}

/** 扫描缓存目录，返回文件数与总占用 */
async function cacheStats(cacheDir: string): Promise<{ files: number; size: number }> {
  try {
    const entries = await readdir(cacheDir)
    const pcmFiles = entries.filter((f) => f.endsWith('.pcm'))
    let totalSize = 0
    for (const f of pcmFiles) {
      try {
        const s = await stat(join(cacheDir, f))
        totalSize += s.size
      } catch {
        // 跳过损坏的条目
      }
    }
    return { files: pcmFiles.length, size: totalSize }
  } catch {
    return { files: 0, size: 0 }
  }
}

/** 收集完整诊断信息文本（技术内容用英文，跨语言通用） */
export async function collectDiagnostics(): Promise<string> {
  const lines: string[] = []

  // --- 版本与平台 ---
  lines.push(`Version: ${app.getVersion()}`)
  lines.push(`Electron: ${process.versions.electron}`)
  lines.push(`Node.js: ${process.versions.node}`)
  lines.push(`Platform: ${process.platform}-${process.arch}`)
  lines.push(`Packaged: ${app.isPackaged ? 'yes' : 'no'}`)

  // --- 引擎路径 ---
  lines.push('')
  lines.push(`FFmpeg: ${resolveFfmpegPath()}`)

  const piper = locatePiperBinary(app.isPackaged, app.getAppPath())
  lines.push(`Piper Binary: ${piper?.bin ?? 'Not found'}`)
  lines.push(`eSpeak NG Data: ${piper?.espeakData ?? 'Not found'}`)

  // --- 缓存 ---
  lines.push('')
  const cache = new SegmentCache()
  const cacheDir = cache.cacheDir()
  const stats = await cacheStats(cacheDir)
  lines.push(`Segment Cache: ${cacheDir}`)
  lines.push(`  (${stats.files} files, ${formatBytes(stats.size)})`)

  // --- 已下载 Piper 模型 ---
  lines.push('')
  const models = new PiperModelManager()
  const downloaded: string[] = []
  for (const v of PIPER_VOICES) {
    if (await models.isDownloaded(v.id)) {
      downloaded.push(`  - ${v.id} (${v.sizeMB.toFixed(0)} MB)`)
    }
  }
  lines.push(`Downloaded Models: ${downloaded.length}`)
  if (downloaded.length > 0) {
    lines.push(...downloaded)
  }

  return lines.join('\n')
}

/**
 * 展示诊断信息对话框，返回用户选择的按钮索引。
 * 0 = 复制到剪贴板，1 = 关闭。
 */
export async function showDiagnosticsDialog(
  win: Electron.BrowserWindow | null,
  title: string,
  summary: string,
  copyLabel: string,
  okLabel: string
): Promise<number> {
  const { dialog } = await import('electron')
  const info = await collectDiagnostics()
  const result = dialog.showMessageBoxSync(win ?? undefined!, {
    type: 'info',
    title,
    message: summary,
    detail: info,
    buttons: [copyLabel, okLabel],
    defaultId: 1,
    cancelId: 1
  })
  if (result === 0) {
    clipboard.writeText(info)
  }
  return result
}
