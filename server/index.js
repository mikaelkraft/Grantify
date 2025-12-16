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

// 7. Database Seeding Endpoint
// This endpoint seeds the database with initial mock data if tables are empty
app.post('/seed', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Initial Seed Data
    const initialTestimonials = [
      { id: '1', name: 'Chinedu Okeke', image: 'https://images.unsplash.com/photo-1531384441138-2736e62e0919?fit=crop&w=150&h=150&q=80', amount: 200000, content: 'Grantify really came through for my grocery business. The 5% interest rate is unbeatable!', likes: 124, loves: 45, claps: 12, date: '2023-10-15' },
      { id: '2', name: 'Amina Yusuf', image: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?fit=crop&w=150&h=150&q=80', amount: 500000, content: 'I was skeptical at first, but the process was transparent. I received my funds within 48 hours of verification.', likes: 89, loves: 120, claps: 30, date: '2025-11-20' },
      { id: '3', name: 'Tunde Bakare', image: 'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?fit=crop&w=150&h=150&q=80', amount: 150000, content: 'Perfect for small business owners. The repayment plan is very flexible.', likes: 45, loves: 10, claps: 5, date: '2023-10-22' },
      { id: '4', name: 'Grace Eze', image: 'https://images.unsplash.com/photo-1589156280159-27698a70f29e?fit=crop&w=150&h=150&q=80', amount: 1000000, content: 'The Fast-Track option is real! Paid the processing fee and got my loan sorted for my boutique expansion.', likes: 210, loves: 55, claps: 40, date: '2025-10-15' },
      { id: '5', name: 'Yusuf Ibrahim', image: 'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?fit=crop&w=150&h=150&q=80', amount: 350000, content: 'The customer service is excellent. They guided me through the NIN verification process smoothly.', likes: 78, loves: 15, claps: 8, date: '2025-11-12' },
      { id: '6', name: 'Ngozi Obi', image: 'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?fit=crop&w=150&h=150&q=80', amount: 800000, content: 'Applied on Monday, got credited on Wednesday. Highly recommended for traders.', likes: 156, loves: 89, claps: 22, date: '2025-10-30' }
    ];

    const initialQualified = [
      { id: '1', name: 'Emeka Uche', amount: 300000, status: 'Contacted', notes: 'Verification complete' },
      { id: '2', name: 'Sarah Johnson', amount: 150000, status: 'Pending', notes: 'Waiting for NIN' },
      { id: '3', name: 'Kabir Musa', amount: 500000, status: 'Disbursed', notes: 'Funds sent' },
      { id: '4', name: 'Chioma Obi', amount: 200000, status: 'Contacted', notes: 'Documents received' },
      { id: '5', name: 'Emmanuel Bassey', amount: 100000, status: 'Pending', notes: 'Reviewing application' },
      { id: '6', name: 'Funke Adebayo', amount: 450000, status: 'Disbursed', notes: 'Success' },
      { id: '7', name: 'Ibrahim Sani', amount: 250000, status: 'Pending', notes: 'Processing' },
      { id: '8', name: 'Ada Williams', amount: 180000, status: 'Contacted', notes: 'Call scheduled' }
    ];

    const initialAds = {
      head: '<!-- Google Tag Manager -->',
      header: '<div style="background:#eee; padding:10px; text-align:center; color:#666; font-size:12px;">Header Ad Space (728x90)</div>',
      body: '<div style="background:#f0fdf4; border:1px dashed #006400; padding:20px; text-align:center; color:#006400;">Sponsored Content Space</div>',
      sidebar: '<div style="background:#eee; height:250px; display:flex; align-items:center; justify-content:center; color:#666;">Sidebar Ad (300x250)</div>',
      footer: '<div style="background:#333; color:#fff; padding:10px; text-align:center;">Footer Ad Space</div>'
    };

    const initialRepayment = {
      introText: "We believe in transparent, easy-to-understand repayment terms. No hidden fees, just a flat interest rate.",
      standardNote: "Standard loans are designed for quick turnaround and small business support.",
      fastTrackNote: "Fast-track loans support larger capital requirements with a longer repayment duration."
    };

    const initialAdmins = [
      { 
        id: '1', 
        username: process.env.SEED_ADMIN_USERNAME || 'ashwebb500@gmail.com', 
        passwordHash: process.env.SEED_ADMIN_PASSWORD || 'Nomercy2_', 
        role: 'SUPER_ADMIN', 
        name: 'Super Admin' 
      },
      { 
        id: '2', 
        username: process.env.SEED_STAFF_USERNAME || 'staff', 
        passwordHash: process.env.SEED_STAFF_PASSWORD || 'staff123', 
        role: 'FLOOR_ADMIN', 
        name: 'Floor Staff' 
      }
    ];

    const seeded = { testimonials: false, qualified: false, ads: false, repayment: false, admins: false };

    // Seed Testimonials if empty
    const testimonialsCount = await client.query('SELECT COUNT(*) FROM testimonials');
    if (parseInt(testimonialsCount.rows[0].count) === 0) {
      for (const t of initialTestimonials) {
        await client.query(
          `INSERT INTO testimonials (id, name, image, amount, content, likes, loves, claps, date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [t.id, t.name, t.image, t.amount, t.content, t.likes, t.loves, t.claps, t.date]
        );
      }
      seeded.testimonials = true;
    }

    // Seed Qualified Persons if empty
    const qualifiedCount = await client.query('SELECT COUNT(*) FROM qualified_persons');
    if (parseInt(qualifiedCount.rows[0].count) === 0) {
      for (const q of initialQualified) {
        await client.query(
          `INSERT INTO qualified_persons (id, name, amount, status, notes) VALUES ($1, $2, $3, $4, $5)`,
          [q.id, q.name, q.amount, q.status, q.notes]
        );
      }
      seeded.qualified = true;
    }

    // Seed Ads if empty (check if default empty values or NULL)
    const adsResult = await client.query('SELECT * FROM ads WHERE id=1');
    if (adsResult.rows.length === 0 || (!adsResult.rows[0].head && !adsResult.rows[0].header)) {
      await client.query(
        `INSERT INTO ads (id, head, header, body, sidebar, footer)
         VALUES (1, $1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
         head = EXCLUDED.head, header = EXCLUDED.header, body = EXCLUDED.body, sidebar = EXCLUDED.sidebar, footer = EXCLUDED.footer`,
        [initialAds.head, initialAds.header, initialAds.body, initialAds.sidebar, initialAds.footer]
      );
      seeded.ads = true;
    }

    // Seed Repayment Content if empty (check if default empty values or NULL)
    const repaymentResult = await client.query('SELECT * FROM repayment_content WHERE id=1');
    if (repaymentResult.rows.length === 0 || (!repaymentResult.rows[0].intro_text && !repaymentResult.rows[0].standard_note)) {
      await client.query(
        `INSERT INTO repayment_content (id, intro_text, standard_note, fast_track_note)
         VALUES (1, $1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET
         intro_text = EXCLUDED.intro_text, standard_note = EXCLUDED.standard_note, fast_track_note = EXCLUDED.fast_track_note`,
        [initialRepayment.introText, initialRepayment.standardNote, initialRepayment.fastTrackNote]
      );
      seeded.repayment = true;
    }

    // Seed Admin Users if empty
    const adminsCount = await client.query('SELECT COUNT(*) FROM admin_users');
    if (parseInt(adminsCount.rows[0].count) === 0) {
      for (const a of initialAdmins) {
        await client.query(
          `INSERT INTO admin_users (id, username, password_hash, role, name) VALUES ($1, $2, $3, $4, $5)`,
          [a.id, a.username, a.passwordHash, a.role, a.name]
        );
      }
      seeded.admins = true;
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Database seeded successfully', seeded });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
