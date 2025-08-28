// server/vite.ts
import type { Express } from 'express'
import express from 'express'
import fs from 'fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer as createViteServer, createLogger } from 'vite'
// ❌ import viteConfig from "../vite.config";  // <- 이 라인 제거!

const viteLogger = createLogger()

export async function setupVite(app: Express, server: any) {
  const vite = await createViteServer({
    // 설정 파일을 자동으로 읽게 함 (루트의 vite.config.ts 사용)
    configFile: true,
    server: {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true as const,
    },
    appType: 'custom',
    // 로그 커스터마이즈는 필요시 유지
    customLogger: viteLogger,
  })

  app.use(vite.middlewares)
}

export function serveStatic(app: Express) {
  // 빌드 후 런타임 기준은 dist/
  const __dirname = path.dirname(fileURLToPath(import.meta.url)) // => dist/
  const publicDir = path.join(__dirname, 'public')               // => dist/public

  if (!fs.existsSync(publicDir)) {
    throw new Error(`Could not find build dir: ${publicDir}. Run "vite build" first.`)
  }

  app.use(express.static(publicDir))

  // 루트(/) 문서
  app.get('/', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'))
  })

  // SPA 라우팅이 필요하면 가장 마지막에:
  // app.get('*', (_req, res) => res.sendFile(path.join(publicDir, 'index.html')))
}
