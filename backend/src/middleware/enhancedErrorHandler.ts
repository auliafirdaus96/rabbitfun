import { Request, Response, NextFunction } from 'express';
import { Prisma } from '../generated/prisma';
import logger from '../utils/logger';
import { errorTrackingService, createErrorContext, ErrorCategory, ErrorSeverity } from '../services/errorTrackingService';

// Custom error classes
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly category: ErrorCategory;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.category = category;
    this.context = context;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public readonly details: string[];

  constructor(message: string, details: string[] = []) {
    super(message, 400, ErrorCategory.VALIDATION);
    this.details = details;
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, ErrorCategory.AUTHENTICATION);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, ErrorCategory.AUTHORIZATION);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, ErrorCategory.BUSINESS_LOGIC);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, ErrorCategory.BUSINESS_LOGIC);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(message, 500, ErrorCategory.DATABASE);
  }
}

export class ExternalAPIError extends AppError {
  constructor(message: string = 'External API error') {
    super(message, 502, ErrorCategory.EXTERNAL_API);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, ErrorCategory.SYSTEM);
  }
}

// Error response formatter
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string[];
    context?: Record<string, any>;
  };
  timestamp: string;
  requestId?: string;
  path?: string;
}

class EnhancedErrorHandler {
  private isDevelopment = process.env.NODE_ENV === 'development';

  // Main error handler middleware
  async handle(error: Error, req: Request, res: Response, next: NextFunction) {
    const requestId = req.headers['x-request-id'] as string;
    const startTime = Date.now();

    try {
      // Track the error
      const errorContext = createErrorContext(req, {
        statusCode: this.getStatusCode(error),
        processingTime: Date.now() - startTime
      });

      const errorId = await errorTrackingService.trackError(error, errorContext);

      // Format and send response
      const errorResponse = this.formatErrorResponse(error, errorId, req);

      res.status(errorResponse.statusCode).json(errorResponse.body);

      // Log error details
      this.logError(error, errorContext, errorId);

    } catch (handlingError) {
      // Fallback if error handling itself fails
      logger.error('Error in error handler:', handlingError);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  // Determine appropriate status code for error
  private getStatusCode(error: Error): number {
    if (error instanceof AppError) {
      return error.statusCode;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          return 409; // Unique constraint violation
        case 'P2025':
          return 404; // Record not found
        case 'P2003':
          return 400; // Foreign key constraint violation
        default:
          return 400;
      }
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return 400;
    }

    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      return 500;
    }

    if (error.name === 'ValidationError') {
      return 400;
    }

    if (error.name === 'JsonWebTokenError') {
      return 401;
    }

    if (error.name === 'TokenExpiredError') {
      return 401;
    }

    if (error.name === 'CastError') {
      return 400;
    }

    return 500;
  }

  // Format error response
  private formatErrorResponse(error: Error, errorId: string, req: Request) {
    const statusCode = this.getStatusCode(error);
    const requestId = req.headers['x-request-id'] as string;

    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: this.getErrorCode(error),
        message: this.getErrorMessage(error),
        ...(error instanceof ValidationError && { details: error.details }),
        ...(error instanceof AppError && error.context && { context: error.context })
      },
      timestamp: new Date().toISOString(),
      ...(requestId && { requestId }),
      path: req.path
    };

    // Include stack trace in development
    if (this.isDevelopment && error.stack) {
      (errorResponse.error as any).stack = error.stack;
    }

    return {
      statusCode,
      body: errorResponse
    };
  }

  // Get error code for response
  private getErrorCode(error: Error): string {
    if (error instanceof AppError) {
      return error.constructor.name.toUpperCase().replace('ERROR', '_ERROR');
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return `PRISMA_${error.code}`;
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return 'PRISMA_VALIDATION_ERROR';
    }

    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      return 'PRISMA_UNKNOWN_ERROR';
    }

    if (error.name === 'ValidationError') {
      return 'VALIDATION_ERROR';
    }

    if (error.name === 'JsonWebTokenError') {
      return 'JWT_ERROR';
    }

    if (error.name === 'TokenExpiredError') {
      return 'TOKEN_EXPIRED';
    }

    if (error.name === 'CastError') {
      return 'CAST_ERROR';
    }

    return 'INTERNAL_ERROR';
  }

  // Get user-friendly error message
  private getErrorMessage(error: Error): string {
    if (error instanceof AppError) {
      return error.message;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          return 'A record with this value already exists.';
        case 'P2025':
          return 'The requested record was not found.';
        case 'P2003':
          return 'Referenced record does not exist.';
        default:
          return 'A database error occurred.';
      }
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return 'Invalid data provided.';
    }

    if (error.name === 'ValidationError') {
      return error.message;
    }

    if (error.name === 'JsonWebTokenError') {
      return 'Invalid authentication token.';
    }

    if (error.name === 'TokenExpiredError') {
      return 'Authentication token has expired.';
    }

    if (error.name === 'CastError') {
      return 'Invalid data format.';
    }

    // In production, don't expose internal error messages
    if (!this.isDevelopment) {
      return 'An internal error occurred. Please try again later.';
    }

    return error.message;
  }

  // Log error with appropriate level
  private logError(error: Error, context: any, errorId: string) {
    const logData = {
      errorId,
      context,
      stack: error.stack,
      statusCode: this.getStatusCode(error)
    };

    const statusCode = this.getStatusCode(error);

    if (statusCode >= 500) {
      logger.error('Server Error:', error, logData);
    } else if (statusCode >= 400) {
      logger.warn('Client Error:', error, logData);
    } else {
      logger.info('Error:', error, logData);
    }
  }

  // Async error wrapper for route handlers
  asyncHandler(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  // Validation error helper
  createValidationError(message: string, details: string[] = []) {
    return new ValidationError(message, details);
  }

  // Database error helper
  createDatabaseError(error: any, message?: string) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          return new ConflictError('A record with this value already exists.');
        case 'P2025':
          return new NotFoundError('The requested record was not found.');
        case 'P2003':
          return new ValidationError('Referenced record does not exist.');
        default:
          return new DatabaseError(message || 'Database operation failed.');
      }
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return new ValidationError('Invalid data provided.');
    }

    return new DatabaseError(message || 'Database operation failed.');
  }

  // External API error helper
  createExternalAPIError(error: any, serviceName?: string) {
    const message = serviceName
      ? `${serviceName} service error: ${error.message}`
      : `External API error: ${error.message}`;

    return new ExternalAPIError(message);
  }
}

export const enhancedErrorHandler = new EnhancedErrorHandler();

// Express middleware
export const errorHandler = enhancedErrorHandler.handle.bind(enhancedErrorHandler);

// Async handler wrapper
export const asyncHandler = enhancedErrorHandler.asyncHandler.bind(enhancedErrorHandler);

// Validation error helper
export const createValidationError = enhancedErrorHandler.createValidationError.bind(enhancedErrorHandler);

// Database error helper
export const createDatabaseError = enhancedErrorHandler.createDatabaseError.bind(enhancedErrorHandler);

// External API error helper
export const createExternalAPIError = enhancedErrorHandler.createExternalAPIError.bind(enhancedErrorHandler);

// Common error creators
export const notFoundError = (message = 'Resource not found') => new NotFoundError(message);
export const unauthorizedError = (message = 'Unauthorized') => new AuthenticationError(message);
export const forbiddenError = (message = 'Access denied') => new AuthorizationError(message);
export const conflictError = (message = 'Resource conflict') => new ConflictError(message);
export const rateLimitError = (message = 'Rate limit exceeded') => new RateLimitError(message);

export default enhancedErrorHandler;