import { spawn } from 'child_process'
import { readFile, writeFile } from 'fs/promises'
import type {
  RawSynthesisResult,
  SynthesisOutcome,
  TTSProvider,
  TtsSegmentRequest,
  TtsSynthesisHooks
} from './types'

/**
 * Piper 本地离线合成 Provider（rhasspy/piper，MIT）：
 * spawn piper 静态二进制，stdin 传文本、stdout 收集原始 PCM
 * （s16le / 单声道 / 采样率由模型 .onnx.json 的 audio.sample_rate 决定），
 * 由本模块完成音量缩放并打包 44 字节头的 WAV 写入 outPath。
 *
 * 与在线 Edge Provider 的语义差异（调用方 SegmentSynthesizer 已天然兼容）：
 * - 本地合成不存在「服务端提前截断」，complete 恒为 true、serverEndMs 为 -1；
 * - 无逐词边界元数据，spokenTail 为空字符串（尾部对齐判据对空流直接通过）；
 * - pitch 参数不支持（忽略）；rate 映射为 length_scale；volume 由本模块缩放实现。
 */
export class PiperProvider implements TTSProvider {
  readonly name = 'piper'

  constructor(
    private readonly options: {
      /** piper 可执行文件绝对路径 */
      piperBin: string
      /** .onnx 模型绝对路径 */
      modelPath: string
      /** .onnx.json 配置绝对路径（读取采样率） */
      configPath: string
      /** 多说话人模型的说话人数量（>1 时追加 --speaker 0） */
      numSpeakers?: number
    }
  ) {}

  async synthesizeSegment(
    req: TtsSegmentRequest,
    outPath: string,
    _hooks: TtsSynthesisHooks,
    isStopped: () => boolean
  ): Promise<SynthesisOutcome> {
    let sampleRate = 22050
    try {
      const config = JSON.parse(await readFile(this.options.configPath, 'utf8')) as {
        audio?: { sample_rate?: number }
      }
      if (config.audio?.sample_rate) sampleRate = config.audio.sample_rate
    } catch {
      // 配置缺失时按 piper medium 模型默认采样率处理
    }

    const pcm = await this.runPiper(req.text, req.rate, isStopped)
    const gained = applyGainS16(pcm, volumeToGain(req.volume))
    await writeFile(outPath, buildWav(gained, sampleRate))
    return { complete: true, serverEndMs: -1, spokenTail: '' }
  }

  /**
   * 直通模式：返回原始 s16le PCM，由调用方直接转 StereoPcm，
   * 省去 buildWav → writeFile → readFile → decodeAudioToPcm 的往返开销。
   */
  async synthesizeRaw(
    req: TtsSegmentRequest,
    _hooks: TtsSynthesisHooks,
    isStopped: () => boolean
  ): Promise<RawSynthesisResult> {
    let sampleRate = 22050
    try {
      const config = JSON.parse(await readFile(this.options.configPath, 'utf8')) as {
        audio?: { sample_rate?: number }
      }
      if (config.audio?.sample_rate) sampleRate = config.audio.sample_rate
    } catch {
      // 配置缺失时按 piper medium 模型默认采样率处理
    }

    const pcm = await this.runPiper(req.text, req.rate, isStopped)
    const gained = applyGainS16(pcm, volumeToGain(req.volume))
    return {
      outcome: { complete: true, serverEndMs: -1, spokenTail: '' },
      rawPcm: gained,
      sampleRate,
      channels: 1
    }
  }

  /** spawn piper 收集原始 PCM；停止信号或进程异常时抛错 */
  private runPiper(text: string, rate: number, isStopped: () => boolean): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const args = [
        '--model',
        this.options.modelPath,
        '--output_raw',
        '--length_scale',
        String(rateToLengthScale(rate))
      ]
      if ((this.options.numSpeakers ?? 1) > 1) {
        args.push('--speaker', '0')
      }
      const child = spawn(this.options.piperBin, args, { stdio: ['pipe', 'pipe', 'pipe'] })

