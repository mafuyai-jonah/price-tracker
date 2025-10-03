const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'biz_book',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function createSearchTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Creating advanced search system tables...');

    // 1. Search History Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS search_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        search_query VARCHAR(255) NOT NULL,
        filters JSONB DEFAULT '{}',
        results_count INTEGER DEFAULT 0,
        clicked_product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        search_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address INET,
        user_agent TEXT
      );
    `);

    // 2. Search Suggestions Table (for auto-complete)
    await client.query(`
      CREATE TABLE IF NOT EXISTS search_suggestions (
        id SERIAL PRIMARY KEY,
        suggestion_text VARCHAR(255) UNIQUE NOT NULL,
        search_count INTEGER DEFAULT 1,
        category VARCHAR(100),
        last_searched TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_trending BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Popular Searches Table (trending/popular queries)
    await client.query(`
      CREATE TABLE IF NOT EXISTS popular_searches (
        id SERIAL PRIMARY KEY,
        search_query VARCHAR(255) NOT NULL,
        search_count INTEGER DEFAULT 1,
        category VARCHAR(100),
        time_period VARCHAR(20) DEFAULT 'daily', -- daily, weekly, monthly
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(search_query, time_period, period_start)
      );
    `);

    // 4. Saved Searches Table (user bookmarked searches)
    await client.query(`
      CREATE TABLE IF NOT EXISTS saved_searches (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        search_name VARCHAR(100) NOT NULL,
        search_query VARCHAR(255) NOT NULL,
        filters JSONB DEFAULT '{}',
        alert_enabled BOOLEAN DEFAULT FALSE,
        alert_frequency VARCHAR(20) DEFAULT 'daily', -- daily, weekly, instant
        last_alert_sent TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Search Analytics Table (for business intelligence)
    await client.query(`
      CREATE TABLE IF NOT EXISTS search_analytics (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        total_searches INTEGER DEFAULT 0,
        unique_users INTEGER DEFAULT 0,
        top_queries JSONB DEFAULT '[]',
        top_categories JSONB DEFAULT '[]',
        avg_results_per_search DECIMAL(10,2) DEFAULT 0,
        zero_result_searches INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(date)
      );
    `);

    // Create indexes for better performance
    console.log('📊 Creating search performance indexes...');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_search_history_timestamp ON search_history(search_timestamp DESC);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_search_suggestions_text ON search_suggestions(suggestion_text);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_search_suggestions_trending ON search_suggestions(is_trending, search_count DESC);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_popular_searches_period ON popular_searches(time_period, period_start DESC);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id);
    `);

    // Insert some initial search suggestions
    console.log('💡 Adding initial search suggestions...');
    
    const initialSuggestions = [
      { text: 'iPhone', category: 'Electronics', trending: true },
      { text: 'Samsung Galaxy', category: 'Electronics', trending: true },
      { text: 'MacBook', category: 'Electronics', trending: false },
      { text: 'Nike shoes', category: 'Fashion', trending: true },
      { text: 'Adidas', category: 'Fashion', trending: false },
      { text: 'PlayStation', category: 'Electronics', trending: true },
      { text: 'Xbox', category: 'Electronics', trending: false },
      { text: 'Smart TV', category: 'Electronics', trending: true },
      { text: 'Laptop', category: 'Electronics', trending: false },
      { text: 'Headphones', category: 'Electronics', trending: false },
      { text: 'Wireless earbuds', category: 'Electronics', trending: true },
      { text: 'Gaming chair', category: 'Furniture', trending: false },
      { text: 'Office desk', category: 'Furniture', trending: false },
      { text: 'Smartphone', category: 'Electronics', trending: true },
      { text: 'Tablet', category: 'Electronics', trending: false }
    ];

    for (const suggestion of initialSuggestions) {
      await client.query(`
        INSERT INTO search_suggestions (suggestion_text, category, is_trending, search_count)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (suggestion_text) DO NOTHING
      `, [suggestion.text, suggestion.category, suggestion.trending, suggestion.trending ? 50 : 10]);
    }

    console.log('✅ Advanced search system tables created successfully!');
    console.log('📈 Features enabled:');
    console.log('   • Search history tracking');
    console.log('   • Auto-suggestions with trending');
    console.log('   • Popular searches analytics');
    console.log('   • Saved searches with alerts');
    console.log('   • Search performance analytics');
    
  } catch (error) {
    console.error('❌ Error creating search tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the migration
createSearchTables()
  .then(() => {
    console.log('🎉 Search system migration completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });