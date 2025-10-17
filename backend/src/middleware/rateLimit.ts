import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import logger from '../utils/logger';

// Type definitions for rate limit configurations
interface RateLimitMessage {
  error: string;
  retryAfter: string;
}

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: RateLimitMessage;
}

// Rate limiting configurations
const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  // Global rate limit untuk semua requests
  global: {
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 100, // 100 requests per 15 menit per IP
    message: {
      error: 'Too many requests from this IP. Please try again later.',
      retryAfter: '15 minutes'
    }
  },

  // API endpoints yang lebih intensif
  api: {
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 1000, // 1000 requests per 15 menit per IP
    message: {
      error: 'Too many API requests from this IP. Please try again later.',
      retryAfter: '15 minutes'
    }
  },

  // Token creation - sangat restrictive
  tokenCreation: {
    windowMs: 60 * 60 * 1000, // 1 jam
    max: 5, // 5 token creation per jam per IP
    message: {
      error: 'Token creation limit exceeded. You can create maximum 5 tokens per hour.',
      retryAfter: '1 hour'
    }
  },

  // Trading operations
  trading: {
    windowMs: 1 * 60 * 1000, // 1 menit
    max: 30, // 30 trading operations per menit per IP
    message: {
      error: 'Too many trading operations. Please wait before trading again.',
      retryAfter: '1 minute'
    }
  },

  // Analytics requests
  analytics: {
    windowMs: 5 * 60 * 1000, // 5 menit
    max: 50, // 50 analytics requests per 5 menit per IP
    message: {
      error: 'Too many analytics requests. Please try again later.',
      retryAfter: '5 minutes'
    }
  },

  // Upload operations
  upload: {
    windowMs: 10 * 60 * 1000, // 10 menit
    max: 10, // 10 uploads per 10 menit per IP
    message: {
      error: 'Upload limit exceeded. Please wait before uploading again.',
      retryAfter: '10 minutes'
    }
  }
};

// Global rate limiter
export const globalLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIGS.global.windowMs,
  max: RATE_LIMIT_CONFIGS.global.max,
  message: RATE_LIMIT_CONFIGS.global.message,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Global rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method
    });

    res.status(429).json({
      success: false,
      error: RATE_LIMIT_CONFIGS.global.message.error,
      retryAfter: RATE_LIMIT_CONFIGS.global.message.retryAfter,
      timestamp: new Date().toISOString()
    });
  }
});

// API rate limiter
export const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIGS.api.windowMs,
  max: RATE_LIMIT_CONFIGS.api.max,
  message: RATE_LIMIT_CONFIGS.api.message,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('API rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method
    });

    res.status(429).json({
      success: false,
      error: RATE_LIMIT_CONFIGS.api.message.error,
      retryAfter: RATE_LIMIT_CONFIGS.api.message.retryAfter,
      timestamp: new Date().toISOString()
    });
  }
});

// General API rate limit (alias for backward compatibility)
export const generalLimiter = apiLimiter;

// Strict rate limit for sensitive endpoints
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many attempts from this IP, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Token creation rate limiter
export const tokenCreationLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIGS.tokenCreation.windowMs,
  max: RATE_LIMIT_CONFIGS.tokenCreation.max,
  message: RATE_LIMIT_CONFIGS.tokenCreation.message,
  keyGenerator: (req: Request) => {
    // Gunakan kombinasi IP dan user address untuk lebih spesifik
    const userAddress = req.body?.creatorAddress || req.body?.creator || req.ip;
    return `token-creation:${userAddress}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Token creation rate limit exceeded', {
      ip: req.ip,
      userAddress: req.body?.creatorAddress || req.body?.creator,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method
    });

    res.status(429).json({
      success: false,
      error: RATE_LIMIT_CONFIGS.tokenCreation.message.error,
      retryAfter: RATE_LIMIT_CONFIGS.tokenCreation.message.retryAfter,
      timestamp: new Date().toISOString()
    });
  }
});

// Trading operations rate limiter
export const tradingLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIGS.trading.windowMs,
  max: RATE_LIMIT_CONFIGS.trading.max,
  message: RATE_LIMIT_CONFIGS.trading.message,
  keyGenerator: (req: Request) => {
    const userAddress = req.body?.userAddress || req.body?.trader || req.ip;
    return `trading:${userAddress}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Trading rate limit exceeded', {
      ip: req.ip,
      userAddress: req.body?.userAddress || req.body?.trader,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method
    });

    res.status(429).json({
      success: false,
      error: RATE_LIMIT_CONFIGS.trading.message.error,
      retryAfter: RATE_LIMIT_CONFIGS.trading.message.retryAfter,
      timestamp: new Date().toISOString()
    });
  }
});

