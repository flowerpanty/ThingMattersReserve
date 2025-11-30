// Load .env file in development only (Railway provides env vars directly)
if (process.env.NODE_ENV !== "production") {
  try {
    require("dotenv/config");
  } catch (e) {
    console.log("dotenv not available, using system environment variables");
  }
}

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// server/index.ts (초반 아무 데나)
app.get('/healthz', (_req, res) => res.status(200).send('ok'))

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 1000) {
        logLine = logLine.slice(0, 1000) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // 서버 시작 전에 데이터베이스 테이블 생성
  try {
    if (process.env.DATABASE_URL) {
      console.log('🔄 데이터베이스 테이블 확인 중...');
      const { db } = await import('./db');
      const { sql } = await import('drizzle-orm');

      // orders 테이블 생성 (존재하지 않으면)
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          customer_name TEXT NOT NULL,
          customer_contact TEXT NOT NULL,
          delivery_date TEXT NOT NULL,
          delivery_method TEXT,
          order_items JSONB NOT NULL,
          total_price INTEGER NOT NULL,
          order_status TEXT,
          payment_confirmed INTEGER DEFAULT 0,
          quote_file_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log('✅ 데이터베이스 테이블 준비 완료!');
    } else {
      console.log('⚠️  DATABASE_URL이 설정되지 않았습니다. 메모리 저장소를 사용합니다.');
    }
  } catch (error) {
    console.error('❌ 데이터베이스 초기화 오류:', error);
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();

