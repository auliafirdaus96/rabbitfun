import { Router } from 'express';
import multer from 'multer';
import { generalLimiter } from '../middleware/rateLimit';
import { authenticate, optionalAuth } from '../middleware/auth';
import { userController } from '../controllers/UserController';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Public routes
router.get('/search', optionalAuth, generalLimiter, userController.searchUsers);

// Protected routes (require authentication)
router.get('/profile', authenticate, generalLimiter, userController.getProfile);
router.put('/profile', authenticate, generalLimiter, userController.updateProfile);
router.post('/avatar', authenticate, upload.single('avatar'), generalLimiter, userController.uploadAvatar);
router.get('/stats', authenticate, generalLimiter, userController.getUserStats);

// Token management routes
router.get('/tokens/created', authenticate, generalLimiter, userController.getCreatedTokens);
router.get('/transactions', authenticate, generalLimiter, userController.getTransactionHistory);

// Favorites management
router.get('/favorites', authenticate, generalLimiter, userController.getFavoriteTokens);
router.post('/favorites/:tokenAddress', authenticate, generalLimiter, userController.addFavoriteToken);
router.delete('/favorites/:tokenAddress', authenticate, generalLimiter, userController.removeFavoriteToken);

export default router;