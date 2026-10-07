import { describe, expect, it } from 'vitest'
import { mkdtemp, readFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  buildSubtitleCues,
  detectSpeechRange,
  formatLrc,
  formatLrcTimestamp,
  formatSrt,
  formatSrtTimestamp,
  shiftCues,
  subtitleFileNameFor,
  writeSubtitleFile
} from '../src/main/subtitles'
import type { SubtitleSource } from '../src/main/subtitles'

// cue 构建：空文本过滤、毫秒取整、序号从 1 起
describe('buildSubtitleCues', () => {
  const sources: SubtitleSource[] = [
    { role: 'A', text: '第一句。', startMs: 0, endMs: 1234.6 },
    { role: 'B', text: '  ', startMs: 1234.6, endMs: 2000 }, // 空白文本 → 过滤
    { role: 'B', text: '第二句。', startMs: 2234.6, endMs: 5000.4 }
  ]

  it('过滤空文本并按序编号，毫秒四舍五入', () => {
    const cues = buildSubtitleCues(sources)
    expect(cues).toHaveLength(2)
    expect(cues[0]).toMatchObject({ index: 1, role: 'A', startMs: 0, endMs: 1235 })
    expect(cues[1]).toMatchObject({ index: 2, role: 'B', startMs: 2235, endMs: 5000 })
  })

  it('取整后起止重合时至少保留 1ms', () => {
    const cues = buildSubtitleCues([{ role: 'A', text: 'x', startMs: 100.2, endMs: 100.4 }])
    expect(cues[0].startMs).toBe(100)
    expect(cues[0].endMs).toBe(101)
  })
})

// 前奏偏移：整体右移，返回新数组不改原数据
describe('shiftCues', () => {
  it('整体加偏移', () => {
    const cues = buildSubtitleCues([{ role: 'A', text: 'hi', startMs: 0, endMs: 500 }])
    const shifted = shiftCues(cues, 3000)
    expect(shifted[0].startMs).toBe(3000)
    expect(shifted[0].endMs).toBe(3500)
    expect(cues[0].startMs).toBe(0) // 原数组不变
  })

  it('偏移为 0 时原样复制', () => {
    const cues = buildSubtitleCues([{ role: 'A', text: 'hi', startMs: 0, endMs: 500 }])
    expect(shiftCues(cues, 0)).toEqual(cues)
  })
})

// SRT 时间戳与格式
describe('formatSrt', () => {
  it('时间戳 HH:MM:SS,mmm 格式', () => {
    expect(formatSrtTimestamp(0)).toBe('00:00:00,000')
    expect(formatSrtTimestamp(3200)).toBe('00:00:03,200')
    expect(formatSrtTimestamp(3661500)).toBe('01:01:01,500')
    expect(formatSrtTimestamp(1234.6)).toBe('00:00:01,235')
  })

  it('块结构：序号/时间轴/【角色】文本/空行', () => {
    const cues = buildSubtitleCues([
      { role: 'A', text: '大家好，欢迎收听本期节目。', startMs: 500, endMs: 3200 },
      { role: 'B', text: '我是主持人小B。', startMs: 3200, endMs: 5800 }
    ])
    expect(formatSrt(cues)).toBe(
      [
        '1\n00:00:00,500 --> 00:00:03,200\n【A】大家好，欢迎收听本期节目。\n',
        '\n2\n00:00:03,200 --> 00:00:05,800\n【B】我是主持人小B。\n',
        '\n'
      ].join('')
    )
  })
})

// LRC 时间戳与格式
describe('formatLrc', () => {
  it('时间戳 [MM:SS.xx] 格式', () => {
    expect(formatLrcTimestamp(0)).toBe('00:00.00')
    expect(formatLrcTimestamp(3200)).toBe('00:03.20')
    expect(formatLrcTimestamp(123456)).toBe('02:03.46')
    expect(formatLrcTimestamp(999)).toBe('00:01.00') // 四舍五入进位
  })

  it('内联角色标签，段内换行折叠为空格', () => {
    const cues = buildSubtitleCues([
      { role: 'A', text: '第一行\n第二行', startMs: 500, endMs: 3200 }
    ])
    expect(formatLrc(cues)).toBe('[00:00.50]<A>第一行 第二行\n')
  })
})

