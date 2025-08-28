// vite.config.ts (repo 최상위)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Node ESM에서 __dirname 만들기
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(() => ({
  // 프론트 소스 루트는 client/
  root: path.resolve(__dirname, 'client'),
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client', 'src'),
      '@shared': path.resolve(__dirname, 'shared'),
      '@assets': path.resolve(__dirname, 'attached_assets'),
    },
  },
  // 빌드 산출물은 dist/public 로 (서버가 이 폴더를 정적 서빙)
  build: {
    outDir: path.resolve(__dirname, 'dist/public'),
    emptyOutDir: true,
  },
}))

