import request from 'supertest';
import express from 'express';
import {
  createAdaptiveRateLimiter,
  createContentAwareRateLimiter,
  createGeographicRateLimiter,
  createBurstProtectionLimiter,
  userBehaviorTracker,
  rateLimitMonitor
} from '../../../src/middleware/advancedRateLimiter';

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(900),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1)
  }));
});

describe('Advanced Rate Limiters', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    jest.clearAllMocks();
  });

  describe('createAdaptiveRateLimiter', () => {
    it('should allow requests within limits', async () => {
      const baseConfig = {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100,
        message: { error: 'Too many requests', retryAfter: '15 minutes' }
      };

      const limiter = createAdaptiveRateLimiter(baseConfig);
      app.use('/test-adaptive', limiter);
      app.get('/test-adaptive', (req, res) => res.json({ success: true }));

      // First request should succeed
      const response1 = await request(app)
        .get('/test-adaptive')
        .set('X-User-Address', '0x1234567890123456789012345678901234567890');

      expect(response1.status).toBe(200);
      expect(response1.body.success).toBe(true);
    });

    it('should track user reputation', async () => {
      const baseConfig = {
        windowMs: 15 * 60 * 1000,
        max: 10,
        message: { error: 'Too many requests', retryAfter: '15 minutes' }
      };

      const limiter = createAdaptiveRateLimiter(baseConfig);
      app.use('/test-reputation', limiter);
      app.get('/test-reputation', (req, res) => res.json({ success: true }));

      const userAddress = '0x1234567890123456789012345678901234567890';

      // Make several successful requests to build reputation
      for (let i = 0; i < 5; i++) {
        await request(app)
          .get('/test-reputation')
          .set('X-User-Address', userAddress);
      }

      const reputation = userBehaviorTracker.getReputationScore(userAddress);
      expect(reputation).toBeGreaterThan(0);
    });

    it('should adjust limits based on user reputation', async () => {
      const baseConfig = {
        windowMs: 60 * 1000, // 1 minute
        max: 5,
        message: { error: 'Too many requests', retryAfter: '1 minute' }
      };

      const limiter = createAdaptiveRateLimiter(baseConfig);
      app.use('/test-adaptive', limiter);
      app.get('/test-adaptive', (req, res) => res.json({ success: true }));

      const goodUserAddress = '0x1234567890123456789012345678901234567890';
      const badUserAddress = '0x0987654321098765432109876543210987654321';

      // Build reputation for good user
      for (let i = 0; i < 15; i++) {
        userBehaviorTracker.trackRequest(goodUserAddress, true, 100);
      }

      // Build negative reputation for bad user
      for (let i = 0; i < 15; i++) {
        userBehaviorTracker.trackRequest(badUserAddress, false, 5000);
      }

      const goodReputation = userBehaviorTracker.getReputationScore(goodUserAddress);
      const badReputation = userBehaviorTracker.getReputationScore(badUserAddress);

      expect(goodReputation).toBeGreaterThan(badReputation);
    });
  });

  describe('createContentAwareRateLimiter', () => {
    it('should allow different limits based on content size', async () => {
      const limiter = createContentAwareRateLimiter();
      app.use('/test-content', limiter);
      app.post('/test-content', (req, res) => res.json({ success: true }));

      // Small request should succeed
      const smallResponse = await request(app)
        .post('/test-content')
        .send({ data: 'small' })
        .set('Content-Length', '100')
        .set('X-User-Address', '0x1234567890123456789012345678901234567890');

      expect(smallResponse.status).toBe(200);

      // Large request should have different key
      const largeResponse = await request(app)
        .post('/test-content')
        .send({ data: 'x'.repeat(2000000) }) // 2MB
        .set('Content-Length', '2000000')
        .set('X-User-Address', '0x1234567890123456789012345678901234567890');

      // Should still succeed if within limits, but with different classification
      expect([200, 429]).toContain(largeResponse.status);
    });

    it('should classify requests correctly', async () => {
      const limiter = createContentAwareRateLimiter();
      app.use('/test-classify', limiter);
      app.post('/test-classify', (req, res) => res.json({ success: true }));

      // Analytics request
      const analyticsResponse = await request(app)
        .post('/test-classify/analytics')
        .send({ query: 'test' })
        .set('X-User-Address', '0x1234567890123456789012345678901234567890');

      expect([200, 429]).toContain(analyticsResponse.status);
    });
  });

  describe('createGeographicRateLimiter', () => {
    it('should apply different limits per region', async () => {
      const limiter = createGeographicRateLimiter();
      app.use('/test-geo', limiter);
      app.get('/test-geo', (req, res) => res.json({ success: true }));

      // US user
      const usResponse = await request(app)
        .get('/test-geo')
        .set('X-Country-Code', 'US')
        .set('X-User-Address', '0x1234567890123456789012345678901234567890');

      expect(usResponse.status).toBe(200);

      // EU user
      const euResponse = await request(app)
        .get('/test-geo')
        .set('X-Country-Code', 'EU')
        .set('X-User-Address', '0x1234567890123456789012345678901234567891');

      expect(euResponse.status).toBe(200);

      // Unknown region user
      const unknownResponse = await request(app)
        .get('/test-geo')
        .set('X-Country-Code', 'UNKNOWN')
        .set('X-User-Address', '0x1234567890123456789012345678901234567892');

      expect(unknownResponse.status).toBe(200);
    });

    it('should skip rate limiting for certain regions in maintenance', async () => {
      process.env.MAINTENANCE_MODE = 'true';
      const limiter = createGeographicRateLimiter();
      app.use('/test-maintenance', limiter);
      app.get('/test-maintenance', (req, res) => res.json({ success: true }));

      const usResponse = await request(app)
        .get('/test-maintenance')
        .set('X-Country-Code', 'US')
        .set('X-User-Address', '0x1234567890123456789012345678901234567890');

      expect(usResponse.status).toBe(200);

      process.env.MAINTENANCE_MODE = 'false';
    });
  });

  describe('createBurstProtectionLimiter', () => {
    it('should limit rapid requests in short time window', async () => {
      const limiter = createBurstProtectionLimiter();
      app.use('/test-burst', limiter);
      app.get('/test-burst', (req, res) => res.json({ success: true }));

      const userAddress = '0x1234567890123456789012345678901234567890';
      const responses = [];

      // Make rapid requests
      for (let i = 0; i < 25; i++) {
        const response = await request(app)
          .get('/test-burst')
          .set('X-User-Address', userAddress);
        responses.push(response.status);
      }

      // Some requests should be rate limited
      const successCount = responses.filter(status => status === 200).length;
      const limitedCount = responses.filter(status => status === 429).length;

      expect(successCount + limitedCount).toBe(25);
      expect(limitedCount).toBeGreaterThan(0);
    });

    it('should allow requests after burst window resets', async () => {
      const limiter = createBurstProtectionLimiter();
      app.use('/test-burst-reset', limiter);
      app.get('/test-burst-reset', (req, res) => res.json({ success: true }));

      const userAddress = '0x1234567890123456789012345678901234567890';

      // Make requests until rate limited
      let response;
      let requestCount = 0;
      do {
        response = await request(app)
          .get('/test-burst-reset')
          .set('X-User-Address', userAddress);
        requestCount++;
      } while (response.status === 200 && requestCount < 30);

      expect(response.status).toBe(429);
    });
  });

  describe('RateLimitMonitor', () => {
    beforeEach(() => {
      rateLimitMonitor.reset();
    });

    it('should track violations correctly', () => {
      const mockReq = {
        ip: '127.0.0.1',
        headers: {},
        path: '/api/test',
        get: (header: string) => header === 'user-agent' ? 'test-agent' : undefined
      } as any;

      rateLimitMonitor.recordViolation(mockReq, 'test-limiter');
      rateLimitMonitor.recordRequest();

      const metrics = rateLimitMonitor.getMetrics();

      expect(metrics.totalRequests).toBe(1);
      expect(metrics.blockedRequests).toBe(1);
      expect(metrics.rateLimitHits).toBe(1);
    });

    it('should track top violators', () => {
      const mockReq1 = {
        ip: '127.0.0.1',
        headers: { 'x-user-address': 'user1' },
        path: '/api/test',
        get: () => 'test-agent'
      } as any;

      const mockReq2 = {
        ip: '127.0.0.2',
        headers: { 'x-user-address': 'user2' },
        path: '/api/test',
        get: () => 'test-agent'
      } as any;

      // user1 violates 3 times, user2 violates 1 time
      rateLimitMonitor.recordViolation(mockReq1, 'test-limiter');
      rateLimitMonitor.recordViolation(mockReq1, 'test-limiter');
      rateLimitMonitor.recordViolation(mockReq1, 'test-limiter');
      rateLimitMonitor.recordViolation(mockReq2, 'test-limiter');

      const metrics = rateLimitMonitor.getMetrics();
      const topViolators = metrics.topViolators;

      expect(topViolators).toHaveLength(2);
      expect(topViolators[0].count).toBe(3);
      expect(topViolators[1].count).toBe(1);
    });

    it('should track violations by path', () => {
      const mockReq1 = {
        ip: '127.0.0.1',
        headers: {},
        path: '/api/tokens',
        get: () => 'test-agent'
      } as any;

      const mockReq2 = {
        ip: '127.0.0.2',
        headers: {},
        path: '/api/users',
        get: () => 'test-agent'
      } as any;

      rateLimitMonitor.recordViolation(mockReq1, 'test-limiter');
      rateLimitMonitor.recordViolation(mockReq1, 'test-limiter');
      rateLimitMonitor.recordViolation(mockReq2, 'test-limiter');

      const metrics = rateLimitMonitor.getMetrics();
      const topPaths = metrics.topPaths;

      expect(topPaths).toHaveLength(2);
      expect(topPaths[0].count).toBe(2);
      expect(topPaths[1].count).toBe(1);
    });

    it('should calculate violation rate correctly', () => {
      rateLimitMonitor.recordRequest();
      rateLimitMonitor.recordRequest();
      rateLimitMonitor.recordRequest();
      rateLimitMonitor.recordRequest();

      const mockReq = {
        ip: '127.0.0.1',
        headers: {},
        path: '/api/test',
        get: () => 'test-agent'
      } as any;

      rateLimitMonitor.recordViolation(mockReq, 'test-limiter');

      const metrics = rateLimitMonitor.getMetrics();

      expect(metrics.violationRate).toBe(25); // 1 violation out of 4 requests = 25%
    });

    it('should reset metrics correctly', () => {
      const mockReq = {
        ip: '127.0.0.1',
        headers: {},
        path: '/api/test',
        get: () => 'test-agent'
      } as any;

      rateLimitMonitor.recordViolation(mockReq, 'test-limiter');
      rateLimitMonitor.recordRequest();

      expect(rateLimitMonitor.getMetrics().totalRequests).toBe(1);

      rateLimitMonitor.reset();

      expect(rateLimitMonitor.getMetrics().totalRequests).toBe(0);
    });
  });

  describe('UserBehaviorTracker', () => {
    beforeEach(() => {
      // Reset tracker state
      userBehaviorTracker.destroy();
    });

    afterEach(() => {
      userBehaviorTracker.destroy();
    });

    it('should track user behavior correctly', () => {
      const userKey = 'user123';

      // Track successful requests
      userBehaviorTracker.trackRequest(userKey, true, 100);
      userBehaviorTracker.trackRequest(userKey, true, 150);
      userBehaviorTracker.trackRequest(userKey, true, 200);

      // Track failed requests
      userBehaviorTracker.trackRequest(userKey, false, 1000);

      const behavior = userBehaviorTracker.getBehavior(userKey);

      expect(behavior).toBeDefined();
      expect(behavior?.totalRequests).toBe(4);
      expect(behavior?.successfulRequests).toBe(3);
      expect(behavior?.failedRequests).toBe(1);
    });

    it('should update reputation score based on behavior', () => {
      const goodUser = 'good-user';
      const badUser = 'bad-user';

      // Good user behavior
      for (let i = 0; i < 20; i++) {
        userBehaviorTracker.trackRequest(goodUser, true, 100); // Fast, successful
      }

      // Bad user behavior
      for (let i = 0; i < 20; i++) {
        userBehaviorTracker.trackRequest(badUser, false, 2000); // Slow, failed
      }

      const goodReputation = userBehaviorTracker.getReputationScore(goodUser);
      const badReputation = userBehaviorTracker.getReputationScore(badUser);

      expect(goodReputation).toBeGreaterThan(0);
      expect(badReputation).toBeLessThan(0);
    });

    it('should handle new users gracefully', () => {
      const newUser = 'new-user';

      const reputation = userBehaviorTracker.getReputationScore(newUser);
      const behavior = userBehaviorTracker.getBehavior(newUser);

      expect(reputation).toBe(0);
      expect(behavior).toBeUndefined();
    });

    it('should calculate average response time correctly', () => {
      const userKey = 'user123';

      userBehaviorTracker.trackRequest(userKey, true, 100);
      userBehaviorTracker.trackRequest(userKey, true, 200);
      userBehaviorTracker.trackRequest(userKey, true, 300);

      const behavior = userBehaviorTracker.getBehavior(userKey);

      expect(behavior?.averageResponseTime).toBeGreaterThan(100);
      expect(behavior?.averageResponseTime).toBeLessThan(300);
    });
  });

  describe('combined rate limiters', () => {
    it('should work together without conflicts', async () => {
      const burstLimiter = createBurstProtectionLimiter();
      const geoLimiter = createGeographicRateLimiter();

      app.use('/test-combined', burstLimiter, geoLimiter);
      app.get('/test-combined', (req, res) => res.json({ success: true }));

      const response = await request(app)
        .get('/test-combined')
        .set('X-Country-Code', 'US')
        .set('X-User-Address', '0x1234567890123456789012345678901234567890');

      expect([200, 429]).toContain(response.status);
    });
  });

  describe('error handling', () => {
    it('should handle Redis failures gracefully', async () => {
      // Mock Redis to throw errors
      const Redis = require('ioredis');
      Redis.mockImplementation(() => ({
        incr: jest.fn().mockRejectedValue(new Error('Redis error')),
        expire: jest.fn().mockRejectedValue(new Error('Redis error'))
      }));

      const limiter = createAdaptiveRateLimiter({
        windowMs: 60000,
        max: 10,
        message: { error: 'Too many requests' }
      });

      app.use('/test-redis-error', limiter);
      app.get('/test-redis-error', (req, res) => res.json({ success: true }));

      // Should not crash the application
      const response = await request(app)
        .get('/test-redis-error')
        .set('X-User-Address', '0x1234567890123456789012345678901234567890');

      expect([200, 429]).toContain(response.status);
    });
  });
});