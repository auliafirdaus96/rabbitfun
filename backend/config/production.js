const path = require('path');

module.exports = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3001,
    host: process.env.HOST || '0.0.0.0',
    cors: {
      origin: process.env.FRONTEND_URL || 'https://ahiru-launchpad.com',
      credentials: true
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    }
  },

  // Database Configuration
  database: {
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ahiru-production',
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferMaxEntries: 0,
        bufferCommands: false
      }
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      db: 0,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    }
  },

  // Blockchain Configuration
  blockchain: {
    bsc: {
      rpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/',
      rpcBackup: process.env.BSC_RPC_BACKUP || 'https://bsc-dataseed1.defibit.io/',
      chainId: 56,
      blockTime: 3000,
      gasMultiplier: 1.2,
      maxRetries: 3,
      retryDelay: 1000
    },
    contracts: {
      tokenAddress: process.env.AHIRU_TOKEN_ADDRESS,
      launchpadAddress: process.env.AHIRU_LAUNCHPAD_ADDRESS
    },
    web3Config: {
      transactionConfirmationBlocks: 1,
      transactionPollingTimeout: 750,
      defaultBlock: 'latest'
    }
  },

  // Security Configuration
  security: {
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: '7d',
      algorithm: 'HS256'
    },
    apiKeys: {
      bscScan: process.env.BSCSCAN_API_KEY,
      coinGecko: process.env.COINGECKO_API_KEY,
      moralis: process.env.MORALIS_API_KEY
    },
    encryption: {
      algorithm: 'aes-256-gcm',
      keyLength: 32,
      ivLength: 16,
      saltLength: 32,
      tagLength: 16
    }
  },

  // Analytics Configuration
  analytics: {
    tracking: {
      enabled: true,
      batchSize: 100,
      flushInterval: 30000, // 30 seconds
      retentionDays: 365
    },
    events: [
      'token_created',
      'token_purchased',
      'token_sold',
      'wallet_connected',
      'transaction_completed',
      'transaction_failed',
      'user_registered',
      'user_active'
    ]
  },

  // Monitoring Configuration
  monitoring: {
    enabled: true,
    metrics: {
      collection: true,
      interval: 60000, // 1 minute
      retention: '7d'
    },
    healthCheck: {
      enabled: true,
      interval: 30000, // 30 seconds
      endpoints: [
        '/health',
        '/api/v1/status',
        '/api/v1/blockchain/status'
      ]
    },
    alerts: {
      email: {
        enabled: true,
        smtp: {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          secure: true,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        },
        from: process.env.ALERT_EMAIL_FROM,
        to: process.env.ALERT_EMAIL_TO?.split(',')
      },
      discord: {
        enabled: true,
        webhookUrl: process.env.DISCORD_WEBHOOK_URL
      },
      telegram: {
        enabled: true,
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_CHAT_ID
      }
    }
  },

  // Caching Configuration
  caching: {
    redis: {
      enabled: true,
      defaultTTL: 300, // 5 minutes
      maxKeys: 10000,
      strategies: {
        tokens: { ttl: 600 },      // 10 minutes
        prices: { ttl: 60 },       // 1 minute
        analytics: { ttl: 1800 },  // 30 minutes
        users: { ttl: 3600 }       // 1 hour
      }
    }
  },

  // WebSocket Configuration
  websocket: {
    enabled: true,
    port: process.env.WS_PORT || 3002,
    cors: {
      origin: process.env.FRONTEND_URL || 'https://ahiru-launchpad.com',
      methods: ['GET', 'POST']
    },
    heartbeat: {
      interval: 30000,
      timeout: 5000
    },
    rooms: {
      maxUsers: 1000,
      cleanupInterval: 300000 // 5 minutes
    }
  },

  // File Upload Configuration
  upload: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    storage: {
      type: 's3', // or 'local'
      s3: {
        bucket: process.env.AWS_S3_BUCKET,
        region: process.env.AWS_REGION,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    }
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json',
    transports: [
      {
        type: 'console',
        colorize: false,
        timestamp: true
      },
      {
        type: 'file',
        filename: 'logs/app.log',
        maxSize: '100m',
        maxFiles: 10,
        datePattern: 'YYYY-MM-DD'
      },
      {
        type: 'file',
        filename: 'logs/error.log',
        level: 'error',
        maxSize: '100m',
        maxFiles: 10,
        datePattern: 'YYYY-MM-DD'
      }
    ]
  },

  // Performance Configuration
  performance: {
    compression: true,
    helmet: true,
    cluster: {
      enabled: true,
      workers: 'auto'
    },
    memory: {
      maxOldSpaceSize: 2048
    }
  }
};