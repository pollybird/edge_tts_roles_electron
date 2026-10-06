import type { RoleId, Segment } from './types'

/** 标记语法：[A]/[B]/[C]/[D] 切换角色，[数字] 停顿毫秒数，[R] 蜂鸣声 */
const MARKER_PATTERN = /(\[[ABCD]\])|(\[\d+\])|(\[R\])/

/**
 * 解析含标记的文本为片段序列。
 * 利用带捕获组的 split：命中的分隔符会作为数组元素交错插入结果，
 * 一次遍历即可区分普通文本、角色切换、停顿与蜂鸣四种片段。
 */
export function parseText(text: string): Segment[] {
  const segments: Segment[] = []
  let currentRole: RoleId = 'A'
  let currentText: string[] = []

  const flushText = (): void => {
    const t = currentText.join('')
    if (t) {
      segments.push({ type: 'text', text: t, role: currentRole })
      currentText = []
    }
  }

  for (const part of text.split(MARKER_PATTERN)) {
    if (!part) continue
    if (part.startsWith('[') && part.endsWith(']')) {
      flushText()
      if (part === '[R]') {
        segments.push({ type: 'beep' })
      } else if (part.length === 3 && 'ABCD'.includes(part[1])) {
        currentRole = part[1] as RoleId
      } else {
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
