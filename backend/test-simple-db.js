require('dotenv').config();
const mockDb = require('./src/mock-database');

async function testSimpleDatabase() {
  console.log('🔍 Testing mock database...');

  try {
    // Test connection
    const isConnected = await mockDb.testConnection();
    console.log('✅ Mock database connected:', isConnected);

    // Test tokens
    const tokens = await mockDb.db.getTokens();
    console.log('🪙 Tokens found:', tokens.length);

    tokens.forEach(token => {
      console.log(`  - ${token.name} (${token.symbol}): ${token.bonding_curve_progress}% progress`);
    });

    // Test creating a new token
    const newToken = await mockDb.db.createToken({
      address: '0x' + Math.random().toString(16).substr(2, 40),
      name: 'Test New Token',
      symbol: 'TESTNEW',
      description: 'Test token creation',
      creator_address: '0xtestcreator',
      total_supply: '1000000000000000000000000000',
      current_price: 0.00000001,
      bonding_curve_progress: 0
    });

    console.log('✅ New token created:', newToken.name, newToken.symbol);

    // Test transactions
    const transaction = await mockDb.db.createTransaction({
      hash: '0x' + Math.random().toString(16).substr(2, 64),
      token_address: newToken.address,
      from_address: '0xbuyer',
      type: 'buy',
      amount_bnb: 0.1,
      amount_tokens: 10000,
      price_per_token: 0.00000001
    });

    console.log('✅ Transaction created:', transaction.type, transaction.amount_bnb, 'BNB');

    console.log('✅ All database operations working correctly!');

  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error(error.stack);
  }

  await mockDb.closeConnection();
  process.exit(0);
}

testSimpleDatabase();