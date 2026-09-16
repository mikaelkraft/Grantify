import pool from '../backend/db.js';

async function rescale() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Rescale testimonials to natural low numbers (likes: 1-5, loves: 0-3, claps: 0-2)
    await client.query(`
      UPDATE testimonials
      SET 
        likes = LEAST(5, GREATEST(1, ROUND(likes / 38.0))),
        loves = LEAST(3, GREATEST(0, ROUND(loves / 35.0))),
        claps = LEAST(2, GREATEST(0, ROUND(claps / 25.0)))
    `);

    // Rescale blog_posts to natural low numbers (likes: 1-4, loves: 0-2, claps: 0-1)
    await client.query(`
      UPDATE blog_posts
      SET 
        likes = LEAST(4, GREATEST(1, ROUND(likes / 22.0))),
        loves = LEAST(2, GREATEST(0, ROUND(loves / 18.0))),
        claps = LEAST(1, GREATEST(0, ROUND(claps / 18.0)))
    `);

    await client.query('COMMIT');
    console.log('Successfully trimmed reactions in database.');

    const t = await client.query('SELECT id, name, likes, loves, claps FROM testimonials ORDER BY id');
    console.log('Updated Testimonials:');
    console.table(t.rows);

    const b = await client.query('SELECT id, title, likes, loves, claps FROM blog_posts ORDER BY id LIMIT 10');
    console.log('Sample Updated Blog Posts:');
    console.table(b.rows);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during rescale:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

rescale();
