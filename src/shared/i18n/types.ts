/**
 * i18n 语言包类型定义。
 *
 * 设计目标：
 * - 新增语言 = 新增一个语言包文件 + 注册，业务代码零改动；
 * - voices 为音色命名空间；messages 为全部界面文案（点分 key 访问，如 t('menu.file')）；
 * - en-US 是基准包：任何语言缺失的条目自动回退英语，不会出现 undefined。
 */

/** Edge TTS 音色命名空间 */
export interface VoiceNamespace {
  /** shortName → 本地化人名（如 zh-CN-XiaoxiaoNeural → 晓晓）；缺失时用接口原名 */
  voiceNames: Record<string, string>
  /** locale → 本地化“语言（国家/地区）”；缺失时用接口英文 LocaleName */
  localeNames: Record<string, string>
  /** 性别译词 */
  gender: { female: string; male: string }
  /**
   * 显示名模板：{name} / {region} / {gender}
   * 不同语言可调整语序与分隔符（如日语习惯「名前（地域） - 性別」）
   */
  displayPattern: string
}

/**
 * 界面文案命名空间。每组是一组点分 key → 文案，支持 {name} 形式插值。
 * 新增界面文字时在 en-US（基准包）与各语言包同步添加。
 */
export interface Messages {
  app: Record<string, string>
  menu: Record<string, string>
  editor: Record<string, string>
  roles: Record<string, string>
  extras: Record<string, string>
  output: Record<string, string>
  preview: Record<string, string>
  message: Record<string, string>
  tts: Record<string, string>
  dialog: Record<string, string>
  help: Record<string, string>
  agreement: Record<string, string>
  about: Record<string, string>
}

/** 单个语言的完整资源包 */
export interface LocalePack {
  voices: VoiceNamespace
  messages: Messages
}

/** 语言包可以只覆盖部分命名空间/条目，其余回退基准包 */
export type PartialLocalePack = {
  voices?: Partial<VoiceNamespace>
  messages?: Partial<Messages>
}
