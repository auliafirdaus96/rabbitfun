import { PrismaClient, Prisma } from '../generated/prisma';
import logger from '../utils/logger';

export class DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient({
      log: ['error', 'warn'],
      errorFormat: 'pretty'
    });
  }

  // User operations
  async createUser(data: Prisma.UserCreateInput) {
    try {
      const user = await this.prisma.user.create({ data });
      logger.info(`Created user: ${user.walletAddress}`);
      return user;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  async getUserByWalletAddress(walletAddress: string) {
    try {
      return await this.prisma.user.findUnique({
        where: { walletAddress }
      });
    } catch (error) {
      logger.error('Error fetching user by wallet address:', error);
      throw error;
    }
  }

  async updateUser(walletAddress: string, data: Prisma.UserUpdateInput) {
    try {
      const user = await this.prisma.user.update({
        where: { walletAddress },
        data
      });
      logger.info(`Updated user: ${user.walletAddress}`);
      return user;
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  // Token operations
  async createToken(data: Prisma.TokenCreateInput) {
    try {
      const token = await this.prisma.token.create({ data });
      logger.info(`Created token: ${token.address}`);
      return token;
    } catch (error) {
      logger.error('Error creating token:', error);
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
              avatar: true
            }
          },
          _count: {
            select: {
              transactions: true,
              tokenFavorites: true
            }
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching token by address:', error);
      throw error;
    }
  }

  async getAllTokens(params: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
    creator?: string;
    graduated?: boolean;
    isFeatured?: boolean;
    isVerified?: boolean;
  }) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search,
        creator,
        graduated,
        isFeatured,
        isVerified
      } = params;

      const skip = (page - 1) * limit;
      const where: Prisma.TokenWhereInput = {
        isActive: true,
        isHidden: false,
        ...(creator && { creatorAddress: creator }),
        ...(graduated !== undefined && { graduated }),
        ...(isFeatured !== undefined && { isFeatured }),
        ...(isVerified !== undefined && { isVerified }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { symbol: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        })
      };

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
                avatar: true
              }
            },
            _count: {
              select: {
                transactions: true,
                tokenFavorites: true
              }
            }
          }
        }),
        this.prisma.token.count({ where })
      ]);

      return {
        tokens,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error fetching all tokens:', error);
      throw error;
    }
  }

  async updateToken(address: string, data: Prisma.TokenUpdateInput) {
    try {
      const token = await this.prisma.token.update({
        where: { address },
        data,
        include: {
          creator: {
            select: {
              walletAddress: true,
              username: true,
              displayName: true,
              avatar: true
            }
          }
        }
      });
      logger.info(`Updated token: ${token.address}`);
      return token;
    } catch (error) {
      logger.error('Error updating token:', error);
      throw error;
    }
  }

  // Transaction operations
  async createTransaction(data: Prisma.TransactionCreateInput) {
    try {
      const transaction = await this.prisma.transaction.create({ data });
      logger.info(`Created transaction: ${transaction.hash}`);
      return transaction;
    } catch (error) {
      logger.error('Error creating transaction:', error);
      throw error;
    }
  }

  async getTransactionsByToken(tokenAddress: string, params: {
    page?: number;
    limit?: number;
    type?: 'BUY' | 'SELL';
    status?: 'PENDING' | 'CONFIRMED' | 'FAILED';
  }) {
    try {
      const { page = 1, limit = 50, type, status } = params;
      const skip = (page - 1) * limit;

      const where: Prisma.TransactionWhereInput = {
        tokenAddress,
        ...(type && { type }),
        ...(status && { status })
      };

      const [transactions, total] = await Promise.all([
        this.prisma.transaction.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            trader: {
              select: {
                walletAddress: true,
                username: true,
                displayName: true,
                avatar: true
              }
            }
          }
        }),
        this.prisma.transaction.count({ where })
      ]);

      return {
        transactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error fetching transactions by token:', error);
      throw error;
    }
  }

  async getTransactionsByUser(walletAddress: string, params: {
    page?: number;
    limit?: number;
    type?: 'BUY' | 'SELL';
  }) {
    try {
      const { page = 1, limit = 50, type } = params;
      const skip = (page - 1) * limit;

      const where: Prisma.TransactionWhereInput = {
        traderAddress: walletAddress,
        ...(type && { type })
      };

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
                imageUrl: true
              }
            }
          }
        }),
        this.prisma.transaction.count({ where })
      ]);

      return {
        transactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error fetching transactions by user:', error);
      throw error;
    }
  }

  // Token favorites operations
  async addTokenFavorite(userId: string, tokenId: string) {
    try {
      const favorite = await this.prisma.tokenFavorite.create({
        data: { userId, tokenId }
      });
      logger.info(`User ${userId} favorited token ${tokenId}`);
      return favorite;
    } catch (error) {
      logger.error('Error adding token favorite:', error);
      throw error;
    }
  }

  async removeTokenFavorite(userId: string, tokenId: string) {
    try {
      await this.prisma.tokenFavorite.delete({
        where: {
          userId_tokenId: { userId, tokenId }
        }
      });
      logger.info(`User ${userId} unfavorited token ${tokenId}`);
    } catch (error) {
      logger.error('Error removing token favorite:', error);
      throw error;
    }
  }

  async getUserFavoriteTokens(userId: string, params: { page?: number; limit?: number }) {
    try {
      const { page = 1, limit = 20 } = params;
      const skip = (page - 1) * limit;

      const [favorites, total] = await Promise.all([
        this.prisma.tokenFavorite.findMany({
          where: { userId },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            token: {
              include: {
                creator: {
                  select: {
                    walletAddress: true,
                    username: true,
                    displayName: true,
                    avatar: true
                  }
                },
                _count: {
                  select: {
                    transactions: true,
                    tokenFavorites: true
                  }
                }
              }
            }
          }
        }),
        this.prisma.tokenFavorite.count({ where: { userId } })
      ]);

      return {
        favorites: favorites.map(f => f.token),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error fetching user favorite tokens:', error);
      throw error;
    }
  }

  // Analytics operations
  async getTokenAnalytics(tokenId: string, days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      return await this.prisma.tokenAnalytics.findMany({
        where: {
          tokenId,
          date: {
            gte: startDate
          }
        },
        orderBy: { date: 'asc' }
      });
    } catch (error) {
      logger.error('Error fetching token analytics:', error);
      throw error;
    }
  }

  async updateTokenAnalytics(tokenId: string, data: Prisma.TokenAnalyticsCreateInput) {
    try {
      return await this.prisma.tokenAnalytics.upsert({
        where: {
          tokenId_date: {
            tokenId,
            date: data.date!
          }
        },
        update: data,
        create: data
      });
    } catch (error) {
      logger.error('Error updating token analytics:', error);
      throw error;
    }
  }

  // System configuration operations
  async getSystemConfig(key: string) {
    try {
      const config = await this.prisma.systemConfig.findUnique({
        where: { key }
      });
      return config?.value;
    } catch (error) {
      logger.error('Error fetching system config:', error);
      throw error;
    }
  }

  async updateSystemConfig(key: string, value: string, description?: string) {
    try {
      const config = await this.prisma.systemConfig.upsert({
        where: { key },
        update: { value, description },
        create: { key, value, description }
      });
      logger.info(`Updated system config: ${key} = ${value}`);
      return config;
    } catch (error) {
      logger.error('Error updating system config:', error);
      throw error;
    }
  }

  // Audit log operations
  async createAuditLog(data: Prisma.AuditLogCreateInput) {
    try {
      return await this.prisma.auditLog.create({ data });
    } catch (error) {
      logger.error('Error creating audit log:', error);
      throw error;
    }
  }

  async getAuditLogs(params: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    try {
      const {
        page = 1,
        limit = 50,
        userId,
        action,
        resource,
        startDate,
        endDate
      } = params;
      const skip = (page - 1) * limit;

      const where: Prisma.AuditLogWhereInput = {
        ...(userId && { userId }),
        ...(action && { action: { contains: action, mode: 'insensitive' } }),
        ...(resource && { resource: { contains: resource, mode: 'insensitive' } }),
        ...(startDate && endDate && {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        })
      };

      const [logs, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.auditLog.count({ where })
      ]);

      return {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error fetching audit logs:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', timestamp: new Date() };
    } catch (error) {
      logger.error('Database health check failed:', error);
      throw error;
    }
  }

  // Cleanup
  async disconnect() {
    try {
      await this.prisma.$disconnect();
      logger.info('Database disconnected');
    } catch (error) {
      logger.error('Error disconnecting from database:', error);
      throw error;
    }
  }
}

export const databaseService = new DatabaseService();