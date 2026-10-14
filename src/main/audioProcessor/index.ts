/**
 * 音频处理统一入口（re-export）：
 * 将纯 PCM 运算（pcmOps）与 ffmpeg 编解码（ffmpegOps）拆分后，
 * 通过此文件保持对外导入路径不变（`from './audioProcessor'` 或 `from '../audioProcessor'`）。
 */

export type { StereoPcm } from './types'

export {
  createSilence,
  createBeep,
  concatenate,
  applyGain,
  loopToLength,
  mixPcm,
  pcmFromS16le,
  writePcmCache,
  readPcmCache
} from './pcmOps'

export { tempPath, decodeAudioToPcm, encodeWav, encodeWithFfmpeg } from './ffmpegOps'
