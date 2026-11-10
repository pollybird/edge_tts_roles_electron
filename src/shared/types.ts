/** 角色标识，对应文本标记 [A]/[B]/[C]/[D] */
export type RoleId = 'A' | 'B' | 'C' | 'D'

export const ROLE_IDS: readonly RoleId[] = ['A', 'B', 'C', 'D']

/** 单个角色的语音参数（偏移量语义与 edge-tts 的 prosody 参数一致） */
export interface VoiceSettings {
  /** 语音 shortName，如 zh-CN-XiaoxiaoNeural */
  voice: string
  /** 语速百分比偏移（-100 ~ +100），对应 prosody rate="+0%" */
  rate: number
  /** 音量百分比偏移（-100 ~ +100） */
  volume: number
  /** 音调 Hz 偏移（-100 ~ +100），对应 prosody pitch="+0Hz" */
  pitch: number
}

export type RoleVoiceSettings = Record<RoleId, VoiceSettings>

/** 语气标签集合（语法 [tone]...[/tone]，作用范围到闭合标签或文末） */
export type ToneId = 'happy' | 'sad' | 'angry' | 'gentle' | 'excited' | 'calm'

export const TONE_IDS: readonly ToneId[] = ['happy', 'sad', 'angry', 'gentle', 'excited', 'calm']

/** 语气 → 韵律偏移（叠加到角色设置上，全引擎通用映射；缓存键含折算后参数，天然隔离） */
export interface ProsodyOffset {
  rate: number
  volume: number
  pitch: number
}

export const TONE_PROSODY: Record<ToneId, ProsodyOffset> = {
  happy: { rate: 10, volume: 6, pitch: 20 },
  sad: { rate: -15, volume: -6, pitch: -20 },
  angry: { rate: 15, volume: 12, pitch: 8 },
  gentle: { rate: -10, volume: -4, pitch: 6 },
  excited: { rate: 25, volume: 10, pitch: 15 },
  calm: { rate: -20, volume: -2, pitch: -5 }
}

/** clamp 范围与界面滑块一致（rate/volume/pitch 均为 -100 ~ +100） */
const PROSODY_LIMIT = 100

/**
 * 把语气偏移叠加到角色设置上，返回新对象（不修改入参）；
 * tone 为 null 时原样返回。偏移结果 clamp 到滑块允许范围。
 */
export function applyTone(base: VoiceSettings, tone: ToneId | null): VoiceSettings {
  if (!tone) return base
  const offset = TONE_PROSODY[tone]
  const clamp = (v: number): number => Math.max(-PROSODY_LIMIT, Math.min(PROSODY_LIMIT, v))
  return {
    ...base,
    rate: clamp(base.rate + offset.rate),
    volume: clamp(base.volume + offset.volume),
    pitch: clamp(base.pitch + offset.pitch)
  }
}

/** 文本片段：parseText 的解析结果 */
export type Segment =
  | { type: 'text'; text: string; role: RoleId; tone?: ToneId }
  | { type: 'pause'; durationMs: number }
  | { type: 'beep' }

export type AudioFormat = 'wav' | 'mp3' | 'ogg' | 'flac'

/** 字幕输出格式；'' = 不生成字幕 */
export type SubtitleFormat = '' | 'lrc' | 'srt'

/** 一路用户附加音频（前奏 / 尾声 / 背景音乐） */
export interface ExtraAudioTrack {
  /** 本地音频文件绝对路径；空串表示未选择 */
  path: string
  /** 播放音量百分比（0~100），100 为原始音量 */
  volume: number
}

/** 附加音频三件套：前奏（语音前）、尾声（语音后）、背景音乐（语音期间循环混音） */
export interface AudioExtras {
  intro: ExtraAudioTrack
  outro: ExtraAudioTrack
  bgm: ExtraAudioTrack
}

/** 附加音频默认值；背景音乐默认 30%，避免盖过人声 */
export function createDefaultAudioExtras(): AudioExtras {
  return {
    intro: { path: '', volume: 100 },
    outro: { path: '', volume: 100 },
    bgm: { path: '', volume: 30 }
  }
}

/** Edge TTS 语音列表条目 */
export interface VoiceInfo {
  shortName: string
  friendlyName: string
  locale: string
  gender: string
}

export interface GenerateRequest {
  text: string
  roleSettings: RoleVoiceSettings
  outputPath: string
  format: AudioFormat
  /** 可选：前奏 / 尾声 / 背景音乐 */
  extras?: AudioExtras
  /** 可选：随音频同步生成的字幕格式（缺省 = 不生成） */
  subtitleFormat?: SubtitleFormat
}

export interface PreviewRequest {
  text: string
  roleSettings: RoleVoiceSettings
  /** 可选：前奏 / 尾声 / 背景音乐（试听同样参与混音） */
  extras?: AudioExtras
}