      const chunks: Buffer[] = []
      let stderrTail = ''
      let settled = false
      // 本地推理的兜底看门狗：正常 RTF 远小于 1，10 分钟上限防异常挂起
      const watchdog = setTimeout(() => {
        child.kill('SIGKILL')
      }, 600_000)
      // 停止信号轮询：用户点停止后立即终止子进程
      const stopPoller = setInterval(() => {
        if (isStopped()) child.kill('SIGKILL')
      }, 200)

      const finish = (err?: Error, value?: Buffer): void => {
        if (settled) return
        settled = true
        clearTimeout(watchdog)
        clearInterval(stopPoller)
        err ? reject(err) : resolve(value as Buffer)
      }

      child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk))
      child.stderr.on('data', (chunk: Buffer) => {
        stderrTail = (stderrTail + chunk.toString()).slice(-2000)
      })
      child.on('error', (err) => finish(new Error(`piper spawn failed: ${err.message}`)))
      child.on('close', (code, signal) => {
        if (isStopped()) {
          finish(new Error('piper synthesis stopped'))
          return
        }
        if (signal) {
          finish(new Error(`piper terminated by ${signal}`))
          return
        }
        if (code !== 0) {
          finish(new Error(`piper exited ${code}: ${stderrTail.trim() || 'no stderr'}`))
          return
        }
        const pcm = Buffer.concat(chunks)
        if (pcm.length === 0) {
          finish(new Error('piper produced no audio'))
          return
        }
        finish(undefined, pcm)
      })

      // piper 从 stdin 逐行读取待合成文本；换行会触发句间停顿，压平为单行
      child.stdin.on('error', () => {
        // 进程被 kill 时 stdin EPIPE 属预期，由 close 统一收尾
      })
      child.stdin.end(text.replace(/\s*\n+\s*/g, ' ').trim() + '\n')
    })
  }
}

/** Edge rate -100~+100 → piper length_scale（越大越慢）；夹取到 0.25~4 防除零与极端值 */
export function rateToLengthScale(rate: number): number {
  const clamped = Math.max(-99, Math.min(100, rate))
  const scale = 1 / (1 + clamped / 100)
  return Math.min(4, Math.max(0.25, scale))
}

/** Edge volume -100~+100 → PCM 增益倍数（0~2，0 时静音） */
export function volumeToGain(volume: number): number {
  const gain = (100 + Math.max(-100, Math.min(100, volume))) / 100
  return Math.min(2, gain)
}

/** 按 16-bit 有符号样本逐点应用增益（饱和处理防溢出爆音） */
export function applyGainS16(pcm: Buffer, gain: number): Buffer {
  if (gain === 1) return pcm
  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 2))
  for (let i = 0; i < samples.length; i++) {
    const v = Math.round(samples[i] * gain)
    samples[i] = v > 32767 ? 32767 : v < -32768 ? -32768 : v
  }
  return pcm
}

/** 将 16-bit 单声道 PCM 打包为 44 字节头 RIFF WAVE 容器 */
export function buildWav(pcm: Buffer, sampleRate: number): Buffer {
  const header = Buffer.alloc(44)
  header.write('RIFF', 0, 'ascii')
  header.writeUInt32LE(36 + pcm.length, 4)
  header.write('WAVE', 8, 'ascii')
  header.write('fmt ', 12, 'ascii')
  header.writeUInt32LE(16, 16) // fmt chunk 大小
  header.writeUInt16LE(1, 20) // PCM
  header.writeUInt16LE(1, 22) // 单声道
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * 2, 28) // byteRate = sr * blockAlign
  header.writeUInt16LE(2, 32) // blockAlign = 1 sample * 2 bytes
  header.writeUInt16LE(16, 34) // bits per sample
  header.write('data', 36, 'ascii')
  header.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([header, pcm])
}
