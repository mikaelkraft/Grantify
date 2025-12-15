require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for Neon
});

// --- HELPER TO MAP DB ROWS TO FRONTEND TYPES ---
const toCamelCase = (row) => {
  const newRow = {};
  for (const key in row) {
    const newKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    newRow[newKey] = row[key];
  }
  return newRow;
};

// --- ROUTES ---

// 1. Applications
app.get('/applications', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM applications ORDER BY created_at DESC');
    res.json(result.rows.map(toCamelCase));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/applications', async (req, res) => {
  const { id, fullName, phoneNumber, email, country, amount, purpose, type, repaymentAmount, durationMonths, status, dateApplied, referralCode } = req.body;
  try {
    await pool.query(
      `INSERT INTO applications (id, full_name, phone_number, email, country, amount, purpose, type, repayment_amount, duration_months, status, date_applied, referral_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [id, fullName, phoneNumber, email, country, amount, purpose, type, repaymentAmount, durationMonths, status, dateApplied, referralCode]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Testimonials
app.get('/testimonials', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM testimonials ORDER BY created_at DESC');
    res.json(result.rows.map(toCamelCase));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/testimonials/:id', async (req, res) => {
  const { id } = req.params;
  const { likes, loves, claps, name, content, amount } = req.body;
  try {
    // We update everything provided
    await pool.query(
      `UPDATE testimonials SET likes=$1, loves=$2, claps=$3, name=$4, content=$5, amount=$6 WHERE id=$7`,
      [likes, loves, claps, name, content, amount, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk Save Testimonials (Wipe and Replace - Simple sync pattern)
app.post('/testimonials', async (req, res) => {
  const items = req.body; // Array
  if (!Array.isArray(items)) return res.status(400).json({error: "Expected array"});
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM testimonials');
    for (const t of items) {
      await client.query(
        `INSERT INTO testimonials (id, name, image, amount, content, likes, loves, claps, date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [t.id, t.name, t.image, t.amount, t.content, t.likes, t.loves, t.claps, t.date]
      );
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// 3. Qualified Persons
app.get('/qualified', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM qualified_persons');
    res.json(result.rows.map(toCamelCase));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk Save Qualified
app.post('/qualified', async (req, res) => {
  const items = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM qualified_persons');
    for (const q of items) {
      await client.query(
        `INSERT INTO qualified_persons (id, name, amount, status, notes) VALUES ($1, $2, $3, $4, $5)`,
        [q.id, q.name, q.amount, q.status, q.notes]
      );
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// 4. Ads (Single Row ID=1)
app.get('/ads', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ads WHERE id=1');
    if (result.rows.length > 0) res.json(toCamelCase(result.rows[0]));
    else res.json({});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/ads', async (req, res) => {
  const { head, header, body, sidebar, footer } = req.body;
  try {
    await pool.query(
      `INSERT INTO ads (id, head, header, body, sidebar, footer)
       VALUES (1, $1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
       head = EXCLUDED.head, header = EXCLUDED.header, body = EXCLUDED.body, sidebar = EXCLUDED.sidebar, footer = EXCLUDED.footer`,
      [head, header, body, sidebar, footer]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Admins
app.get('/admins', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, role, name, password_hash FROM admin_users');
    res.json(result.rows.map(r => ({
      id: r.id,
      username: r.username,
      role: r.role,
      name: r.name,
      passwordHash: r.password_hash // We send this back to match frontend types (In prod, never send hash)
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/admins', async (req, res) => {
  const items = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM admin_users');
    for (const a of items) {
      await client.query(
        `INSERT INTO admin_users (id, username, password_hash, role, name) VALUES ($1, $2, $3, $4, $5)`,
        [a.id, a.username, a.passwordHash, a.role, a.name]
      );
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM admin_users WHERE username = $1 AND password_hash = $2', [username, password]);
    if (result.rows.length > 0) {
      const u = result.rows[0];
      res.json({
        id: u.id,
        username: u.username,
        name: u.name,
        role: u.role,
        passwordHash: u.password_hash
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Repayment Content
app.get('/content/repayment', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM repayment_content WHERE id=1');
    if (result.rows.length > 0) {
      res.json({
        introText: result.rows[0].intro_text,
        standardNote: result.rows[0].standard_note,
        fastTrackNote: result.rows[0].fast_track_note
      });
    } else {
      res.json({});
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/content/repayment', async (req, res) => {
  const { introText, standardNote, fastTrackNote } = req.body;
  try {
    await pool.query(
      `INSERT INTO repayment_content (id, intro_text, standard_note, fast_track_note)
       VALUES (1, $1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET
       intro_text = EXCLUDED.intro_text, standard_note = EXCLUDED.standard_note, fast_track_note = EXCLUDED.fast_track_note`,
      [introText, standardNote, fastTrackNote]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
