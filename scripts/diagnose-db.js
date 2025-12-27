import pg from 'pg';
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function diagnose() {
  const client = await pool.connect();
  try {
    console.log("--- Tables ---");
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.table(tables.rows);

    console.log("\n--- Testimonials Columns ---");
    const tCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'testimonials'
    `);
    console.table(tCols.rows);

    console.log("\n--- Ads Columns ---");
    const aCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ads'
    `);
    console.table(aCols.rows);

    console.log("\n--- Ads Data Check ---");
    const ads = await client.query('SELECT * FROM ads');
    console.log("msg:", ads.rows);

  } catch (err) {
    console.error("Diagnosis failed:", err);
  } finally {
    client.release();
    pool.end();
  }
}

diagnose();
