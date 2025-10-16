# 📚 Rabbit Launchpad API Documentation

> **Complete REST API Reference for Rabbit Launchpad Platform**

## Overview

The Rabbit Launchpad API provides comprehensive access to all platform functionality including token creation, trading, analytics, and user management. This API follows RESTful principles and uses JSON for data exchange.

## Base URL

```
Development: http://localhost:3001/api
Production:  https://api.rabbit-launchpad.com/api
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

## API Endpoints

### 🔐 Authentication Endpoints

#### User Login
```http
POST /auth/login
```

**Request Body:**
```json
{
  "address": "0x742d35Cc6634C0532925a3b8D4C8b0a7e3b4c5f6",
  "signature": "0x...",
  "message": "Sign in to Rabbit Launchpad"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "address": "0x742d35Cc6634C0532925a3b8D4C8b0a7e3b4c5f6",
      "createdAt": "2024-01-15T10:30:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### User Registration
```http
POST /auth/register
```

**Request Body:**
```json
{
  "address": "0x742d35Cc6634C0532925a3b8D4C8b0a7e3b4c5f6",
  "signature": "0x...",
  "username": "john_doe",
  "email": "john@example.com"
}
```

#### Refresh Token
```http
POST /auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Logout
```http
DELETE /auth/logout
```

**Headers:** `Authorization: Bearer <token>`

### 🪙 Token Management

#### Get All Tokens
```http
GET /tokens
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `sortBy` (string): Sort field (createdAt, marketCap, price)
- `sortOrder` (string): asc or desc (default: desc)
- `status` (string): Filter by status (active, graduated, ended)

**Response:**
```json
{
  "success": true,
  "data": {
    "tokens": [
      {
        "address": "0x123...",
        "name": "Rabbit Token",
        "symbol": "RABBIT",
        "description": "Community driven token",
        "creator": "0x742d...",
        "createdAt": "2024-01-15T10:30:00Z",
        "status": "active",
        "marketCap": 50000,
        "price": 0.001,
        "holders": 150,
        "totalSupply": 1000000,
        "graduatedAt": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

#### Get Token Details
```http
GET /tokens/:address
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": {
      "address": "0x123...",
      "name": "Rabbit Token",
      "symbol": "RABBIT",
      "description": "Community driven token",
      "creator": "0x742d...",
      "createdAt": "2024-01-15T10:30:00Z",
      "status": "active",
      "marketCap": 50000,
      "price": 0.001,
      "holders": 150,
      "totalSupply": 1000000,
      "bondingCurve": {
        "buyFee": 0.01,
        "sellFee": 0.01,
        "graduationThreshold": 100000
      },
      "socials": {
        "twitter": "https://twitter.com/rabbittoken",
        "telegram": "https://t.me/rabbittoken",
        "website": "https://rabbittoken.com"
      }
    },
    "tradingHistory": [
      {
        "type": "buy",
        "amount": 1000,
        "price": 0.001,
        "timestamp": "2024-01-15T11:00:00Z",
        "txHash": "0xabc..."
      }
    ],
    "holders": [
      {
        "address": "0x742d...",
        "balance": 10000,
        "percentage": 1.0
      }
    ]
  }
}
```

#### Create New Token
```http
POST /tokens
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "My Awesome Token",
  "symbol": "AWESOME",
  "description": "The most awesome token ever",
  "imageUrl": "https://example.com/token-image.png",
  "socials": {
    "twitter": "https://twitter.com/mytoken",
    "telegram": "https://t.me/mytoken",
    "website": "https://mytoken.com"
  },
  "bondingCurve": {
    "buyFee": 0.01,
    "sellFee": 0.01,
    "graduationThreshold": 100000
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": {
      "address": "0x456...",
      "name": "My Awesome Token",
      "symbol": "AWESOME",
      "status": "pending",
      "transactionHash": "0xdef..."
    }
  }
}
```

#### Update Token Information
```http
PUT /tokens/:address
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "description": "Updated description",
  "imageUrl": "https://example.com/new-image.png",
  "socials": {
    "twitter": "https://twitter.com/mytoken-updated"
  }
}
```

### 💰 Trading Endpoints

#### Get Trading History
```http
GET /trades
```

**Query Parameters:**
- `token` (string): Filter by token address
- `user` (string): Filter by user address
- `type` (string): buy or sell
- `page` (number): Page number
- `limit` (number): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "trades": [
      {
        "id": "trade_123",
        "token": "0x123...",
        "user": "0x742d...",
        "type": "buy",
        "amount": 1000,
        "price": 0.001,
        "total": 1.0,
        "fee": 0.01,
        "timestamp": "2024-01-15T11:00:00Z",
        "txHash": "0xabc..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1000
    }
  }
}
```

