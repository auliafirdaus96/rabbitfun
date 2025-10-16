import { PrismaClient } from '../src/generated/prisma-test';

const prisma = new PrismaClient();

// Test data constants
const TEST_USERS = [
  {
    walletAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    email: 'testuser1@example.com',
    username: 'testuser1',
    displayName: 'Test User 1',
    isActive: true,
    isAdmin: false,
    isVerified: true,
  },
  {
    walletAddress: '0x1234567890123456789012345678901234567890',
    email: 'testuser2@example.com',
    username: 'testuser2',
    displayName: 'Test User 2',
    isActive: true,
    isAdmin: false,
    isVerified: false,
  },
  {
    walletAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    email: 'admin@example.com',
    username: 'testadmin',
    displayName: 'Test Admin',
    isActive: true,
    isAdmin: true,
    isVerified: true,
  },
];

const TEST_TOKENS = [
  {
    address: '0x1111111111111111111111111111111111111111',
    name: 'Test Token One',
    symbol: 'TTO',
    creatorId: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    creatorAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    soldSupply: '500000000000000000000000', // 500000 tokens
    totalBNB: '500000000000000000', // 0.5 BNB
    initialPrice: '1000000000000000', // 0.001 BNB
    graduated: false,
    exists: true,
    totalPlatformFees: '25000000000000000', // 0.025 BNB
    totalCreatorFees: '25000000000000000', // 0.025 BNB
    bondingCurveLiquidity: '450000000000000000', // 0.45 BNB
    liquidityPoolAmount: '450000000000000000',
    description: 'First test token for integration testing',
    imageUrl: 'https://example.com/tto-logo.png',
    isActive: true,
    isFeatured: true,
    isVerified: true,
    isHidden: false,
  },
  {
    address: '0x2222222222222222222222222222222222222222',
    name: 'Test Token Two',
    symbol: 'TTT',
    creatorId: '0x1234567890123456789012345678901234567890',
    creatorAddress: '0x1234567890123456789012345678901234567890',
    soldSupply: '1000000000000000000000000', // 1000000 tokens
    totalBNB: '2000000000000000000', // 2 BNB
    initialPrice: '2000000000000000', // 0.002 BNB
    graduated: false,
    exists: true,
    totalPlatformFees: '100000000000000000', // 0.1 BNB
    totalCreatorFees: '100000000000000000', // 0.1 BNB
    bondingCurveLiquidity: '1800000000000000000', // 1.8 BNB
    liquidityPoolAmount: '1800000000000000000',
    description: 'Second test token for integration testing',
    imageUrl: 'https://example.com/ttt-logo.png',
    isActive: true,
    isFeatured: false,
    isVerified: false,
    isHidden: false,
  },
  {
    address: '0x3333333333333333333333333333333333333333',
    name: 'Graduated Token',
    symbol: 'GRAD',
    creatorId: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    creatorAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    soldSupply: '800000000000000000000000', // 800000 tokens
    totalBNB: '8000000000000000000', // 8 BNB
    initialPrice: '10000000000000000', // 0.01 BNB
    graduated: true,
    exists: true,
    totalPlatformFees: '400000000000000000', // 0.4 BNB
    totalCreatorFees: '400000000000000000', // 0.4 BNB
    bondingCurveLiquidity: '0',
    liquidityPoolAmount: '0',
    description: 'Graduated token for testing graduation logic',
    imageUrl: 'https://example.com/grad-logo.png',
    isActive: true,
    isFeatured: true,
    isVerified: true,
    isHidden: false,
    graduatedAt: new Date('2024-01-01T00:00:00Z'),
  },
];

