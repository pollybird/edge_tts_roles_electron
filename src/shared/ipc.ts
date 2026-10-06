/** 主进程 ↔ 渲染进程 IPC 通道定义（唯一事实来源，双侧共用） */
export const IpcChannels = {
  // invoke（渲染 → 主，有返回值）
  listVoices: 'tts:list-voices',
  generate: 'tts:generate',
  preview: 'tts:preview',
  stop: 'tts:stop',
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  dialogOpenTextFile: 'dialog:open-text-file',
  dialogSaveTextFile: 'dialog:save-text-file',
  dialogSaveAudioFile: 'dialog:save-audio-file',
  dialogPickAudioFile: 'dialog:pick-audio-file',
  readAudioFile: 'file:read-audio',
  configSaveRoleSettings: 'config:save-role-settings',
  configLoadRoleSettings: 'config:load-role-settings',
  // 语言：启动时渲染进程用 settings:get 读取偏好；菜单切换后主进程广播此事件
  localeChanged: 'locale:changed',
  // 用户拒绝用户协议时退出应用
  appQuit: 'app:quit',
  menuAction: 'menu:action',
  // 自动更新（invoke：渲染→主；send：主→渲染推送状态）
  updateCheck: 'update:check',
  updateInstall: 'update:install',
  updateChecking: 'update:checking',
  updateAvailable: 'update:available',
  updateNotAvailable: 'update:not-available',
  updateDownloadProgress: 'update:download-progress',
  updateDownloaded: 'update:downloaded',
  updateError: 'update:error',
  // send（主 → 渲染，事件推送）
  progress: 'tts:progress',
  finished: 'tts:finished',
  taskError: 'tts:error'
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]