#### Execute Trade
```http
POST /trades
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "token": "0x123...",
  "type": "buy",
  "amount": 1000,
  "maxPrice": 0.002,
  "slippage": 0.01
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "trade": {
      "id": "trade_456",
      "token": "0x123...",
      "type": "buy",
      "amount": 1000,
      "price": 0.001,
      "total": 1.0,
      "fee": 0.01,
      "timestamp": "2024-01-15T12:00:00Z",
      "txHash": "0xxyz..."
    },
    "transaction": {
      "hash": "0xxyz...",
      "status": "pending",
      "gasUsed": "21000"
    }
  }
}
```

### 📊 Analytics Endpoints

#### Platform Overview
```http
GET /analytics/overview
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalTokens": 250,
    "activeTokens": 180,
    "graduatedTokens": 45,
    "totalTrades": 15000,
    "totalVolume": 2500000,
    "totalUsers": 5000,
    "activeUsers": 1200,
    "marketStats": {
      "totalMarketCap": 10000000,
      "avgMarketCap": 40000,
      "topGainer": {
        "token": "0x123...",
        "change": 250
      },
      "topLoser": {
        "token": "0x456...",
        "change": -45
      }
    },
    "periodStats": {
      "daily": {
        "newTokens": 5,
        "newTrades": 500,
        "volume": 50000
      },
      "weekly": {
        "newTokens": 35,
        "newTrades": 3500,
        "volume": 350000
      },
      "monthly": {
        "newTokens": 150,
        "newTrades": 15000,
        "volume": 1500000
      }
    }
  }
}
```

#### Token Analytics
```http
GET /analytics/tokens
```

**Query Parameters:**
- `token` (string): Specific token address
- `period` (string): 1h, 24h, 7d, 30d (default: 24h)

**Response:**
```json
{
  "success": true,
  "data": {
    "tokens": [
      {
        "address": "0x123...",
        "name": "Rabbit Token",
        "currentPrice": 0.001,
        "priceChange": {
          "1h": 2.5,
          "24h": 15.8,
          "7d": 45.2,
          "30d": 120.5
        },
        "volume": {
          "1h": 1000,
          "24h": 25000,
          "7d": 175000,
          "30d": 750000
        },
        "trades": {
          "1h": 25,
          "24h": 500,
          "7d": 3500,
          "30d": 15000
        },
        "liquidity": 50000,
        "holders": 150,
        "marketCap": 50000
      }
    ]
  }
}
```

#### User Analytics
```http
GET /analytics/users
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "userStats": {
      "totalTrades": 250,
      "totalVolume": 5000,
      "winRate": 65.5,
      "avgHoldingTime": "2d 14h",
      "topTokens": [
        {
          "token": "0x123...",
          "trades": 50,
          "profit": 500
        }
      ],
      "portfolio": {
        "totalValue": 10000,
        "tokens": 15,
        "pnl": 2500,
        "pnlPercentage": 25.0
      }
    },
    "tradingHistory": [
      {
        "token": "0x123...",
        "type": "buy",
        "amount": 1000,
        "price": 0.001,
        "timestamp": "2024-01-15T10:00:00Z",
        "pnl": 100
      }
    ]
  }
}
```

### 🚨 Error Tracking & Monitoring

#### Get Error Logs
```http
GET /errors
```

**Headers:** `Authorization: Bearer <token> (Admin only)`

