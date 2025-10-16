import { Router } from 'express';
import { generalLimiter, authLimiter } from '../middleware/rateLimit';
import { optionalAuth } from '../middleware/auth';
import { authController } from '../controllers/AuthController';

const router = Router();

// Public authentication routes (no auth required)
router.post('/nonce', generalLimiter, authLimiter, authController.generateNonce);
router.post('/authenticate', generalLimiter, authLimiter, authController.authenticate);
router.post('/refresh', generalLimiter, authLimiter, authController.refreshToken);
router.post('/logout', generalLimiter, authController.logout);
router.post('/verify', generalLimiter, authController.verifyToken);
router.post('/register-details', generalLimiter, authLimiter, authController.registerDetails);

// Wallet check route (public)
router.get('/wallet/:walletAddress', generalLimiter, authController.checkWallet);

// Protected routes (require valid token)
router.get('/me', optionalAuth, generalLimiter, authController.verifyToken);

export default router;