// Analytics rate limiter
export const analyticsLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIGS.analytics.windowMs,
  max: RATE_LIMIT_CONFIGS.analytics.max,
  message: RATE_LIMIT_CONFIGS.analytics.message,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Analytics rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method
    });

    res.status(429).json({
      success: false,
      error: RATE_LIMIT_CONFIGS.analytics.message.error,
      retryAfter: RATE_LIMIT_CONFIGS.analytics.message.retryAfter,
      timestamp: new Date().toISOString()
    });
  }
});

// Upload rate limiter
export const uploadLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIGS.upload.windowMs,
  max: RATE_LIMIT_CONFIGS.upload.max,
  message: RATE_LIMIT_CONFIGS.upload.message,
  keyGenerator: (req: Request) => {
    const userAddress = req.body?.creatorAddress || req.body?.user || req.ip;
    return `upload:${userAddress}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Upload rate limit exceeded', {
      ip: req.ip,
      userAddress: req.body?.creatorAddress || req.body?.user,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method
    });

    res.status(429).json({
      success: false,
      error: RATE_LIMIT_CONFIGS.upload.message.error,
      retryAfter: RATE_LIMIT_CONFIGS.upload.message.retryAfter,
      timestamp: new Date().toISOString()
    });
  }
});

// Authentication rate limiter (strict)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 20, // 20 auth attempts per 15 menit per IP
  message: {
    error: 'Too many authentication attempts. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Authentication rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method
    });

    res.status(429).json({
      success: false,
      error: RATE_LIMIT_CONFIGS.upload.message.error,
      retryAfter: '15 minutes',
      timestamp: new Date().toISOString()
    });
  }
});

// Middleware untuk dynamic rate limiting berdasarkan user tier (future implementation)
export const createUserTierLimiter = (tier: 'basic' | 'premium' | 'enterprise') => {
  const limits = {
    basic: { windowMs: 15 * 60 * 1000, max: 50 },
    premium: { windowMs: 15 * 60 * 1000, max: 200 },
    enterprise: { windowMs: 15 * 60 * 1000, max: 1000 }
  };

  const limit = limits[tier];

  return rateLimit({
    windowMs: limit.windowMs,
    max: limit.max,
    keyGenerator: (req: Request) => {
      const userAddress = req.headers['x-user-address'] as string || req.ip;
      return `${tier}:${userAddress}`;
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logger.warn(`User tier rate limit exceeded`, {
        tier,
        ip: req.ip,
        userAddress: req.headers['x-user-address'],
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method
      });

      res.status(429).json({
        success: false,
        error: `Rate limit exceeded for ${tier} tier`,
        retryAfter: Math.ceil(limit.windowMs / 60000) + ' minutes',
        timestamp: new Date().toISOString()
      });
    }
  });
};

// Middleware untuk check rate limit headers
export const checkRateLimitHeaders = (req: Request, res: Response, next: Function) => {
  const rateLimitRemaining = res.get('X-RateLimit-Remaining');
  const rateLimitReset = res.get('X-RateLimit-Reset');

  if (rateLimitRemaining) {
    res.setHeader('X-RateLimit-Remaining-Original', rateLimitRemaining);
  }

  if (rateLimitReset) {
    res.setHeader('X-RateLimit-Reset-Original', rateLimitReset);
  }

  next();
};

// Export configurations untuk external use
export { RATE_LIMIT_CONFIGS };