import { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';
import { databaseService } from '../services/databaseService';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import logger from '../utils/logger';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';

export class UserController {
  // Get user profile
  async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { walletAddress } = req.user!;

      const user = await databaseService.getUserByWalletAddress(walletAddress);

      if (!user) {
        const error: AppError = new Error('User not found');
        error.statusCode = 404;
        error.isOperational = true;
        return next(error);
      }

      // Get user statistics
      const [createdTokens, transactions, favorites] = await Promise.all([
        databaseService.getAllTokens({ creator: walletAddress, limit: 1 }),
        databaseService.getTransactionsByUser(walletAddress, { limit: 1 }),
        databaseService.getUserFavoriteTokens(user.id, { limit: 1 })
      ]);

      res.json({
        success: true,
        data: {
          user: {
            ...user,
            statistics: {
              tokensCreated: createdTokens.pagination.total,
              transactionsMade: transactions.pagination.total,
              favoriteCount: favorites.pagination.total
            }
          }
        }
      });
    } catch (error) {
      logger.error('Error getting user profile:', error);
      next(error);
    }
  }

  // Update user profile
  async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { walletAddress } = req.user!;
      const { username, email, displayName, bio, twitterHandle, telegramHandle, website } = req.body;

      // Validate data
      if (username && (username.length < 3 || username.length > 50)) {
        const error: AppError = new Error('Username must be between 3 and 50 characters');
        error.statusCode = 400;
        error.isOperational = true;
        return next(error);
      }

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        const error: AppError = new Error('Invalid email format');
        error.statusCode = 400;
        error.isOperational = true;
        return next(error);
      }

      // Check if username is already taken (by another user)
      if (username) {
        const existingUser = await databaseService.prisma.user.findFirst({
          where: {
            username,
            walletAddress: { not: walletAddress }
          }
        });

        if (existingUser) {
          const error: AppError = new Error('Username already taken');
          error.statusCode = 409;
          error.isOperational = true;
          return next(error);
        }
      }

      const updatedUser = await databaseService.updateUser(walletAddress, {
        ...(username && { username }),
        ...(email && { email }),
        ...(displayName !== undefined && { displayName }),
        ...(bio !== undefined && { bio }),
        ...(twitterHandle !== undefined && { twitterHandle }),
        ...(telegramHandle !== undefined && { telegramHandle }),
        ...(website !== undefined && { website })
      });

      res.json({
        success: true,
        data: {
          user: updatedUser
        },
        message: 'Profile updated successfully'
      });
    } catch (error) {
      logger.error('Error updating user profile:', error);
      next(error);
    }
  }

  // Upload avatar
  async uploadAvatar(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { walletAddress } = req.user!;

      if (!req.file) {
        const error: AppError = new Error('No file uploaded');
        error.statusCode = 400;
        error.isOperational = true;
        return next(error);
      }

      // Process image with Sharp
      const processedImage = await sharp(req.file.buffer)
        .resize(200, 200, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      // Generate unique filename
      const filename = `avatar-${walletAddress}-${Date.now()}.jpg`;
      const uploadPath = path.join(process.cwd(), 'uploads', 'avatars', filename);

      // Save file
      await require('fs').promises.writeFile(uploadPath, processedImage);

      // Update user avatar URL
      const avatarUrl = `/uploads/avatars/${filename}`;
      await databaseService.updateUser(walletAddress, { avatarUrl });

      res.json({
        success: true,
        data: {
          avatarUrl
        },
        message: 'Avatar uploaded successfully'
      });
    } catch (error) {
      logger.error('Error uploading avatar:', error);
      next(error);
    }
  }

  // Get user's created tokens
  async getCreatedTokens(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { walletAddress } = req.user!;
      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

      const result = await databaseService.getAllTokens({
        creator: walletAddress,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error getting created tokens:', error);
      next(error);
    }
  }

  // Get user's transaction history
  async getTransactionHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { walletAddress } = req.user!;
      const { page = 1, limit = 50, type } = req.query;

      const result = await databaseService.getTransactionsByUser(walletAddress, {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        type: type as 'BUY' | 'SELL' | undefined
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error getting transaction history:', error);
      next(error);
    }
  }

  // Get user's favorite tokens
  async getFavoriteTokens(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { walletAddress } = req.user!;
      const { page = 1, limit = 20 } = req.query;

      // First get user by wallet address to get user ID
      const user = await databaseService.getUserByWalletAddress(walletAddress);
      if (!user) {
        const error: AppError = new Error('User not found');
        error.statusCode = 404;
        error.isOperational = true;
        return next(error);
      }

      const result = await databaseService.getUserFavoriteTokens(user.id, {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error getting favorite tokens:', error);
      next(error);
    }
  }

  // Add token to favorites
  async addFavoriteToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { walletAddress } = req.user!;
      const { tokenAddress } = req.params;

      // Validate token address
      if (!ethers.isAddress(tokenAddress)) {
        const error: AppError = new Error('Invalid token address');
        error.statusCode = 400;
        error.isOperational = true;
        return next(error);
      }

      // Get user and token
      const [user, token] = await Promise.all([
        databaseService.getUserByWalletAddress(walletAddress),
        databaseService.getTokenByAddress(tokenAddress)
      ]);

      if (!user) {
        const error: AppError = new Error('User not found');
        error.statusCode = 404;
        error.isOperational = true;
        return next(error);
      }

      if (!token) {
        const error: AppError = new Error('Token not found');
        error.statusCode = 404;
        error.isOperational = true;
        return next(error);
      }

      // Add to favorites
      await databaseService.addTokenFavorite(user.id, token.id);

      res.json({
        success: true,
        message: 'Token added to favorites'
      });
    } catch (error) {
      logger.error('Error adding favorite token:', error);
      next(error);
    }
  }

  // Remove token from favorites
  async removeFavoriteToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { walletAddress } = req.user!;
      const { tokenAddress } = req.params;

      // Get user and token
      const [user, token] = await Promise.all([
        databaseService.getUserByWalletAddress(walletAddress),
        databaseService.getTokenByAddress(tokenAddress)
      ]);

      if (!user) {
        const error: AppError = new Error('User not found');
        error.statusCode = 404;
        error.isOperational = true;
        return next(error);
      }

      if (!token) {
        const error: AppError = new Error('Token not found');
        error.statusCode = 404;
        error.isOperational = true;
        return next(error);
      }

      // Remove from favorites
      await databaseService.removeTokenFavorite(user.id, token.id);

      res.json({
        success: true,
        message: 'Token removed from favorites'
      });
    } catch (error) {
      logger.error('Error removing favorite token:', error);
      next(error);
    }
  }

  // Get user statistics
  async getUserStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { walletAddress } = req.user!;

      const user = await databaseService.getUserByWalletAddress(walletAddress);
      if (!user) {
        const error: AppError = new Error('User not found');
        error.statusCode = 404;
        error.isOperational = true;
        return next(error);
      }

      // Get comprehensive statistics
      const [
        createdTokens,
        transactions,
        favorites,
        analytics
      ] = await Promise.all([
        databaseService.getAllTokens({ creator: walletAddress, limit: 1000 }),
        databaseService.getTransactionsByUser(walletAddress, { limit: 1000 }),
        databaseService.getUserFavoriteTokens(user.id, { limit: 1000 }),
        databaseService.prisma.userAnalytics.findMany({
          where: { userId: user.id },
          orderBy: { date: 'desc' },
          take: 30
        })
      ]);

      // Calculate additional stats
      const buyTransactions = transactions.transactions.filter(t => t.type === 'BUY');
      const sellTransactions = transactions.transactions.filter(t => t.type === 'SELL');
      const totalVolume = transactions.transactions.reduce((sum, tx) => {
        return sum + parseFloat(tx.bnbAmount || '0');
      }, 0);

      res.json({
        success: true,
        data: {
          overview: {
            tokensCreated: createdTokens.pagination.total,
            totalTransactions: transactions.pagination.total,
            buyTransactions: buyTransactions.length,
            sellTransactions: sellTransactions.length,
            favoriteTokens: favorites.pagination.total,
            totalVolume: totalVolume.toString()
          },
          analytics: analytics,
          recentActivity: {
            recentTokens: createdTokens.tokens.slice(0, 5),
            recentTransactions: transactions.transactions.slice(0, 10)
          }
        }
      });
    } catch (error) {
      logger.error('Error getting user stats:', error);
      next(error);
    }
  }

  // Search users
  async searchUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { q, page = 1, limit = 20 } = req.query;

      if (!q || typeof q !== 'string') {
        const error: AppError = new Error('Search query is required');
        error.statusCode = 400;
        error.isOperational = true;
        return next(error);
      }

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const users = await databaseService.prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            { username: { contains: q, mode: 'insensitive' } },
            { displayName: { contains: q, mode: 'insensitive' } },
            { walletAddress: { contains: q, mode: 'insensitive' } }
          ]
        },
        skip,
        take: limitNum,
        select: {
          walletAddress: true,
          username: true,
          displayName: true,
          avatar: true,
          isVerified: true,
          createdAt: true,
          _count: {
            select: {
              createdTokens: true,
              transactions: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const total = await databaseService.prisma.user.count({
        where: {
          isActive: true,
          OR: [
            { username: { contains: q, mode: 'insensitive' } },
            { displayName: { contains: q, mode: 'insensitive' } },
            { walletAddress: { contains: q, mode: 'insensitive' } }
          ]
        }
      });

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
      logger.error('Error searching users:', error);
      next(error);
    }
  }
}

export const userController = new UserController();