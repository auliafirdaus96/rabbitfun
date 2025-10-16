import { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';
import { databaseService } from '../services/databaseService';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import logger from '../utils/logger';

interface CreateNotificationData {
  type: 'PRICE_ALERT' | 'TOKEN_CREATED' | 'TOKEN_GRADUATED' | 'TRANSACTION' | 'SYSTEM' | 'SOCIAL';
  title: string;
  message: string;
  data?: any;
  priority?: 'low' | 'medium' | 'high';
}

export class NotificationController {
  // Get user notifications
  async getNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { walletAddress } = req.user!;
      const { page = 1, limit = 20, type, isRead } = req.query;

      // Get user
      const user = await databaseService.getUserByWalletAddress(walletAddress);
      if (!user) {
        const error: AppError = new Error('User not found');
        error.statusCode = 404;
        error.isOperational = true;
        return next(error);
      }

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: any = { userAddress: walletAddress };
      if (type) where.type = type;
      if (isRead !== undefined) where.isRead = isRead === 'true';

      // Get notifications
      const [notifications, total] = await Promise.all([
        databaseService.prisma.notification.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' }
        }),
        databaseService.prisma.notification.count({ where })
      ]);

      // Get unread count
      const unreadCount = await databaseService.prisma.notification.count({
        where: {
          userAddress: walletAddress,
          isRead: false
        }
      });

      res.json({
        success: true,
        data: {
          notifications,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
          },
          unreadCount
        }
      });
    } catch (error) {
      logger.error('Error getting notifications:', error);
      next(error);
    }
  }

  // Get notification by ID
  async getNotification(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { walletAddress } = req.user!;
      const { id } = req.params;

      const notification = await databaseService.prisma.notification.findFirst({
        where: {
          id,
          userAddress: walletAddress
        }
      });

      if (!notification) {
        const error: AppError = new Error('Notification not found');
        error.statusCode = 404;
        error.isOperational = true;
        return next(error);
      }

      res.json({
        success: true,
        data: { notification }
      });
    } catch (error) {
      logger.error('Error getting notification:', error);
      next(error);
    }
  }

  // Mark notification as read
  async markAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { walletAddress } = req.user!;
      const { id } = req.params;

      const notification = await databaseService.prisma.notification.updateMany({
        where: {
          id,
          userAddress: walletAddress
        },
        data: {
          isRead: true
        }
      });

      if (notification.count === 0) {
        const error: AppError = new Error('Notification not found');
        error.statusCode = 404;
        error.isOperational = true;
        return next(error);
      }

      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      next(error);
    }
  }

  // Mark multiple notifications as read
  async markMultipleAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { walletAddress } = req.user!;
      const { notificationIds } = req.body;

      if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        const error: AppError = new Error('Notification IDs array is required');
        error.statusCode = 400;
        error.isOperational = true;
        return next(error);
      }

      const result = await databaseService.prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userAddress: walletAddress
        },
        data: {
          isRead: true
        }
      });

      res.json({
        success: true,
        data: {
          updatedCount: result.count
        },
        message: `${result.count} notifications marked as read`
      });
    } catch (error) {
      logger.error('Error marking notifications as read:', error);
      next(error);
    }
  }

  // Mark all notifications as read
  async markAllAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { walletAddress } = req.user!;

      const result = await databaseService.prisma.notification.updateMany({
        where: {
          userAddress: walletAddress,
          isRead: false
        },
        data: {
          isRead: true
        }
      });

      res.json({
        success: true,
        data: {
          updatedCount: result.count
        },
        message: `All ${result.count} notifications marked as read`
      });
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      next(error);
    }
  }

  // Delete notification
  async deleteNotification(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { walletAddress } = req.user!;
      const { id } = req.params;

      const result = await databaseService.prisma.notification.deleteMany({
        where: {
          id,
          userAddress: walletAddress
        }
      });

      if (result.count === 0) {
        const error: AppError = new Error('Notification not found');
        error.statusCode = 404;
        error.isOperational = true;
        return next(error);
      }

      res.json({
        success: true,
        message: 'Notification deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting notification:', error);
      next(error);
    }
  }

  // Clear all notifications
  async clearAllNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { walletAddress } = req.user!;

      const result = await databaseService.prisma.notification.deleteMany({
        where: {
          userAddress: walletAddress
        }
      });

      res.json({
        success: true,
        data: {
          deletedCount: result.count
        },
        message: `All ${result.count} notifications cleared`
      });
    } catch (error) {
      logger.error('Error clearing notifications:', error);
      next(error);
    }
  }

  // Create notification (internal use)
  async createNotification(walletAddress: string, data: CreateNotificationData): Promise<void> {
    try {
      const user = await databaseService.getUserByWalletAddress(walletAddress);
      if (!user) return;

      await databaseService.prisma.notification.create({
        data: {
          userAddress: walletAddress,
          type: data.type,
          title: data.title,
          message: data.message,
          data: data.data || {},
          isRead: false
        }
      });

      logger.info(`Notification created for user ${walletAddress}: ${data.title}`);
    } catch (error) {
      logger.error('Error creating notification:', error);
    }
  }

  // Create notification for multiple users
  async createBulkNotifications(walletAddresses: string[], data: CreateNotificationData): Promise<void> {
    try {
      const notifications = walletAddresses.map(walletAddress => ({
        userAddress: walletAddress,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data || {},
        isRead: false
      }));

      await databaseService.prisma.notification.createMany({
        data: notifications,
        skipDuplicates: true
      });

      logger.info(`Bulk notifications created for ${walletAddresses.length} users: ${data.title}`);
    } catch (error) {
      logger.error('Error creating bulk notifications:', error);
    }
  }

  // Get notification preferences
  async getNotificationPreferences(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { walletAddress } = req.user!;

      // In a real implementation, you'd have a separate table for preferences
      // For now, return default preferences
      const preferences = {
        email: {
          enabled: false,
          priceAlerts: true,
          tokenCreated: true,
          tokenGraduated: true,
          transactions: false,
          system: true
        },
        push: {
          enabled: true,
          priceAlerts: true,
          tokenCreated: true,
          tokenGraduated: true,
          transactions: true,
          system: true
        },
        inApp: {
          enabled: true,
          priceAlerts: true,
          tokenCreated: true,
          tokenGraduated: true,
          transactions: true,
          system: true,
          social: true
        }
      };

      res.json({
        success: true,
        data: { preferences }
      });
    } catch (error) {
      logger.error('Error getting notification preferences:', error);
      next(error);
    }
  }

  // Update notification preferences
  async updateNotificationPreferences(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { walletAddress } = req.user!;
      const { preferences } = req.body;

      // In a real implementation, you'd save these to a preferences table
      // For now, just return success

      res.json({
        success: true,
        message: 'Notification preferences updated successfully'
      });
    } catch (error) {
      logger.error('Error updating notification preferences:', error);
      next(error);
    }
  }

  // Get notification statistics
  async getNotificationStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { walletAddress } = req.user!;

      const [
        totalCount,
        unreadCount,
        typeStats
      ] = await Promise.all([
        databaseService.prisma.notification.count({
          where: { userAddress: walletAddress }
        }),
        databaseService.prisma.notification.count({
          where: {
            userAddress: walletAddress,
            isRead: false
          }
        }),
        databaseService.prisma.notification.groupBy({
          by: ['type'],
          where: { userAddress: walletAddress },
          _count: { type: true }
        })
      ]);

      const stats = {
        total: totalCount,
        unread: unreadCount,
        read: totalCount - unreadCount,
        byType: typeStats.reduce((acc, item) => {
          acc[item.type] = item._count.type;
          return acc;
        }, {} as Record<string, number>)
      };

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      logger.error('Error getting notification stats:', error);
      next(error);
    }
  }

  // System notification methods (for admin use)
  async createSystemNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, message, type = 'SYSTEM', priority = 'medium', targetUsers } = req.body;

      if (!title || !message) {
        const error: AppError = new Error('Title and message are required');
        error.statusCode = 400;
        error.isOperational = true;
        return next(error);
      }

      let walletAddresses: string[] = [];

      if (targetUsers === 'all') {
        // Send to all active users
        const users = await databaseService.prisma.user.findMany({
          where: { isActive: true },
          select: { walletAddress: true }
        });
        walletAddresses = users.map(u => u.walletAddress);
      } else if (Array.isArray(targetUsers)) {
        walletAddresses = targetUsers;
      }

      if (walletAddresses.length === 0) {
        const error: AppError = new Error('No target users specified');
        error.statusCode = 400;
        error.isOperational = true;
        return next(error);
      }

      await this.createBulkNotifications(walletAddresses, {
        type: type as any,
        title,
        message,
        priority: priority as any
      });

      res.json({
        success: true,
        data: {
          sentCount: walletAddresses.length
        },
        message: `System notification sent to ${walletAddresses.length} users`
      });
    } catch (error) {
      logger.error('Error creating system notification:', error);
      next(error);
    }
  }
}

export const notificationController = new NotificationController();