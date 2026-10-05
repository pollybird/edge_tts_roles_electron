import { defineConfig } from 'vitest/config'

// 与 electron-vite 相互独立的最简配置：仅在 Node 环境跑 tests/ 下的纯逻辑单元测试
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/out/**']
  }
})
