import { writeFile } from 'fs/promises'
import { format as formatPath, parse as parsePath } from 'path'

/** 单条字幕的原始素材：语音段在旁白时间轴上的起止（毫秒，不含前奏偏移） */
export interface SubtitleSource {
  role: string
  text: string
  startMs: number
  endMs: number
}

/**
 * 语音活动检测：返回段内首个/末个有效音频的样本索引。
 *
 * 背景：edge-tts 每段 MP3 流自带编码器延迟（首部静音实测约 160ms）与
 * 帧补齐（尾部静音数百 ms），按流边界标定字幕会让起点偏早、终点偏晚。
 * 以 20ms 窗 RMS 超阈值判定「有效音频」，阈值随段内峰值自适应
 * （max(1e-3, peak×1%)），兼容用户调低音量的场景。
 *
 * 全段均低于阈值（纯静音段）时返回 null，由调用方回退流边界。
 */
export function detectSpeechRange(
  left: Float32Array,
  sampleRate: number
): { startSample: number; endSample: number } | null {
  const window = Math.floor(sampleRate * 0.02) // 20ms
  if (left.length < window) return null
  let peak = 0
  for (let i = 0; i < left.length; i++) {
    const abs = Math.abs(left[i])
    if (abs > peak) peak = abs
  }
  const threshold = Math.max(1e-3, peak * 0.01)
  let first = -1
  let last = -1
  for (let s = 0; s + window <= left.length; s += window) {
    let sum = 0
    for (let i = s; i < s + window; i++) sum += left[i] * left[i]
    if (Math.sqrt(sum / window) > threshold) {
      if (first < 0) first = s
      last = s + window
    }
  }
  if (first < 0) return null
  return { startSample: first, endSample: Math.min(last, left.length) }
}

/** 单条字幕 cue（index 从 1 起，时间轴已含前奏偏移） */
export interface SubtitleCue {
  index: number
  startMs: number
  endMs: number
  role: string
  text: string
}

/**
 * 由语音段素材构建字幕 cue。
 * 段间空隙（停顿 / 蜂鸣）天然形成时间轴推进，无需参与构建；
 * 空文本段不产出 cue（避免纯标点/空白进入字幕）。
 */
export function buildSubtitleCues(sources: SubtitleSource[]): SubtitleCue[] {
  const cues: SubtitleCue[] = []
  for (const src of sources) {
    const text = src.text.trim()
    if (!text) continue
    const startMs = Math.round(src.startMs)
    const endMs = Math.max(Math.round(src.endMs), startMs + 1)
    cues.push({ index: cues.length + 1, startMs, endMs, role: src.role, text })
  }
  return cues
}

/** 整体平移 cue 时间轴（前奏时长偏移），返回新数组 */
export function shiftCues(cues: SubtitleCue[], offsetMs: number): SubtitleCue[] {
  if (offsetMs <= 0) return cues.map((c) => ({ ...c }))
  return cues.map((c) => ({
    ...c,
    startMs: c.startMs + offsetMs,
    endMs: c.endMs + offsetMs
  }))
}

/** SRT 时间戳：HH:MM:SS,mmm（毫秒逗号分隔） */
export function formatSrtTimestamp(ms: number): string {
  const total = Math.max(0, Math.round(ms))
  const h = Math.floor(total / 3_600_000)
  const m = Math.floor((total % 3_600_000) / 60_000)
  const s = Math.floor((total % 60_000) / 1000)
  const msec = total % 1000
  const pad = (n: number, len = 2): string => String(n).padStart(len, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(msec, 3)}`
}

/** LRC 时间戳：[MM:SS.xx]（百分秒两位） */
export function formatLrcTimestamp(ms: number): string {
  const total = Math.max(0, Math.round(ms / 10))
  const m = Math.floor(total / 6000)
  const s = Math.floor((total % 6000) / 100)
  const cs = total % 100
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${pad(m)}:${pad(s)}.${pad(cs)}`
}

/**
 * 生成 SRT 格式字幕：
 * 块结构为「序号 → 时间轴 → 【角色】文本 → 空行」，角色前缀沿用脚本标记的方括号语义，
 * 便于多人配音场景区分说话人；段内换行按 SRT 规范原样保留。
 */
export function formatSrt(cues: SubtitleCue[]): string {
  return (
    cues
      .map(
        (c) =>
          `${c.index}\n${formatSrtTimestamp(c.startMs)} --> ${formatSrtTimestamp(c.endMs)}\n【${c.role}】${c.text}\n`
      )
      .join('\n') + (cues.length > 0 ? '\n' : '')
  )
}

/**
 * 生成 LRC 格式字幕：
 * 每段一行 `[MM:SS.xx]<角色>文本`，角色用增强 LRC 内联标签表示；
 * LRC 行格式不支持多行文本，段内换行折叠为空格。
 */
export function formatLrc(cues: SubtitleCue[]): string {
  return cues
    .map((c) => `[${formatLrcTimestamp(c.startMs)}]<${c.role}>${c.text.replace(/\r?\n/g, ' ')}\n`)
    .join('')
}

/** 由音频输出路径推导同名字幕文件路径（output.mp3 → output.lrc / output.srt） */
export function subtitleFileNameFor(outputPath: string, format: 'lrc' | 'srt'): string {
  const parsed = parsePath(outputPath)
  return formatPath({ ...parsed, base: undefined, ext: `.${format}` })
}

/**
 * 生成并写入字幕文件。
 * 返回字幕文件路径；格式未知或无有效 cue 时返回 ''（不写文件）。
 */
export async function writeSubtitleFile(
  outputPath: string,
  format: string,
  cues: SubtitleCue[]
): Promise<string> {
  if (format !== 'lrc' && format !== 'srt') return ''
  if (cues.length === 0) return ''
  const filePath = subtitleFileNameFor(outputPath, format)
  const content = format === 'srt' ? formatSrt(cues) : formatLrc(cues)
  await writeFile(filePath, content, 'utf-8')
  return filePath
}
