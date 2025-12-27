import pg from 'pg';
const { Pool } = pg;

// Connection string from Vercel environment (User needs to provide this or set it in .env)
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Error: DATABASE_URL environment variable is missing.");
  console.error("Please create a .env file with your Neon DB connection string.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const seedDatabase = async () => {
  const client = await pool.connect();
  try {
    console.log("Connected to database...");
    await client.query('BEGIN');

    // 1. Ads
    console.log("Seeding Ads...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS ads (
          id INTEGER PRIMARY KEY DEFAULT 1,
          head TEXT DEFAULT '',
          header TEXT DEFAULT '',
          body TEXT DEFAULT '',
          sidebar TEXT DEFAULT '',
          footer TEXT DEFAULT '',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT single_row_ads CHECK (id = 1)
      );
    `);
    
    // Default Ads
    const initialAds = {
      head: '<!-- Google Tag Manager -->',
      header: '<div style="background:#eee; padding:10px; text-align:center; color:#666; font-size:12px;">Header Ad Space (728x90)</div>',
      body: '<div style="background:#f0fdf4; border:1px dashed #006400; padding:20px; text-align:center; color:#006400;">Sponsored Content Space</div>',
      sidebar: '<div style="background:#eee; height:250px; display:flex; align-items:center; justify-content:center; color:#666;">Sidebar Ad (300x250)</div>',
      footer: '<div style="background:#333; color:#fff; padding:10px; text-align:center;">Footer Ad Space</div>'
    };

    await client.query(
      `INSERT INTO ads (id, head, header, body, sidebar, footer)
       VALUES (1, $1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
       head = EXCLUDED.head, header = EXCLUDED.header, body = EXCLUDED.body, sidebar = EXCLUDED.sidebar, footer = EXCLUDED.footer`,
      [initialAds.head, initialAds.header, initialAds.body, initialAds.sidebar, initialAds.footer]
    );

    // 2. Testimonials
    console.log("Seeding Testimonials...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS testimonials (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          image TEXT NOT NULL,
          amount NUMERIC(12, 2) NOT NULL,
          content TEXT NOT NULL,
          likes INTEGER DEFAULT 0,
          loves INTEGER DEFAULT 0,
          claps INTEGER DEFAULT 0,
          date TEXT NOT NULL,
          status TEXT DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Only seed if empty
    const tCount = await client.query('SELECT COUNT(*) FROM testimonials');
    if (parseInt(tCount.rows[0].count) === 0) {
        const initialTestimonials = [
          { id: '1', name: 'Chinedu Okeke', image: 'https://images.unsplash.com/photo-1531384441138-2736e62e0919?fit=crop&w=150&h=150&q=80', amount: 200000, content: 'Grantify really came through for my grocery business. The 5% interest rate is unbeatable!', likes: 124, loves: 45, claps: 12, date: '2025-10-15' },
          { id: '2', name: 'Amina Yusuf', image: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?fit=crop&w=150&h=150&q=80', amount: 500000, content: 'I was skeptical at first, but the process was transparent. I received my funds within 48 hours of verification.', likes: 89, loves: 120, claps: 30, date: '2025-11-20' },
          { id: '3', name: 'Tunde Bakare', image: 'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?fit=crop&w=150&h=150&q=80', amount: 150000, content: 'Perfect for small business owners. The repayment plan is very flexible.', likes: 45, loves: 10, claps: 5, date: '2025-10-22' },
          { id: '4', name: 'Grace Eze', image: 'https://images.unsplash.com/photo-1589156280159-27698a70f29e?fit=crop&w=150&h=150&q=80', amount: 1000000, content: 'The Fast-Track option is real! Paid the processing fee and got my loan sorted for my boutique expansion.', likes: 210, loves: 55, claps: 40, date: '2025-10-15' },
          { id: '5', name: 'Yusuf Ibrahim', image: 'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?fit=crop&w=150&h=150&q=80', amount: 350000, content: 'The customer service is excellent. They guided me through the NIN verification process smoothly.', likes: 78, loves: 15, claps: 8, date: '2025-11-12' },
          { id: '6', name: 'Ngozi Obi', image: 'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?fit=crop&w=150&h=150&q=80', amount: 800000, content: 'Applied on Monday, got credited on Wednesday. Highly recommended for traders.', likes: 156, loves: 89, claps: 22, date: '2025-10-30' }
        ];
        
        for (const t of initialTestimonials) {
            await client.query(
              `INSERT INTO testimonials (id, name, image, amount, content, likes, loves, claps, date)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [t.id, t.name, t.image, t.amount, t.content, t.likes, t.loves, t.claps, t.date]
            );
        }
    }

    await client.query('COMMIT');
    console.log("✅ Database seeded successfully!");

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("❌ Seeding failed:", err);
  } finally {
    client.release();
    process.exit(0);
  }
};

seedDatabase();
