import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/personalrecord/', // Set base path for GitHub Pages
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    host: true,
    port: 5174, // Default to 5174 to avoid conflict with other apps on 5173
    strictPort: false // If 5174 is taken, try next port
  }
})
