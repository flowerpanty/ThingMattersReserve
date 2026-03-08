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

// Database initialization function - runs in background after server starts
async function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  DATABASE_URL not set, skipping database initialization');
    return;
  }

  try {
    console.log('🔄 Initializing database...');
    const { db } = await import('./db');
    const { sql } = await import('drizzle-orm');

    // Drizzle ORM이 인식할 수 있도록 스키마 import
    const { orders } = await import('../shared/schema');

    // orders 테이블 생성 - ID는 애플리케이션에서 생성
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR PRIMARY KEY,
        customer_name TEXT NOT NULL,
        customer_contact TEXT NOT NULL,
        delivery_date TEXT NOT NULL,
        delivery_method TEXT NOT NULL DEFAULT 'pickup',
        pickup_time TEXT,
        order_items JSON NOT NULL,
        total_price INTEGER NOT NULL,
        order_status TEXT NOT NULL DEFAULT 'pending',
        payment_confirmed INTEGER NOT NULL DEFAULT 0,
        payment_method TEXT,
        quote_file_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 기존 테이블에 pickup_time 및 payment_method 컬럼 추가 (이미 존재하는 경우를 대비해 별도 실행)
    try {
      await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_time TEXT`);
    } catch (e) {
      console.log('ℹ️ pickup_time 컬럼 추가 건너뜀 (이미 존재하거나 오류 발생)');
    }

    try {
      await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT`);
    } catch (e) {
      console.log('ℹ️ payment_method 컬럼 추가 건너뜀 (이미 존재하거나 오류 발생)');
    }

    console.log('✅ Database initialized successfully (v5)');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    console.error('Details:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

(async () => {
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
  // Other ports are firewalled. Default to 5001 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5001', 10);

  // START SERVER FIRST - critical for healthcheck to succeed
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`✅ Server listening on port ${port}`);

    // Initialize database in background (non-blocking)
    initializeDatabase().catch(err => {
      console.error('❌ Database initialization failed, but server will continue running');
      console.error('Error:', err);
    });
  });
})();

