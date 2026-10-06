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

/** 文本片段：parseText 的解析结果 */
export type Segment =
  | { type: 'text'; text: string; role: RoleId }
  | { type: 'pause'; durationMs: number }
  | { type: 'beep' }

export type AudioFormat = 'wav' | 'mp3' | 'ogg' | 'flac'

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
}

/** 任务错误事件 */
export interface ErrorPayload {
  kind: TaskKind
  message: string
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
  /** 订阅主菜单动作（文件/编辑/帮助中需渲染进程处理的项），返回取消订阅函数 */
  onMenuAction(cb: (actionId: string) => void): () => void
  /** 订阅事件，返回取消订阅函数 */
  onProgress(cb: (payload: ProgressPayload) => void): () => void
  onFinished(cb: (payload: FinishedPayload) => void): () => void
  onError(cb: (payload: ErrorPayload) => void): () => void
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
  | { type: 'error'; message: string }
