/**
 * 统一调试开关：
 *
 * - EDGE_TTS_DEBUG=1：全局调试，输出引擎探测结果与每段来源（edge/piper/cache）
 * - EDGE_TTS_DEBUG_CUES=1：字幕对齐调试（落盘 /tmp/cues-debug.json，v2.0.3 既有行为）
 *
 * EDGE_TTS_DEBUG 是超集：启用时自动包含 CUES 行为，向后兼容现有环境变量。
 */

/** 全局调试是否启用（包含 CUES） */
export function isDebugEnabled(): boolean {
  return process.env.EDGE_TTS_DEBUG === '1' || process.env.EDGE_TTS_DEBUG_CUES === '1'
}

/** 字幕对齐调试是否启用（EDGE_TTS_DEBUG 超集或 EDGE_TTS_DEBUG_CUES 独立启用） */
export function isCuesDebugEnabled(): boolean {
  return process.env.EDGE_TTS_DEBUG === '1' || process.env.EDGE_TTS_DEBUG_CUES === '1'
}

/** 条件输出调试日志到主进程控制台 */
export function debugLog(category: string, ...args: unknown[]): void {
  if (isDebugEnabled()) {
    console.log(`[edge-tts:${category}]`, ...args)
  }
}
