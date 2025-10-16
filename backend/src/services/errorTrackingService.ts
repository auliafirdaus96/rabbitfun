import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import Redis from 'ioredis';

// Error classification and severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATABASE = 'database',
  NETWORK = 'network',
  EXTERNAL_API = 'external_api',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

interface ErrorContext {
  userId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  timestamp?: Date;
  environment?: string;
  version?: string;
  additionalData?: Record<string, any>;
}

interface TrackedError {
  id: string;
  message: string;
  stack?: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context: ErrorContext;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  tags: string[];
  similarErrors: string[];
}

interface ErrorMetrics {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  errorsOverTime: Array<{ timestamp: Date; count: number }>;
  topErrors: Array<{ error: TrackedError; count: number }>;
  resolutionRate: number;
  averageResolutionTime: number;
}

class ErrorTrackingService {
  private redis: Redis | null = null;
  private errors = new Map<string, TrackedError>();
  private errorMetrics: ErrorMetrics = {
    totalErrors: 0,
    errorsByCategory: {} as Record<ErrorCategory, number>,
    errorsBySeverity: {} as Record<ErrorSeverity, number>,
    errorsOverTime: [],
    topErrors: [],
    resolutionRate: 0,
    averageResolutionTime: 0
  };

  constructor() {
    // Initialize Redis if available
    if (process.env.REDIS_URL) {
      this.redis = new Redis(process.env.REDIS_URL, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });
    }

    // Initialize category counters
    Object.values(ErrorCategory).forEach(category => {
      this.errorMetrics.errorsByCategory[category] = 0;
    });

    // Initialize severity counters
    Object.values(ErrorSeverity).forEach(severity => {
      this.errorMetrics.errorsBySeverity[severity] = 0;
    });