/** 主进程推送给渲染进程的进度事件 */
export interface ProgressPayload {
  percent: number
  message: string
}

export type TaskKind = 'generate' | 'preview'

/** 生成/试听完成事件。生成：输出文件路径；试听：临时 WAV 文件路径 */
export interface FinishedPayload {
  kind: TaskKind
  filePath: string
  /** 同步生成的字幕文件路径（未生成字幕时缺省） */
  subtitlePath?: string
}

/** 任务错误事件 */
export interface ErrorPayload {
  kind: TaskKind
  message: string
}

/** 任务被用户停止事件（生成/试听中断后通知渲染进程复位界面状态） */
export interface StoppedPayload {
  kind: TaskKind
}

/** 渲染进程 API 契约（preload 实现，渲染进程经 window.api 使用） */
export interface RendererApi {
  listVoices(): Promise<VoiceInfo[]>
  generate(req: GenerateRequest): Promise<void>
  preview(req: PreviewRequest): Promise<void>
  stop(): Promise<void>
  getSetting<T = unknown>(key: string): Promise<T>
  setSetting(key: string, value: unknown): Promise<void>
  openTextFile(): Promise<{ path: string; content: string } | null>
  saveTextFile(content: string): Promise<string | null>
  saveAudioFile(format: AudioFormat): Promise<string | null>
  /** 弹出文件选择对话框选择本地音频文件（前奏/尾声/背景音乐），取消返回 null */
  pickAudioFile(): Promise<string | null>
  readAudioFile(filePath: string): Promise<Uint8Array>
  /** 将四角色的发音人/语速/音量/音调保存为 JSON 配置文件，返回保存路径（取消返回 null） */
  saveRoleSettings(settings: RoleVoiceSettings): Promise<string | null>
  /** 从 JSON 配置文件加载角色语音设置（取消或校验失败返回 null） */
  loadRoleSettings(): Promise<RoleVoiceSettings | null>
  /** 订阅主进程“语言”菜单切换广播（启动偏好通过 getSetting('locale') 读取），返回取消订阅函数 */
  onLocaleChanged(cb: (code: string) => void): () => void
  /** 拒绝用户协议时退出应用 */
  quitApp(): Promise<void>
  /** 手动检查更新 */
  checkForUpdates(): Promise<void>
  /** 下载完成后立即安装并重启 */
  installUpdate(): Promise<void>
  /** 订阅更新状态事件，返回取消订阅函数 */
  onUpdateEvent(cb: (event: UpdateEvent) => void): () => void
  /** 开始下载已确认的更新（autoDownload 关闭后由用户在确认弹窗中触发），进度经 onUpdateEvent 推送 */
  downloadUpdate(): Promise<void>
  /** 将指定版本标记为“不再提示”：启动静默检查发现该版本时不再弹出更新确认；手动检查不受影响 */
  skipUpdateVersion(version: string): Promise<void>
  /** 订阅主菜单动作（文件/编辑/帮助中需渲染进程处理的项），返回取消订阅函数 */
  onMenuAction(cb: (actionId: string) => void): () => void
  /** 订阅事件，返回取消订阅函数 */
  onProgress(cb: (payload: ProgressPayload) => void): () => void
  onFinished(cb: (payload: FinishedPayload) => void): () => void
  onError(cb: (payload: ErrorPayload) => void): () => void
  /** 任务被用户停止（生成/试听中断） */
  onStopped(cb: (payload: StoppedPayload) => void): () => void
  /** Piper 模型清单 + 引擎可用性 */
  piperList(): Promise<PiperListPayload>
  /** 下载 Piper 模型（进度经 onPiperDownloadProgress 推送；完成后需重新 piperList 刷新状态） */
  piperDownload(id: string): Promise<void>
  /** 删除已下载的 Piper 模型 */
  piperRemove(id: string): Promise<void>
  /** 订阅 Piper 模型下载进度，返回取消订阅函数 */
  onPiperDownloadProgress(cb: (p: PiperDownloadProgress) => void): () => void
  /** 云服务商可用音色清单（未启用/未配置的服务商为 null）；保存凭据后重新调用刷新 */
  cloudVoices(): Promise<CloudVoicesPayload>
  /** 打开外部链接（主进程白名单校验后经 shell.openExternal） */
  openExternal(url: string): Promise<void>
  /** 云服务商连接测试：以首个目录音色做一次微型合成，丢弃音频，返回成功/失败原因 */
  cloudTest(provider: CloudProviderId): Promise<CloudTestResult>
}

/** Piper 策略：fallback 在线优先（默认，失败时离线兜底）/ off 仅在线 / prefer 仅离线（发音人限已下载的离线模型） */
export type PiperFallback = 'off' | 'fallback' | 'prefer'

