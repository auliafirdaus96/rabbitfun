import { Router } from 'express';
import { generalLimiter } from '../middleware/rateLimit';

const router = Router();

// Placeholder webhook routes for blockchain events
router.post('/token-created', generalLimiter, (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'Token created webhook endpoint - to be implemented'
    }
  });
});

router.post('/token-bought', generalLimiter, (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'Token bought webhook endpoint - to be implemented'
    }
  });
});

router.post('/token-sold', generalLimiter, (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'Token sold webhook endpoint - to be implemented'
    }
  });
});

export default router;