import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';
import path from 'path';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Rabbit Launchpad API',
      version: '1.0.0',
      description: `
        ## 🐰 Rabbit Launchpad API Documentation

        Comprehensive API for token creation, trading, and management on the Rabbit Launchpad platform.

        ### Features
        - 🚀 Token creation with bonding curves
        - 💱 Secure trading operations
        - 📊 Analytics and insights
        - 🔐 Authentication and authorization
        - 📱 Real-time WebSocket connections
        - 🎯 Rate limiting and security

        ### Base URL
        - **Development**: \`http://localhost:3001/api\`
        - **Production**: \`https://api.rabbitlaunchpad.com/api\`

        ### Authentication
        Most endpoints require JWT authentication. Include the token in the Authorization header:
        \`Authorization: Bearer <your-jwt-token>\`

        ### Rate Limiting
        - Global: 100 requests per 15 minutes
        - API endpoints: 1000 requests per 15 minutes
        - Token creation: 5 per hour per user
        - Trading: 30 per minute per user

        ### WebSocket
        Connect to: \`ws://localhost:8081\` for real-time updates
      `,
      contact: {
        name: 'Rabbit Launchpad Team',
        email: 'support@rabbitlaunchpad.com',
        url: 'https://rabbitlaunchpad.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      },
      termsOfService: 'https://rabbitlaunchpad.com/terms'
    },
    servers: [
      {
        url: 'http://localhost:3001/api',
        description: 'Development server',
      },
      {
        url: 'https://api.rabbitlaunchpad.com/api',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token obtained from authentication endpoint'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['id', 'address', 'createdAt'],
          properties: {
            id: {
              type: 'string',
              description: 'Unique user identifier',
              example: 'usr_1234567890'
            },
            address: {
              type: 'string',
              description: 'Blockchain wallet address',
              example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'
            },
            username: {
              type: 'string',
              description: 'Optional username',
              example: 'rabbit_trader'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Optional email address',
              example: 'user@example.com'
            },
            role: {
              type: 'string',
              enum: ['user', 'admin'],
              description: 'User role',
              example: 'user'
            },
            isVerified: {
              type: 'boolean',
              description: 'Whether the user is verified',
              example: true
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            }
          }
        },
        Token: {
          type: 'object',
          required: ['id', 'address', 'name', 'symbol', 'creator', 'createdAt'],
          properties: {
            id: {
              type: 'string',
              description: 'Unique token identifier',
              example: 'tok_1234567890'
            },
            address: {
              type: 'string',
              description: 'Token contract address',
              example: '0x1234567890123456789012345678901234567890'
            },
            name: {
              type: 'string',
              description: 'Token name',
              example: 'Rabbit Token'
            },
            symbol: {
              type: 'string',
              description: 'Token symbol',
              example: 'RABBIT'
            },
            description: {
              type: 'string',
              description: 'Token description',
              example: 'A fun token for the Rabbit Launchpad community'
            },
            creator: {
              type: 'string',
              description: 'Creator wallet address',
              example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'
            },
            image: {
              type: 'string',
              format: 'uri',
              description: 'Token image URL',
              example: 'https://example.com/token-image.png'
            },
            totalSupply: {
              type: 'string',
              description: 'Total token supply',
              example: '1000000000000000000000000000'
            },
            soldSupply: {
              type: 'string',
              description: 'Tokens already sold',
              example: '500000000000000000000000000'
            },
            currentPrice: {
              type: 'string',
              description: 'Current token price in BNB',
              example: '0.00000001'
            },
            marketCap: {
              type: 'string',
              description: 'Current market cap in BNB',
              example: '5.0'
            },
            raisedAmount: {
              type: 'string',
              description: 'Total amount raised in BNB',
              example: '2.5'
            },
            isGraduated: {
              type: 'boolean',
              description: 'Whether token has graduated to DEX',
              example: false
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Token creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            }
          }
        },
        ApiResponse: {
          type: 'object',
          required: ['success', 'message'],
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the operation was successful',
              example: true
            },
            message: {
              type: 'string',
              description: 'Response message',
              example: 'Operation completed successfully'
            },
            data: {
              type: 'object',
              description: 'Response data payload'
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'Error code',
                  example: 'VALIDATION_ERROR'
                },
                message: {
                  type: 'string',
                  description: 'Error message',
                  example: 'Invalid input parameters'
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'string'
                  },
                  description: 'Error details',
                  example: ['Name is required', 'Symbol must be 3-10 characters']
                }
              }
            },
            pagination: {
              type: 'object',
              properties: {
                page: {
                  type: 'integer',
                  description: 'Current page number',
                  example: 1
                },
                limit: {
                  type: 'integer',
                  description: 'Items per page',
                  example: 20
                },
                total: {
                  type: 'integer',
                  description: 'Total number of items',
                  example: 150
                },
                totalPages: {
                  type: 'integer',
                  description: 'Total number of pages',
                  example: 8
                }
              }
            }
          }
        },
        CreateTokenRequest: {
          type: 'object',
          required: ['name', 'symbol', 'description'],
          properties: {
            name: {
              type: 'string',
              minLength: 3,
              maxLength: 50,
              description: 'Token name (3-50 characters)',
              example: 'Rabbit Token'
            },
            symbol: {
              type: 'string',
              minLength: 3,
              maxLength: 10,
              pattern: '^[A-Z]+$',
              description: 'Token symbol (3-10 uppercase letters)',
              example: 'RABBIT'
            },
            description: {
              type: 'string',
              maxLength: 500,
              description: 'Token description (max 500 characters)',
              example: 'A fun token for the Rabbit Launchpad community'
            },
            image: {
              type: 'string',
              format: 'uri',
              description: 'Optional token image URL',
              example: 'https://example.com/token-image.png'
            },
            twitter: {
              type: 'string',
              description: 'Optional Twitter handle',
              example: '@rabbitlaunchpad'
            },
            telegram: {
              type: 'string',
              description: 'Optional Telegram group',
              example: 'https://t.me/rabbitlaunchpad'
            },
            website: {
              type: 'string',
              format: 'uri',
              description: 'Optional website URL',
              example: 'https://rabbitlaunchpad.com'
            }
          }
        },
        BuyTokenRequest: {
          type: 'object',
          required: ['amount'],
          properties: {
            amount: {
              type: 'string',
              pattern: '^[0-9]+(\\.[0-9]+)?$',
              description: 'Amount of BNB to spend',
              example: '0.1'
            },
            minTokens: {
              type: 'string',
              description: 'Minimum tokens to receive (slippage protection)',
              example: '10000000000000000000000'
            },
            deadline: {
              type: 'integer',
              description: 'Transaction deadline (Unix timestamp)',
              example: 1640995200
            }
          }
        },
        SellTokenRequest: {
          type: 'object',
          required: ['amount'],
          properties: {
            amount: {
              type: 'string',
              pattern: '^[0-9]+$',
              description: 'Amount of tokens to sell (in wei)',
              example: '10000000000000000000000'
            },
            minBNB: {
              type: 'string',
              description: 'Minimum BNB to receive (slippage protection)',
              example: '0.09'
            },
            deadline: {
              type: 'integer',
              description: 'Transaction deadline (Unix timestamp)',
              example: 1640995200
            }
          }
        },
        Transaction: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Transaction ID',
              example: 'txn_1234567890'
            },
            hash: {
              type: 'string',
              description: 'Blockchain transaction hash',
              example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
            },
            type: {
              type: 'string',
              enum: ['buy', 'sell', 'create'],
              description: 'Transaction type',
              example: 'buy'
            },
            tokenAddress: {
              type: 'string',
              description: 'Token contract address',
              example: '0x1234567890123456789012345678901234567890'
            },
            userAddress: {
              type: 'string',
              description: 'User wallet address',
              example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'
            },
            amount: {
              type: 'string',
              description: 'Transaction amount',
              example: '0.1'
            },
            price: {
              type: 'string',
              description: 'Token price at time of transaction',
              example: '0.00000001'
            },
            gasUsed: {
              type: 'string',
              description: 'Gas used for transaction',
              example: '21000'
            },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'failed'],
              description: 'Transaction status',
              example: 'confirmed'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Transaction timestamp'
            }
          }
        },
        Analytics: {
          type: 'object',
          properties: {
            totalTokens: {
              type: 'integer',
              description: 'Total number of tokens created',
              example: 150
            },
            totalVolume: {
              type: 'string',
              description: 'Total trading volume in BNB',
              example: '1250.5'
            },
            activeUsers: {
              type: 'integer',
              description: 'Number of active users',
              example: 2500
            },
            totalRaised: {
              type: 'string',
              description: 'Total amount raised in BNB',
              example: '890.25'
            },
            topTokens: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Token'
              },
              description: 'Top performing tokens'
            },
            dailyStats: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: {
                    type: 'string',
                    format: 'date',
                    description: 'Date'
                  },
                  volume: {
                    type: 'string',
                    description: 'Daily volume'
                  },
                  tokens: {
                    type: 'integer',
                    description: 'Tokens created'
                  },
                  users: {
                    type: 'integer',
                    description: 'Active users'
                  }
                }
              },
              description: 'Daily statistics'
            }
          }
        },
        Error: {
          type: 'object',
          required: ['error', 'message', 'timestamp'],
          properties: {
            error: {
              type: 'string',
              description: 'Error type',
              example: 'ValidationError'
            },
            message: {
              type: 'string',
              description: 'Error message',
              example: 'Invalid input parameters'
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    description: 'Field with error'
                  },
                  message: {
                    type: 'string',
                    description: 'Error message for field'
                  }
                }
              },
              description: 'Detailed error information'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Error timestamp'
            },
            requestId: {
              type: 'string',
              description: 'Request ID for tracking',
              example: 'req_1234567890'
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'UnauthorizedError',
                message: 'Invalid or expired authentication token',
                timestamp: '2023-12-01T10:00:00Z',
                requestId: 'req_1234567890'
              }
            }
          }
        },
        RateLimitError: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'RateLimitError',
                message: 'Too many requests. Please try again later.',
                timestamp: '2023-12-01T10:00:00Z',
                requestId: 'req_1234567890'
              }
            }
          },
          headers: {
            'X-RateLimit-Limit': {
              description: 'Rate limit period',
              schema: {
                type: 'integer'
              }
            },
            'X-RateLimit-Remaining': {
              description: 'Remaining requests',
              schema: {
                type: 'integer'
              }
            },
            'X-RateLimit-Reset': {
              description: 'Rate limit reset timestamp',
              schema: {
                type: 'integer'
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'ValidationError',
                message: 'Invalid input parameters',
                details: [
                  {
                    field: 'name',
                    message: 'Name is required and must be 3-50 characters'
                  },
                  {
                    field: 'symbol',
                    message: 'Symbol must be 3-10 uppercase letters'
                  }
                ],
                timestamp: '2023-12-01T10:00:00Z',
                requestId: 'req_1234567890'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'NotFoundError',
                message: 'Token not found',
                timestamp: '2023-12-01T10:00:00Z',
                requestId: 'req_1234567890'
              }
            }
          }
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'InternalServerError',
                message: 'An unexpected error occurred',
                timestamp: '2023-12-01T10:00:00Z',
                requestId: 'req_1234567890'
              }
            }
          }
        }
      }
    },
    apis: [
      path.join(__dirname, '../routes/*.ts'),
      path.join(__dirname, '../controllers/*.ts'),
      path.join(__dirname, '../server.ts'),
    ],
  },
  apis: [
    path.join(__dirname, '../routes/*.ts'),
    path.join(__dirname, '../controllers/*.ts'),
    path.join(__dirname, '../server.ts'),
  ],
};

