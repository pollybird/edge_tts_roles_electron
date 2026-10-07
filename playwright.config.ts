import { defineConfig } from '@playwright/test'

/**
 * Electron UI 自动化（@playwright/test 的 _electron 驱动，无需下载浏览器）。
 * 运行前由 npm run test:e2e 先执行 electron-vite build，测试加载 out/ 下的产物。
 * workers=1：Electron 单实例 + 共享显示（CI 下 xvfb），用例间必须串行。
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    trace: 'retain-on-failure'
  }
})
