require('dotenv').config();

async function testDatabase() {
  console.log('🔍 Testing database connection...');

  // Load database with a small delay to ensure initialization
  setTimeout(async () => {
    const { testConnection, db } = require('./src/database');

    const isConnected = await testConnection();

    if (isConnected) {
      console.log('✅ Database is connected');

      try {
        // Test basic query
        const result = await db.raw('SELECT version()');
        console.log('📊 Database version:', result.rows[0].version);

        // Test if tables exist
        if (db.raw.toString().includes('Mock')) {
          console.log('📋 Using mock database with tables: tokens, transactions, users');
        } else {
          const tables = await db('information_schema.tables')
            .select('table_name')
            .where('table_schema', 'public')
            .andWhere('table_type', 'BASE TABLE');

          console.log('📋 Existing tables:', tables.map(t => t.table_name));
        }

        // Test token retrieval
        const tokens = await db.getTokens();
        console.log('🪙 Sample tokens found:', tokens.length);

        if (tokens.length > 0) {
          console.log('📊 First token:', {
            name: tokens[0].name,
            symbol: tokens[0].symbol,
            price: tokens[0].current_price,
            progress: tokens[0].bonding_curve_progress
          });
        }

      } catch (error) {
        console.error('❌ Error during database test:', error.message);
      }
    } else {
      console.log('❌ Database connection failed');
    }

    process.exit(0);
  }, 1000); // Wait 1 second for database initialization
}

testDatabase();