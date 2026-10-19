import type { RoleId, Segment, ToneId } from './types'
import { TONE_IDS } from './types'

/** 基础标记语法：[A]/[B]/[C]/[D] 切换角色，[数字] 停顿毫秒数，[R] 蜂鸣声 */
const MARKER_PATTERN = /(\[[ABCD]\])|(\[\d+\])|(\[R\])/

/**
 * 语气标签：[happy] 开标签、[/happy] 闭标签（六个语气关键词）。
 * 与基础标记合并为一个联合正则，保证 split 一次遍历识别全部片段类型。
 */
const TONE_NAMES = TONE_IDS.join('|')
const TONE_OPEN_PATTERN = new RegExp(`\\[(${TONE_NAMES})\\]`)
const TONE_CLOSE_PATTERN = new RegExp(`\\[/(${TONE_NAMES})\\]`)
const MARKER_WITH_TONE_PATTERN = new RegExp(
  `${MARKER_PATTERN.source}|(\\[(?:${TONE_NAMES})\\])|(\\[\\/(?:${TONE_NAMES})\\])`
)

/**
 * 解析含标记的文本为片段序列。
 * 利用带捕获组的 split：命中的分隔符会作为数组元素交错插入结果，
 * 一次遍历即可区分普通文本、角色切换、停顿、蜂鸣与语气开/闭标签。
 *
 * 语气状态机：开标签直接切换当前语气（嵌套 = 覆盖），
 * 闭标签清空语气；未闭合的语气延续到文末。
 * 语气随所在文本片段输出到 Segment.tone，由合成侧折算韵律参数。
 */
export function parseText(text: string): Segment[] {
  const segments: Segment[] = []
  let currentRole: RoleId = 'A'
  let currentTone: ToneId | null = null
  let currentText: string[] = []

  const flushText = (): void => {
    const t = currentText.join('')
    if (t) {
      segments.push({
        type: 'text',
        text: t,
        role: currentRole,
        ...(currentTone ? { tone: currentTone } : {})
      })
      currentText = []
    }
  }

  for (const part of text.split(MARKER_WITH_TONE_PATTERN)) {
    if (!part) continue
    if (part.startsWith('[') && part.endsWith(']')) {
      flushText()
      if (part === '[R]') {
        segments.push({ type: 'beep' })
      } else if (part.length === 3 && 'ABCD'.includes(part[1])) {
        currentRole = part[1] as RoleId
      } else {
        const openMatch = TONE_OPEN_PATTERN.exec(part)
        if (openMatch) {
          currentTone = openMatch[1] as ToneId
          continue
        }
        const closeMatch = TONE_CLOSE_PATTERN.exec(part)
        if (closeMatch) {
          currentTone = null
          continue
        }
        const duration = Number.parseInt(part.slice(1, -1), 10)
        if (Number.isFinite(duration)) {
          segments.push({ type: 'pause', durationMs: duration })
        }
      }
    } else {
      currentText.push(part)
    }
  }
  flushText()
  return segments
}
