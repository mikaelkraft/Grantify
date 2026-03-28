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
  max: 1
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