/** 云服务商标识（音色 id 前缀：google:<name> / xfyun:<vcn> / volc:<voiceType>） */
export type CloudProviderId = 'google' | 'xfyun' | 'volc'

export const CLOUD_PROVIDER_IDS: readonly CloudProviderId[] = ['google', 'xfyun', 'volc']

/** 云音色条目（发音人下拉展示用）；voiceName/langName 为原生名（endonym），不随界面语言变化 */
export interface CloudVoiceInfo {
  /** 服务商前缀后的裸音色 id（google name / 讯飞 vcn / 火山 voice_type） */
  id: string
  /** 音色显示名（原生名） */
  voiceName: string
  /** 语言/区域显示名（原生名或 locale 码） */
  langName: string
  gender?: 'female' | 'male'
}

/** Google Cloud Text-to-Speech 凭据 */
export interface GoogleProviderSettings {
  enabled: boolean
  apiKey: string
}

/** 科大讯飞在线语音合成凭据（appId + apiKey + apiSecret 三元组） */
export interface XfyunProviderSettings {
  enabled: boolean
  appId: string
  apiKey: string
  apiSecret: string
}

/** 火山引擎 TTS 凭据（App ID 标识应用；API Key 为新版控制台签发，替代旧版 Access Token） */
export interface VolcProviderSettings {
  enabled: boolean
  appId: string
  apiKey: string
}

/** 三个云服务商的凭据配置（设置→语音服务 对话框维护；敏感字段经 safeStorage 加密后落盘） */
export interface CloudProvidersSettings {
  google: GoogleProviderSettings
  xfyun: XfyunProviderSettings
  volc: VolcProviderSettings
}

/** 云服务商网络代理模式：直连 / 跟随系统代理 / 自定义代理服务器 */
export type CloudProxyMode = 'direct' | 'system' | 'custom'

/** 自定义代理协议：SOCKS5 或 HTTP */
export type CloudProxyProtocol = 'socks5' | 'http'

/** 云服务商网络代理设置（影响 Google/讯飞/火山三家的合成与音色清单请求） */
export interface CloudProxySettings {
  mode: CloudProxyMode
  /** mode='custom' 时的代理协议 */
  protocol: CloudProxyProtocol
  /** mode='custom' 时的代理主机（IP 或域名） */
  host: string
  /** mode='custom' 时的代理端口 */
  port: number
}

export const DEFAULT_CLOUD_PROXY: CloudProxySettings = {
  mode: 'direct',
  protocol: 'socks5',
  host: '',
  port: 1080
}

export function createDefaultCloudProviders(): CloudProvidersSettings {
  return {
    google: { enabled: false, apiKey: '' },
    xfyun: { enabled: false, appId: '', apiKey: '', apiSecret: '' },
    volc: { enabled: false, appId: '', apiKey: '' }
  }
}

/** cloudVoices IPC 返回：某服务商未启用/未配置时为 null（下拉不显示该分组） */
export interface CloudVoicesPayload {
  google: CloudVoiceInfo[] | null
  xfyun: CloudVoiceInfo[] | null
  volc: CloudVoiceInfo[] | null
}

/** cloudTest IPC 返回：真实微型合成验证凭据可用性 */
export interface CloudTestResult {
  ok: boolean
  /** 失败时的错误描述（已本地化） */
  error?: string
}

/** cloudTest IPC 请求参数 */
export type CloudTestRequest = { provider: CloudProviderId }

/** Piper 离线引擎模型清单条目（「设置→离线引擎」对话框展示用） */
export interface PiperVoiceStatus {
  id: string
  /** 模型原生名（专有名词，不随界面语言变化，如 huayan） */
  voiceName: string
  /** 语言原生名（endonym，不随界面语言变化，如 简体中文） */
  langName: string
  quality: string
  sizeMB: number
  downloaded: boolean
}

/** Piper 引擎状态：engineAvailable=false 表示当前平台无可用二进制（如 win-arm64） */
export interface PiperListPayload {
  engineAvailable: boolean
  voices: PiperVoiceStatus[]
}

/** Piper 模型下载进度事件（主进程 → 渲染进程推送；total=0 时按未知大小处理） */
export interface PiperDownloadProgress {
  id: string
  received: number
  total: number
  /** 本次是否为断点续传（检测到 .part 残留从断点继续） */
  resuming?: boolean
}

/** 自动更新事件（主进程→渲染进程） */
export type UpdateEvent =
  | { type: 'checking' }
  | { type: 'available'; version: string; releaseDate?: string }
  | { type: 'not-available'; version: string; manual: boolean }
  | {
      type: 'download-progress'
      percent: number
      bytesPerSecond: number
      total: number
      transferred: number
    }
  | { type: 'downloaded'; version: string }
  /** 更新检查失败：仅 manual=true（用户手动触发）时渲染进程提示；静默检查失败零打扰 */
  | { type: 'error'; manual: boolean }
