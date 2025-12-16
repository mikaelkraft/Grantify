// Shared database connection for Vercel serverless functions
// Uses Neon PostgreSQL with connection pooling optimized for serverless

import { Pool } from 'pg';

// Create a connection pool - Neon supports serverless with connection pooling
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Required for Neon
  max: 1, // Limit connections in serverless environment
});

// Helper to map DB rows (snake_case) to frontend types (camelCase)
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
