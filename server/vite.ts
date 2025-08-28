// server/vite.ts
import type { Express } from 'express'
import express from 'express'
import fs from 'fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export function serveStatic(app: Express) {
  // dist/ 위치를 기준으로 public 디렉터리 계산
  const __dirname = path.dirname(fileURLToPath(import.meta.url)) // => dist/
  const publicDir = path.join(__dirname, 'public')               // => dist/public

  if (!fs.existsSync(publicDir)) {
    throw new Error(`Could not find the build directory: ${publicDir}. Run "vite build" first.`)
  }

  // 1) 정적 파일 서빙
  app.use(express.static(publicDir))

  // 2) 루트(/) 처리
  app.get('/', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'))
  })

  // 3) (선택) SPA 라우팅: API 라우트 등록 **이후**, 마지막에 배치
  // app.get('*', (_req, res) => res.sendFile(path.join(publicDir, 'index.html')))
}
