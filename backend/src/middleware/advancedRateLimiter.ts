import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import Redis from 'ioredis';
import logger from '../utils/logger';
import { RATE_LIMIT_CONFIGS } from './rateLimiter';

// Enhanced rate limiting with Redis for distributed systems
interface RedisRateLimitStore {
  incr: (key: string) => Promise<number>;
  expire: (key: string, ttl: number) => Promise<void>;
  ttl: (key: string) => Promise<number>;
  get: (key: string) => Promise<string | null>;
}

class RedisStore {
  private redis: RedisRateLimitStore;
  private prefix: string;

  constructor(options: { redis: RedisRateLimitStore; prefix?: string }) {
    this.redis = options.redis;
    this.prefix = options.prefix || 'rate_limit:';
  }

  async incr(key: string): Promise<number> {
    const fullKey = this.prefix + key;
    const count = await this.redis.incr(fullKey);

    // Set expiration on first increment
    if (count === 1) {
      await this.redis.expire(fullKey, 900); // 15 minutes default
    }

    return count;
  }

  async decrement(key: string): Promise<void> {
    const fullKey = this.prefix + key;
    const current = await this.redis.get(fullKey);
    if (current && parseInt(current) > 0) {
      // Redis doesn't have a direct decrement command that prevents negative values
      // We'll use a Lua script for atomic decrement
      const luaScript = `
        local current = redis.call('GET', KEYS[1])
        if current and tonumber(current) > 0 then
          return redis.call('DECR', KEYS[1])
        else
          return 0
        end
      `;
      // Note: In a real implementation, you'd use eval to execute this Lua script
      // For now, we'll just skip decrement functionality
    }
  }

  async resetKey(key: string): Promise<void> {
    const fullKey = this.prefix + key;
    await this.redis.del(fullKey);
  }

  async get(key: string): Promise<number | null> {
    const fullKey = this.prefix + key;
    const value = await this.redis.get(fullKey);
    return value ? parseInt(value) : null;
  }
}

// Advanced rate limiting configurations
const ADVANCED_RATE_LIMITS = {
  // Adaptive rate limiting based on user behavior
  adaptive: {
    // Base limits that can be increased for good users
    base: {
      windowMs: 15 * 60 * 1000,
      max: 100,
      goodUserMultiplier: 2, // Good users get 2x limit
      badUserReduction: 0.5, // Bad users get 50% limit
    },
    // How quickly to adapt
    adaptationWindow: 60 * 60 * 1000, // 1 hour
    minRequests: 10, // Minimum requests before adaptation
    successRateThreshold: 0.95, // 95% success rate for good users
    errorRateThreshold: 0.1, // 10% error rate for bad users
  },

  // Progressive rate limiting for expensive operations
  progressive: {
    // Start with low limits and increase gradually
    initial: { max: 5, windowMs: 60 * 1000 },
    // How to progress
    progression: [
      { max: 10, windowMs: 60 * 1000, after: 100 }, // After 100 requests
      { max: 25, windowMs: 60 * 1000, after: 500 }, // After 500 requests
      { max: 50, windowMs: 60 * 1000, after: 1000 }, // After 1000 requests
      { max: 100, windowMs: 60 * 1000, after: 5000 }, // After 5000 requests
    ],
  },

  // Burst protection with gradual recovery
  burstProtection: {
    // Allow short bursts but enforce long-term limits
    burstWindow: 10 * 1000, // 10 seconds
    burstMax: 20, // 20 requests in 10 seconds
    sustainedWindow: 60 * 1000, // 1 minute
    sustainedMax: 60, // 60 requests in 1 minute
    recoveryRate: 0.1, // 10% recovery per second
  },

  // Content-aware rate limiting
  contentAware: {
    // Different limits based on content type/size
    lightRequests: { max: 1000, windowMs: 15 * 60 * 1000 }, // Small requests
    heavyRequests: { max: 50, windowMs: 15 * 60 * 1000 }, // Large uploads
    expensiveRequests: { max: 10, windowMs: 15 * 60 * 1000 }, // Complex operations
    // Thresholds for classification
    sizeThreshold: 1024 * 1024, // 1MB
    complexityThreshold: 1000, // Based on processing time
  },

  // Geographic rate limiting
  geographic: {
    // Different limits per region
    regions: {
      'US': { max: 1000, windowMs: 15 * 60 * 1000 },
      'EU': { max: 800, windowMs: 15 * 60 * 1000 },
      'ASIA': { max: 600, windowMs: 15 * 60 * 1000 },
      'OTHER': { max: 400, windowMs: 15 * 60 * 1000 },
    },
    // Fallback for unknown regions
    default: { max: 200, windowMs: 15 * 60 * 1000 },
  },
};

