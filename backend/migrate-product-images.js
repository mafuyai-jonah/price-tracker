const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'biz_book',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function migrateProductImages() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting product images migration...');
    
    // Create product_images table
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_images (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        image_url VARCHAR(500) NOT NULL,
        thumbnail_url VARCHAR(500),
        is_primary BOOLEAN DEFAULT FALSE,
        alt_text VARCHAR(255),
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_product_images_product_id 
      ON product_images(product_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_product_images_primary 
      ON product_images(product_id, is_primary) 
      WHERE is_primary = TRUE
    `);
    
    // Migrate existing image_url data from products table
    const existingProducts = await client.query(`
      SELECT id, image_url 
      FROM products 
      WHERE image_url IS NOT NULL AND image_url != ''
    `);
    
    console.log(`📸 Found ${existingProducts.rows.length} products with existing images`);
    
    for (const product of existingProducts.rows) {
      // Check if image already migrated
      const existingImage = await client.query(`
        SELECT id FROM product_images 
        WHERE product_id = $1 AND image_url = $2
      `, [product.id, product.image_url]);
      
      if (existingImage.rows.length === 0) {
        await client.query(`
          INSERT INTO product_images (product_id, image_url, is_primary, sort_order)
          VALUES ($1, $2, TRUE, 0)
        `, [product.id, product.image_url]);
        
        console.log(`✅ Migrated image for product ${product.id}`);
      }
    }
    
    // Add trigger to update updated_at timestamp
    await client.query(`
      CREATE OR REPLACE FUNCTION update_product_images_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS update_product_images_updated_at_trigger 
      ON product_images
    `);
    
    await client.query(`
      CREATE TRIGGER update_product_images_updated_at_trigger
      BEFORE UPDATE ON product_images
      FOR EACH ROW
      EXECUTE FUNCTION update_product_images_updated_at()
    `);
    
    console.log('✅ Product images migration completed successfully!');
    console.log('📋 New features available:');
    console.log('   - Multiple images per product');
    console.log('   - Primary image designation');
    console.log('   - Thumbnail support');
    console.log('   - Image sorting');
    console.log('   - Alt text for accessibility');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
if (require.main === module) {
  migrateProductImages()
    .then(() => {
      console.log('🎉 Migration completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateProductImages;