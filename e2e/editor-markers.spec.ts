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

  test('语气插入：未选中时插入成对标签，光标落在两标签之间', async () => {
    const editor = ctx.page.getByTestId('script-editor')
    // 默认语气为 happy；未选中文本 → 插入 [happy][/happy]
    await ctx.page.getByTestId('tone-select').selectOption('sad')
    await ctx.page.getByTestId('insert-tone').click()
    await expect(editor).toHaveValue('[sad][/sad]')
    // 焦点回到编辑器且选区在两标签之间，直接输入即落入标签内
    await editor.type('唉')
    await expect(editor).toHaveValue('[sad]唉[/sad]')
  })

  test('语气插入：选中文本时两端包裹', async () => {
    const editor = ctx.page.getByTestId('script-editor')
    await editor.click()
    await editor.type('平静的话')
    // 全选后选择 calm 语气插入 → 两端包裹
    await editor.press('ControlOrMeta+a')
    await ctx.page.getByTestId('tone-select').selectOption('calm')
    await ctx.page.getByTestId('insert-tone').click()
    await expect(editor).toHaveValue('[calm]平静的话[/calm]')
  })
})
