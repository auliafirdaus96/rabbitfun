import { Router } from 'express';
import { generalLimiter } from '../middleware/rateLimit';
import { authenticate } from '../middleware/auth';
import { adminController } from '../controllers/AdminController';

const router = Router();

// All admin routes require authentication and admin privileges
router.use(authenticate);

// Dashboard and statistics
router.get('/dashboard', generalLimiter, adminController.getDashboardStats);
router.get('/analytics', generalLimiter, adminController.getSystemAnalytics);

// User management
router.get('/users', generalLimiter, adminController.getUsers);
router.put('/users/:walletAddress/status', generalLimiter, adminController.updateUserStatus);

// Token management
router.get('/tokens', generalLimiter, adminController.getTokens);
router.put('/tokens/:tokenAddress/status', generalLimiter, adminController.updateTokenStatus);

// Transaction monitoring
router.get('/transactions', generalLimiter, adminController.getTransactions);

// System configuration
router.get('/audit-logs', generalLimiter, adminController.getAuditLogs);
router.put('/system-config', generalLimiter, adminController.updateSystemConfig);

// System notifications (admin only) - TODO: Implement this method
// router.post('/system-notification', generalLimiter, adminController.createSystemNotification);

export default router;