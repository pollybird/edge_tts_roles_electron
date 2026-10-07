/** 单片段合成请求参数 */
export interface TtsSegmentRequest {
  /** 已裁剪的待合成文本 */
  text: string
  /** 发音人内部代号，如 zh-CN-XiaoxiaoNeural */
  voice: string
  /** 语速百分比偏移 -100~+100 */
  rate: number
  /** 音量百分比偏移 -100~+100 */
  volume: number
  /** 音调 Hz 偏移 -100~+100 */
  pitch: number
}

/** 单片段合成过程中的事件钩子 */
export interface TtsSynthesisHooks {
  /** 每收到一包音频数据回调（用于传输进度观测） */
  onAudioChunk?: () => void
}

/**
 * 单片段合成结果：
 * complete 表示音频流按服务端收尾信号（turn.end）正常结束；
 * serverEndMs 为服务端宣告的语音终点（最后一个字的结束时刻，毫秒），
 * 用于调用方交叉校验音频时长是否被服务端提前收尾截断；未知时为 -1。
 */
export interface SynthesisOutcome {
  complete: boolean
  serverEndMs: number
}

/**
 * TTS 语音合成 Provider 抽象：
 * 将「单片段文本 → 音频文件」的传输实现与合成器的重试编排、磁盘缓存解耦。
 * 当前默认实现为 {@link EdgeTTSProvider}（edge-tts-universal 在线服务）；
 * 预留后续引入 ONNX 本地推理作为无网络离线回退的扩展点。
 */
export interface TTSProvider {
  /** 实现标识，用于日志与未来按设置选择实现 */
  readonly name: string
  /**
   * 合成单个文本片段并写入 outPath。
   *
   * 返回 outcome.complete 为 false 表示流不完整
   * （连接提前断开 / 数据间隔超时 / 收到停止信号），调用方按需重试。
   * complete 为 true 但实际音频时长明显短于 serverEndMs 时，
   * 说明服务端在推完音频前就提前收尾（无法从流信号察觉），调用方同样应重试。
   * 传输层错误（如服务端 50x）直接抛出，由调用方统一处理。
   */
  synthesizeSegment(
    req: TtsSegmentRequest,
    outPath: string,
    hooks: TtsSynthesisHooks,
    isStopped: () => boolean
  ): Promise<SynthesisOutcome>
}
