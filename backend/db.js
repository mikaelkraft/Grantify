// Shared database connection for serverless handlers
// Uses Neon PostgreSQL with connection pooling optimized for serverless

import { Pool } from 'pg';

// Vercel's cron UI may flag functions as "error" when they emit deprecation warnings to stderr.
// This keeps logs clean in production without impacting local development.
if (process.env.VERCEL) {
  process.noDeprecation = true;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: (() => {
    const raw = process.env.PGPOOL_MAX || process.env.DB_POOL_MAX;
    const n = Number.parseInt(String(raw || '').trim(), 10);
    if (Number.isFinite(n) && n > 0) return Math.min(n, 50);
    // Serverless-safe default: allow some concurrency without stampeding the DB.
    return process.env.VERCEL ? 3 : 10;
  })(),
  connectionTimeoutMillis: (() => {
    const raw = process.env.PGPOOL_CONN_TIMEOUT_MS;
    const n = Number.parseInt(String(raw || '').trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : 5000;
  })(),
  idleTimeoutMillis: (() => {
    const raw = process.env.PGPOOL_IDLE_TIMEOUT_MS;
    const n = Number.parseInt(String(raw || '').trim(), 10);
    if (Number.isFinite(n) && n >= 0) return n;
    return process.env.VERCEL ? 10000 : 30000;
  })(),
  allowExitOnIdle: true,
});

export const toCamelCase = (row) => {
  if (!row) return row;
  const newRow = {};
  for (const key in row) {
    const newKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    newRow[newKey] = row[key];
  }
  return newRow;
};

export default pool;
