const { pool } = require('./utils');

const createRefreshTokensTable = async () => {
  const client = await pool.connect();
  try {
    console.log('🔄 Creating refresh_tokens table...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(64) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        invalidated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_invalidated_at ON refresh_tokens(invalidated_at);
    `);

    console.log('✅ refresh_tokens table created successfully');
  } catch (error) {
    console.error('❌ Error creating refresh_tokens table:', error);
    throw error;
  } finally {
    client.release();
  }
};

const createSecurityLogsTable = async () => {
  const client = await pool.connect();
  try {
    console.log('🔄 Creating security_logs table...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS security_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        details JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_security_logs_action ON security_logs(action);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at);
    `);

    console.log('✅ security_logs table created successfully');
  } catch (error) {
    console.error('❌ Error creating security_logs table:', error);
    throw error;
  } finally {
    client.release();
  }
};

const main = async () => {
  try {
    await createRefreshTokensTable();
    await createSecurityLogsTable();
    console.log('🎉 All security tables created successfully!');
    console.log('📝 Next steps:');
    console.log('   1. Update your auth routes to use the new refresh token system');
    console.log('   2. Add security logging to authentication endpoints');
    console.log('   3. Implement session timeout handling');
    console.log('   4. Add CSRF protection to forms');
    console.log('   5. Set up automated cleanup of expired tokens');
  } catch (error) {
    console.error('❌ Failed to create security tables:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

if (require.main === module) {
  main();
}

module.exports = { createRefreshTokensTable, createSecurityLogsTable };