const TEST_TRANSACTIONS = [
  {
    hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    blockNumber: '12345678',
    blockHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    transactionIndex: 15,
    type: 'BUY',
    tokenId: '0x1111111111111111111111111111111111111111',
    tokenAddress: '0x1111111111111111111111111111111111111111',
    traderAddress: '0x1234567890123456789012345678901234567890',
    tokenAmount: '1000000000000000000000', // 1000 tokens
    bnbAmount: '1000000000000000', // 0.001 BNB
    price: '1000000000000000',
    platformFee: '50000000000000', // 0.00005 BNB
    creatorFee: '50000000000000', // 0.00005 BNB
    totalFee: '100000000000000', // 0.0001 BNB
    priceImpact: '0.01',
    status: 'CONFIRMED',
    gasUsed: '21000',
    gasPrice: '20000000000',
    createdAt: new Date('2024-01-01T12:00:00Z'),
    confirmedAt: new Date('2024-01-01T12:01:00Z'),
  },
  {
    hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    blockNumber: '12345679',
    blockHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    transactionIndex: 20,
    type: 'SELL',
    tokenId: '0x1111111111111111111111111111111111111111',
    tokenAddress: '0x1111111111111111111111111111111111111111',
    traderAddress: '0x1234567890123456789012345678901234567890',
    tokenAmount: '500000000000000000000', // 500 tokens
    bnbAmount: '500000000000000', // 0.0005 BNB
    price: '1000000000000000',
    platformFee: '25000000000000', // 0.000025 BNB
    creatorFee: '25000000000000', // 0.000025 BNB
    totalFee: '50000000000000', // 0.00005 BNB
    priceImpact: '-0.005',
    status: 'CONFIRMED',
    gasUsed: '21000',
    gasPrice: '20000000000',
    createdAt: new Date('2024-01-01T12:30:00Z'),
    confirmedAt: new Date('2024-01-01T12:31:00Z'),
  },
  {
    hash: '0x7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456',
    blockNumber: '12345680',
    blockHash: '0x2345678901bcdef1234567890abcdef1234567890abcdef1234567890abcdef1',
    transactionIndex: 25,
    type: 'BUY',
    tokenId: '0x2222222222222222222222222222222222222222',
    tokenAddress: '0x2222222222222222222222222222222222222222',
    traderAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    tokenAmount: '2000000000000000000000', // 2000 tokens
    bnbAmount: '4000000000000000', // 0.004 BNB
    price: '2000000000000000',
    platformFee: '200000000000000', // 0.0002 BNB
    creatorFee: '200000000000000', // 0.0002 BNB
    totalFee: '400000000000000', // 0.0004 BNB
    priceImpact: '0.02',
    status: 'PENDING',
    gasUsed: null,
    gasPrice: null,
    createdAt: new Date('2024-01-01T13:00:00Z'),
    confirmedAt: null,
  },
];

const TEST_TOKEN_FAVORITES = [
  {
    userId: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    tokenId: '0x1111111111111111111111111111111111111111',
    createdAt: new Date('2024-01-01T10:00:00Z'),
  },
  {
    userId: '0x1234567890123456789012345678901234567890',
    tokenId: '0x1111111111111111111111111111111111111111',
    createdAt: new Date('2024-01-01T10:30:00Z'),
  },
  {
    userId: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    tokenId: '0x2222222222222222222222222222222222222222',
    createdAt: new Date('2024-01-01T11:00:00Z'),
  },
];

const TEST_TOKEN_ANALYTICS = [
  {
    tokenId: '0x1111111111111111111111111111111111111111',
    date: new Date('2024-01-01'),
    totalVolume: '1500000000000000', // 0.0015 BNB
    totalTrades: 2,
    totalBuyers: 1,
    totalSellers: 1,
    openPrice: '1000000000000000',
    closePrice: '1000000000000000',
    highPrice: '1000000000000000',
    lowPrice: '1000000000000000',
    marketCap: '1000000000000000000000', // 1000 * 1e18 (assuming 1M supply)
    liquidity: '450000000000000000',
  },
  {
    tokenId: '0x2222222222222222222222222222222222222222',
    date: new Date('2024-01-01'),
    totalVolume: '4000000000000000', // 0.004 BNB
    totalTrades: 1,
    totalBuyers: 1,
    totalSellers: 0,
    openPrice: '2000000000000000',
    closePrice: '2000000000000000',
    highPrice: '2000000000000000',
    lowPrice: '2000000000000000',
    marketCap: '2000000000000000000000', // 2000 * 1e18 (assuming 1M supply)
    liquidity: '1800000000000000000',
  },
];

const TEST_USER_ANALYTICS = [
  {
    userId: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    date: new Date('2024-01-01'),
    tokensCreated: 1,
    transactionsMade: 1,
    volumeTraded: '4000000000000000', // 0.004 BNB
    portfolioValue: '2000000000000000000000', // 2000 tokens
    holdingsCount: 1,
    favoritesCount: 2,
  },
  {
    userId: '0x1234567890123456789012345678901234567890',
    date: new Date('2024-01-01'),
    tokensCreated: 1,
    transactionsMade: 2,
    volumeTraded: '1500000000000000', // 0.0015 BNB
    portfolioValue: '500000000000000000000', // 500 tokens
    holdingsCount: 1,
    favoritesCount: 1,
  },
];

const TEST_TOKEN_PRICE_HISTORY = [
  {
    tokenId: '0x1111111111111111111111111111111111111111',
    timestamp: new Date('2024-01-01T12:00:00Z'),
    price: '1000000000000000',
    supply: '500000000000000000000000',
  },
  {
    tokenId: '0x1111111111111111111111111111111111111111',
    timestamp: new Date('2024-01-01T12:30:00Z'),
    price: '1000000000000000',
    supply: '500000000000000000000000',
  },
  {
    tokenId: '0x2222222222222222222222222222222222222222',
    timestamp: new Date('2024-01-01T13:00:00Z'),
    price: '2000000000000000',
    supply: '1000000000000000000000000',
  },
];

