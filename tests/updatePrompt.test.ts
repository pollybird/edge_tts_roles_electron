import { describe, expect, it } from 'vitest'
import { shouldPromptUpdate } from '../src/main/updatePrompt'

// 更新确认弹窗判定：手动检查无视“不再提示”；跳过记录按版本号生效
describe('shouldPromptUpdate', () => {
  it('从未跳过（空记录）时静默检查也应弹出', () => {
    expect(
      shouldPromptUpdate({ skippedVersion: '', newVersion: '2.0.5', isManualCheck: false })
    ).toBe(true)
  })

  it('新版本与被跳过版本不同时弹出（更高版本重新提示）', () => {
    expect(
      shouldPromptUpdate({ skippedVersion: '2.0.5', newVersion: '2.0.6', isManualCheck: false })
    ).toBe(true)
  })

  it('新版本正是被跳过的版本时静默（启动检查不弹窗）', () => {
    expect(
      shouldPromptUpdate({ skippedVersion: '2.0.5', newVersion: '2.0.5', isManualCheck: false })
    ).toBe(false)
  })

  it('手动检查无视“不再提示”，即使版本正是被跳过的也弹出', () => {
    expect(
      shouldPromptUpdate({ skippedVersion: '2.0.5', newVersion: '2.0.5', isManualCheck: true })
    ).toBe(true)
  })
})
