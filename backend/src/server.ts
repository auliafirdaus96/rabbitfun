import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import logger from './utils/logger';
import { connectRedis } from './config/redis';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { databaseService } from './services/databaseService';
import contractIntegrationService from './services/contractIntegrationService';
import BlockchainService from './services/blockchainService';
import WebhookController from './controllers/webhookController';
import { setupSwagger } from './config/swagger';

// Import rate limiting middleware
import {
  globalLimiter,
  apiLimiter,
  tokenCreationLimiter,
  tradingLimiter,
  analyticsLimiter,
  uploadLimiter,
  checkRateLimitHeaders,
  createUserTierLimiter
} from './middleware/rateLimiter';

// Import routes
import tokenRoutes from './routes/tokenRoutes';
import userRoutes from './routes/userRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import webhookRoutes from './routes/webhookRoutes';
import bondingCurveRoutes from './routes/bondingCurveRoutes';
import contractRoutes from './routes/contractRoutes';
import authRoutes from './routes/authRoutes';
import portfolioRoutes from './routes/portfolioRoutes';
import notificationRoutes from './routes/notificationRoutes';
import adminRoutes from './routes/adminRoutes';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Export app for testing
export { app, server };

// Export database service for use in routes
export { databaseService };

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(compression());

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:8080', 'http://localhost:8081', 'http://localhost:8082', 'http://localhost:8083'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply global rate limiting
app.use('/api', globalLimiter);

// Add rate limit headers checker
app.use(checkRateLimitHeaders);

// Request logging with rate limit context
app.use((req, res, next) => {
  const rateLimitRemaining = res.get('X-RateLimit-Remaining');
  const rateLimitReset = res.get('X-RateLimit-Reset');

  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    rateLimitRemaining,
    rateLimitReset
  });
  next();
});

// Health check endpoint (no rate limiting)
app.get('/health', async (_req, res) => {
  try {
    // Check blockchain services status
    const blockchainStatus = await blockchainService.validateConnection();

    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      services: {
        database: 'connected',
        redis: 'connected',
        blockchain: {
          alchemy: blockchainStatus.alchemy ? 'connected' : 'disconnected',
          moralis: blockchainStatus.moralis ? 'connected' : 'disconnected'
        }
      },
      rateLimits: {
        global: '100 requests per 15 minutes',
        api: '1000 requests per 15 minutes',
        tokenCreation: '5 per hour per user',
        trading: '30 per minute per user'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Initialize Blockchain Service
const blockchainService = new BlockchainService();

// API Routes with specific rate limiting
app.use('/api/auth', apiLimiter, authRoutes);
app.use('/api/users', apiLimiter, userRoutes);
app.use('/api/portfolio', apiLimiter, portfolioRoutes);
app.use('/api/notifications', apiLimiter, notificationRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);
app.use('/api/tokens', apiLimiter, tokenRoutes);
app.use('/api/analytics', analyticsLimiter, analyticsRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/bonding-curve', tradingLimiter, bondingCurveRoutes);
app.use('/api/contract', apiLimiter, contractRoutes);

// Blockchain endpoints
app.get('/api/blockchain/health', async (req, res) => {
  try {
    const status = await blockchainService.validateConnection();
    res.status(200).json({
      status: 'healthy',
      blockchain: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Moralis webhook endpoint (no rate limiting)
app.post('/webhooks/moralis', WebhookController.handleMoralisWebhook);
app.get('/webhooks/health', WebhookController.handleHealthCheck);
app.get('/webhooks/stats', WebhookController.getWebhookStats);

// Upload endpoints with specific rate limiting
app.use('/api/upload', uploadLimiter);

// Setup API documentation
setupSwagger(app);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'Rabbit Launchpad Backend API',
    version: '1.0.0',
    status: 'Running',
    timestamp: new Date().toISOString(),
    documentation: '/api-docs',
    endpoints: {
      health: '/health',
      api: '/api',
      docs: '/api-docs',
      blockchain: '/api/blockchain/health',
      auth: '/api/auth',
      users: '/api/users',
      tokens: '/api/tokens',
      portfolio: '/api/portfolio',
      analytics: '/api/analytics',
      notifications: '/api/notifications',
      admin: '/api/admin'
    }
  });
});

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed.');

    try {
      // Shutdown contract integration service
      await contractIntegrationService.shutdown();
      logger.info('Contract integration service shut down.');

      await databaseService.disconnect();
      logger.info('Database disconnected.');

      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const startServer = async () => {
  try {
    // Test database connection (non-blocking for development)
    try {
      await databaseService.healthCheck();
      logger.info('Database connected successfully.');
    } catch (dbError) {
      logger.warn('Database connection failed, continuing in degraded mode:', dbError);
      logger.info('Server will start without database connection. Some features may be limited.');
    }

    // Connect to Redis (only if enabled)
    if (process.env.REDIS_ENABLED === 'true') {
      try {
        await connectRedis();
        logger.info('Redis connected successfully.');
      } catch (redisError) {
        logger.warn('Redis connection failed, continuing without caching:', redisError);
        logger.info('Server will start without Redis. Caching features will be disabled.');
      }
    } else {
      logger.info('Redis is disabled. Skipping Redis connection.');
    }

    // Initialize contract integration service
    // await contractIntegrationService.initialize();
    // logger.info('Contract integration service initialized successfully.');

    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`API Documentation: http://localhost:${PORT}/api`);
      logger.info(`WebSocket Server: ws://localhost:${process.env.WS_PORT || 8081}`);
      logger.info('Contract integration services are active');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});