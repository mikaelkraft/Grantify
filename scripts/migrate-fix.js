import pg from 'pg';
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("Applying Migration...");
    
    // Add missing status column to testimonials
    await client.query(`
      ALTER TABLE testimonials 
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT NULL
    `);
    
    console.log("✅ Added status column to testimonials");

    // Add valid_until column to ads (just in case)
    // await client.query(`
    //   ALTER TABLE ads 
    //   ADD COLUMN IF NOT EXISTS valid_until TIMESTAMP DEFAULT NULL
    // `);

  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
