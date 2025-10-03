const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'biz_book',
  password: process.env.DB_PASSWORD || 'permitted',
  port: process.env.DB_PORT || 5432,
});

async function migrate() {
  try {
    // Create vendors table with all required fields
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        business_name TEXT NOT NULL,
        business_description TEXT,
        location TEXT,
        phone TEXT,
        website TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_vendors_user ON vendors(user_id);
    `);

    console.log('✅ Vendors table migrated successfully');
  } catch (error) {
    console.error('❌ Error in migration:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate().catch((e) => {
  console.error('❌ Migration failed', e);
  process.exit(1);
});
