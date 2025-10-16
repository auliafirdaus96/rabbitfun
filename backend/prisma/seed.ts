import { PrismaClient } from '../src/generated/prisma';
import { logger } from '../src/utils/logger';

const prisma = new PrismaClient();

async function main() {
  logger.info('Starting database seeding...');

  // Create system configuration
  const systemConfigs = [
    {
      key: 'PLATFORM_FEE_PERCENT',
      value: '0.01', // 1%
      description: 'Platform fee percentage for token trades'
    },
    {
      key: 'CREATOR_FEE_PERCENT',
      value: '0.01', // 1%
      description: 'Creator fee percentage for token trades'
    },
    {
      key: 'INITIAL_TOKEN_PRICE',
      value: '0.0001',
      description: 'Initial token price in BNB'
    },
    {
      key: 'MAX_TOKEN_SUPPLY',
      value: '1000000000000000000000000', // 1M tokens with 18 decimals
      description: 'Maximum token supply'
    },
    {
      key: 'GRADUATION_THRESHOLD',
      value: '100000000000000000000', // 100 BNB
      description: 'BNB amount needed for token graduation'
    },
    {
      key: 'MIN_CREATE_FEE',
      value: '0.01',
      description: 'Minimum fee to create a token'
    },
    {
      key: 'RATE_LIMIT_WINDOW',
      value: '900000',
      description: 'Rate limit window in milliseconds (15 minutes)'
    },
    {
      key: 'RATE_LIMIT_MAX_REQUESTS',
      value: '100',
      description: 'Maximum requests per rate limit window'
    }
  ];

  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: config,
      create: config
    });
  }

  logger.info(`Created ${systemConfigs.length} system configuration entries`);

  // Create sample admin user (this would normally be created through registration)
  const adminUser = await prisma.user.upsert({
    where: { walletAddress: '0x0000000000000000000000000000000000000000' },
    update: {
      isAdmin: true,
      isVerified: true,
      username: 'admin',
      displayName: 'System Admin'
    },
    create: {
      walletAddress: '0x0000000000000000000000000000000000000000',
      isAdmin: true,
      isVerified: true,
      username: 'admin',
      displayName: 'System Admin'
    }
  });

  logger.info('Created admin user');

  // Create sample tokens (for testing)
  const sampleTokens = [
    {
      address: '0x1234567890123456789012345678901234567890',
      name: 'Ahiru Test Token',
      symbol: 'AHIRU',
      metadata: 'https://gateway.pinata.cloud/ipfs/QmTestHash123',
      creatorId: adminUser.id,
      creatorAddress: '0x0000000000000000000000000000000000000000',
      description: 'A test token for Ahiru Launchpad',
      imageUrl: 'https://example.com/ahiru-logo.png',
      twitterUrl: 'https://twitter.com/ahirutoken',
      telegramUrl: 'https://t.me/ahirutoken',
      websiteUrl: 'https://ahirutoken.com',
      isFeatured: true,
      isVerified: true
    },
    {
      address: '0x0987654321098765432109876543210987654321',
      name: 'Demo Token',
      symbol: 'DEMO',
      metadata: '',
      creatorId: adminUser.id,
      creatorAddress: '0x0000000000000000000000000000000000000000',
      description: 'Demo token for testing purposes',
      isFeatured: false,
      isVerified: false
    }
  ];

  for (const tokenData of sampleTokens) {
    await prisma.token.upsert({
      where: { address: tokenData.address },
      update: tokenData,
      create: tokenData
    });
  }

  logger.info(`Created ${sampleTokens.length} sample tokens`);

  // Create sample transactions
  const sampleTransactions = [
    {
      hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      blockNumber: '12345678',
      blockHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
      transactionIndex: 1,
      type: 'BUY' as const,
      tokenId: sampleTokens[0].address,
      tokenAddress: sampleTokens[0].address,
      traderAddress: '0x1111111111111111111111111111111111111111',
      tokenAmount: '100000000000000000000', // 100 tokens
      bnbAmount: '10000000000000000', // 0.01 BNB
      price: '100000000000000', // 0.0001 BNB per token
      platformFee: '100000000000000', // 0.0001 BNB
      creatorFee: '100000000000000', // 0.0001 BNB
      totalFee: '200000000000000', // 0.0002 BNB
      priceImpact: '0.01',
      status: 'CONFIRMED' as const,
      gasUsed: '21000',
      gasPrice: '20000000000',
      confirmedAt: new Date()
    },
    {
      hash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
      blockNumber: '12345679',
      blockHash: '0x9876543210987654321098765432109876543210987654321098765432109876',
      transactionIndex: 2,
      type: 'SELL' as const,
      tokenId: sampleTokens[0].address,
      tokenAddress: sampleTokens[0].address,
      traderAddress: '0x2222222222222222222222222222222222222222',
      tokenAmount: '50000000000000000000', // 50 tokens
      bnbAmount: '5000000000000000', // 0.005 BNB
      price: '100000000000000', // 0.0001 BNB per token
      platformFee: '50000000000000', // 0.00005 BNB
      creatorFee: '50000000000000', // 0.00005 BNB
      totalFee: '100000000000000', // 0.0001 BNB
      priceImpact: '0.005',
      status: 'CONFIRMED' as const,
      gasUsed: '21000',
      gasPrice: '20000000000',
      confirmedAt: new Date()
    }
  ];

  for (const txData of sampleTransactions) {
    await prisma.transaction.upsert({
      where: { hash: txData.hash },
      update: txData,
      create: txData
    });
  }

  logger.info(`Created ${sampleTransactions.length} sample transactions`);

  // Create token analytics
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const token of sampleTokens) {
    await prisma.tokenAnalytics.upsert({
      where: {
        tokenId_date: {
          tokenId: token.address,
          date: today
        }
      },
      update: {
        totalVolume: '15000000000000000', // 0.015 BNB
        totalTrades: 2,
        totalBuyers: 1,
        totalSellers: 1,
        openPrice: '100000000000000', // 0.0001 BNB
        closePrice: '100000000000000', // 0.0001 BNB
        highPrice: '100000000000000', // 0.0001 BNB
        lowPrice: '100000000000000', // 0.0001 BNB
        marketCap: '100000000000000000', // 0.1 BNB (assuming 1000 tokens)
        liquidity: '10000000000000000' // 0.01 BNB
      },
      create: {
        tokenId: token.address,
        date: today,
        totalVolume: '15000000000000000', // 0.015 BNB
        totalTrades: 2,
        totalBuyers: 1,
        totalSellers: 1,
        openPrice: '100000000000000', // 0.0001 BNB
        closePrice: '100000000000000', // 0.0001 BNB
        highPrice: '100000000000000', // 0.0001 BNB
        lowPrice: '100000000000000', // 0.0001 BNB
        marketCap: '100000000000000000', // 0.1 BNB
        liquidity: '10000000000000000' // 0.01 BNB
      }
    });
  }

  logger.info('Created token analytics for today');

  // Create sample user analytics
  await prisma.userAnalytics.upsert({
    where: {
      userId_date: {
        userId: adminUser.id,
        date: today
      }
    },
    update: {
      tokensCreated: 2,
      transactionsMade: 0,
      volumeTraded: '0',
      portfolioValue: '0',
      holdingsCount: 0,
      favoritesCount: 0
    },
    create: {
      userId: adminUser.id,
      date: today,
      tokensCreated: 2,
      transactionsMade: 0,
      volumeTraded: '0',
      portfolioValue: '0',
      holdingsCount: 0,
      favoritesCount: 0
    }
  });

  logger.info('Created user analytics for admin');

  logger.info('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    logger.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });