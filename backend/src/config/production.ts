import dotenv from 'dotenv';

// Load production environment variables
dotenv.config({ path: '.env.production' });

// Production configuration
export const productionConfig = {
  // Application
  app: {
    name: 'Rabbit Launchpad',
    version: '1.0.0',
    env: process.env.NODE_ENV || 'production',
    port: parseInt(process.env.PORT || '3001', 10),
    apiVersion: process.env.API_VERSION || 'v1',
  },

  // Database
  database: {
    url: process.env.PRODUCTION_DATABASE_URL!,
    poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '20', 10),
    poolTimeout: parseInt(process.env.DATABASE_POOL_TIMEOUT || '30000', 10),
    sslMode: process.env.DATABASE_SSL_MODE || 'require',
    // Connection pool settings for production
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    maxUses: 7500,
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL!,
    clusterNodes: process.env.REDIS_CLUSTER_NODES?.split(','),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    // Redis settings for production
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
  },

  // Security
  security: {
    jwt: {
      secret: process.env.JWT_SECRET!,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      refreshSecret: process.env.JWT_REFRESH_SECRET!,
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      issuer: 'rabbit-launchpad',
      audience: 'rabbit-launchpad-users',
    },
    encryption: {
      key: process.env.ENCRYPTION_KEY!,
      algorithm: 'aes-256-gcm',
    },
    bcrypt: {
      rounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    },
    session: {
      secret: process.env.SESSION_SECRET!,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['https://yourdomain.com'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    },
  },

  // Rate Limiting
  rateLimiting: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    maxRequestsApi: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS_API || '1000', 10),
    maxRequestsToken: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS_TOKEN || '5', 10),
    maxRequestsTrading: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS_TRADING || '30', 10),
    maxRequestsUpload: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS_UPLOAD || '10', 10),
  },

  // Blockchain
  blockchain: {
    bsc: {
      rpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
      network: process.env.BSC_NETWORK || 'mainnet',
      chainId: parseInt(process.env.BSC_CHAIN_ID || '56', 10),
      blockConfirmations: 2,
      timeout: 30000,
    },
    contracts: {
      bondingCurve: process.env.BONDING_CURVE_ADDRESS,
      factory: process.env.FACTORY_ADDRESS,
      router: process.env.ROUTER_ADDRESS,
    },
    // Alchemy Integration
    alchemy: {
      apiKey: process.env.ALCHEMY_API_KEY!,
      network: process.env.ALCHEMY_NETWORK || 'bnb-mainnet',
      maxRetries: parseInt(process.env.ALCHEMY_MAX_RETRIES || '3', 10),
      timeout: parseInt(process.env.ALCHEMY_TIMEOUT || '30000', 10),
    },
    // Moralis Integration
    moralis: {
      apiKey: process.env.MORALIS_API_KEY!,
      webhookUrl: process.env.MORALIS_WEBHOOK_URL!,
      streamId: process.env.MORALIS_STREAM_ID,
      timeout: parseInt(process.env.MORALIS_TIMEOUT || '30000', 10),
    },
  },

  // File Upload
  upload: {
    dir: process.env.UPLOAD_DIR || '/app/uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'pdf'],
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
      folder: 'rabbit-launchpad',
    },
  },

  // Email
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    },
    from: {
      email: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
      name: process.env.FROM_NAME || 'Rabbit Launchpad',
    },
  },

  // Monitoring
  monitoring: {
    logLevel: process.env.LOG_LEVEL || 'info',
    sentry: {
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'production',
    },
    newRelic: {
      licenseKey: process.env.NEW_RELIC_LICENSE_KEY,
      appName: 'rabbit-launchpad-backend',
    },
    datadog: {
      apiKey: process.env.DATADOG_API_KEY,
      site: 'datadoghq.com',
    },
  },

  // Webhook
  webhook: {
    secret: process.env.WEBHOOK_SECRET!,
    timeout: parseInt(process.env.WEBHOOK_TIMEOUT || '30000', 10),
    retryAttempts: parseInt(process.env.WEBHOOK_RETRY_ATTEMPTS || '3', 10),
  },

  // Analytics
  analytics: {
    googleAnalytics: {
      id: process.env.GOOGLE_ANALYTICS_ID,
    },
    mixpanel: {
      token: process.env.MIXPANEL_TOKEN,
    },
  },

  // Backup
  backup: {
    schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10),
    s3: {
      bucket: process.env.BACKUP_S3_BUCKET!,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      region: process.env.AWS_REGION || 'us-east-1',
    },
  },

  // Performance
  performance: {
    cache: {
      ttl: parseInt(process.env.CACHE_TTL || '3600', 10), // 1 hour
    },
    server: {
      maxConnections: parseInt(process.env.MAX_CONNECTIONS || '1000', 10),
      timeout: parseInt(process.env.TIMEOUT || '30000', 10),
      keepAliveTimeout: parseInt(process.env.KEEP_ALIVE_TIMEOUT || '65000', 10),
      headersTimeout: parseInt(process.env.HEADERS_TIMEOUT || '66000', 10),
    },
  },

  // Monitoring Endpoints
  endpoints: {
    healthCheck: process.env.HEALTH_CHECK_ENDPOINT || '/health',
    metrics: process.env.METRICS_ENDPOINT || '/metrics',
    status: process.env.STATUS_ENDPOINT || '/status',
  },

  // Feature Flags
  features: {
    analytics: process.env.ENABLE_ANALYTICS === 'true',
    websockets: process.env.ENABLE_WEBSOCKETS === 'true',
    backgroundJobs: process.env.ENABLE_BACKGROUND_JOBS === 'true',
    rateLimiting: process.env.ENABLE_RATE_LIMITING === 'true',
    auditLogging: process.env.ENABLE_AUDIT_LOGGING === 'true',
  },

  // Social Media
  social: {
    twitter: {
      apiKey: process.env.TWITTER_API_KEY,
      apiSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    },
    discord: {
      webhookUrl: process.env.DISCORD_WEBHOOK_URL,
    },
  },

  // CDN
  cdn: {
    url: process.env.CDN_URL,
    staticUrl: process.env.STATIC_URL,
  },

  // External Services
  external: {
    ipfs: {
      gatewayUrl: process.env.IPFS_GATEWAY_URL || 'https://ipfs.io',
    },
    pinata: {
      apiKey: process.env.PINATA_API_KEY,
      secretKey: process.env.PINATA_SECRET_KEY,
    },
  },

  // Development overrides (should be false in production)
  development: {
    debug: process.env.DEBUG === 'true',
    verboseLogging: process.env.VERBOSE_LOGGING === 'true',
    enablePlayground: process.env.ENABLE_PLAYGROUND === 'true',
    enableIntrospection: process.env.ENABLE_INTROSPECTION === 'true',
  },
};

// Validation
export function validateProductionConfig(): void {
  const requiredEnvVars = [
    'PRODUCTION_DATABASE_URL',
    'JWT_SECRET',
    'ENCRYPTION_KEY',
    'SESSION_SECRET',
    'WEBHOOK_SECRET',
    'ALCHEMY_API_KEY',
    'MORALIS_API_KEY',
    'MORALIS_WEBHOOK_URL',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Validate secret lengths
  if (productionConfig.security.jwt.secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  if (productionConfig.security.encryption.key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
  }

  if (productionConfig.security.session.secret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters long');
  }

  // Validate database URL format
  if (!productionConfig.database.url.startsWith('postgresql://')) {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection string');
  }

  // Validate port ranges
  if (productionConfig.app.port < 1 || productionConfig.app.port > 65535) {
    throw new Error('PORT must be between 1 and 65535');
  }

  // Validate blockchain configuration
  if (!productionConfig.blockchain.contracts.bondingCurve) {
    throw new Error('BONDING_CURVE_ADDRESS is required');
  }

  console.log('✅ Production configuration validated successfully');
}

export default productionConfig;