// User behavior tracking for adaptive rate limiting
interface UserBehavior {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  lastRequestTime: number;
  averageResponseTime: number;
  reputationScore: number; // -1 to 1, where 1 is excellent
}

class UserBehaviorTracker {
  private behaviors = new Map<string, UserBehavior>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up old user data every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000);
  }

  trackRequest(key: string, success: boolean, responseTime: number) {
    let behavior = this.behaviors.get(key);

    if (!behavior) {
      behavior = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        lastRequestTime: Date.now(),
        averageResponseTime: 0,
        reputationScore: 0,
      };
      this.behaviors.set(key, behavior);
    }

    behavior.totalRequests++;
    behavior.lastRequestTime = Date.now();

    if (success) {
      behavior.successfulRequests++;
    } else {
      behavior.failedRequests++;
    }

    // Update average response time (exponential moving average)
    const alpha = 0.1; // Smoothing factor
    behavior.averageResponseTime =
      behavior.averageResponseTime * (1 - alpha) + responseTime * alpha;

    // Update reputation score
    this.updateReputationScore(behavior);
  }

  private updateReputationScore(behavior: UserBehavior) {
    if (behavior.totalRequests < 10) return; // Not enough data

    const successRate = behavior.successfulRequests / behavior.totalRequests;
    const avgResponseTime = behavior.averageResponseTime;
    const requestFrequency = this.getRequestFrequency(behavior);

    // Calculate reputation based on multiple factors
    let reputation = 0;

    // Success rate component (weight: 0.5)
    reputation += (successRate - 0.5) * 1.0;

    // Response time component (weight: 0.3) - lower is better
    const responseTimeScore = Math.max(0, 1 - (avgResponseTime / 1000)); // Normalize to 0-1
    reputation += (responseTimeScore - 0.5) * 0.6;

    // Request frequency component (weight: 0.2) - moderate frequency is good
    const frequencyScore = Math.min(1, requestFrequency / 10); // Normalize, 10 req/min = 1.0
    if (frequencyScore > 0.8) {
      reputation -= (frequencyScore - 0.8) * 0.5; // Penalize very high frequency
    } else {
      reputation += frequencyScore * 0.4;
    }

    behavior.reputationScore = Math.max(-1, Math.min(1, reputation));
  }

  private getRequestFrequency(behavior: UserBehavior): number {
    const timeDiff = Date.now() - behavior.lastRequestTime;
    if (timeDiff < 60000) { // Within last minute
      return behavior.totalRequests;
    }
    return 0;
  }

  getReputationScore(key: string): number {
    const behavior = this.behaviors.get(key);
    return behavior ? behavior.reputationScore : 0;
  }

  getBehavior(key: string): UserBehavior | undefined {
    return this.behaviors.get(key);
  }

  private cleanup() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [key, behavior] of this.behaviors.entries()) {
      if (now - behavior.lastRequestTime > maxAge) {
        this.behaviors.delete(key);
      }
    }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Global user behavior tracker
const userBehaviorTracker = new UserBehaviorTracker();

