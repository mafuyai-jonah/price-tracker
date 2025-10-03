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
    // Create comparisons table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comparisons (
        id SERIAL PRIMARY KEY,
        shopper_id INTEGER REFERENCES shoppers(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        original_price NUMERIC(12,2) NOT NULL,
        compared_price NUMERIC(12,2) NOT NULL,
        money_saved NUMERIC(12,2) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_comparisons_shopper ON comparisons(shopper_id);
      CREATE INDEX IF NOT EXISTS idx_comparisons_product ON comparisons(product_id);
    `);

    console.log('✅ Comparisons table migrated successfully');
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