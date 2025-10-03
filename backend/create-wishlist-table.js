// Simple script to create wishlist table. Run with: node backend/create-wishlist-table.js
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'biz_book',
  password: process.env.DB_PASSWORD || 'permitted',
  port: process.env.DB_PORT || 5432,
});

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS wishlist (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_name TEXT NOT NULL,
      target_price NUMERIC(12,2),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist(user_id);
  `);
  console.log('✅ wishlist table ready');
  await pool.end();
}

main().catch((e) => {
  console.error('❌ Failed creating wishlist table', e);
  process.exit(1);
});


