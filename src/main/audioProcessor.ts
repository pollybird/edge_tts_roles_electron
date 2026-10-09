/**
 * 音频 PCM 处理与编解码：ffmpeg 解码、声道合成、静音/蜂鸣生成与 WAV 等格式编码。
 *
 * 依赖：随安装包分发的 ffmpeg（resources/ffmpeg，见 ffmpegResolver.ts）；
 * 开发环境直接使用 ffmpeg-static 下载的当前平台二进制。
 */

import { spawn } from 'child_process'
import { randomUUID } from 'crypto'
import { mkdir, readFile, unlink, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { createT } from '../shared/i18n'
import { resolveFfmpegPath } from './ffmpegResolver'

const FFMPEG = resolveFfmpegPath()

/** 双声道 PCM（planar：左右声道各一个 Float32Array，对应 numpy 的 (N, 2) 结构） */
export interface StereoPcm {
  left: Float32Array
  right: Float32Array
  sampleRate: number
}

/** 生成临时文件路径（可选指定父目录） */
export function tempPath(suffix: string, dir?: string): string {
  return join(dir ?? tmpdir(), `${randomUUID()}${suffix}`)
}

/** 确保目录存在 */
async function ensureDir(p: string): Promise<void> {
  await mkdir(p, { recursive: true }).catch(() => {})
}

/** 用 ffmpeg 解码 MP3（或任意 ffmpeg 支持的格式）为 f32le 立体声 PCM */
export async function decodeAudioToPcm(inputPath: string, sampleRate = 24000): Promise<StereoPcm> {
  const rawPath = tempPath('.raw')
  await runFfmpeg([
    '-y',
    '-i',
    inputPath,
    '-f',
    'f32le',
    '-ac',
    '2',
    '-ar',
    String(sampleRate),
    rawPath
  ])
  const buf = await readFile(rawPath)
  await unlink(rawPath).catch(() => {})

  const samples = Math.floor(buf.length / 8)
  const left = new Float32Array(samples)
  const right = new Float32Array(samples)
  for (let i = 0; i < samples; i++) {
    left[i] = buf.readFloatLE(i * 8)
    right[i] = buf.readFloatLE(i * 8 + 4)
  }
  return { left, right, sampleRate }
}

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
function interleaveToBuffer(pcm: StereoPcm): Buffer {
  const buf = Buffer.alloc(pcm.left.length * 8)
  for (let i = 0; i < pcm.left.length; i++) {
    buf.writeFloatLE(pcm.left[i], i * 8)
    buf.writeFloatLE(pcm.right[i], i * 8 + 4)
  }
  return buf
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

/** 编码为 WAV（IEEE float 32-bit, 双声道） */
export async function encodeWav(pcm: StereoPcm, filePath: string): Promise<void> {
  await ensureDir(dirname(filePath))
  const dataSize = pcm.left.length * 8
  const fileSize = 44 + dataSize

  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(fileSize - 8, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16) // fmt chunk size
  header.writeUInt16LE(3, 20) // IEEE float
  header.writeUInt16LE(2, 22) // stereo
  header.writeUInt32LE(pcm.sampleRate, 24)
  header.writeUInt32LE(pcm.sampleRate * 2 * 4, 28) // byteRate
  header.writeUInt16LE(2 * 4, 32) // blockAlign
  header.writeUInt16LE(32, 34) // bitsPerSample
  header.write('data', 36)
  header.writeUInt32LE(dataSize, 40)

  const data = interleaveToBuffer(pcm)
  await writeFile(filePath, Buffer.concat([header, data]))
}

/** 编码为 MP3 / OGG / FLAC（ffmpeg） */
export async function encodeWithFfmpeg(
  pcm: StereoPcm,
  filePath: string,
  format: 'mp3' | 'ogg' | 'flac'
): Promise<void> {
  await ensureDir(dirname(filePath))
  const rawPath = tempPath('.raw')
  await writeFile(rawPath, interleaveToBuffer(pcm))

  const args: string[] = [
    '-y',
    '-f',
    'f32le',
    '-ac',
    '2',
    '-ar',
    String(pcm.sampleRate),
    '-i',
    rawPath
  ]
  if (format === 'mp3') {
    // MP3 统一输出 44.1kHz（MPEG-1）：24kHz 属于 MPEG-2 LSF 格式，
    // 部分播放器对其进度计算不准确，导致字幕/歌词与音频不同步
    args.push('-ar', '44100', '-c:a', 'libmp3lame', '-q:a', '2')
  } else if (format === 'ogg') {
    args.push('-c:a', 'libvorbis', '-q:a', '4')
  } else if (format === 'flac') {
    args.push('-c:a', 'flac')
  }
  args.push(filePath)

  try {
    await runFfmpeg(args)
  } finally {
    await unlink(rawPath).catch(() => {})
  }
}

/** 执行 ffmpeg 进程并等待完成 */
function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG, args, { windowsHide: true })
    let stderr = ''
    proc.stderr?.on('data', (d) => {
      stderr += d
    })
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(0, 200)}`))
    })
  })
}
