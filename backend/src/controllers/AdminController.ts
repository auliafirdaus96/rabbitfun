import { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';
import { databaseService } from '../services/databaseService';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import logger from '../utils/logger';
import notificationController from './NotificationController';

export class AdminController {
  // Middleware to check if user is admin
  private requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    if (!req.user?.isAdmin) {
      const error: AppError = new Error('Admin access required');
      error.statusCode = 403;
      error.isOperational = true;
      return next(error);
    }
    next();
  }

  // Get dashboard statistics
  async getDashboardStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      this.requireAdmin(req, res, next);

      const [
        totalUsers,
        activeUsers,
        totalTokens,
        activeTokens,
        totalTransactions,
        totalVolume,
        recentTransactions
      ] = await Promise.all([
        databaseService.prisma.user.count(),
        databaseService.prisma.user.count({
          where: { isActive: true }
        }),
        databaseService.prisma.token.count(),
        databaseService.prisma.token.count({
          where: { isActive: true, isHidden: false }
        }),
        databaseService.prisma.transaction.count(),
        databaseService.prisma.transaction.aggregate({
          _sum: { bnbAmount: true }
        }),
        databaseService.prisma.transaction.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            token: { select: { name: true, symbol: true } },
            trader: { select: { username: true, displayName: true } }
          }
        })
      ]);

      const stats = {
        users: {
          total: totalUsers,
          active: activeUsers,
          newToday: await this.getNewUsersToday(),
          newThisWeek: await this.getNewUsersThisWeek()
        },
        tokens: {
          total: totalTokens,
          active: activeTokens,
          graduated: await this.getGraduatedTokensCount(),
          featured: await this.getFeaturedTokensCount()
        },
        transactions: {
          total: totalTransactions,
          totalVolume: totalVolume._sum.bnbAmount || '0',
          today: await this.getTransactionsToday(),
          thisWeek: await this.getTransactionsThisWeek()
        },
        system: {
          totalVolume: totalVolume._sum.bnbAmount || '0',
          averageDailyVolume: await this.getAverageDailyVolume(),
          topToken: await this.getTopTokenByVolume(),
          topUser: await this.getTopUserByVolume()
        },
        recentTransactions
      };

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      logger.error('Error getting dashboard stats:', error);
      next(error);
    }
  }

  // Get all users (with pagination and filters)
  async getUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      this.requireAdmin(req, res, next);

      const {
        page = 1,
        limit = 50,
        search,
        isActive,
        isVerified,
        isAdmin,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: any = {};
      if (isActive !== undefined) where.isActive = isActive === 'true';
      if (isVerified !== undefined) where.isVerified = isVerified === 'true';
      if (isAdmin !== undefined) where.isAdmin = isAdmin === 'true';
      if (search) {
        where.OR = [
          { walletAddress: { contains: search as string, mode: 'insensitive' } },
          { username: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      const [users, total] = await Promise.all([
        databaseService.prisma.user.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { [sortBy as string]: sortOrder as 'asc' | 'desc' },
          include: {
            _count: {
              select: {
                createdTokens: true,
                transactions: true,
                tokenFavorites: true
              }
            }
          }
        }),
        databaseService.prisma.user.count({ where })
      ]);

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
          }
        }
      });
    } catch (error) {
      logger.error('Error getting users:', error);
      next(error);
    }
  }

  // Update user status
  async updateUserStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      this.requireAdmin(req, res, next);

      const { walletAddress } = req.params;
      const { isActive, isVerified, isAdmin } = req.body;

      if (!ethers.isAddress(walletAddress)) {
        const error: AppError = new Error('Invalid wallet address');
        error.statusCode = 400;
        error.isOperational = true;
        return next(error);
      }

      const updateData: any = {};
      if (isActive !== undefined) updateData.isActive = isActive;
      if (isVerified !== undefined) updateData.isVerified = isVerified;
      if (isAdmin !== undefined) updateData.isAdmin = isAdmin;

      const updatedUser = await databaseService.updateUser(walletAddress, updateData);

      // Create audit log
      await databaseService.createAuditLog({
        userId: req.user!.id,
        action: 'UPDATE_USER_STATUS',
        resource: 'User',
        resourceId: walletAddress,
        oldValue: JSON.stringify({ isActive, isVerified, isAdmin }),
        newValue: JSON.stringify(updateData),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        data: { user: updatedUser },
        message: 'User status updated successfully'
      });
    } catch (error) {
      logger.error('Error updating user status:', error);
      next(error);
    }
  }

  // Get all tokens (with pagination and filters)
  async getTokens(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      this.requireAdmin(req, res, next);

      const {
        page = 1,
        limit = 50,
        search,
        creator,
        isActive,
        isHidden,
        isFeatured,
        isVerified,
        graduated,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const result = await databaseService.getAllTokens({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        search: search as string,
        creator: creator as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        isHidden: isHidden === 'true' ? true : isHidden === 'false' ? false : undefined,
        isFeatured: isFeatured === 'true' ? true : isFeatured === 'false' ? false : undefined,
        isVerified: isVerified === 'true' ? true : isVerified === 'false' ? false : undefined,
        graduated: graduated === 'true' ? true : graduated === 'false' ? false : undefined,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error getting tokens:', error);
      next(error);
    }
  }

  // Update token status
  async updateTokenStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      this.requireAdmin(req, res, next);

      const { tokenAddress } = req.params;
      const { isActive, isHidden, isFeatured, isVerified, hideReason } = req.body;

      if (!ethers.isAddress(tokenAddress)) {
        const error: AppError = new Error('Invalid token address');
        error.statusCode = 400;
        error.isOperational = true;
        return next(error);
      }

      const updateData: any = {};
      if (isActive !== undefined) updateData.isActive = isActive;
      if (isHidden !== undefined) updateData.isHidden = isHidden;
      if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
      if (isVerified !== undefined) updateData.isVerified = isVerified;
      if (hideReason !== undefined) updateData.hideReason = hideReason;

      const updatedToken = await databaseService.updateToken(tokenAddress, updateData);

      // Create audit log
      await databaseService.createAuditLog({
        userId: req.user!.id,
        action: 'UPDATE_TOKEN_STATUS',
        resource: 'Token',
        resourceId: tokenAddress,
        oldValue: JSON.stringify({ isActive, isHidden, isFeatured, isVerified }),
        newValue: JSON.stringify(updateData),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        data: { token: updatedToken },
        message: 'Token status updated successfully'
      });
    } catch (error) {
      logger.error('Error updating token status:', error);
      next(error);
    }
  }

  // Get transactions (with pagination and filters)
  async getTransactions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      this.requireAdmin(req, res, next);

      const {
        page = 1,
        limit = 100,
        tokenAddress,
        userAddress,
        type,
        status,
        startDate,
        endDate,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: any = {};
      if (tokenAddress) where.tokenAddress = tokenAddress;
      if (userAddress) where.traderAddress = userAddress;
      if (type) where.type = type;
      if (status) where.status = status;
      if (startDate && endDate) {
        where.createdAt = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        };
      }

      const [transactions, total] = await Promise.all([
        databaseService.prisma.transaction.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { [sortBy as string]: sortOrder as 'asc' | 'desc' },
          include: {
            token: {
              select: {
                address: true,
                name: true,
                symbol: true,
                imageUrl: true
              }
            },
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
        databaseService.prisma.transaction.count({ where })
      ]);

      res.json({
        success: true,
        data: {
          transactions,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
          }
        }
      });
    } catch (error) {
      logger.error('Error getting transactions:', error);
      next(error);
    }
  }

  // Get system analytics
  async getSystemAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      this.requireAdmin(req, res, next);

      const { period = '7d' } = req.query;

      // Calculate date range
      const days = period === '1d' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [
        userGrowth,
        tokenGrowth,
        transactionVolume,
        topTokens,
        topUsers
      ] = await Promise.all([
        this.getUserGrowthData(startDate),
        this.getTokenGrowthData(startDate),
        this.getTransactionVolumeData(startDate),
        this.getTopTokensByVolume(10),
        this.getTopUsersByVolume(10)
      ]);

      const analytics = {
        period,
        userGrowth,
        tokenGrowth,
        transactionVolume,
        topPerformers: {
          tokens: topTokens,
          users: topUsers
        }
      };

      res.json({
        success: true,
        data: { analytics }
      });
    } catch (error) {
      logger.error('Error getting system analytics:', error);
      next(error);
    }
  }

  // Get audit logs
  async getAuditLogs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      this.requireAdmin(req, res, next);

      const {
        page = 1,
        limit = 100,
        userId,
        action,
        resource,
        startDate,
        endDate
      } = req.query;

      const result = await databaseService.getAuditLogs({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        userId: userId as string,
        action: action as string,
        resource: resource as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error getting audit logs:', error);
      next(error);
    }
  }

  // Update system configuration
  async updateSystemConfig(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      this.requireAdmin(req, res, next);

      const { configs } = req.body; // Array of { key, value, description }

      if (!Array.isArray(configs)) {
        const error: AppError = new Error('Configs must be an array');
        error.statusCode = 400;
        error.isOperational = true;
        return next(error);
      }

      const results = await Promise.all(
        configs.map(async ({ key, value, description }) => {
          return await databaseService.updateSystemConfig(key, value, description);
        })
      );

      // Create audit log
      await databaseService.createAuditLog({
        userId: req.user!.id,
        action: 'UPDATE_SYSTEM_CONFIG',
        resource: 'SystemConfig',
        newValue: JSON.stringify(configs),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        data: { updatedConfigs: results },
        message: 'System configuration updated successfully'
      });
    } catch (error) {
      logger.error('Error updating system config:', error);
      next(error);
    }
  }

  // Helper methods
  private async getNewUsersToday(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return await databaseService.prisma.user.count({
      where: { createdAt: { gte: today } }
    });
  }

  private async getNewUsersThisWeek(): Promise<number> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return await databaseService.prisma.user.count({
      where: { createdAt: { gte: weekAgo } }
    });
  }

  private async getGraduatedTokensCount(): Promise<number> {
    return await databaseService.prisma.token.count({
      where: { graduated: true }
    });
  }

  private async getFeaturedTokensCount(): Promise<number> {
    return await databaseService.prisma.token.count({
      where: { isFeatured: true }
    });
  }

  private async getTransactionsToday(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return await databaseService.prisma.transaction.count({
      where: { createdAt: { gte: today } }
    });
  }

  private async getTransactionsThisWeek(): Promise<number> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return await databaseService.prisma.transaction.count({
      where: { createdAt: { gte: weekAgo } }
    });
  }

  private async getAverageDailyVolume(): Promise<string> {
    // Simplified calculation
    const totalVolume = await databaseService.prisma.transaction.aggregate({
      _sum: { bnbAmount: true }
    });
    return (parseFloat(totalVolume._sum.bnbAmount || '0') / 30).toFixed(4);
  }

  private async getTopTokenByVolume(): Promise<any> {
    const topToken = await databaseService.prisma.token.findFirst({
      orderBy: { totalBNB: 'desc' },
      select: {
        address: true,
        name: true,
        symbol: true,
        totalBNB: true
      }
    });
    return topToken;
  }

  private async getTopUserByVolume(): Promise<any> {
    const topUser = await databaseService.prisma.user.findFirst({
      orderBy: {
        transactions: {
          _sum: { bnbAmount: 'desc' }
        }
      },
      select: {
        walletAddress: true,
        username: true,
        displayName: true
      }
    });
    return topUser;
  }

  private async getUserGrowthData(startDate: Date): Promise<any[]> {
    // This would typically involve more complex date-based queries
    return [];
  }

  private async getTokenGrowthData(startDate: Date): Promise<any[]> {
    // This would typically involve more complex date-based queries
    return [];
  }

  private async getTransactionVolumeData(startDate: Date): Promise<any[]> {
    // This would typically involve more complex date-based queries
    return [];
  }

  private async getTopTokensByVolume(limit: number): Promise<any[]> {
    return await databaseService.prisma.token.findMany({
      take: limit,
      orderBy: { totalBNB: 'desc' },
      select: {
        address: true,
        name: true,
        symbol: true,
        totalBNB: true,
        imageUrl: true
      }
    });
  }

  private async getTopUsersByVolume(limit: number): Promise<any[]> {
    return await databaseService.prisma.user.findMany({
      take: limit,
      orderBy: {
        transactions: {
          _sum: { bnbAmount: 'desc' }
        }
      },
      select: {
        walletAddress: true,
        username: true,
        displayName: true,
        avatar: true
      }
    });
  }
}

export const adminController = new AdminController();