import { Request, Response, NextFunction } from 'express';
import logger from './logger';

// Custom error types
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public details: any;

  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict') {
    super(message, 409, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(message, 500, 'DATABASE_ERROR');
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(`${service} error: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR');
  }
}

// Production Error Handler
export const productionErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = { ...err } as any;
  error.message = err.message;

  // Log error with context
  logger.error('Production Error Handler:', {
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      body: req.method !== 'GET' ? req.body : undefined,
      params: req.params,
      query: req.query
    },
    user: (req as any).user?.id || 'anonymous'
  });

  // Default error response
  let statusCode = 500;
  let message = 'Internal Server Error';
  let code = 'INTERNAL_SERVER_ERROR';

  // Handle known error types
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code || 'APP_ERROR';
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    code = 'VALIDATION_ERROR';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    code = 'INVALID_ID';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED';
  } else if (err.name === 'MulterError') {
    statusCode = 400;
    message = 'File upload error';
    code = 'FILE_UPLOAD_ERROR';
  } else if (err.name === 'PrismaClientKnownRequestError') {
    statusCode = 400;
    message = 'Database request error';
    code = 'DATABASE_REQUEST_ERROR';
  } else if (err.name === 'PrismaClientUnknownRequestError') {
    statusCode = 500;
    message = 'Database unknown error';
    code = 'DATABASE_UNKNOWN_ERROR';
  } else if (err.name === 'PrismaClientRustPanicError') {
    statusCode = 500;
    message = 'Database panic error';
    code = 'DATABASE_PANIC_ERROR';
  } else if (err.name === 'PrismaClientInitializationError') {
    statusCode = 500;
    message = 'Database initialization error';
    code = 'DATABASE_INITIALIZATION_ERROR';
  } else if (err.name === 'PrismaClientValidationError') {
    statusCode = 500;
    message = 'Database validation error';
    code = 'DATABASE_VALIDATION_ERROR';
  }

  // Build error response
  const errorResponse: any = {
    success: false,
    error: {
      message,
      code,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    }
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = error.stack;

    // Add details if available
    if (error.details) {
      errorResponse.error.details = error.details;
    }
  }

  // Add rate limit info if available
  const rateLimitRemaining = res.get('X-RateLimit-Remaining');
  const rateLimitReset = res.get('X-RateLimit-Reset');
  if (rateLimitRemaining || rateLimitReset) {
    errorResponse.error.rateLimit = {
      remaining: rateLimitRemaining,
      reset: rateLimitReset
    };
  }

  // Handle specific status codes
  if (statusCode === 429) {
    res.set({
      'Retry-After': '60',
      'X-RateLimit-Limit': '100',
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': new Date(Date.now() + 60000).toISOString()
    });
  }

  res.status(statusCode).json(errorResponse);
};

// Async Error Wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Unhandled Promise Rejection Handler
export const handleUnhandledRejection = (reason: any, promise: Promise<any>): void => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);

  // Send to external monitoring service in production
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    // Send to Sentry or similar service
  }
};

// Uncaught Exception Handler
export const handleUncaughtException = (error: Error): void => {
  logger.error('Uncaught Exception:', error);

  // Send to external monitoring service in production
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    // Send to Sentry or similar service
  }

  process.exit(1);
};

// Graceful Shutdown Handler
export const createGracefulShutdown = (server: any) => {
  return (signal: string) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    server.close(async () => {
      logger.info('HTTP server closed.');

      try {
        // Cleanup resources
        await cleanupResources();
        logger.info('Resources cleaned up successfully.');
        process.exit(0);
      } catch (error) {
        logger.error('Error during cleanup:', error);
        process.exit(1);
      }
    });

    // Force close after 30 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
  };
};

// Cleanup resources
const cleanupResources = async (): Promise<void> => {
  // Close database connections
  // Close Redis connections
  // Close WebSocket connections
  // Close any other resources
  logger.info('All resources cleaned up');
};

// Health Check Error Handler
export const healthCheckErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // For health check endpoints, return simple error
  if (req.path === '/health' || req.path.startsWith('/api/health')) {
    res.status(500).json({
      status: 'error',
      message: 'Service unavailable',
      timestamp: new Date().toISOString()
    });
    return;
  }

  // For other endpoints, use production error handler
  productionErrorHandler(err, req, res, next);
};