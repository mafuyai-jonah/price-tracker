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
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sales_reports (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount > 0),
        report_date DATE NOT NULL DEFAULT CURRENT_DATE,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_sales_vendor ON sales_reports(vendor_id);
      CREATE INDEX IF NOT EXISTS idx_sales_date ON sales_reports(report_date);
    `);
    console.log('✅ Sales reports table migrated successfully');
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
