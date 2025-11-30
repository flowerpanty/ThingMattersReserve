// server/vite.ts
import type { Express } from 'express'
import express from 'express'
import fs from 'fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer as createViteServer, createLogger } from 'vite'

const viteLogger = createLogger()

// ✅ server/index.ts 에서 import 하는 log 함수 다시 export
export function log(message: string, source = 'express') {
  const formattedTime = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
  console.log(`${formattedTime} [${source}] ${message}`)
}

// 개발 모드에서만 Vite 미들웨어 사용
export async function setupVite(app: Express, server: any) {
  const vite = await createViteServer({
    configFile: true,         // 루트의 vite.config.ts 자동 로드
    server: {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true as const,
    },
    appType: 'custom',
    customLogger: viteLogger,
  })
  app.use(vite.middlewares)
}

// 프로덕션: dist/public 정적 서빙
export function serveStatic(app: Express) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url)) // => dist/
  const publicDir = path.join(__dirname, 'public')               // => dist/public

  if (!fs.existsSync(publicDir)) {
    throw new Error(`Could not find build dir: ${publicDir}. Run "vite build" first.`)
  }

  app.use(express.static(publicDir))

  // 루트 페이지
  app.get('/', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'))
  })

  // SPA 라우팅: 모든 경로를 index.html로 리다이렉트
  app.get('*', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'))
  })
}

