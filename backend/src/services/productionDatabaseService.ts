import { PrismaClient } from '../generated/prisma-production';
import logger from '../utils/logger';

class ProductionDatabaseService {
  private prisma: PrismaClient;
  private static instance: ProductionDatabaseService;

  constructor() {
    this.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
      errorFormat: 'pretty',
    });
  }

  public static getInstance(): ProductionDatabaseService {
    if (!ProductionDatabaseService.instance) {
      ProductionDatabaseService.instance = new ProductionDatabaseService();
    }
    return ProductionDatabaseService.instance;
  }

  // Connection management
  async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      logger.info('Production PostgreSQL database connected successfully');
    } catch (error) {
      logger.error('Failed to connect to production database:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      logger.info('Production database disconnected successfully');
    } catch (error) {
      logger.error('Error disconnecting from database:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; responseTime: number }> {
    const startTime = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;
      return {
        status: 'healthy',
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        responseTime,
      };
    }
  }

  // User management
  async createOrUpdateUser(userData: {
    walletAddress: string;
    email?: string;
    username?: string;
    displayName?: string;
  }) {
    try {
      const user = await this.prisma.user.upsert({
        where: { walletAddress: userData.walletAddress },
        update: {
          ...userData,
          lastLoginAt: new Date(),
          loginCount: { increment: 1 },
        },
        create: {
          ...userData,
          isActive: true,
        },
      });
      return user;
    } catch (error) {
      logger.error('Error creating/updating user:', error);
      throw error;
    }
  }

  async getUserByWallet(walletAddress: string) {
    try {
      return await this.prisma.user.findUnique({
        where: { walletAddress },
        include: {
          createdTokens: true,
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          userAnalytics: {
            orderBy: { date: 'desc' },
            take: 30,
          },
        },
      });
    } catch (error) {
      logger.error('Error fetching user by wallet:', error);
      throw error;
    }
  }

  // Token management
  async createToken(tokenData: {
    address: string;
    name: string;
    symbol: string;
    creatorAddress: string;
    creatorId?: string;
    description?: string;
    imageUrl?: string;
    initialPrice?: string;
  }) {
    try {
      const token = await this.prisma.token.create({
        data: {
          ...tokenData,
          isActive: true,
          exists: true,
          totalPlatformFees: '0',
          totalCreatorFees: '0',
          bondingCurveLiquidity: '0',
          liquidityPoolAmount: '0',
        },
      });
      return token;
    } catch (error) {
      logger.error('Error creating token:', error);
      throw error;
    }
  }

  async getTokens(filter: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    isFeatured?: boolean;
    sortBy?: 'createdAt' | 'totalBNB' | 'marketCap';
    sortOrder?: 'asc' | 'desc';
  } = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        isActive = true,
        isFeatured,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = filter;

      const skip = (page - 1) * limit;
      const where: any = { isActive };

      if (isFeatured !== undefined) {
        where.isFeatured = isFeatured;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { symbol: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [tokens, total] = await Promise.all([
        this.prisma.token.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            creator: {
              select: {
                walletAddress: true,
                username: true,
                displayName: true,
                avatar: true,
              },
            },
            _count: {
              select: {
                transactions: true,
                tokenFavorites: true,
              },
            },
          },
        }),
        this.prisma.token.count({ where }),
      ]);

      return {
        tokens,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching tokens:', error);
      throw error;
    }
  }

  async getTokenByAddress(address: string) {
    try {
      return await this.prisma.token.findUnique({
        where: { address },
        include: {
          creator: {
            select: {
              walletAddress: true,
              username: true,
              displayName: true,
              avatar: true,
              isVerified: true,
            },
          },
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          tokenAnalytics: {
            orderBy: { date: 'desc' },
            take: 30,
          },
          priceHistory: {
            orderBy: { timestamp: 'desc' },
            take: 100,
          },
          _count: {
            select: {
              transactions: true,
              tokenFavorites: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error fetching token by address:', error);
      throw error;
    }
  }

  async updateTokenStatus(address: string, status: {
    isActive?: boolean;
    isFeatured?: boolean;
    isVerified?: boolean;
    isHidden?: boolean;
    hideReason?: string;
  }) {
    try {
      return await this.prisma.token.update({
        where: { address },
        data: status,
      });
    } catch (error) {
      logger.error('Error updating token status:', error);
      throw error;
    }
  }

  // Transaction management
  async createTransaction(transactionData: {
    hash: string;
    blockNumber: string;
    blockHash: string;
    transactionIndex: number;
    type: 'BUY' | 'SELL';
    tokenId: string;
    tokenAddress: string;
    traderAddress?: string;
    tokenAmount: string;
    bnbAmount: string;
    price: string;
    platformFee?: string;
    creatorFee?: string;
    totalFee?: string;
    priceImpact?: string;
  }) {
    try {
      const transaction = await this.prisma.transaction.create({
        data: {
          ...transactionData,
          status: 'PENDING',
        },
      });

      // Update token statistics
      await this.updateTokenStats(transactionData.tokenId, transactionData.type, transactionData.bnbAmount);

      return transaction;
    } catch (error) {
      logger.error('Error creating transaction:', error);
      throw error;
    }
  }

  async updateTransactionStatus(hash: string, status: {
    status: 'PENDING' | 'PROCESSING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';
    gasUsed?: string;
    gasPrice?: string;
    errorMessage?: string;
    confirmedAt?: Date;
  }) {
    try {
      return await this.prisma.transaction.update({
        where: { hash },
        data: status,
      });
    } catch (error) {
      logger.error('Error updating transaction status:', error);
      throw error;
    }
  }

  async getTransactions(filter: {
    page?: number;
    limit?: number;
    tokenId?: string;
    traderAddress?: string;
    type?: 'BUY' | 'SELL';
    status?: string;
  } = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        tokenId,
        traderAddress,
        type,
        status,
      } = filter;

      const skip = (page - 1) * limit;
      const where: any = {};

      if (tokenId) where.tokenId = tokenId;
      if (traderAddress) where.traderAddress = traderAddress;
      if (type) where.type = type;
      if (status) where.status = status;

      const [transactions, total] = await Promise.all([
        this.prisma.transaction.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            token: {
              select: {
                address: true,
                name: true,
                symbol: true,
                imageUrl: true,
              },
            },
            trader: {
              select: {
                walletAddress: true,
                username: true,
                displayName: true,
                avatar: true,
              },
            },
          },
        }),
        this.prisma.transaction.count({ where }),
      ]);

      return {
        transactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching transactions:', error);
      throw error;
    }
  }

  // Analytics
  async getTokenAnalytics(tokenId: string, days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      return await this.prisma.tokenAnalytics.findMany({
        where: {
          tokenId,
          date: { gte: startDate },
        },
        orderBy: { date: 'asc' },
      });
    } catch (error) {
      logger.error('Error fetching token analytics:', error);
      throw error;
    }
  }

  async updateDailyAnalytics(tokenId: string) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Get today's transactions
      const todayTransactions = await this.prisma.transaction.findMany({
        where: {
          tokenId,
          createdAt: { gte: today },
          status: 'CONFIRMED',
        },
      });

      // Calculate metrics
      const totalVolume = todayTransactions.reduce(
        (sum, tx) => sum + BigInt(tx.bnbAmount),
        BigInt(0)
      );

      const totalBuys = todayTransactions.filter(tx => tx.type === 'BUY').length;
      const totalSells = todayTransactions.filter(tx => tx.type === 'SELL').length;
      const uniqueTraders = new Set(todayTransactions.map(tx => tx.traderAddress)).size;

      // Get price data
      const priceHistory = await this.prisma.tokenPriceHistory.findFirst({
        where: { tokenId },
        orderBy: { timestamp: 'desc' },
      });

      // Update or create analytics record
      await this.prisma.tokenAnalytics.upsert({
        where: {
          tokenId_date: {
            tokenId,
            date: today,
          },
        },
        update: {
          totalVolume: totalVolume.toString(),
          totalTrades: totalBuys + totalSells,
          totalBuyers: totalBuys,
          totalSellers: totalSells,
          uniqueTraders,
          closePrice: priceHistory?.price || '0',
        },
        create: {
          tokenId,
          date: today,
          totalVolume: totalVolume.toString(),
          totalTrades: totalBuys + totalSells,
          totalBuyers: totalBuys,
          totalSellers: totalSells,
          uniqueTraders,
          openPrice: priceHistory?.price || '0',
          closePrice: priceHistory?.price || '0',
          highPrice: priceHistory?.price || '0',
          lowPrice: priceHistory?.price || '0',
        },
      });
    } catch (error) {
      logger.error('Error updating daily analytics:', error);
      throw error;
    }
  }

  // Helper methods
  private async updateTokenStats(tokenId: string, type: 'BUY' | 'SELL', bnbAmount: string) {
    try {
      const updateData: any = {
        totalBNB: { increment: BigInt(bnbAmount) },
      };

      if (type === 'BUY') {
        updateData.soldSupply = { increment: BigInt(1) }; // This should be calculated based on bonding curve
      }

      await this.prisma.token.update({
        where: { id: tokenId },
        data: updateData,
      });
    } catch (error) {
      logger.error('Error updating token stats:', error);
    }
  }

  // Get Prisma client for custom queries
  getPrismaClient(): PrismaClient {
    return this.prisma;
  }

  // Raw query execution
  async executeRawQuery<T = any>(query: string, ...params: any[]): Promise<T[]> {
    try {
      return await this.prisma.$queryRawUnsafe(query, ...params);
    } catch (error) {
      logger.error('Error executing raw query:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const productionDatabaseService = ProductionDatabaseService.getInstance();
export default productionDatabaseService;