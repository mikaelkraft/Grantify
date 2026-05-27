import pg from 'pg'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

async function run() {
  const client = await pool.connect()
  try {
    // find posts that contain <h2> or multiple <br> or nbsp oddities
    const res = await client.query("SELECT id FROM blog_posts WHERE content ILIKE '%<h2%' OR content ILIKE '%&nbsp;%' OR content LIKE '%<br><br>%'")
    res.rows.forEach(r => console.log(r.id))
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch(e => { console.error(e); process.exit(1) })