**Query Parameters:**
- `severity` (string): low, medium, high, critical
- `category` (string): validation, authentication, database, etc.
- `page` (number): Page number
- `limit` (number): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "errors": [
      {
        "id": "error_123",
        "message": "Database connection failed",
        "severity": "high",
        "category": "database",
        "stackTrace": "...",
        "userAgent": "Mozilla/5.0...",
        "ip": "192.168.1.1",
        "userId": "user_456",
        "timestamp": "2024-01-15T10:30:00Z",
        "resolved": false
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 100
    }
  }
}
```

#### Report Error
```http
POST /errors
```

**Request Body:**
```json
{
  "message": "API request failed",
  "severity": "medium",
  "category": "api",
  "context": {
    "endpoint": "/tokens",
    "method": "GET",
    "statusCode": 500,
    "userId": "user_123"
  }
}
```

#### Get System Metrics
```http
GET /metrics
```

**Headers:** `Authorization: Bearer <token> (Admin only)`

**Response:**
```json
{
  "success": true,
  "data": {
    "system": {
      "uptime": "5d 12h 30m",
      "cpu": 45.2,
      "memory": 68.5,
      "disk": 75.8
    },
    "database": {
      "connections": 15,
      "queriesPerSecond": 125,
      "avgResponseTime": 25,
      "slowQueries": 2
    },
    "cache": {
      "hitRate": 94.5,
      "memoryUsage": 512,
      "keys": 10000
    },
    "api": {
      "requestsPerMinute": 500,
      "avgResponseTime": 150,
      "errorRate": 0.5,
      "activeConnections": 50
    }
  }
}
```

## WebSocket API

### Connection

Connect to the WebSocket server at:

```
Development: ws://localhost:8081
Production:  wss://ws.rabbit-launchpad.com
```

### Authentication

Send authentication message after connecting:

```json
{
  "type": "auth",
  "token": "your-jwt-token"
}
```

### Subscriptions

#### Subscribe to Token Updates
```json
{
  "type": "subscribe",
  "channel": "token",
  "params": {
    "address": "0x123..."
  }
}
```

#### Subscribe to Trade Updates
```json
{
  "type": "subscribe",
  "channel": "trades",
  "params": {
    "token": "0x123..."
  }
}
```

#### Subscribe to Platform Updates
```json
{
  "type": "subscribe",
  "channel": "platform"
}
```

### Message Formats

#### Token Price Update
```json
{
  "type": "token_update",
  "data": {
    "address": "0x123...",
    "price": 0.001,
    "marketCap": 50000,
    "volume24h": 25000,
    "timestamp": "2024-01-15T12:00:00Z"
  }
}
```

#### Trade Execution
```json
{
  "type": "trade",
  "data": {
    "id": "trade_123",
    "token": "0x123...",
    "type": "buy",
    "amount": 1000,
    "price": 0.001,
    "timestamp": "2024-01-15T12:00:00Z"
  }
}
```

## Error Handling

### Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": {
      "field": "address",
      "reason": "Invalid Ethereum address format"
    },
    "timestamp": "2024-01-15T12:00:00Z",
    "requestId": "req_123"
  }
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error occurred |

### Common Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Input validation failed |
| `AUTHENTICATION_REQUIRED` | JWT token required |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions |
| `RESOURCE_NOT_FOUND` | Requested resource does not exist |
| `RATE_LIMIT_EXCEEDED` | API rate limit exceeded |
| `INSUFFICIENT_BALANCE` | Insufficient balance for transaction |
| `SLIPPAGE_EXCEEDED` | Trade slippage exceeded limit |
| `TOKEN_INACTIVE` | Token is not active for trading |
| `NETWORK_ERROR` | Network connectivity issue |
| `DATABASE_ERROR` | Database operation failed |

## Rate Limiting

### Rate Limits by Endpoint

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Authentication | 5 requests | 1 minute |
| Token Creation | 3 requests | 1 hour |
| Trading | 60 requests | 1 minute |
| Read Operations | 1000 requests | 1 minute |
| Analytics | 100 requests | 1 minute |

### Rate Limit Headers

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1642248600
```

## SDKs & Libraries

### JavaScript/TypeScript

```bash
npm install @rabbit-launchpad/sdk
```

```typescript
import { RabbitLaunchpadAPI } from '@rabbit-launchpad/sdk';

const api = new RabbitLaunchpadAPI({
  baseURL: 'http://localhost:3001/api',
  token: 'your-jwt-token'
});

// Get all tokens
const tokens = await api.tokens.getAll();

// Create a new token
const token = await api.tokens.create({
  name: 'My Token',
  symbol: 'MTK',
  description: 'My awesome token'
});
```

### Python

```bash
pip install rabbit-launchpad-sdk
```

```python
from rabbit_launchpad import RabbitLaunchpadAPI

api = RabbitLaunchpadAPI(
    base_url='http://localhost:3001/api',
    token='your-jwt-token'
)

# Get all tokens
tokens = api.tokens.get_all()

# Create a new token
token = api.tokens.create(
    name='My Token',
    symbol='MTK',
    description='My awesome token'
)
```

## Testing

### API Testing with Postman

Import the Postman collection from `docs/postman-collection.json` to test all endpoints.

### curl Examples

```bash
# Get all tokens
curl -X GET "http://localhost:3001/api/tokens" \
  -H "Authorization: Bearer your-jwt-token"

# Create a new token
curl -X POST "http://localhost:3001/api/tokens" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "name": "My Token",
    "symbol": "MTK",
    "description": "My awesome token"
  }'

# Execute a trade
curl -X POST "http://localhost:3001/api/trades" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "token": "0x123...",
    "type": "buy",
    "amount": 1000
  }'
```

## Changelog

### v1.0.0 (Current)
- Initial API release
- Complete token management functionality
- Trading and analytics endpoints
- WebSocket real-time updates
- Comprehensive error handling

### Upcoming Features
- Advanced analytics endpoints
- Batch operations
- GraphQL API
- Enhanced filtering and search

## Support

For API support and questions:

- 📧 **Email**: api-support@rabbit-launchpad.com
- 💬 **Discord**: [API Support Channel](https://discord.gg/rabbit-api)
- 📖 **Documentation**: [docs.rabbit-launchpad.com](https://docs.rabbit-launchpad.com)
- 🐛 **Report Issues**: [GitHub Issues](https://github.com/rabbit-launchpad/api/issues)

---

**© 2024 Rabbit Launchpad. All rights reserved.**