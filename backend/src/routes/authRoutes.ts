import { Router } from 'express';
import { generalLimiter, authLimiter } from '../middleware/rateLimit';
import { optionalAuth } from '../middleware/auth';
import { authController } from '../controllers/AuthController';

const router = Router();

// Debug - check if authController methods exist
console.log('AuthController methods:', {
  generateNonce: typeof authController.generateNonce,
  authenticate: typeof authController.authenticate,
  refreshToken: typeof authController.refreshToken,
  logout: typeof authController.logout,
  verifyToken: typeof authController.verifyToken,
  registerDetails: typeof authController.registerDetails,
  checkWallet: typeof authController.checkWallet
});

// Public authentication routes (no auth required) - temporarily simplified for testing
if (authController.generateNonce) {
  router.post('/nonce', authController.generateNonce);
}
if (authController.authenticate) {
  router.post('/authenticate', authController.authenticate);
}
if (authController.refreshToken) {
  router.post('/refresh', authController.refreshToken);
}
if (authController.logout) {
  router.post('/logout', authController.logout);
}
if (authController.verifyToken) {
  router.post('/verify', authController.verifyToken);
}
if (authController.registerDetails) {
  router.post('/register-details', authController.registerDetails);
}

// Wallet check route (public)
router.get('/wallet/:walletAddress', generalLimiter, authController.checkWallet);

// Protected routes (require valid token)
router.get('/me', optionalAuth, generalLimiter, authController.verifyToken);

export default router;