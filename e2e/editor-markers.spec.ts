import { expect, test } from '@playwright/test'
import { launchApp, type AppContext } from './fixtures'

/**
 * 编辑器工具栏标记插入：角色 [A]-[D]、自定义毫秒停顿、蜂鸣 [R]、快捷停顿。
 * 标记在光标处顺序插入，手输文本与标记可混合。
 */
test.describe('脚本标记插入', () => {
  let ctx: AppContext

  test.beforeEach(async () => {
    ctx = await launchApp({ accepted: true })
    await expect(ctx.page.getByTestId('script-editor')).toBeVisible()
  })

  test.afterEach(async () => {
    await ctx?.cleanup()
  })

  test('角色标记按点击顺序追加', async () => {
    const editor = ctx.page.getByTestId('script-editor')
    await ctx.page.getByTestId('insert-role-A').click()
    await expect(editor).toHaveValue('[A]')
    await ctx.page.getByTestId('insert-role-C').click()
    await expect(editor).toHaveValue('[A][C]')
  })

  test('自定义停顿毫秒数生效，蜂鸣与快捷停顿依次插入', async () => {
    const editor = ctx.page.getByTestId('script-editor')

    await ctx.page.getByTestId('insert-role-A').click()
    await ctx.page.getByTestId('pause-ms').fill('500')
    await ctx.page.getByTestId('insert-pause').click()
    await ctx.page.getByTestId('insert-beep').click()
    await ctx.page.getByTestId('quick-pause-1000').click()

    await expect(editor).toHaveValue('[A][500][R][1000]')
  })

  test('标记后可继续手动输入文本', async () => {
    const editor = ctx.page.getByTestId('script-editor')
    await ctx.page.getByTestId('insert-role-B').click()
    await editor.click()
    await editor.type('hello')
    await expect(editor).toHaveValue('[B]hello')
  })
})
