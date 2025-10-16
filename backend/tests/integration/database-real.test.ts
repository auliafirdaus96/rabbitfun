import { PrismaClient } from '../../src/generated/prisma-test';
import {
  setupTestDatabase,
  cleanupTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
  createTestUser,
  createTestToken,
  createTestTransaction,
  getDatabaseStats,
  checkTestDatabase
} from '../helpers/databaseHelper';

const prisma = new PrismaClient();

describe('Database Integration Tests (Real Database)', () => {
  beforeAll(async () => {
    // Setup test database with real connection
    await setupTestDatabase();
  });

  afterAll(async () => {
    // Cleanup test database
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    // Ensure database is clean before each test
    // Note: In a real scenario, you might want to clean only specific data
  });

  afterEach(async () => {
    // Clean up any test-specific data after each test
  });

  describe('Database Connection', () => {
    it('should connect to test database successfully', async () => {
      const isConnected = await checkTestDatabase();
      expect(isConnected).toBe(true);
    });

    it('should be able to execute simple queries', async () => {
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should have proper database structure', async () => {
      // Check if all expected tables exist
      const tables = await prisma.$queryRaw`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `;

      const tableNames = (tables as any[]).map(t => t.table_name);

      // Check for expected tables
      const expectedTables = [
        'users',
        'tokens',
        'transactions',
        'token_favorites',
        'token_analytics',
        'user_analytics',
        'token_price_history',
        'system_config',
        'audit_logs'
      ];

      expectedTables.forEach(table => {
        expect(tableNames).toContain(table);
      });
    });

    it('should have seeded test data', async () => {
      const stats = await getDatabaseStats();

      expect(stats.users).toBeGreaterThan(0);
      expect(stats.tokens).toBeGreaterThan(0);
      expect(stats.transactions).toBeGreaterThan(0);
      expect(stats.systemConfig).toBeGreaterThan(0);
    });
  });

  describe('User Operations', () => {
    it('should create a new user', async () => {
      const userData = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        email: 'newuser@example.com',
        username: 'newuser',
        displayName: 'New Test User',
        isActive: true,
        isAdmin: false,
        isVerified: false,
      };

      const user = await createTestUser(userData);

      expect(user).toBeDefined();
      expect(user.walletAddress).toBe(userData.walletAddress);
      expect(user.email).toBe(userData.email);
      expect(user.username).toBe(userData.username);
      expect(user.isActive).toBe(true);
      expect(user.createdAt).toBeDefined();
    });

    it('should find user by wallet address', async () => {
      const testAddress = '0x1111111111111111111111111111111111111111';

      // Create user
      await createTestUser({ walletAddress: testAddress });

      // Find user
      const user = await prisma.user.findUnique({
        where: { walletAddress: testAddress }
      });

      expect(user).toBeDefined();
      expect(user!.walletAddress).toBe(testAddress);
    });

    it('should update user information', async () => {
      const user = await createTestUser();

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          displayName: 'Updated Display Name',
          isVerified: true,
        }
      });

      expect(updatedUser.displayName).toBe('Updated Display Name');
      expect(updatedUser.isVerified).toBe(true);
      expect(updatedUser.updatedAt.getTime()).toBeGreaterThan(user.createdAt.getTime());
    });

    it('should delete user', async () => {
      const user = await createTestUser();

      await prisma.user.delete({
        where: { id: user.id }
      });

      const deletedUser = await prisma.user.findUnique({
        where: { id: user.id }
      });

      expect(deletedUser).toBeNull();
    });

    it('should enforce unique constraints on wallet addresses', async () => {
      const walletAddress = '0x9999999999999999999999999999999999999999';

      await createTestUser({ walletAddress });

      await expect(
        prisma.user.create({
          data: {
            walletAddress,
            email: 'duplicate@example.com',
            isActive: true,
          }
        })
      ).rejects.toThrow();
    });
  });

  describe('Token Operations', () => {
    it('should create a new token', async () => {
      const tokenData = {
        address: '0x2222222222222222222222222222222222222222',
        name: 'Test Token',
        symbol: 'TEST',
        creatorId: '0x1234567890123456789012345678901234567890',
        creatorAddress: '0x1234567890123456789012345678901234567890',
        initialPrice: '1000000000000000',
        isActive: true,
        isFeatured: false,
        isVerified: false,
      };

      const token = await createTestToken(tokenData);

      expect(token).toBeDefined();
      expect(token.address).toBe(tokenData.address);
      expect(token.name).toBe(tokenData.name);
      expect(token.symbol).toBe(tokenData.symbol);
      expect(token.isActive).toBe(true);
      expect(token.createdAt).toBeDefined();
    });

    it('should find token by address', async () => {
      const testAddress = '0x3333333333333333333333333333333333333333';

      await createTestToken({ address: testAddress });

      const token = await prisma.token.findUnique({
        where: { address: testAddress }
      });

      expect(token).toBeDefined();
      expect(token!.address).toBe(testAddress);
    });

    it('should update token information', async () => {
      const token = await createTestToken();

      const updatedToken = await prisma.token.update({
        where: { id: token.id },
        data: {
          totalBNB: '10000000000000000',
          isFeatured: true,
          isVerified: true,
        }
      });

      expect(updatedToken.totalBNB).toBe('10000000000000000');
      expect(updatedToken.isFeatured).toBe(true);
      expect(updatedToken.isVerified).toBe(true);
    });

    it('should handle token graduation', async () => {
      const token = await createTestToken();

      const graduatedToken = await prisma.token.update({
        where: { id: token.id },
        data: {
          graduated: true,
          graduatedAt: new Date(),
        }
      });

      expect(graduatedToken.graduated).toBe(true);
      expect(graduatedToken.graduatedAt).toBeDefined();
    });

    it('should enforce unique constraints on token addresses', async () => {
      const tokenAddress = '0x8888888888888888888888888888888888888888';

      await createTestToken({ address: tokenAddress });

      await expect(
        prisma.token.create({
          data: {
            address: tokenAddress,
            name: 'Duplicate Token',
            symbol: 'DUP',
            creatorId: '0x1234567890123456789012345678901234567890',
            creatorAddress: '0x1234567890123456789012345678901234567890',
            isActive: true,
          }
        })
      ).rejects.toThrow();
    });
  });

  describe('Transaction Operations', () => {
    it('should create a new transaction', async () => {
      const transactionData = {
        hash: '0x4444444444444444444444444444444444444444444444444444444444444444',
        blockNumber: '12345678',
        blockHash: '0x5555555555555555555555555555555555555555555555555555555555555555',
        transactionIndex: 15,
        type: 'BUY',
        tokenId: '0x6666666666666666666666666666666666666666',
        tokenAddress: '0x6666666666666666666666666666666666666666',
        traderAddress: '0x7777777777777777777777777777777777777777',
        tokenAmount: '1000000000000000000',
        bnbAmount: '1000000000000000',
        price: '1000000000000000',
        status: 'PENDING',
      };

      const transaction = await createTestTransaction(transactionData);

      expect(transaction).toBeDefined();
      expect(transaction.hash).toBe(transactionData.hash);
      expect(transaction.type).toBe('BUY');
      expect(transaction.status).toBe('PENDING');
      expect(transaction.createdAt).toBeDefined();
    });

    it('should update transaction status', async () => {
      const transaction = await createTestTransaction();

      const updatedTransaction = await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
          gasUsed: '21000',
        }
      });

      expect(updatedTransaction.status).toBe('CONFIRMED');
      expect(updatedTransaction.confirmedAt).toBeDefined();
      expect(updatedTransaction.gasUsed).toBe('21000');
    });

    it('should find transactions by trader address', async () => {
      const traderAddress = '0x9999999999999999999999999999999999999999';

      await createTestTransaction({ traderAddress });
      await createTestTransaction({ traderAddress });

      const transactions = await prisma.transaction.findMany({
        where: { traderAddress },
        orderBy: { createdAt: 'desc' }
      });

      expect(transactions).toHaveLength(2);
      expect(transactions[0].traderAddress).toBe(traderAddress);
      expect(transactions[1].traderAddress).toBe(traderAddress);
    });

    it('should enforce unique constraints on transaction hashes', async () => {
      const txHash = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

      await createTestTransaction({ hash: txHash });

      await expect(
        prisma.transaction.create({
          data: {
            hash: txHash,
            blockNumber: '12345679',
            blockHash: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            transactionIndex: 16,
            type: 'SELL',
            tokenId: '0xcccccccccccccccccccccccccccccccccccccccccc',
            tokenAddress: '0xcccccccccccccccccccccccccccccccccccccccccc',
            traderAddress: '0xdddddddddddddddddddddddddddddddddddddddddd',
            tokenAmount: '500000000000000000',
            bnbAmount: '500000000000000',
            price: '1000000000000000',
            status: 'PENDING',
          }
        })
      ).rejects.toThrow();
    });
  });

  describe('Relationship Operations', () => {
    it('should create token favorites', async () => {
      const user = await createTestUser();
      const token = await createTestToken();

      const favorite = await prisma.tokenFavorite.create({
        data: {
          userId: user.id,
          tokenId: token.id,
        }
      });

      expect(favorite).toBeDefined();
      expect(favorite.userId).toBe(user.id);
      expect(favorite.tokenId).toBe(token.id);
      expect(favorite.createdAt).toBeDefined();
    });

    it('should find user with their favorite tokens', async () => {
      const user = await createTestUser();
      const token1 = await createTestToken();
      const token2 = await createTestToken();

      // Create favorites
      await prisma.tokenFavorite.create({
        data: { userId: user.id, tokenId: token1.id }
      });
      await prisma.tokenFavorite.create({
        data: { userId: user.id, tokenId: token2.id }
      });

      // Find user with favorites
      const userWithFavorites = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          tokenFavorites: {
            include: { token: true }
          }
        }
      });

      expect(userWithFavorites).toBeDefined();
      expect(userWithFavorites!.tokenFavorites).toHaveLength(2);
      expect(userWithFavorites!.tokenFavorites[0].token).toBeDefined();
    });

    it('should find token with transactions', async () => {
      const token = await createTestToken();
      const traderAddress = '0x1111111111111111111111111111111111111111';

      // Create transactions
      await createTestTransaction({
        tokenId: token.id,
        tokenAddress: token.address,
        traderAddress
      });
      await createTestTransaction({
        tokenId: token.id,
        tokenAddress: token.address,
        traderAddress
      });

      // Find token with transactions
      const tokenWithTransactions = await prisma.token.findUnique({
        where: { id: token.id },
        include: {
          transactions: true
        }
      });

      expect(tokenWithTransactions).toBeDefined();
      expect(tokenWithTransactions!.transactions).toHaveLength(2);
    });

    it('should enforce unique constraints on favorites', async () => {
      const user = await createTestUser();
      const token = await createTestToken();

      await prisma.tokenFavorite.create({
        data: { userId: user.id, tokenId: token.id }
      });

      await expect(
        prisma.tokenFavorite.create({
          data: { userId: user.id, tokenId: token.id }
        })
      ).rejects.toThrow();
    });
  });

  describe('Analytics Operations', () => {
    it('should create token analytics', async () => {
      const token = await createTestToken();
      const analyticsData = {
        tokenId: token.id,
        date: new Date(),
        totalVolume: '10000000000000000',
        totalTrades: 5,
        totalBuyers: 3,
        totalSellers: 2,
        openPrice: '1000000000000000',
        closePrice: '1100000000000000',
        highPrice: '1200000000000000',
        lowPrice: '900000000000000',
        marketCap: '1000000000000000000000',
        liquidity: '500000000000000000',
      };

      const analytics = await prisma.tokenAnalytics.create({
        data: analyticsData
      });

      expect(analytics).toBeDefined();
      expect(analytics.tokenId).toBe(token.id);
      expect(analytics.totalTrades).toBe(5);
      expect(analytics.totalBuyers).toBe(3);
      expect(analytics.totalSellers).toBe(2);
    });

    it('should create user analytics', async () => {
      const user = await createTestUser();
      const analyticsData = {
        userId: user.id,
        date: new Date(),
        tokensCreated: 2,
        transactionsMade: 10,
        volumeTraded: '50000000000000000',
        portfolioValue: '20000000000000000000',
        holdingsCount: 5,
        favoritesCount: 3,
      };

      const analytics = await prisma.userAnalytics.create({
        data: analyticsData
      });

      expect(analytics).toBeDefined();
      expect(analytics.userId).toBe(user.id);
      expect(analytics.tokensCreated).toBe(2);
      expect(analytics.transactionsMade).toBe(10);
    });

    it('should create token price history', async () => {
      const token = await createTestToken();
      const priceHistoryData = {
        tokenId: token.id,
        timestamp: new Date(),
        price: '1500000000000000',
        supply: '1000000000000000000000',
      };

      const priceHistory = await prisma.tokenPriceHistory.create({
        data: priceHistoryData
      });

      expect(priceHistory).toBeDefined();
      expect(priceHistory.tokenId).toBe(token.id);
      expect(priceHistory.price).toBe('1500000000000000');
    });
  });

  describe('System Configuration', () => {
    it('should create system configuration', async () => {
      const configData = {
        key: 'test_config',
        value: 'test_value',
        description: 'Test configuration for integration tests',
      };

      const config = await prisma.systemConfig.create({
        data: configData
      });

      expect(config).toBeDefined();
      expect(config.key).toBe('test_config');
      expect(config.value).toBe('test_value');
      expect(config.description).toBe('Test configuration for integration tests');
      expect(config.updatedAt).toBeDefined();
    });

    it('should update system configuration', async () => {
      const config = await prisma.systemConfig.create({
        data: {
          key: 'updatable_config',
          value: 'initial_value',
          description: 'Config to test updates',
        }
      });

      const updatedConfig = await prisma.systemConfig.update({
        where: { id: config.id },
        data: { value: 'updated_value' }
      });

      expect(updatedConfig.value).toBe('updated_value');
      expect(updatedConfig.updatedAt.getTime()).toBeGreaterThan(config.updatedAt.getTime());
    });

    it('should find system configuration by key', async () => {
      const config = await prisma.systemConfig.create({
        data: {
          key: 'findable_config',
          value: 'findable_value',
          description: 'Config to test finding',
        }
      });

      const foundConfig = await prisma.systemConfig.findUnique({
        where: { key: 'findable_config' }
      });

      expect(foundConfig).toBeDefined();
      expect(foundConfig!.value).toBe('findable_value');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle bulk operations efficiently', async () => {
      const startTime = Date.now();

      // Create 100 users in bulk
      const users = await Promise.all(
        Array(10).fill(null).map(() => createTestUser())
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(users).toHaveLength(10);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle complex queries with joins', async () => {
      const user = await createTestUser();
      const token = await createTestToken();

      // Create favorites
      await Promise.all(
        Array(5).fill(null).map(() =>
          prisma.tokenFavorite.create({
            data: { userId: user.id, tokenId: token.id }
          })
        )
      );

      // Complex query with joins and aggregations
      const result = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          tokenFavorites: {
            include: {
              token: {
                include: {
                  transactions: true,
                  tokenAnalytics: true
                }
              }
            }
          },
          userAnalytics: true
        }
      });

      expect(result).toBeDefined();
      expect(result!.tokenFavorites).toHaveLength(5);
    });

    it('should handle concurrent operations', async () => {
      const token = await createTestToken();

      // Create multiple transactions concurrently
      const transactions = await Promise.all(
        Array(10).fill(null).map((_, index) =>
          createTestTransaction({
            hash: `0x${index.toString().padStart(64, '0')}`,
            tokenId: token.id,
            tokenAddress: token.address,
            traderAddress: `0x${index.toString().padStart(40, '0')}`,
          })
        )
      );

      expect(transactions).toHaveLength(10);

      // Verify all transactions were created successfully
      const count = await prisma.transaction.count({
        where: { tokenId: token.id }
      });
      expect(count).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Data Integrity and Constraints', () => {
    it('should maintain foreign key constraints', async () => {
      const user = await createTestUser();
      const token = await createTestToken();

      // Create valid relationship
      const favorite = await prisma.tokenFavorite.create({
        data: { userId: user.id, tokenId: token.id }
      });

      expect(favorite).toBeDefined();

      // Try to create relationship with non-existent user
      await expect(
        prisma.tokenFavorite.create({
          data: {
            userId: 'non-existent-user-id',
            tokenId: token.id
          }
        })
      ).rejects.toThrow();
    });

    it('should handle cascading deletes correctly', async () => {
      const user = await createTestUser();
      const token = await createTestToken();

      // Create favorite
      await prisma.tokenFavorite.create({
        data: { userId: user.id, tokenId: token.id }
      });

      // Verify favorite exists
      let favorite = await prisma.tokenFavorite.findFirst({
        where: { userId: user.id, tokenId: token.id }
      });
      expect(favorite).toBeDefined();

      // Delete user (should cascade delete favorites)
      await prisma.user.delete({
        where: { id: user.id }
      });

      // Verify favorite was deleted
      favorite = await prisma.tokenFavorite.findFirst({
        where: { userId: user.id, tokenId: token.id }
      });
      expect(favorite).toBeNull();
    });

    it('should enforce check constraints', async () => {
      // Test that invalid data types are rejected
      await expect(
        prisma.token.create({
          data: {
            address: '0x1234567890123456789012345678901234567890',
            name: 'Test Token',
            symbol: 'TEST',
            creatorId: '0x1234567890123456789012345678901234567890',
            creatorAddress: '0x1234567890123456789012345678901234567890',
            soldSupply: 'invalid_number', // Should be a valid number string
            isActive: true,
          }
        })
      ).rejects.toThrow();
    });
  });
});