const TEST_SYSTEM_CONFIG = [
  {
    key: 'platform_fee_percentage',
    value: '0.05',
    description: 'Platform fee percentage (5%)',
  },
  {
    key: 'creator_fee_percentage',
    value: '0.05',
    description: 'Creator fee percentage (5%)',
  },
  {
    key: 'min_token_amount',
    value: '1000000000000000000',
    description: 'Minimum token amount for trading (1 token)',
  },
  {
    key: 'max_token_amount',
    value: '10000000000000000000000',
    description: 'Maximum token amount for trading (10000 tokens)',
  },
];

const TEST_AUDIT_LOGS = [
  {
    userId: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    action: 'CREATE_TOKEN',
    resource: 'Token',
    resourceId: '0x1111111111111111111111111111111111111111',
    oldValue: null,
    newValue: 'Created Test Token One',
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0 (Test Browser)',
    createdAt: new Date('2024-01-01T09:00:00Z'),
  },
  {
    userId: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    action: 'UPDATE_TOKEN',
    resource: 'Token',
    resourceId: '0x1111111111111111111111111111111111111111',
    oldValue: 'isFeatured: false',
    newValue: 'isFeatured: true',
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0 (Test Browser)',
    createdAt: new Date('2024-01-01T09:30:00Z'),
  },
];

async function seedTestDatabase() {
  try {
    console.log('🌱 Starting test database seeding...');

    // Clean existing data
    console.log('🗑️  Cleaning existing test data...');
    await prisma.auditLog.deleteMany();
    await prisma.systemConfig.deleteMany();
    await prisma.tokenPriceHistory.deleteMany();
    await prisma.userAnalytics.deleteMany();
    await prisma.tokenAnalytics.deleteMany();
    await prisma.tokenFavorite.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.token.deleteMany();
    await prisma.user.deleteMany();

    // Seed users
    console.log('👤 Seeding test users...');
    for (const userData of TEST_USERS) {
      await prisma.user.create({
        data: userData,
      });
    }

    // Seed tokens
    console.log('🪙 Seeding test tokens...');
    for (const tokenData of TEST_TOKENS) {
      await prisma.token.create({
        data: tokenData,
      });
    }

    // Seed transactions
    console.log('💱 Seeding test transactions...');
    for (const transactionData of TEST_TRANSACTIONS) {
      await prisma.transaction.create({
        data: transactionData,
      });
    }

    // Seed token favorites
    console.log('⭐ Seeding test token favorites...');
    for (const favoriteData of TEST_TOKEN_FAVORITES) {
      await prisma.tokenFavorite.create({
        data: favoriteData,
      });
    }

    // Seed token analytics
    console.log('📊 Seeding test token analytics...');
    for (const analyticsData of TEST_TOKEN_ANALYTICS) {
      await prisma.tokenAnalytics.create({
        data: analyticsData,
      });
    }

    // Seed user analytics
    console.log('📈 Seeding test user analytics...');
    for (const userAnalyticsData of TEST_USER_ANALYTICS) {
      await prisma.userAnalytics.create({
        data: userAnalyticsData,
      });
    }

    // Seed token price history
    console.log('📈 Seeding test token price history...');
    for (const priceHistoryData of TEST_TOKEN_PRICE_HISTORY) {
      await prisma.tokenPriceHistory.create({
        data: priceHistoryData,
      });
    }

    // Seed system config
    console.log('⚙️  Seeding test system config...');
    for (const configData of TEST_SYSTEM_CONFIG) {
      await prisma.systemConfig.create({
        data: configData,
      });
    }

    // Seed audit logs
    console.log('📋 Seeding test audit logs...');
    for (const auditLogData of TEST_AUDIT_LOGS) {
      await prisma.auditLog.create({
        data: auditLogData,
      });
    }

    console.log('✅ Test database seeding completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`- Users: ${TEST_USERS.length}`);
    console.log(`- Tokens: ${TEST_TOKENS.length}`);
    console.log(`- Transactions: ${TEST_TRANSACTIONS.length}`);
    console.log(`- Token Favorites: ${TEST_TOKEN_FAVORITES.length}`);
    console.log(`- Token Analytics: ${TEST_TOKEN_ANALYTICS.length}`);
    console.log(`- User Analytics: ${TEST_USER_ANALYTICS.length}`);
    console.log(`- Price History: ${TEST_TOKEN_PRICE_HISTORY.length}`);
    console.log(`- System Config: ${TEST_SYSTEM_CONFIG.length}`);
    console.log(`- Audit Logs: ${TEST_AUDIT_LOGS.length}`);

  } catch (error) {
    console.error('❌ Error seeding test database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Export for use in tests
export { seedTestDatabase, TEST_USERS, TEST_TOKENS, TEST_TRANSACTIONS };

// Run seed if called directly
if (require.main === module) {
  seedTestDatabase()
    .catch((error) => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    });
}