// Add missing columns to products table
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || process.env.PGDATABASE || 'biz_book',
  password: process.env.DB_PASSWORD || 'permitted',
  port: process.env.DB_PORT || 5432,
});

async function addColumns() {
  try {
    await pool.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS sku TEXT,
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
    `);
    console.log('✅ Added sku and status columns to products table');
  } catch (err) {
    console.error('❌ Error adding columns:', err);
  } finally {
    await pool.end();
  }
}

addColumns();