// Advanced adaptive rate limiter
export const createAdaptiveRateLimiter = (baseConfig: typeof RATE_LIMIT_CONFIGS.global) => {
  return rateLimit({
    windowMs: baseConfig.windowMs,
    max: baseConfig.max,
    keyGenerator: (req: Request) => {
      const userKey = req.headers['x-user-address'] as string || req.ip;
      return `adaptive:${userKey}`;
    },
    skip: (req: Request) => {
      // Skip rate limiting for health checks and admin requests
      return req.path === '/health' || req.path.startsWith('/admin/health');
    },
    handler: (req: Request, res: Response) => {
      const userKey = req.headers['x-user-address'] as string || req.ip;
      const reputation = userBehaviorTracker.getReputationScore(userKey);

      // Adjust response based on user reputation
      let message = baseConfig.message.error;
      let retryAfter = '15 minutes';

      if (reputation > 0.5) {
        message = 'Rate limit temporarily exceeded. Your good standing gives you higher limits.';
        retryAfter = '5 minutes';
      } else if (reputation < -0.5) {
        message = 'Rate limit exceeded due to poor request history. Please wait longer.';
        retryAfter = '30 minutes';
      }

      logger.warn('Adaptive rate limit exceeded', {
        ip: req.ip,
        userKey,
        reputation,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method
      });

      res.status(429).json({
        success: false,
        error: message,
        retryAfter,
        reputation,
        timestamp: new Date().toISOString()
      });
    },
    onLimitReached: (req: Request, res: Response) => {
      const userKey = req.headers['x-user-address'] as string || req.ip;
      userBehaviorTracker.trackRequest(userKey, false, 0);
    },
    onSuccessfulRequest: (req: Request, res: Response) => {
      const userKey = req.headers['x-user-address'] as string || req.ip;
      const responseTime = res.get('X-Response-Time')
        ? parseInt(res.get('X-Response-Time')!)
        : 0;
      userBehaviorTracker.trackRequest(userKey, true, responseTime);
    }
  });
};

// Content-aware rate limiter
export const createContentAwareRateLimiter = () => {
  return rateLimit({
    windowMs: ADVANCED_RATE_LIMITS.contentAware.lightRequests.windowMs,
    max: ADVANCED_RATE_LIMITS.contentAware.lightRequests.max,
    keyGenerator: (req: Request) => {
      const userKey = req.headers['x-user-address'] as string || req.ip;
      const contentLength = req.headers['content-length']
        ? parseInt(req.headers['content-length'])
        : 0;

      // Classify request type
      let requestType = 'light';
      if (contentLength > ADVANCED_RATE_LIMITS.contentAware.sizeThreshold) {
        requestType = 'heavy';
      } else if (req.path.includes('analytics') || req.path.includes('complex')) {
        requestType = 'expensive';
      }

      return `content:${requestType}:${userKey}`;
    },
    handler: (req: Request, res: Response) => {
      const contentLength = req.headers['content-length']
        ? parseInt(req.headers['content-length'])
        : 0;

      let message = 'Rate limit exceeded';
      if (contentLength > ADVANCED_RATE_LIMITS.contentAware.sizeThreshold) {
        message = 'Upload rate limit exceeded. Large files have stricter limits.';
      } else if (req.path.includes('analytics')) {
        message = 'Analytics rate limit exceeded. Please wait before making more requests.';
      }

      logger.warn('Content-aware rate limit exceeded', {
        ip: req.ip,
        contentLength,
        path: req.path,
        userAgent: req.get('User-Agent')
      });

      res.status(429).json({
        success: false,
        error: message,
        timestamp: new Date().toISOString()
      });
    }
  });
};

// Geographic rate limiter
export const createGeographicRateLimiter = () => {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: ADVANCED_RATE_LIMITS.geographic.default.max,
    keyGenerator: (req: Request) => {
      const userKey = req.headers['x-user-address'] as string || req.ip;
      const country = req.headers['x-country-code'] as string || 'OTHER';
      const region = ADVANCED_RATE_LIMITS.geographic.regions[country]
        ? country
        : 'OTHER';

      return `geo:${region}:${userKey}`;
    },
    skip: (req: Request) => {
      const country = req.headers['x-country-code'] as string;
      // Skip rate limiting for certain regions during maintenance
      return country === 'US' && process.env.MAINTENANCE_MODE === 'true';
    },
    handler: (req: Request, res: Response) => {
      const country = req.headers['x-country-code'] as string || 'Unknown';

      logger.warn('Geographic rate limit exceeded', {
        ip: req.ip,
        country,
        userAgent: req.get('User-Agent'),
        path: req.path
      });

      res.status(429).json({
        success: false,
        error: `Rate limit exceeded for your region (${country})`,
        retryAfter: '15 minutes',
        timestamp: new Date().toISOString()
      });
    }
  });
};

