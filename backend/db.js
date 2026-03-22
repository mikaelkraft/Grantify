// Shared database connection for serverless handlers
// Uses Neon PostgreSQL with connection pooling optimized for serverless

import { Pool } from 'pg';

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
