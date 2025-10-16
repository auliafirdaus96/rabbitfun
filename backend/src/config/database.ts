import { Pool } from 'pg';
import logger from '@/utils/logger';

let pool: Pool;

export const connectDatabase = async (): Promise<Pool> => {
  try {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    pool = new Pool({
      connectionString: databaseUrl,
      max: 20, // maximum number of clients in the pool
      idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
      connectionTimeoutMillis: 2000, // how long to wait when connecting a new client
    });

    // Test the connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();

    logger.info('Database connected successfully');
    return pool;
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

export const getPool = (): Pool => {
  if (!pool) {
    throw new Error('Database not initialized. Call connectDatabase() first.');
  }
  return pool;
};

export const closeDatabase = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    logger.info('Database connection closed');
  }
};

// Database schema initialization
export const initializeDatabase = async (): Promise<void> => {
  const pool = getPool();

  try {
    // Create tokens table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tokens (
        address VARCHAR(42) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        symbol VARCHAR(20) NOT NULL,
        description TEXT,
        logo_url VARCHAR(500),
        website VARCHAR(500),
        twitter VARCHAR(255),
        telegram VARCHAR(255),
        github VARCHAR(255),
        discord VARCHAR(255),
        reddit VARCHAR(255),
        creator_address VARCHAR(42) NOT NULL,
        is_graduated BOOLEAN DEFAULT FALSE,
        graduation_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP
      )
    `);

    // Create indexes for tokens
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tokens_creator_address ON tokens(creator_address);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tokens_created_at ON tokens(created_at DESC);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tokens_symbol ON tokens(symbol);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tokens_is_graduated ON tokens(is_graduated);
    `);

    // Create user_favorites table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_favorites (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(42) NOT NULL,
        token_address VARCHAR(42) NOT NULL REFERENCES tokens(address) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_address, token_address)
      )
    `);

    // Create indexes for user_favorites
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_favorites_user_address ON user_favorites(user_address);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_favorites_token_address ON user_favorites(token_address);
    `);

    // Create token_analytics table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS token_analytics (
        token_address VARCHAR(42) PRIMARY KEY REFERENCES tokens(address) ON DELETE CASCADE,
        total_volume DECIMAL(20,8) DEFAULT 0,
        total_holders INTEGER DEFAULT 0,
        market_cap DECIMAL(20,8) DEFAULT 0,
        price_change_24h DECIMAL(10,4) DEFAULT 0,
        volume_24h DECIMAL(20,8) DEFAULT 0,
        holders_24h INTEGER DEFAULT 0,
        current_price DECIMAL(20,8) DEFAULT 0,
        initial_price DECIMAL(20,8) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for token_analytics
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_token_analytics_total_volume ON token_analytics(total_volume DESC);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_token_analytics_volume_24h ON token_analytics(volume_24h DESC);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_token_analytics_updated_at ON token_analytics(updated_at DESC);
    `);

    // Create transaction_history table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transaction_history (
        id SERIAL PRIMARY KEY,
        tx_hash VARCHAR(66) NOT NULL UNIQUE,
        token_address VARCHAR(42) NOT NULL REFERENCES tokens(address) ON DELETE CASCADE,
        user_address VARCHAR(42) NOT NULL,
        transaction_type VARCHAR(20) NOT NULL, -- 'BUY', 'SELL', 'CREATE', 'GRADUATE'
        amount_in DECIMAL(20,8) NOT NULL,
        amount_out DECIMAL(20,8) NOT NULL,
        fee_amount DECIMAL(20,8) DEFAULT 0,
        price DECIMAL(20,8) NOT NULL,
        block_number BIGINT NOT NULL,
        block_timestamp TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for transaction_history
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_transaction_history_token_address ON transaction_history(token_address);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_transaction_history_user_address ON transaction_history(user_address);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_transaction_history_type ON transaction_history(transaction_type);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_transaction_history_timestamp ON transaction_history(block_timestamp DESC);
    `);

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        address VARCHAR(42) PRIMARY KEY,
        username VARCHAR(50) UNIQUE,
        email VARCHAR(255) UNIQUE,
        bio TEXT,
        avatar_url VARCHAR(500),
        twitter_handle VARCHAR(50),
        is_verified BOOLEAN DEFAULT FALSE,
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for users
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_twitter_handle ON users(twitter_handle);
    `);

    // Create notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(42) NOT NULL REFERENCES users(address) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL, -- 'PRICE_ALERT', 'TOKEN_CREATED', 'TOKEN_GRADUATED', etc.
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        data JSONB, -- additional data for the notification
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for notifications
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_address ON notifications(user_address);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
    `);

    // Create price_history table for charts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS price_history (
        id SERIAL PRIMARY KEY,
        token_address VARCHAR(42) NOT NULL REFERENCES tokens(address) ON DELETE CASCADE,
        price DECIMAL(20,8) NOT NULL,
        market_cap DECIMAL(20,8) DEFAULT 0,
        volume_24h DECIMAL(20,8) DEFAULT 0,
        total_supply DECIMAL(20,8) DEFAULT 0,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for price_history
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_price_history_token_timestamp ON price_history(token_address, timestamp DESC);
    `);

    logger.info('Database schema initialized successfully');
  } catch (error) {
    logger.error('Error initializing database schema:', error);
    throw error;
  }
};

export const runMigrations = async (): Promise<void> => {
  try {
    await initializeDatabase();
    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error('Database migration failed:', error);
    throw error;
  }
};