// 语音活动检测：cue 边界对齐实际发声，剔除编码器延迟/帧补齐静音
describe('detectSpeechRange', () => {
  const sr = 24000
  /** 合成一段「静音头 + 正弦语音 + 静音尾」的 PCM */
  function makePcm(silenceMsHead: number, speechMs: number, silenceMsTail: number): Float32Array {
    const n = Math.floor((sr * (silenceMsHead + speechMs + silenceMsTail)) / 1000)
    const pcm = new Float32Array(n)
    const start = Math.floor((sr * silenceMsHead) / 1000)
    const end = start + Math.floor((sr * speechMs) / 1000)
    for (let i = start; i < end; i++) pcm[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / sr)
    return pcm
  }

  it('剔除首部编码器延迟与尾部帧补齐静音', () => {
    const range = detectSpeechRange(makePcm(160, 2000, 572), sr)
    expect(range).not.toBeNull()
    // 20ms 窗粒度：允许一个窗口的误差
    expect(Math.abs(range!.startSample - (sr * 160) / 1000)).toBeLessThanOrEqual(sr * 0.02)
    expect(Math.abs(range!.endSample - (sr * 2160) / 1000)).toBeLessThanOrEqual(sr * 0.02)
  })

  it('首部无静音时从 0 开始', () => {
    const range = detectSpeechRange(makePcm(0, 500, 100), sr)
    expect(range!.startSample).toBe(0)
  })

  it('纯静音段返回 null（调用方回退流边界）', () => {
    expect(detectSpeechRange(new Float32Array(sr), sr)).toBeNull()
  })

  it('低音量段（峰值 0.02）仍可检测：阈值随峰值自适应', () => {
    const pcm = makePcm(100, 500, 100)
    const scaled = new Float32Array(pcm.length)
    for (let i = 0; i < pcm.length; i++) scaled[i] = pcm[i] * 0.04 // 峰值 0.02
    const range = detectSpeechRange(scaled, sr)
    expect(range).not.toBeNull()
    expect(Math.abs(range!.startSample - (sr * 100) / 1000)).toBeLessThanOrEqual(sr * 0.02)
  })

  it('样本数不足一个窗口时返回 null', () => {
    expect(detectSpeechRange(new Float32Array(100), sr)).toBeNull()
  })
})

// 文件名推导与写盘
describe('writeSubtitleFile', () => {
  it('输出路径同名换扩展名', () => {
    expect(subtitleFileNameFor('/tmp/output.mp3', 'lrc')).toBe('/tmp/output.lrc')
    expect(subtitleFileNameFor('/tmp/a.b/output.wav', 'srt')).toBe('/tmp/a.b/output.srt')
    expect(subtitleFileNameFor('/tmp/noext', 'srt')).toBe('/tmp/noext.srt')
  })

  it('未知格式或空 cue 不写文件', async () => {
    expect(
      await writeSubtitleFile('/tmp/x.mp3', '', [
        { index: 1, startMs: 0, endMs: 1, role: 'A', text: 'x' }
      ])
    ).toBe('')
    expect(await writeSubtitleFile('/tmp/x.mp3', 'srt', [])).toBe('')
    expect(
      await writeSubtitleFile('/tmp/x.mp3', 'vtt', [
        { index: 1, startMs: 0, endMs: 1, role: 'A', text: 'x' }
      ])
    ).toBe('')
  })

  it('写入 SRT 文件内容与 formatSrt 一致', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'sub-'))
    try {
      const audio = join(dir, 'out.mp3')
      const cues = shiftCues(
        buildSubtitleCues([{ role: 'A', text: '你好。', startMs: 0, endMs: 1000 }]),
        2500
      )
      const path = await writeSubtitleFile(audio, 'srt', cues)
      expect(path).toBe(join(dir, 'out.srt'))
      expect(await readFile(path, 'utf-8')).toBe(formatSrt(cues))
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
