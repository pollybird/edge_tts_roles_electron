/**
 * 纯 PCM 运算：静音/蜂鸣生成、拼接、增益、循环/截断、混音。
 * 不依赖 ffmpeg 或外部进程，仅做 Float32 数组运算。
 */

import { readFile, writeFile } from 'fs/promises'
import { createT } from '../../shared/i18n'
import type { StereoPcm } from './types'

/** 创建静音片段 */
export function createSilence(durationMs: number, sampleRate = 24000): StereoPcm {
  const samples = Math.floor((sampleRate * durationMs) / 1000)
  return { left: new Float32Array(samples), right: new Float32Array(samples), sampleRate }
}

/** 创建蜂鸣声（默认 500ms / 1000Hz，带 5% 淡入淡出避免爆音） */
export function createBeep(durationMs = 500, frequency = 1000, sampleRate = 24000): StereoPcm {
  const samples = Math.floor((sampleRate * durationMs) / 1000)
  const wave = new Float32Array(samples)
  for (let i = 0; i < samples; i++) {
    wave[i] = 0.3 * Math.sin((2 * Math.PI * frequency * i) / sampleRate)
  }
  let fade = Math.floor(0.05 * sampleRate)
  if (fade * 2 > samples) fade = Math.floor(samples / 4)
  for (let i = 0; i < fade; i++) {
    wave[i] *= i / fade
    wave[samples - 1 - i] *= i / fade
  }
  return { left: wave, right: wave.slice(), sampleRate }
}

/** 顺序拼接多个音频片段（采样率需一致） */
export function concatenate(segments: StereoPcm[]): StereoPcm {
  if (segments.length === 0) {
    throw new Error(createT()('tts.noSegments'))
  }
  const sampleRate = segments[0].sampleRate
  const total = segments.reduce((n, s) => n + s.left.length, 0)
  const left = new Float32Array(total)
  const right = new Float32Array(total)
  let offset = 0
  for (const s of segments) {
    left.set(s.left, offset)
    right.set(s.right, offset)
    offset += s.left.length
  }
  return { left, right, sampleRate }
}

/** 线性增益缩放（gain 为倍数，如 0.5 即 50% 音量），结果削波到 ±1 防爆音 */
export function applyGain(pcm: StereoPcm, gain: number): StereoPcm {
  if (gain === 1) return pcm
  const n = pcm.left.length
  const left = new Float32Array(n)
  const right = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    let l = pcm.left[i] * gain
    let r = pcm.right[i] * gain
    if (l > 1) l = 1
    else if (l < -1) l = -1
    if (r > 1) r = 1
    else if (r < -1) r = -1
    left[i] = l
    right[i] = r
  }
  return { left, right, sampleRate: pcm.sampleRate }
}

/** 将音频循环（不足时）或截断（超出时）到指定采样数，用于背景音乐铺满整段语音 */
export function loopToLength(pcm: StereoPcm, samples: number): StereoPcm {
  const src = pcm.left.length
  if (src === 0) {
    return { left: new Float32Array(0), right: new Float32Array(0), sampleRate: pcm.sampleRate }
  }
  if (src === samples) return pcm
  const left = new Float32Array(samples)
  const right = new Float32Array(samples)
  for (let i = 0; i < samples; i++) {
    const j = i % src
    left[i] = pcm.left[j]
    right[i] = pcm.right[j]
  }
  return { left, right, sampleRate: pcm.sampleRate }
}

/** 两路 PCM 叠加混音（等长；长度不一致时以较长者为准，缺失视为静音），结果削波到 ±1 */
export function mixPcm(base: StereoPcm, overlay: StereoPcm): StereoPcm {
  const n = Math.max(base.left.length, overlay.left.length)
  const left = new Float32Array(n)
  const right = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    let l = (base.left[i] ?? 0) + (overlay.left[i] ?? 0)
    let r = (base.right[i] ?? 0) + (overlay.right[i] ?? 0)
    if (l > 1) l = 1
    else if (l < -1) l = -1
    if (r > 1) r = 1
    else if (r < -1) r = -1
    left[i] = l
    right[i] = r
  }
  return { left, right, sampleRate: base.sampleRate }
}

/** 将 StereoPcm 交错写入 f32le raw Buffer */
export function interleaveToBuffer(pcm: StereoPcm): Buffer {
  const buf = Buffer.alloc(pcm.left.length * 8)
  for (let i = 0; i < pcm.left.length; i++) {
    buf.writeFloatLE(pcm.left[i], i * 8)
    buf.writeFloatLE(pcm.right[i], i * 8 + 4)
  }
  return buf
}

/** 将 s16le interleaved Buffer 直接转为 StereoPcm（Float32），省去 WAV 编解码往返 */
export function pcmFromS16le(buffer: Buffer, sampleRate: number, channels: number): StereoPcm {
  const samples = new Int16Array(buffer.buffer, buffer.byteOffset, Math.floor(buffer.length / 2))
  const frames = Math.floor(samples.length / channels)
  const left = new Float32Array(frames)
  const right = new Float32Array(frames)
  for (let i = 0; i < frames; i++) {
    left[i] = samples[i * channels] / 32768
    right[i] = channels > 1 ? samples[i * channels + 1] / 32768 : left[i]
  }
  return { left, right, sampleRate }
}

/** 将 PCM 写入 f32le 立体声 raw 缓存文件（断点续传用） */
export async function writePcmCache(pcm: StereoPcm, filePath: string): Promise<void> {
  await writeFile(filePath, interleaveToBuffer(pcm))
}

/** 读取 f32le 立体声 raw 缓存文件；长度非法时返回 null */
export async function readPcmCache(
  filePath: string,
  sampleRate = 24000
): Promise<StereoPcm | null> {
  let buf: Buffer
  try {
    buf = await readFile(filePath)
  } catch {
    return null
  }
  if (buf.length < 8 || buf.length % 8 !== 0) return null
  const samples = buf.length / 8
  const left = new Float32Array(samples)
  const right = new Float32Array(samples)
  for (let i = 0; i < samples; i++) {
    left[i] = buf.readFloatLE(i * 8)
    right[i] = buf.readFloatLE(i * 8 + 4)
  }
  return { left, right, sampleRate }
}
