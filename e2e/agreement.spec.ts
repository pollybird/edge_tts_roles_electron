import { expect, test } from '@playwright/test'
import { launchApp, readStore, waitForExit, type AppContext } from './fixtures'

/**
 * v2.0.3 首启用户协议门槛：
 * 全新安装首启必须同意；拒绝则退出；只有勾选“下次不再弹出”才持久化同意状态。
 */
test.describe('首启用户协议门槛', () => {
  let ctx: AppContext

  test.afterEach(async () => {
    await ctx?.cleanup()
  })

  test('全新 userData 首启强制弹出协议，复选框默认未勾选', async () => {
    ctx = await launchApp()
    const dialog = ctx.page.getByTestId('agreement-dialog')
    await expect(dialog).toBeVisible()
    await expect(ctx.page.getByTestId('agreement-accept')).toBeVisible()
    await expect(ctx.page.getByTestId('agreement-decline')).toBeVisible()
    await expect(ctx.page.getByTestId('agreement-optout')).not.toBeChecked()
  })

  test('ESC 与遮罩点击均不能绕过协议', async () => {
    ctx = await launchApp()
    const dialog = ctx.page.getByTestId('agreement-dialog')
    await expect(dialog).toBeVisible()

    // ESC 被组件显式拦截
    await ctx.page.keyboard.press('Escape')
    await expect(dialog).toBeVisible()

    // 点击弹窗外的遮罩区域不应关闭模态（取页面左上角遮罩处）
    await ctx.page.mouse.click(20, 200)
    await expect(dialog).toBeVisible()
  })

  test('拒绝协议后应用退出', async () => {
    ctx = await launchApp()
    await expect(ctx.page.getByTestId('agreement-dialog')).toBeVisible()

    const exit = waitForExit(ctx.app)
    await ctx.page.getByTestId('agreement-decline').click()
    // 主进程 app.quit() 生效，Electron 进程真正结束
    await exit
  })

  test('未勾选“下次不再弹出”时同意，重启后仍弹出协议', async () => {
    ctx = await launchApp()
    await ctx.page.getByTestId('agreement-accept').click()
    await expect(ctx.page.getByTestId('agreement-dialog')).toBeHidden()
    await expect(ctx.page.getByTestId('script-editor')).toBeVisible()

    // 同一 userData 重启：未持久化 → 再次要求同意
    const userData = ctx.userData
    await ctx.app.close()
    ctx = await launchApp({ userData })
    await expect(ctx.page.getByTestId('agreement-dialog')).toBeVisible()
    const store = await readStore(userData)
    expect(store.agreementAccepted).toBe(false)
  })

  test('勾选“下次不再弹出”后同意，重启直接进入主界面且状态持久化', async () => {
    ctx = await launchApp()
    await ctx.page.getByTestId('agreement-optout').check()
    await ctx.page.getByTestId('agreement-accept').click()
    await expect(ctx.page.getByTestId('agreement-dialog')).toBeHidden()

    const userData = ctx.userData
    await ctx.app.close()
    ctx = await launchApp({ userData })
    // 不再出现协议，编辑器立即可用
    await expect(ctx.page.getByTestId('agreement-dialog')).toHaveCount(0)
    await expect(ctx.page.getByTestId('script-editor')).toBeVisible()

    const store = await readStore(userData)
    expect(store.agreementAccepted).toBe(true)
  })
})
