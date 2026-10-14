/**
 * ffmpeg 编解码与临时文件管理：
 * - decodeAudioToPcm：用 ffmpeg 解码 MP3 等格式为 f32le 立体声 PCM
 * - encodeWav / encodeWithFfmpeg：将 PCM 编码为 WAV / MP3 / OGG / FLAC
 * - tempPath：生成临时文件路径
 *
 * 依赖：随安装包分发的 ffmpeg（resources/ffmpeg，见 ffmpegResolver.ts）；
 * 开发环境直接使用 ffmpeg-static 下载的当前平台二进制。
 */

import { spawn } from 'child_process'
import { randomUUID } from 'crypto'
import { mkdir, readFile, unlink, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { resolveFfmpegPath } from '../ffmpegResolver'
import { interleaveToBuffer } from './pcmOps'
import type { StereoPcm } from './types'

const FFMPEG = resolveFfmpegPath()

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
