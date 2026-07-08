import { defineConfig } from 'vitest/config'

// 與 vite.config.js 分開，避免測試框架缺席時影響正式 build/deploy。
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.js']
  }
})