export const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Application) => {
  // Swagger UI configuration
  const swaggerUiOptions = {
    explorer: true,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      docExpansion: 'none',
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
      tryItOutEnabled: true,
    },
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0 }
      .swagger-ui .scheme-container { margin: 20px 0 }
      .swagger-ui .opblock.opblock-post { border-color: #49cc90; }
      .swagger-ui .opblock.opblock-get { border-color: #61affe; }
      .swagger-ui .opblock.opblock-put { border-color: #fca130; }
      .swagger-ui .opblock.opblock-delete { border-color: #f93e3e; }
      .swagger-ui .opblock.opblock-patch { border-color: #50e3c2; }
    `,
    customSiteTitle: 'Rabbit Launchpad API Documentation',
    customfavIcon: '/favicon.ico',
  };

  // Serve API documentation
  app.use('/api-docs', swaggerUi.serve);
  app.get('/api-docs.json', swaggerUi.setup(specs, swaggerUiOptions));

  // API docs endpoint
  app.get('/api', (req, res) => {
    res.json({
      name: 'Rabbit Launchpad API',
      version: '1.0.0',
      description: 'Complete API documentation available at /api-docs',
      endpoints: {
        documentation: '/api-docs',
        health: '/health',
        auth: '/api/auth',
        tokens: '/api/tokens',
        analytics: '/api/analytics',
        users: '/api/users',
        portfolio: '/api/portfolio',
        notifications: '/api/notifications',
        admin: '/api/admin',
        webhooks: '/api/webhooks',
        blockchain: '/api/blockchain/health'
      },
      rateLimits: {
        global: '100 requests per 15 minutes',
        api: '1000 requests per 15 minutes',
        tokenCreation: '5 per hour per user',
        trading: '30 per minute per user'
      },
      webSocket: {
        url: 'ws://localhost:8081',
        description: 'Real-time updates and notifications'
      },
      support: {
        email: 'support@rabbitlaunchpad.com',
        docs: 'https://docs.rabbitlaunchpad.com',
        github: 'https://github.com/rabbitlaunchpad/rabbit-launchpad'
      }
    });
  });
};

export default setupSwagger;