import { Router } from 'express';
import { generalLimiter } from '../middleware/rateLimit';
import { authenticate } from '../middleware/auth';
import { portfolioController } from '../controllers/PortfolioController';

const router = Router();

// All portfolio routes require authentication
router.use(authenticate);

// Main portfolio endpoints
router.get('/', generalLimiter, portfolioController.getPortfolio);
router.get('/summary', generalLimiter, portfolioController.getPortfolioSummary);
router.get('/history', generalLimiter, portfolioController.getPortfolioHistory);
router.get('/performance', generalLimiter, portfolioController.getPerformanceMetrics);

// Individual token holding details
router.get('/holding/:tokenAddress', generalLimiter, portfolioController.getTokenHolding);

export default router;