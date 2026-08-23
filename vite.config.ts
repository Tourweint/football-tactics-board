import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 部署到 GitHub Pages 子路径时通过 VITE_BASE 环境变量指定 base（本地开发保持默认 '/'）
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
})
