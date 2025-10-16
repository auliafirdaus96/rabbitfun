import { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import { databaseService } from '../services/databaseService';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export class AuthController {
  // Generate nonce for wallet signature
  async generateNonce(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { walletAddress } = req.body;

      if (!walletAddress) {
        const error: AppError = new Error('Wallet address is required');
        error.statusCode = 400;
        error.isOperational = true;
        return next(error);
      }

      if (!ethers.isAddress(walletAddress)) {
        const error: AppError = new Error('Invalid wallet address');
        error.statusCode = 400;
        error.isOperational = true;
        return next(error);
      }

      // Generate random nonce
      const nonce = ethers.hexlify(ethers.randomBytes(32));

      // Store nonce with expiration (5 minutes)
      const nonceData = {
        walletAddress,
        nonce,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
      };

      // For now, store in memory (in production, use Redis)
      if (!(global as any).nonceStore) {
        (global as any).nonceStore = new Map();
      }
      (global as any).nonceStore.set(walletAddress.toLowerCase(), nonceData);

      res.json({
        success: true,
        data: {
          nonce,
          message: 'Please sign this nonce to authenticate'
        }
      });
    } catch (error) {
      logger.error('Error generating nonce:', error);
      next(error);
    }
  }

  // Authenticate with wallet signature
  async authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { walletAddress, signature } = req.body;

      if (!walletAddress || !signature) {
        const error: AppError = new Error('Wallet address and signature are required');
        error.statusCode = 400;
        error.isOperational = true;
        return next(error);
      }

      if (!ethers.isAddress(walletAddress)) {
        const error: AppError = new Error('Invalid wallet address');
        error.statusCode = 400;
        error.isOperational = true;
        return next(error);
      }

      // Get stored nonce
      const nonceStore = (global as any).nonceStore as Map<string, any>;
      const nonceData = nonceStore.get(walletAddress.toLowerCase());

      if (!nonceData) {
        const error: AppError = new Error('Nonce not found or expired. Please request a new nonce.');
        error.statusCode = 400;
        error.isOperational = true;
        return next(error);
      }

      // Check if nonce has expired
      if (new Date() > new Date(nonceData.expiresAt)) {
        nonceStore.delete(walletAddress.toLowerCase());
        const error: AppError = new Error('Nonce has expired. Please request a new nonce.');
        error.statusCode = 400;
        error.isOperational = true;
        return next(error);
      }

      // Create the message that was signed
      const message = `Sign this message to authenticate with Rabbit Launchpad. Nonce: ${nonceData.nonce}`;

      try {
        // Recover the address from the signature
        const recoveredAddress = ethers.verifyMessage(message, signature);

        if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
          const error: AppError = new Error('Invalid signature');
          error.statusCode = 401;
          error.isOperational = true;
          return next(error);
        }
      } catch (verifyError) {
        const error: AppError = new Error('Signature verification failed');
        error.statusCode = 401;
        error.isOperational = true;
        return next(error);
      }

      // Remove the used nonce
      nonceStore.delete(walletAddress.toLowerCase());

      // Get or create user
      let user = await databaseService.getUserByWalletAddress(walletAddress);

      if (!user) {
        // Create new user
        user = await databaseService.createUser({
          walletAddress,
          isActive: true,
          isAdmin: false,
          isVerified: false
        });
        logger.info(`New user created: ${walletAddress}`);
      } else {
        // Update last login
        await databaseService.updateUser(walletAddress, {
          lastLoginAt: new Date()
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          walletAddress: user.walletAddress,
          id: user.id,
          isAdmin: user.isAdmin
        },
        process.env.JWT_SECRET!,
        {
          expiresIn: process.env.JWT_EXPIRES_IN || '7d',
          issuer: process.env.JWT_ISSUER || 'rabbitfun-launchpad',
          audience: process.env.JWT_AUDIENCE || 'rabbitfun-users'
        }
      );

      // Generate refresh token (optional)
      const refreshToken = jwt.sign(
        {
          walletAddress: user.walletAddress,
          type: 'refresh'
        },
        process.env.JWT_SECRET!,
        {
          expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
        }
      );

      res.json({
        success: true,
        data: {
          user: {
            walletAddress: user.walletAddress,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatar,
            isVerified: user.isVerified,
            isAdmin: user.isAdmin,
            createdAt: user.createdAt
          },
          token,
          refreshToken,
          expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        },
        message: 'Authentication successful'
      });
    } catch (error) {
      logger.error('Error during authentication:', error);
      next(error);
    }
  }

  // Refresh token
  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        const error: AppError = new Error('Refresh token is required');
        error.statusCode = 400;
        error.isOperational = true;
        return next(error);
      }

      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as any;

        if (decoded.type !== 'refresh') {
          const error: AppError = new Error('Invalid refresh token');
          error.statusCode = 401;
          error.isOperational = true;
          return next(error);
        }

        // Get user
        const user = await databaseService.getUserByWalletAddress(decoded.walletAddress);

        if (!user || !user.isActive) {
          const error: AppError = new Error('User not found or inactive');
          error.statusCode = 401;
          error.isOperational = true;
          return next(error);
        }

        // Generate new access token
        const newToken = jwt.sign(
          {
            walletAddress: user.walletAddress,
            id: user.id,
            isAdmin: user.isAdmin
          },
          process.env.JWT_SECRET!,
          {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d',
            issuer: process.env.JWT_ISSUER || 'rabbitfun-launchpad',
            audience: process.env.JWT_AUDIENCE || 'rabbitfun-users'
          }
        );

        // Generate new refresh token
        const newRefreshToken = jwt.sign(
          {
            walletAddress: user.walletAddress,
            type: 'refresh'
          },
          process.env.JWT_SECRET!,
          {
            expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
          }
        );

        res.json({
          success: true,
          data: {
            token: newToken,
            refreshToken: newRefreshToken,
            expiresIn: process.env.JWT_EXPIRES_IN || '7d'
          },
          message: 'Token refreshed successfully'
        });
      } catch (jwtError) {
        const error: AppError = new Error('Invalid or expired refresh token');
        error.statusCode = 401;
        error.isOperational = true;
        return next(error);
      }
    } catch (error) {
      logger.error('Error refreshing token:', error);
      next(error);
    }
  }

  // Logout (optional - mostly client-side)
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // In a stateless JWT setup, logout is mostly client-side
      // However, we could implement token blacklisting if needed

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      logger.error('Error during logout:', error);
      next(error);
    }
  }

  // Verify token
  async verifyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const error: AppError = new Error('Authorization token is required');
        error.statusCode = 401;
        error.isOperational = true;
        return next(error);
      }

      const token = authHeader.substring(7);

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

        const user = await databaseService.getUserByWalletAddress(decoded.walletAddress);

        if (!user || !user.isActive) {
          const error: AppError = new Error('User not found or inactive');
          error.statusCode = 401;
          error.isOperational = true;
          return next(error);
        }

        res.json({
          success: true,
          data: {
            valid: true,
            user: {
              walletAddress: user.walletAddress,
              username: user.username,
              displayName: user.displayName,
              isVerified: user.isVerified,
              isAdmin: user.isAdmin
            }
          }
        });
      } catch (jwtError) {
        res.json({
          success: true,
          data: {
            valid: false,
            error: 'Invalid or expired token'
          }
        });
      }
    } catch (error) {
      logger.error('Error verifying token:', error);
      next(error);
    }
  }

  // Register with additional details (optional step after wallet auth)
  async registerDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { walletAddress, username, email, displayName, bio } = req.body;

      if (!walletAddress) {
        const error: AppError = new Error('Wallet address is required');
        error.statusCode = 400;
        error.isOperational = true;
        return next(error);
      }

      // Check if user exists
      const existingUser = await databaseService.getUserByWalletAddress(walletAddress);

      if (!existingUser) {
        const error: AppError = new Error('User not found. Please authenticate first.');
        error.statusCode = 404;
        error.isOperational = true;
        return next(error);
      }

      // Validate username if provided
      if (username) {
        if (username.length < 3 || username.length > 50) {
          const error: AppError = new Error('Username must be between 3 and 50 characters');
          error.statusCode = 400;
          error.isOperational = true;
          return next(error);
        }

        // Check if username is already taken
        const usernameExists = await databaseService.prisma.user.findFirst({
          where: {
            username,
            walletAddress: { not: walletAddress }
          }
        });

        if (usernameExists) {
          const error: AppError = new Error('Username already taken');
          error.statusCode = 409;
          error.isOperational = true;
          return next(error);
        }
      }

      // Validate email if provided
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        const error: AppError = new Error('Invalid email format');
        error.statusCode = 400;
        error.isOperational = true;
        return next(error);
      }

      // Update user with additional details
      const updatedUser = await databaseService.updateUser(walletAddress, {
        ...(username && { username }),
        ...(email && { email }),
        ...(displayName !== undefined && { displayName }),
        ...(bio !== undefined && { bio })
      });

      res.json({
        success: true,
        data: {
          user: updatedUser
        },
        message: 'Registration details updated successfully'
      });
    } catch (error) {
      logger.error('Error updating registration details:', error);
      next(error);
    }
  }

  // Check if wallet is registered
  async checkWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { walletAddress } = req.params;

      if (!ethers.isAddress(walletAddress)) {
        const error: AppError = new Error('Invalid wallet address');
        error.statusCode = 400;
        error.isOperational = true;
        return next(error);
      }

      const user = await databaseService.getUserByWalletAddress(walletAddress);

      res.json({
        success: true,
        data: {
          isRegistered: !!user,
          user: user ? {
            walletAddress: user.walletAddress,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatar,
            isVerified: user.isVerified,
            createdAt: user.createdAt
          } : null
        }
      });
    } catch (error) {
      logger.error('Error checking wallet:', error);
      next(error);
    }
  }
}

export const authController = new AuthController();