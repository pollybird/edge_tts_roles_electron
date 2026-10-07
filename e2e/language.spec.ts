import { expect, test } from '@playwright/test'
import { clickLanguageMenu, launchApp, readStore, type AppContext } from './fixtures'

/**
 * 顶层“语言”菜单切换：原生菜单 click → 主进程持久化 + IPC 广播 →
 * 渲染进程实时刷新；重启后从 electron-store 恢复。
 */
test.describe('语言菜单切换与持久化', () => {
  let ctx: AppContext

  test.afterEach(async () => {
    await ctx?.cleanup()
  })

  test('菜单切换语言即时生效并持久化，重启后恢复', async () => {
    // 夹具强制系统语言为英文并预置已同意协议
    ctx = await launchApp({ accepted: true })
    const editor = ctx.page.getByTestId('script-editor')

    // 初始：跟随系统 → 英文界面
    await expect(editor).toHaveAttribute('placeholder', /Enter the text to convert/)

    // 切到简体中文：界面文案立即变化
    await clickLanguageMenu(ctx.app, '简体中文')
    await expect(editor).toHaveAttribute('placeholder', /输入要转换为语音的文本/)
    expect((await readStore(ctx.userData)).locale).toBe('zh-CN')

    // 切回英文
    await clickLanguageMenu(ctx.app, 'English')
    await expect(editor).toHaveAttribute('placeholder', /Enter the text to convert/)
    expect((await readStore(ctx.userData)).locale).toBe('en-US')

    // 再次切到中文后重启：偏好必须从配置恢复（不再跟随系统英文）
    await clickLanguageMenu(ctx.app, '简体中文')
    await expect(editor).toHaveAttribute('placeholder', /输入要转换为语音的文本/)

    const userData = ctx.userData
    await ctx.app.close()
    ctx = await launchApp({ userData })
    await expect(ctx.page.getByTestId('script-editor')).toHaveAttribute(
      'placeholder',
      /输入要转换为语音的文本/
    )
    expect((await readStore(userData)).locale).toBe('zh-CN')
  })
})
