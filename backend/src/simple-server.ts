import express from 'express';
import cors from 'cors';
import logger from './utils/logger';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Contract health check endpoint
app.get('/api/contract/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'contract-service',
    timestamp: new Date().toISOString(),
    message: 'Backend server is running successfully',
    features: {
      contractIntegration: true,
      websocketSupport: true,
      eventProcessing: true,
      realTimeUpdates: true
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Rabbit Launchpad Backend API',
    version: '1.0.0',
    status: 'Running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      contractHealth: '/api/contract/health',
      websocket: 'ws://localhost:8081'
    }
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Simple server is running on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`Contract health: http://localhost:${PORT}/api/contract/health`);
  logger.info(`WebSocket Server: ws://localhost:${process.env.WS_PORT || 8081}`);
});

export default app;