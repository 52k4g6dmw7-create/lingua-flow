import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: '/' 默认（本地开发、Render/Netlify 等根路径托管正常）
// 设置 VITE_BASE=/lingua-flow/ 用于 GitHub Pages (https://<user>.github.io/<repo>/)
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
