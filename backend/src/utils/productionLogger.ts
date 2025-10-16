import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for console output
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Custom format for production
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const logObject = {
      timestamp,
      level,
      message,
      stack,
      ...meta
    };

    return JSON.stringify(logObject);
  })
);

// Custom format for development
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;

    // Add stack trace if available
    if (stack) {
      log += `\n${stack}`;
    }

    // Add metadata if available
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }

    return log;
  })
);

// Create base logger configuration
const createLogger = () => {
  const transports: winston.transport[] = [];

  // Console transport for all environments
  transports.push(
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
      level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')
    })
  );

  // File transports for production
  if (process.env.NODE_ENV === 'production') {
    // Ensure log directory exists
    const logDir = process.env.LOG_FILE_PATH ? path.dirname(process.env.LOG_FILE_PATH) : './logs';

    // Daily rotating file for all logs
    transports.push(
      new DailyRotateFile({
        filename: path.join(logDir, 'application-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: productionFormat,
        level: 'info'
      })
    );

    // Daily rotating file for errors only
    transports.push(
      new DailyRotateFile({
        filename: path.join(logDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        format: productionFormat,
        level: 'error'
      })
    );
  }

  return winston.createLogger({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    levels,
    format: process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
    transports,
    exitOnError: false
  });
};

// Create logger instance
const logger = createLogger();

// Production-specific logging utilities
export const productionLogger = {
  // Standard logging methods
  error: (message: string, meta?: any) => {
    logger.error(message, {
      service: 'rabbit-launchpad-backend',
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      ...meta
    });
  },

  warn: (message: string, meta?: any) => {
    logger.warn(message, {
      service: 'rabbit-launchpad-backend',
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      ...meta
    });
  },

  info: (message: string, meta?: any) => {
    logger.info(message, {
      service: 'rabbit-launchpad-backend',
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      ...meta
    });
  },

  debug: (message: string, meta?: any) => {
    logger.debug(message, {
      service: 'rabbit-launchpad-backend',
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      ...meta
    });
  },

  // HTTP request logging
  http: (message: string, meta?: any) => {
    logger.http(message, {
      service: 'rabbit-launchpad-backend',
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      ...meta
    });
  },

  // Security event logging
  security: (event: string, meta?: any) => {
    logger.warn(`SECURITY: ${event}`, {
      service: 'rabbit-launchpad-backend',
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      type: 'security',
      ...meta
    });
  },

  // Performance logging
  performance: (operation: string, duration: number, meta?: any) => {
    logger.info(`PERFORMANCE: ${operation} completed in ${duration}ms`, {
      service: 'rabbit-launchpad-backend',
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      type: 'performance',
      operation,
      duration,
      ...meta
    });
  },

  // Database operation logging
  database: (operation: string, meta?: any) => {
    logger.debug(`DATABASE: ${operation}`, {
      service: 'rabbit-launchpad-backend',
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      type: 'database',
      operation,
      ...meta
    });
  },

  // Contract interaction logging
  contract: (operation: string, meta?: any) => {
    logger.info(`CONTRACT: ${operation}`, {
      service: 'rabbit-launchpad-backend',
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      type: 'contract',
      operation,
      ...meta
    });
  },

  // WebSocket connection logging
  websocket: (event: string, meta?: any) => {
    logger.debug(`WEBSOCKET: ${event}`, {
      service: 'rabbit-launchpad-backend',
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      type: 'websocket',
      event,
      ...meta
    });
  },

  // API error logging
  apiError: (error: Error, req: any, meta?: any) => {
    logger.error(`API Error: ${error.message}`, {
      service: 'rabbit-launchpad-backend',
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      type: 'api_error',
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
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
      user: req.user?.id || 'anonymous',
      ...meta
    });
  },

  // Business event logging
  business: (event: string, meta?: any) => {
    logger.info(`BUSINESS: ${event}`, {
      service: 'rabbit-launchpad-backend',
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      type: 'business',
      event,
      ...meta
    });
  },

  // External service logging
  external: (service: string, operation: string, meta?: any) => {
    logger.info(`EXTERNAL: ${service} - ${operation}`, {
      service: 'rabbit-launchpad-backend',
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      type: 'external',
      externalService: service,
      operation,
      ...meta
    });
  }
};

// Express middleware for request logging
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();

  // Log request
  productionLogger.http(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user?.id || 'anonymous'
  });

  // Capture response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'error' : 'http';

    productionLogger[level](`${req.method} ${req.url} ${res.statusCode} - ${duration}ms`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      user: req.user?.id || 'anonymous',
      statusCode: res.statusCode,
      duration,
      contentLength: res.get('Content-Length')
    });
  });

  next();
};

// Health check logging
export const healthLogger = {
  log: (component: string, status: 'up' | 'down', details?: any) => {
    const level = status === 'up' ? 'info' : 'error';
    logger[level](`HEALTH: ${component} is ${status}`, {
      service: 'rabbit-launchpad-backend',
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      type: 'health',
      component,
      status,
      details
    });
  }
};

export default productionLogger;