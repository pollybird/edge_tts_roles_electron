import { describe, expect, it } from 'vitest'
import { parseText } from '../src/shared/textParser'

// parseText 的行为以 src/shared/textParser.ts 源码为准：
// 带捕获组的 split 交错返回命中的标记；[A-D] 切换角色、[数字] 停顿、[R] 蜂鸣，其余一律按文本处理
describe('parseText', () => {
  it('空文本返回空数组', () => {
    expect(parseText('')).toEqual([])
  })

  it('纯文本（首标记之前）默认角色 A', () => {
    expect(parseText('你好世界')).toEqual([{ type: 'text', text: '你好世界', role: 'A' }])
  })

  it('角色切换标记 [A]/[B]/[C]/[D]', () => {
    expect(parseText('[A]甲[B]乙[C]丙[D]丁')).toEqual([
      { type: 'text', text: '甲', role: 'A' },
      { type: 'text', text: '乙', role: 'B' },
      { type: 'text', text: '丙', role: 'C' },
      { type: 'text', text: '丁', role: 'D' }
    ])
  })

  it('停顿标记 [数字] 解析为毫秒', () => {
    expect(parseText('[1000]')).toEqual([{ type: 'pause', durationMs: 1000 }])
    expect(parseText('[250]')).toEqual([{ type: 'pause', durationMs: 250 }])
  })

  it('蜂鸣标记 [R]', () => {
    expect(parseText('[R]')).toEqual([{ type: 'beep' }])
  })

  it('混合序列保持顺序与角色状态', () => {
    expect(parseText('[B]你好[500][R]喂[A]！[1000]')).toEqual([
      { type: 'text', text: '你好', role: 'B' },
      { type: 'pause', durationMs: 500 },
      { type: 'beep' },
      { type: 'text', text: '喂', role: 'B' },
      { type: 'text', text: '！', role: 'A' },
      { type: 'pause', durationMs: 1000 }
    ])
  })

  it('角色标记在切换后持续生效', () => {
    expect(parseText('[C]一[200]二')).toEqual([
      { type: 'text', text: '一', role: 'C' },
      { type: 'pause', durationMs: 200 },
      { type: 'text', text: '二', role: 'C' }
    ])
  })

  it('未知标记（如 [X]）不匹配语法，按普通文本保留', () => {
    // MARKER_PATTERN 不含 [X]，split 不会拆分，整体落在文本片段里
    expect(parseText('前[X]后')).toEqual([{ type: 'text', text: '前[X]后', role: 'A' }])
  })

  it('连续标记之间无文本时不产生空文本片段', () => {
    expect(parseText('[A][B]内容')).toEqual([{ type: 'text', text: '内容', role: 'B' }])
    expect(parseText('[A][500][R]')).toEqual([{ type: 'pause', durationMs: 500 }, { type: 'beep' }])
  })

  it('标记后无文本时尾部不产生片段', () => {
    expect(parseText('正文[R]')).toEqual([
      { type: 'text', text: '正文', role: 'A' },
      { type: 'beep' }
    ])
  })

  it('仅角色标记时无任何片段', () => {
    expect(parseText('[D]')).toEqual([])
  })
})
