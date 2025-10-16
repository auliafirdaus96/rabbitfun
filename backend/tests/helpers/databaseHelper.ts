import { PrismaClient } from '../../src/generated/prisma-test';
import { seedTestDatabase } from '../../prisma/seed-test';

// Test database connection
let testPrisma: PrismaClient | null = null;

/**
 * Get test database client
 */
export function getTestPrisma(): PrismaClient {
  if (!testPrisma) {
    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
        },
      },
    });
  }
  return testPrisma;
}

/**
 * Connect to test database
 */
export async function connectTestDatabase(): Promise<void> {
  const prisma = getTestPrisma();
  try {
    await prisma.$connect();
    console.log('✅ Connected to test database');
  } catch (error) {
    console.error('❌ Failed to connect to test database:', error);
    throw error;
  }
}

/**
 * Disconnect from test database
 */
export async function disconnectTestDatabase(): Promise<void> {
  if (testPrisma) {
    await testPrisma.$disconnect();
    testPrisma = null;
    console.log('✅ Disconnected from test database');
  }
}

/**
 * Clean all tables in test database
 */
export async function cleanTestDatabase(): Promise<void> {
  const prisma = getTestPrisma();

  try {
    // Clean in order of dependencies (foreign keys)
    await prisma.auditLog.deleteMany();
    await prisma.systemConfig.deleteMany();
    await prisma.tokenPriceHistory.deleteMany();
    await prisma.userAnalytics.deleteMany();
    await prisma.tokenAnalytics.deleteMany();
    await prisma.tokenFavorite.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.token.deleteMany();
    await prisma.user.deleteMany();

    console.log('✅ Test database cleaned');
  } catch (error) {
    console.error('❌ Failed to clean test database:', error);
    throw error;
  }
}

/**
 * Reset and seed test database
 */
export async function resetTestDatabase(): Promise<void> {
  try {
    await cleanTestDatabase();
    await seedTestDatabase();
    console.log('✅ Test database reset and seeded');
  } catch (error) {
    console.error('❌ Failed to reset test database:', error);
    throw error;
  }
}

/**
 * Setup test database before tests
 */
export async function setupTestDatabase(): Promise<void> {
  await connectTestDatabase();
  await cleanTestDatabase();
  await seedTestDatabase();
}

/**
 * Cleanup test database after tests
 */
export async function cleanupTestDatabase(): Promise<void> {
  await cleanTestDatabase();
  await disconnectTestDatabase();
}

/**
 * Create test user
 */
export async function createTestUser(userData: any = {}) {
  const prisma = getTestPrisma();

  const defaultUserData = {
    walletAddress: '0x' + Math.random().toString(16).substr(2, 40),
    isActive: true,
    isAdmin: false,
    isVerified: false,
    ...userData,
  };

  return await prisma.user.create({
    data: defaultUserData,
  });
}

/**
 * Create test token
 */
export async function createTestToken(tokenData: any = {}) {
  const prisma = getTestPrisma();

  const defaultTokenData = {
    address: '0x' + Math.random().toString(16).substr(2, 40),
    name: 'Test Token',
    symbol: 'TEST',
    creatorId: '0x' + Math.random().toString(16).substr(2, 40),
    creatorAddress: '0x' + Math.random().toString(16).substr(2, 40),
    soldSupply: '0',
    totalBNB: '0',
    initialPrice: '1000000000000000',
    graduated: false,
    exists: true,
    isActive: true,
    isFeatured: false,
    isVerified: false,
    isHidden: false,
    ...tokenData,
  };

  return await prisma.token.create({
    data: defaultTokenData,
  });
}

/**
 * Create test transaction
 */
export async function createTestTransaction(transactionData: any = {}) {
  const prisma = getTestPrisma();

  const defaultTransactionData = {
    hash: '0x' + Math.random().toString(16).substr(2, 64),
    blockNumber: Math.floor(Math.random() * 10000000).toString(),
    blockHash: '0x' + Math.random().toString(16).substr(2, 64),
    transactionIndex: Math.floor(Math.random() * 100),
    type: 'BUY',
    tokenId: '0x' + Math.random().toString(16).substr(2, 40),
    tokenAddress: '0x' + Math.random().toString(16).substr(2, 40),
    traderAddress: '0x' + Math.random().toString(16).substr(2, 40),
    tokenAmount: '1000000000000000000',
    bnbAmount: '1000000000000000',
    price: '1000000000000000',
    platformFee: '50000000000000',
    creatorFee: '50000000000000',
    totalFee: '100000000000000',
    priceImpact: '0.01',
    status: 'PENDING',
    ...transactionData,
  };

  return await prisma.transaction.create({
    data: defaultTransactionData,
  });
}

/**
 * Get count of records in each table
 */
export async function getDatabaseStats() {
  const prisma = getTestPrisma();

  try {
    const [
      userCount,
      tokenCount,
      transactionCount,
      tokenFavoriteCount,
      tokenAnalyticsCount,
      userAnalyticsCount,
      priceHistoryCount,
      systemConfigCount,
      auditLogCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.token.count(),
      prisma.transaction.count(),
      prisma.tokenFavorite.count(),
      prisma.tokenAnalytics.count(),
      prisma.userAnalytics.count(),
      prisma.tokenPriceHistory.count(),
      prisma.systemConfig.count(),
      prisma.auditLog.count(),
    ]);

    return {
      users: userCount,
      tokens: tokenCount,
      transactions: transactionCount,
      tokenFavorites: tokenFavoriteCount,
      tokenAnalytics: tokenAnalyticsCount,
      userAnalytics: userAnalyticsCount,
      priceHistory: priceHistoryCount,
      systemConfig: systemConfigCount,
      auditLogs: auditLogCount,
    };
  } catch (error) {
    console.error('❌ Failed to get database stats:', error);
    throw error;
  }
}

/**
 * Check if test database exists and is accessible
 */
export async function checkTestDatabase(): Promise<boolean> {
  const prisma = getTestPrisma();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('❌ Test database not accessible:', error);
    return false;
  }
}

/**
 * Run database health check
 */
export async function runDatabaseHealthCheck(): Promise<{
  connected: boolean;
  stats: any;
  errors: string[];
}> {
  const errors: string[] = [];
  let stats = null;
  let connected = false;

  try {
    connected = await checkTestDatabase();
    if (connected) {
      stats = await getDatabaseStats();
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return {
    connected,
    stats,
    errors,
  };
}