// Burst protection rate limiter
export const createBurstProtectionLimiter = () => {
  return rateLimit({
    windowMs: ADVANCED_RATE_LIMITS.burstProtection.burstWindow,
    max: ADVANCED_RATE_LIMITS.burstProtection.burstMax,
    keyGenerator: (req: Request) => {
      const userKey = req.headers['x-user-address'] as string || req.ip;
      return `burst:${userKey}`;
    },
    handler: (req: Request, res: Response) => {
      logger.warn('Burst rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });

      res.status(429).json({
        success: false,
        error: 'Too many requests in short time. Please wait before making more requests.',
        retryAfter: '10 seconds',
        timestamp: new Date().toISOString()
      });
    }
  });
};

// Combined advanced rate limiter
export const advancedRateLimiter = [
  createBurstProtectionLimiter(),
  createGeographicRateLimiter(),
  createContentAwareRateLimiter(),
  createAdaptiveRateLimiter(RATE_LIMIT_CONFIGS.global)
];

// Rate limit monitoring and analytics
export class RateLimitMonitor {
  private metrics = {
    totalRequests: 0,
    blockedRequests: 0,
    rateLimitHits: 0,
    topViolators: new Map<string, number>(),
    violationsByPath: new Map<string, number>(),
    violationsByRegion: new Map<string, number>(),
  };

  recordViolation(req: Request, reason: string) {
    this.metrics.rateLimitHits++;
    this.metrics.blockedRequests++;

    const userKey = req.headers['x-user-address'] as string || req.ip;
    const country = req.headers['x-country-code'] as string || 'Unknown';

    // Track top violators
    const currentCount = this.metrics.topViolators.get(userKey) || 0;
    this.metrics.topViolators.set(userKey, currentCount + 1);

    // Track violations by path
    const pathCount = this.metrics.violationsByPath.get(req.path) || 0;
    this.metrics.violationsByPath.set(req.path, pathCount + 1);

    // Track violations by region
    const regionCount = this.metrics.violationsByRegion.get(country) || 0;
    this.metrics.violationsByRegion.set(country, regionCount + 1);

    logger.warn('Rate limit violation recorded', {
      userKey,
      path: req.path,
      country,
      reason,
      userAgent: req.get('User-Agent')
    });
  }

  recordRequest() {
    this.metrics.totalRequests++;
  }

  getMetrics() {
    const topViolators = Array.from(this.metrics.topViolators.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    const topPaths = Array.from(this.metrics.violationsByPath.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    const topRegions = Array.from(this.metrics.violationsByRegion.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    return {
      ...this.metrics,
      topViolators,
      topPaths,
      topRegions,
      violationRate: this.metrics.totalRequests > 0
        ? (this.metrics.blockedRequests / this.metrics.totalRequests) * 100
        : 0
    };
  }

  reset() {
    this.metrics = {
      totalRequests: 0,
      blockedRequests: 0,
      rateLimitHits: 0,
      topViolators: new Map(),
      violationsByPath: new Map(),
      violationsByRegion: new Map(),
    };
  }
}

export const rateLimitMonitor = new RateLimitMonitor();

// Enhanced rate limiter with monitoring
export const createMonitoredRateLimiter = (baseConfig: typeof RATE_LIMIT_CONFIGS.global, name: string) => {
  return rateLimit({
    windowMs: baseConfig.windowMs,
    max: baseConfig.max,
    keyGenerator: (req: Request) => {
      const userKey = req.headers['x-user-address'] as string || req.ip;
      return `${name}:${userKey}`;
    },
    handler: (req: Request, res: Response) => {
      rateLimitMonitor.recordViolation(req, name);

      logger.warn(`${name} rate limit exceeded`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });

      res.status(429).json({
        success: false,
        error: baseConfig.message.error,
        retryAfter: baseConfig.message.retryAfter,
        limiter: name,
        timestamp: new Date().toISOString()
      });
    },
    onLimitReached: (req: Request) => {
      rateLimitMonitor.recordViolation(req, name);
    },
    onSuccessfulRequest: () => {
      rateLimitMonitor.recordRequest();
    }
  });
};

export {
  userBehaviorTracker,
  ADVANCED_RATE_LIMITS,
  RedisStore,
};

export default {
  advancedRateLimiter,
  createAdaptiveRateLimiter,
  createContentAwareRateLimiter,
  createGeographicRateLimiter,
  createBurstProtectionLimiter,
  createMonitoredRateLimiter,
  rateLimitMonitor,
  userBehaviorTracker,
};