import { expect, test } from '@playwright/test'
import { launchApp, type AppContext } from './fixtures'

/**
 * Piper 离线引擎策略 E2E（无需真实二进制）：
 * 验证 prefer / off 两种策略下 UI 分支与合成路径的行为正确性。
 *
 * - prefer + 无已下载模型 → 发音人下拉显示引导文案
 * - prefer + 尝试合成 → 进度区提示 piperUnavailable
 * - off → 发音人下拉恢复 Edge 音色列表
 */
test.describe('离线引擎策略', () => {
  let ctx: AppContext

  test.afterEach(async () => {
    await ctx?.cleanup()
  })

  test('prefer 无已下载模型时发音人下拉显示引导文案', async () => {
    ctx = await launchApp({ accepted: true, piperFallback: 'prefer' })
    await expect(ctx.page.getByTestId('script-editor')).toBeVisible()

    const voiceSelect = ctx.page.getByTestId('role-voice-A')
    // 英文环境下显示引导文案（LANG=en_US）
    await expect(voiceSelect).toContainText('No offline models downloaded')
  })

  test('prefer 尝试合成时提示离线模型不可用', async () => {
    ctx = await launchApp({ accepted: true, piperFallback: 'prefer' })
    await expect(ctx.page.getByTestId('script-editor')).toBeVisible()

    // prefer 无模型时下拉只有空选项，无法通过 UI 选发音人；
    // 直接走 IPC 触发试听（绕过下拉），验证主进程 piperUnavailable 路径
    await ctx.page.evaluate(() => {
      const req = {
        text: '[A]你好',
        roleSettings: {
          A: { voice: 'zh_CN-huayan-medium', rate: 0, volume: 0, pitch: 0 },
          B: { voice: '', rate: 0, volume: 0, pitch: 0 },
          C: { voice: '', rate: 0, volume: 0, pitch: 0 },
          D: { voice: '', rate: 0, volume: 0, pitch: 0 }
        },
        extras: {
          intro: { path: '', volume: 100 },
          outro: { path: '', volume: 100 },
          bgm: { path: '', volume: 30 }
        }
      }
      return (
        window as unknown as {
          api: { preview: (r: typeof req) => Promise<void> }
        }
      ).api.preview(req)
    })

    // 错误经 taskError IPC → onError → progressMessage 显示 "Error: Offline model..."
    const msg = ctx.page.getByTestId('progress-message')
    await expect(msg).toContainText('Offline model for role A unavailable', { timeout: 15_000 })
  })

  test('off 策略发音人下拉恢复 Edge 音色列表', async () => {
    ctx = await launchApp({ accepted: true, piperFallback: 'off' })
    await expect(ctx.page.getByTestId('script-editor')).toBeVisible()

    const voiceSelect = ctx.page.getByTestId('role-voice-A')
    // off 策略下下拉列出 Edge 音色（非离线引导文案），首项为 "(none selected)"
    await expect(voiceSelect).toContainText('(none selected)')
    // Edge 音色按语言分组，至少有一个 optgroup
    const optgroups = voiceSelect.locator('optgroup')
    await expect(optgroups).not.toHaveCount(0)
  })
})
