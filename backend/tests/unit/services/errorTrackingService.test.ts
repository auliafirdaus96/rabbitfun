import { ErrorTrackingService, ErrorCategory, ErrorSeverity } from '../../../src/services/errorTrackingService';

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    setex: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    ping: jest.fn().mockResolvedValue('PONG'),
    disconnect: jest.fn().mockResolvedValue('OK')
  }));
});

describe('ErrorTrackingService', () => {
  let errorTrackingService: ErrorTrackingService;
  let mockRedis: any;

  beforeEach(() => {
    // Reset environment
    process.env.NODE_ENV = 'test';
    process.env.REDIS_URL = 'redis://localhost:6379';

    errorTrackingService = new ErrorTrackingService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('trackError', () => {
    it('should track a new error successfully', async () => {
      const error = new Error('Test error');
      const context = {
        userId: 'user123',
        ip: '127.0.0.1',
        path: '/test',
        method: 'GET'
      };

      const errorId = await errorTrackingService.trackError(error, context);

      expect(errorId).toBeDefined();
      expect(typeof errorId).toBe('string');
      expect(errorId.length).toBeGreaterThan(0);
    });

    it('should categorize validation errors correctly', async () => {
      const error = new Error('Validation failed: required field missing');
      const context = { path: '/api/tokens' };

      const errorId = await errorTrackingService.trackError(error, context);
      const trackedError = await errorTrackingService.getError(errorId);

      expect(trackedError?.category).toBe(ErrorCategory.VALIDATION);
    });

    it('should categorize authentication errors correctly', async () => {
      const error = new Error('Unauthorized access');
      const context = { path: '/api/auth' };

      const errorId = await errorTrackingService.trackError(error, context);
      const trackedError = await errorTrackingService.getError(errorId);

      expect(trackedError?.category).toBe(ErrorCategory.AUTHENTICATION);
    });

    it('should categorize database errors correctly', async () => {
      const error = new Error('Database connection failed');
      error.stack = 'Error: Database connection failed\n    at query (sql.js:10:5)';

      const errorId = await errorTrackingService.trackError(error, {});
      const trackedError = await errorTrackingService.getError(errorId);

      expect(trackedError?.category).toBe(ErrorCategory.DATABASE);
    });

    it('should determine severity correctly for critical errors', async () => {
      const error = new Error('System crash');
      const context = { path: '/api/system' };

      const errorId = await errorTrackingService.trackError(error, context);
      const trackedError = await errorTrackingService.getError(errorId);

      expect(trackedError?.severity).toBe(ErrorSeverity.CRITICAL);
    });

    it('should increment count for repeated errors', async () => {
      const error = new Error('Repeated error');
      const context = { path: '/test' };

      const errorId1 = await errorTrackingService.trackError(error, context);
      const errorId2 = await errorTrackingService.trackError(error, context);

      expect(errorId1).toBe(errorId2);

      const trackedError = await errorTrackingService.getError(errorId1);
      expect(trackedError?.count).toBe(2);
    });

    it('should generate appropriate tags', async () => {
      const error = new Error('Test error');
      const context = {
        userId: 'user123',
        path: '/api/tokens',
        method: 'POST'
      };

      const errorId = await errorTrackingService.trackError(error, context);
      const trackedError = await errorTrackingService.getError(errorId);

      expect(trackedError?.tags).toContain('env:test');
      expect(trackedError?.tags).toContain('endpoint:api');
      expect(trackedError?.tags).toContain('method:POST');
      expect(trackedError?.tags).toContain('user-related');
      expect(trackedError?.tags).toContain('type:Error');
    });

    it('should store error context information', async () => {
      const error = new Error('Test error');
      const context = {
        userId: 'user123',
        requestId: 'req-456',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        path: '/api/tokens',
        method: 'GET',
        additionalData: { customField: 'value' }
      };

      const errorId = await errorTrackingService.trackError(error, context);
      const trackedError = await errorTrackingService.getError(errorId);

      expect(trackedError?.context).toMatchObject({
        userId: 'user123',
        requestId: 'req-456',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        path: '/api/tokens',
        method: 'GET',
        environment: 'test',
        version: '1.0.0',
        additionalData: { customField: 'value' }
      });
      expect(trackedError?.context.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('resolveError', () => {
    it('should resolve an existing error', async () => {
      const error = new Error('Test error');
      const errorId = await errorTrackingService.trackError(error, {});
      const resolvedBy = 'admin@example.com';

      const success = await errorTrackingService.resolveError(errorId, resolvedBy);

      expect(success).toBe(true);

      const trackedError = await errorTrackingService.getError(errorId);
      expect(trackedError?.resolved).toBe(true);
      expect(trackedError?.resolvedBy).toBe(resolvedBy);
      expect(trackedError?.resolvedAt).toBeInstanceOf(Date);
    });

    it('should return false for non-existent error', async () => {
      const success = await errorTrackingService.resolveError('non-existent-id', 'admin@example.com');

      expect(success).toBe(false);
    });
  });

  describe('getErrors', () => {
    beforeEach(async () => {
      // Create test errors
      const errors = [
        { message: 'Error 1', category: ErrorCategory.VALIDATION, severity: ErrorSeverity.LOW },
        { message: 'Error 2', category: ErrorCategory.DATABASE, severity: ErrorSeverity.HIGH },
        { message: 'Error 3', category: ErrorCategory.VALIDATION, severity: ErrorSeverity.MEDIUM },
        { message: 'Error 4', category: ErrorCategory.AUTHENTICATION, severity: ErrorSeverity.CRITICAL }
      ];

      for (const errorData of errors) {
        const error = new Error(errorData.message);
        await errorTrackingService.trackError(error, {});
        await new Promise(resolve => setTimeout(resolve, 10)); // Small delay for different timestamps
      }
    });

    it('should return all errors by default', async () => {
      const result = await errorTrackingService.getErrors();

      expect(result.errors).toHaveLength(4);
      expect(result.total).toBe(4);
    });

    it('should filter errors by category', async () => {
      const result = await errorTrackingService.getErrors({ category: ErrorCategory.VALIDATION });

      expect(result.errors).toHaveLength(2);
      expect(result.total).toBe(2);
      result.errors.forEach(error => {
        expect(error.category).toBe(ErrorCategory.VALIDATION);
      });
    });

    it('should filter errors by severity', async () => {
      const result = await errorTrackingService.getErrors({ severity: ErrorSeverity.HIGH });

      expect(result.errors).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.errors[0].severity).toBe(ErrorSeverity.HIGH);
    });

    it('should filter errors by resolution status', async () => {
      // Resolve one error
      const allErrors = await errorTrackingService.getErrors();
      await errorTrackingService.resolveError(allErrors.errors[0].id, 'admin@example.com');

      const unresolvedResult = await errorTrackingService.getErrors({ resolved: false });
      const resolvedResult = await errorTrackingService.getErrors({ resolved: true });

      expect(unresolvedResult.errors).toHaveLength(3);
      expect(resolvedResult.errors).toHaveLength(1);
    });

    it('should apply pagination', async () => {
      const result = await errorTrackingService.getErrors({ limit: 2, offset: 1 });

      expect(result.errors).toHaveLength(2);
      expect(result.total).toBe(4);
    });
  });

  describe('getMetrics', () => {
    beforeEach(async () => {
      // Create test errors with different categories and severities
      const errorConfigs = [
        { category: ErrorCategory.VALIDATION, severity: ErrorSeverity.LOW },
        { category: ErrorCategory.VALIDATION, severity: ErrorSeverity.MEDIUM },
        { category: ErrorCategory.DATABASE, severity: ErrorSeverity.HIGH },
        { category: ErrorCategory.AUTHENTICATION, severity: ErrorSeverity.CRITICAL }
      ];

      for (const config of errorConfigs) {
        const error = new Error(`Test ${config.category} error`);
        await errorTrackingService.trackError(error, {});
      }
    });

    it('should calculate correct metrics', () => {
      const metrics = errorTrackingService.getMetrics();

      expect(metrics.totalErrors).toBe(4);
      expect(metrics.errorsByCategory[ErrorCategory.VALIDATION]).toBe(2);
      expect(metrics.errorsByCategory[ErrorCategory.DATABASE]).toBe(1);
      expect(metrics.errorsByCategory[ErrorCategory.AUTHENTICATION]).toBe(1);
      expect(metrics.errorsBySeverity[ErrorSeverity.LOW]).toBe(1);
      expect(metrics.errorsBySeverity[ErrorSeverity.MEDIUM]).toBe(1);
      expect(metrics.errorsBySeverity[ErrorSeverity.HIGH]).toBe(1);
      expect(metrics.errorsBySeverity[ErrorSeverity.CRITICAL]).toBe(1);
    });

    it('should track errors over time', () => {
      const metrics = errorTrackingService.getMetrics();

      expect(metrics.errorsOverTime).toBeDefined();
      expect(Array.isArray(metrics.errorsOverTime)).toBe(true);
    });

    it('should identify top errors', () => {
      const metrics = errorTrackingService.getMetrics();

      expect(metrics.topErrors).toBeDefined();
      expect(Array.isArray(metrics.topErrors)).toBe(true);
    });
  });

  describe('getErrorDashboard', () => {
    beforeEach(async () => {
      // Create test errors
      const error = new Error('Dashboard test error');
      await errorTrackingService.trackError(error, { userId: 'user123' });
    });

    it('should return comprehensive dashboard data', async () => {
      const dashboard = await errorTrackingService.getErrorDashboard();

      expect(dashboard).toHaveProperty('summary');
      expect(dashboard).toHaveProperty('byCategory');
      expect(dashboard).toHaveProperty('bySeverity');
      expect(dashboard).toHaveProperty('trends');
      expect(dashboard).toHaveProperty('topErrors');
      expect(dashboard).toHaveProperty('recentErrors');

      expect(dashboard.summary.totalErrors).toBeGreaterThan(0);
      expect(dashboard.recentErrors).toBeDefined();
      expect(Array.isArray(dashboard.recentErrors)).toBe(true);
    });
  });

  describe('cleanupOldErrors', () => {
    it('should clean up old resolved errors', async () => {
      // Create an error and resolve it
      const error = new Error('Old error');
      const errorId = await errorTrackingService.trackError(error, {});
      await errorTrackingService.resolveError(errorId, 'admin@example.com');

      // Manually set the lastSeen time to be old
      const trackedError = await errorTrackingService.getError(errorId);
      if (trackedError) {
        trackedError.lastSeen = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
      }

      // Trigger cleanup
      await (errorTrackingService as any).cleanupOldErrors();

      // Verify the old error is removed
      const result = await errorTrackingService.getError(errorId);
      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle empty context', async () => {
      const error = new Error('Test error');

      expect(async () => {
        await errorTrackingService.trackError(error);
      }).not.toThrow();
    });

    it('should handle errors without stack trace', async () => {
      const error = new Error('Test error');
      delete error.stack;

      const errorId = await errorTrackingService.trackError(error, {});
      const trackedError = await errorTrackingService.getError(errorId);

      expect(trackedError?.stack).toBeUndefined();
    });

    it('should handle very long error messages', async () => {
      const longMessage = 'A'.repeat(10000);
      const error = new Error(longMessage);

      expect(async () => {
        await errorTrackingService.trackError(error, {});
      }).not.toThrow();
    });
  });
});