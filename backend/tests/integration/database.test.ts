import { PrismaClient } from '../../src/generated/prisma';

describe('Database Integration Tests', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Database Connection', () => {
    it('should connect to database successfully', async () => {
      // Simple connection test
      await expect(prisma.$queryRaw`SELECT 1`).resolves.toBeDefined();
    });

    it('should be able to query system config', async () => {
      // Test basic query operation
      const configs = await prisma.systemConfig.findMany();
      expect(Array.isArray(configs)).toBe(true);
    });
  });

  describe('Token Operations', () => {
    it('should be able to create and find tokens', async () => {
      const tokenData = {
        address: '0x1234567890123456789012345678901234567890',
        name: 'Test Token',
        symbol: 'TEST',
        creatorId: 'test-creator-id',
        creatorAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        soldSupply: '0',
        totalBNB: '0',
        initialPrice: '1000000000000000', // 0.001 BNB
        isActive: true,
        isHidden: false,
      };

      const createdToken = await prisma.token.create({
        data: tokenData,
      });

      expect(createdToken).toBeDefined();
      expect(createdToken.address).toBe(tokenData.address);
      expect(createdToken.name).toBe(tokenData.name);

      // Clean up
      await prisma.token.delete({
        where: { address: tokenData.address },
      });
    });
  });
});