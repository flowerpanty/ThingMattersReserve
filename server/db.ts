import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema';

// PostgreSQL 연결
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
}

// PostgreSQL 클라이언트 생성
export const client = postgres(connectionString);

// Drizzle ORM 인스턴스
export const db = drizzle(client, { schema });
