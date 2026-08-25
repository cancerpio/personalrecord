import { defineConfig } from 'vitest/config'

// 與 vite.config.js 分開，避免測試框架缺席時影響正式 build/deploy。
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.js'],
    // 釘住時區。本專案有「本地日期 vs UTC 日期」的邏輯，
    // 跟著執行機器的時區跑會讓測試在 CI 與本機得到不同結果。
    env: { TZ: 'Asia/Taipei' }
  }
})
