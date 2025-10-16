import { Router } from 'express';
import { generalLimiter } from '../middleware/rateLimit';
import { authenticate } from '../middleware/auth';
import { notificationController } from '../controllers/NotificationController';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// Main notification endpoints
router.get('/', generalLimiter, notificationController.getNotifications);
router.get('/stats', generalLimiter, notificationController.getNotificationStats);
router.get('/preferences', generalLimiter, notificationController.getNotificationPreferences);

// Individual notification operations
router.get('/:id', generalLimiter, notificationController.getNotification);
router.put('/:id/read', generalLimiter, notificationController.markAsRead);
router.delete('/:id', generalLimiter, notificationController.deleteNotification);

// Bulk operations
router.put('/mark-read', generalLimiter, notificationController.markMultipleAsRead);
router.put('/mark-all-read', generalLimiter, notificationController.markAllAsRead);
router.delete('/clear-all', generalLimiter, notificationController.clearAllNotifications);

// Preferences
router.put('/preferences', generalLimiter, notificationController.updateNotificationPreferences);

export default router;