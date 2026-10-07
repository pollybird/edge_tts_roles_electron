import type { TTSProvider } from './types'
import { EdgeTTSProvider } from './edgeTtsProvider'

/**
 * 创建默认 Provider：当前固定为 edge-tts 在线服务。
 * 未来接入 ONNX 本地回退时，在此按设置（网络可用性 / 用户选择）返回对应实现。
 */
export function createDefaultProvider(): TTSProvider {
  return new EdgeTTSProvider()
}