    // Cleanup old errors periodically
    setInterval(() => this.cleanupOldErrors(), 60 * 60 * 1000); // Every hour
  }

  private generateErrorId(error: Error, context: ErrorContext): string {
    const base = `${error.name}:${error.message}:${context.path || ''}`;
    return Buffer.from(base).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  private categorizeError(error: Error, context: ErrorContext): ErrorCategory {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return ErrorCategory.VALIDATION;
    }

    if (message.includes('unauthorized') || message.includes('authentication') || message.includes('jwt')) {
      return ErrorCategory.AUTHENTICATION;
    }

    if (message.includes('forbidden') || message.includes('permission') || message.includes('access denied')) {
      return ErrorCategory.AUTHORIZATION;
    }

    if (message.includes('database') || message.includes('prisma') || stack.includes('sql')) {
      return ErrorCategory.DATABASE;
    }

    if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
      return ErrorCategory.NETWORK;
    }

    if (message.includes('api') || message.includes('external') || message.includes('fetch')) {
      return ErrorCategory.EXTERNAL_API;
    }

    if (message.includes('system') || message.includes('internal') || message.includes('server')) {
      return ErrorCategory.SYSTEM;
    }

    return ErrorCategory.BUSINESS_LOGIC;
  }

  private determineSeverity(error: Error, category: ErrorCategory, context: ErrorContext): ErrorSeverity {
    // Critical errors
    if (category === ErrorCategory.SYSTEM || category === ErrorCategory.DATABASE) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity errors
    if (category === ErrorCategory.AUTHENTICATION || category === ErrorCategory.EXTERNAL_API) {
      return ErrorSeverity.HIGH;
    }

    // Medium severity errors
    if (category === ErrorCategory.AUTHORIZATION || category === ErrorCategory.BUSINESS_LOGIC) {
      return ErrorSeverity.MEDIUM;
    }

    // Low severity errors
    if (category === ErrorCategory.VALIDATION || category === ErrorCategory.NETWORK) {
      return ErrorSeverity.LOW;
    }

    return ErrorSeverity.MEDIUM;
  }

  private generateTags(error: Error, context: ErrorContext): string[] {
    const tags: string[] = [];

    // Environment tag
    tags.push(`env:${process.env.NODE_ENV || 'development'}`);

    // Path-based tags
    if (context.path) {
      const pathParts = context.path.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        tags.push(`endpoint:${pathParts[0]}`);
      }
    }

    // Method tag
    if (context.method) {
      tags.push(`method:${context.method}`);
    }

    // User-based tag
    if (context.userId) {
      tags.push('user-related');
    }

    // Error type tag
    tags.push(`type:${error.constructor.name}`);

    return tags;
  }

  async trackError(error: Error, context: ErrorContext = {}): Promise<string> {
    const errorId = this.generateErrorId(error, context);
    const now = new Date();

    const category = this.categorizeError(error, context);
    const severity = this.determineSeverity(error, category, context);
    const tags = this.generateTags(error, context);

    const trackedError: TrackedError = {
      id: errorId,
      message: error.message,
      stack: error.stack,
      category,
      severity,
      context: {
        ...context,
        timestamp: now,
        environment: process.env.NODE_ENV || 'development',
        version: process.env.APP_VERSION || '1.0.0'
      },
      count: 1,
      firstSeen: now,
      lastSeen: now,
      resolved: false,
      tags,
      similarErrors: []
    };

    // Check if error already exists
    const existingError = this.errors.get(errorId);
    if (existingError) {
      existingError.count++;
      existingError.lastSeen = now;
      existingError.context = { ...existingError.context, ...context };
    } else {
      this.errors.set(errorId, trackedError);
      this.updateMetrics(trackedError, 'new');
    }

    // Log error
    this.logError(trackedError);

    // Store in Redis if available
    if (this.redis) {
      try {
        await this.redis.setex(
          `error:${errorId}`,
          7 * 24 * 60 * 60, // 7 days
          JSON.stringify(trackedError)
        );
      } catch (redisError) {
        logger.warn('Failed to store error in Redis:', redisError);
      }
    }

    // Send notifications for critical errors
    if (severity === ErrorSeverity.CRITICAL) {
      await this.sendCriticalErrorNotification(trackedError);
    }

    return errorId;
  }

  private updateMetrics(error: TrackedError, action: 'new' | 'resolve') {
    if (action === 'new') {
      this.errorMetrics.totalErrors++;
      this.errorMetrics.errorsByCategory[error.category]++;
      this.errorMetrics.errorsBySeverity[error.severity]++;

      // Add to time series
      const now = new Date();
      const timeSlot = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());

      const existingTimeSlot = this.errorMetrics.errorsOverTime.find(
        slot => slot.timestamp.getTime() === timeSlot.getTime()
      );

      if (existingTimeSlot) {
        existingTimeSlot.count++;
      } else {
        this.errorMetrics.errorsOverTime.push({
          timestamp: timeSlot,
          count: 1
        });

        // Keep only last 24 hours of data
        const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        this.errorMetrics.errorsOverTime = this.errorMetrics.errorsOverTime.filter(
          slot => slot.timestamp > cutoff
        );
      }

      // Update top errors
      this.updateTopErrors();
    } else if (action === 'resolve') {
      this.updateResolutionMetrics(error);
    }
  }

  private updateTopErrors() {
    this.errorMetrics.topErrors = Array.from(this.errors.values())
      .filter(error => !error.resolved)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(error => ({ error, count: error.count }));
  }

  private updateResolutionMetrics(error: TrackedError) {
    const resolutionTime = error.resolvedAt! - error.firstSeen;
    const resolvedErrors = Array.from(this.errors.values()).filter(e => e.resolved).length;

    this.errorMetrics.resolutionRate = (resolvedErrors / this.errorMetrics.totalErrors) * 100;

    // Update average resolution time
    const totalResolutionTime = Array.from(this.errors.values())
      .filter(e => e.resolved && e.resolvedAt)
      .reduce((sum, e) => sum + (e.resolvedAt! - e.firstSeen), 0);

    const resolvedCount = Array.from(this.errors.values()).filter(e => e.resolved).length;
    this.errorMetrics.averageResolutionTime = resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0;
  }

  private logError(error: TrackedError) {
    const logLevel = this.getLogLevel(error.severity);
    const logData = {
      errorId: error.id,
      category: error.category,
      severity: error.severity,
      count: error.count,
      context: error.context,
      tags: error.tags
    };

    switch (logLevel) {
      case 'error':
        logger.error(`[${error.severity.toUpperCase()}] ${error.message}`, logData);
        break;
      case 'warn':
        logger.warn(`[${error.severity.toUpperCase()}] ${error.message}`, logData);
        break;
      default:
        logger.info(`[${error.severity.toUpperCase()}] ${error.message}`, logData);
    }
  }

  private getLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'info' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      default:
        return 'info';
    }
  }

  private async sendCriticalErrorNotification(error: TrackedError) {
    try {
      // Here you could integrate with services like:
      // - Slack notifications
      // - Email alerts
      // - PagerDuty
      // - Discord webhook
      // - Custom alerting system

      logger.error('CRITICAL ERROR DETECTED', {
        errorId: error.id,
        message: error.message,
        category: error.category,
        count: error.count,
        context: error.context,
        timestamp: new Date().toISOString()
      });

      // Example: Send to Slack (implementation would depend on your setup)
      // await this.sendSlackNotification(error);

    } catch (notificationError) {
      logger.error('Failed to send critical error notification:', notificationError);
    }
  }

  async resolveError(errorId: string, resolvedBy: string): Promise<boolean> {
    const error = this.errors.get(errorId);
    if (!error) {
      return false;
    }

    error.resolved = true;
    error.resolvedAt = new Date();
    error.resolvedBy = resolvedBy;

    this.updateMetrics(error, 'resolve');

    // Update in Redis
    if (this.redis) {
      try {
        await this.redis.setex(
          `error:${errorId}`,
          7 * 24 * 60 * 60,
          JSON.stringify(error)
        );
      } catch (redisError) {
        logger.warn('Failed to update resolved error in Redis:', redisError);
      }
    }

    logger.info(`Error resolved: ${errorId} by ${resolvedBy}`);
    return true;
  }

  async getError(errorId: string): Promise<TrackedError | null> {
    const error = this.errors.get(errorId);
    if (error) {
      return error;
    }

    // Try to get from Redis
    if (this.redis) {
      try {
        const errorData = await this.redis.get(`error:${errorId}`);
        if (errorData) {
          const parsedError = JSON.parse(errorData) as TrackedError;
          this.errors.set(errorId, parsedError);
          return parsedError;
        }
      } catch (redisError) {
        logger.warn('Failed to get error from Redis:', redisError);
      }
    }

    return null;
  }

  async getErrors(params: {
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    resolved?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ errors: TrackedError[]; total: number }> {
    let filteredErrors = Array.from(this.errors.values());

    // Apply filters
    if (params.category) {
      filteredErrors = filteredErrors.filter(error => error.category === params.category);
    }

    if (params.severity) {
      filteredErrors = filteredErrors.filter(error => error.severity === params.severity);
    }

    if (params.resolved !== undefined) {
      filteredErrors = filteredErrors.filter(error => error.resolved === params.resolved);
    }

    // Sort by last seen (most recent first)
    filteredErrors.sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());

    const total = filteredErrors.length;
    const offset = params.offset || 0;
    const limit = params.limit || 50;

    const errors = filteredErrors.slice(offset, offset + limit);

    return { errors, total };
  }

  getMetrics(): ErrorMetrics {
    return { ...this.errorMetrics };
  }

  async getErrorDashboard() {
    const metrics = this.getMetrics();
    const recentErrors = await this.getErrors({ limit: 10, resolved: false });
    const criticalErrors = await this.getErrors({ severity: ErrorSeverity.CRITICAL, resolved: false });

    return {
      summary: {
        totalErrors: metrics.totalErrors,
        unresolvedErrors: Array.from(this.errors.values()).filter(e => !e.resolved).length,
        criticalErrors: criticalErrors.total,
        resolutionRate: metrics.resolutionRate
      },
      byCategory: metrics.errorsByCategory,
      bySeverity: metrics.errorsBySeverity,
      trends: metrics.errorsOverTime.slice(-24), // Last 24 hours
      topErrors: metrics.topErrors.slice(0, 5),
      recentErrors: recentErrors.errors
    };
  }

  private cleanupOldErrors() {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    for (const [errorId, error] of this.errors.entries()) {
      if (error.lastSeen < cutoff && error.resolved) {
        this.errors.delete(errorId);
      }
    }

    // Clean up old metrics
    const metricCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    this.errorMetrics.errorsOverTime = this.errorMetrics.errorsOverTime.filter(
      slot => slot.timestamp > metricCutoff
    );

    logger.info('Cleaned up old errors and metrics');
  }

  // Express middleware for automatic error tracking
  middleware() {
    return (error: Error, req: Request, res: Response, next: NextFunction) => {
      const context: ErrorContext = {
        userId: req.headers['x-user-id'] as string,
        requestId: req.headers['x-request-id'] as string,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        additionalData: {
          headers: req.headers,
          query: req.query,
          params: req.params,
          body: req.body
        }
      };

      this.trackError(error, context).catch(trackError => {
        logger.error('Failed to track error:', trackError);
      });

      next(error);
    };
  }

  // Utility method to track async errors
  async trackAsyncError<T>(
    promise: Promise<T>,
    context: ErrorContext
  ): Promise<T> {
    try {
      return await promise;
    } catch (error) {
      await this.trackError(error as Error, context);
      throw error;
    }
  }
}

export const errorTrackingService = new ErrorTrackingService();

// Helper function to create error contexts
export function createErrorContext(req: Request, additionalData?: Record<string, any>): ErrorContext {
  return {
    userId: req.headers['x-user-id'] as string,
    requestId: req.headers['x-request-id'] as string,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    path: req.path,
    method: req.method,
    additionalData
  };
}

export default errorTrackingService;