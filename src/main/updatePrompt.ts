/**
 * 更新确认弹窗判定（纯函数，可单测）：
 * 发现新版本时是否向用户弹出确认对话框。
 */
export function shouldPromptUpdate(options: {
  /** 用户上次选择“不再提示”的版本号（'' = 从未跳过） */
  skippedVersion: string
  /** 新版本号 */
  newVersion: string
  /** 本次检查是否由用户手动发起（菜单“检查更新”） */
  isManualCheck: boolean
}): boolean {
  // 手动检查是用户主动行为，无视“不再提示”，一律弹出
  if (options.isManualCheck) return true
  // “不再提示”仅对被跳过的版本生效：更新到更高版本后仍会弹出
  return options.skippedVersion !== options.newVersion
}
