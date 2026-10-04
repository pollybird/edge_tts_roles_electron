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
  menuAction: 'menu:action',
  // send（主 → 渲染，事件推送）
  progress: 'tts:progress',
  finished: 'tts:finished',
  taskError: 'tts:error'
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]
