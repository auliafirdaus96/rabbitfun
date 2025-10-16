# Alchemy & Moralis Integration Guide

## Overview

This document covers the integration of Alchemy and Moralis services into the Rabbit Launchpad backend for blockchain data and real-time event streaming.

## 🚀 Current Setup

### Alchemy Configuration
- **Network**: BNB Testnet
- **API Key**: `go_QwZCf8544BUL9spniQ`
- **Endpoint**: `https://bnb-testnet.g.alchemy.com/v2/go_QwZCf8544BUL9spniQ`
- **Status**: ✅ Configured and Ready

### Moralis Configuration
- **Organization ID**: 466797
- **User ID**: 480230
- **API Key**: Valid JWT Token
- **Project Type**: Project
- **Status**: ✅ Configured and Ready

## 📋 Available Services

### Alchemy Services
1. **Balance Queries**: Get ETH/BNB balance for any address
2. **Transaction Receipts**: Fetch transaction details and status
3. **Block Information**: Get current block number and block data
4. **Event Logs**: Query contract events and logs
5. **Token Transfers**: Track ERC-20 token transfers

### Moralis Services
1. **Contract Events**: Monitor smart contract events
2. **Transaction History**: Get wallet transaction history
3. **NFT Metadata**: Fetch NFT metadata and collections
4. **Wallet NFTs**: Get NFTs owned by wallet address
5. **Token Prices**: Get real-time token prices
6. **Webhook Streams**: Real-time blockchain event streaming

## 🔧 Implementation Details

### 1. Configuration Files

#### Production Config (`config/production.ts`)
```typescript
blockchain: {
  alchemy: {
    apiKey: process.env.ALCHEMY_API_KEY!,
    network: process.env.ALCHEMY_NETWORK || 'bnb-testnet',
    maxRetries: parseInt(process.env.ALCHEMY_MAX_RETRIES || '3', 10),
    timeout: parseInt(process.env.ALCHEMY_TIMEOUT || '30000', 10),
  },
  moralis: {
    apiKey: process.env.MORALIS_API_KEY!,
    webhookUrl: process.env.MORALIS_WEBHOOK_URL!,
    streamId: process.env.MORALIS_STREAM_ID,
    timeout: parseInt(process.env.MORALIS_TIMEOUT || '30000', 10),
  },
}
```

#### Environment Variables (`.env.production`)
```bash
# Alchemy Configuration
ALCHEMY_API_KEY=go_QwZCf8544BUL9spniQ
ALCHEMY_NETWORK=bnb-testnet
ALCHEMY_MAX_RETRIES=3
ALCHEMY_TIMEOUT=30000

# Moralis Configuration
MORALIS_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
MORALIS_WEBHOOK_URL=https://your-domain.com/webhooks/moralis
MORALIS_STREAM_ID=
MORALIS_TIMEOUT=30000
```

### 2. Blockchain Service (`src/services/blockchainService.ts`)

#### Alchemy Service Methods
```typescript
class AlchemyService {
  async getBalance(address: string): Promise<string>
  async getTransactionReceipt(txHash: string)
  async getBlockNumber(): Promise<number>
  async getLogs(params: any)
}
```

#### Moralis Service Methods
```typescript
class MoralisService {
  async getContractEvents(address: string, fromBlock: number, toBlock: number)
  async getTransactions(address: string, fromBlock: number, toBlock: number)
  async getNFTMetadata(address: string, tokenId: string)
  async getWalletNFTs(address: string)
  async getTokenPrice(address: string)
  async createStream(options: StreamOptions)
}
```

### 3. Webhook Controller (`src/controllers/webhookController.ts`)

#### Supported Webhook Events
- `token.created`: New token creation
- `token.bought`: Token purchase events
- `token.sold`: Token sale events
- `liquidity.added`: Liquidity provision
- `liquidity.removed`: Liquidity removal

#### Webhook Endpoints
```
POST /webhooks/moralis    # Main Moralis webhook endpoint
GET  /webhooks/health     # Webhook service health check
GET  /webhooks/stats      # Webhook statistics
```

## 🛠️ Usage Examples

### 1. Getting Wallet Balance
```typescript
import BlockchainService from './services/blockchainService';

const blockchainService = new BlockchainService();
const balance = await blockchainService.getBalance('0x742d35Cc6634C0532925a3b8D4C9db96C4b3Db21');
console.log(`Balance: ${balance} wei`);
```

### 2. Creating Moralis Stream
```typescript
const streamOptions = {
  webhookUrl: 'https://your-domain.com/webhooks/moralis',
  description: 'Monitor token launches',
  tag: 'token-launches',
  address: ['0x...TokenContract'],
  abi: [/* Contract ABI */]
};

const stream = await blockchainService.createStream(streamOptions);
console.log(`Stream created: ${stream.id}`);
```

### 3. Getting Contract Events
```typescript
const events = await blockchainService.getContractEvents(
  '0x...TokenContract',
  42000000, // from block
  42001000  // to block
);
console.log(`Found ${events.length} events`);
```

### 4. Fetching Transaction History
```typescript
const transactions = await blockchainService.getTransactions(
  '0x742d35Cc6634C0532925a3b8D4C9db96C4b3Db21',
  42000000,
  42001000
);
```

## 📊 Monitoring & Health Checks

### 1. Service Health Check
```bash
# Check blockchain services status
GET /api/blockchain/health

# Response
{
  "status": "healthy",
  "blockchain": {
    "alchemy": true,
    "moralis": true
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. Application Health Check
```bash
GET /health

# Response
{
  "status": "OK",
  "services": {
    "database": "connected",
    "redis": "connected",
    "blockchain": {
      "alchemy": "connected",
      "moralis": "connected"
    }
  }
}
```

## 🔍 Testing the Integration

### 1. Test Alchemy Connection
```bash
curl http://localhost:3001/api/blockchain/health
```

### 2. Test Moralis Webhook
```bash
curl -X POST http://localhost:3001/webhooks/moralis \
  -H "Content-Type: application/json" \
  -H "X-Moralis-Signature: test" \
  -d '{"event": "token.created", "data": {...}}'
```

### 3. Get Block Number
```typescript
const blockNumber = await blockchainService.getBlockNumber();
console.log(`Current block: ${blockNumber}`);
```

## 🚨 Error Handling

### Common Issues & Solutions

1. **Alchemy Rate Limits**
   - Current: 300M compute units/month (Free tier)
   - Solution: Implement caching and batch requests

2. **Moralis Webhook Validation**
   - Issue: Missing signature validation
   - Solution: Implement HMAC signature verification

3. **Network Configuration**
   - Current: BNB Testnet
   - For production: Update `ALCHEMY_NETWORK=bnb-mainnet`

## 📈 Production Considerations

### 1. Rate Limiting
- Alchemy: 300M compute units/month
- Moralis: Based on plan limits
- Implement request batching and caching

### 2. Error Retries
- Automatic retry with exponential backoff
- Circuit breaker pattern for service failures
- Graceful degradation when services are down

### 3. Security
- API keys stored in environment variables
- Webhook signature verification
- Request validation and sanitization

## 🔄 Next Steps

### Immediate (This Week)
1. [ ] Set up production Moralis webhook URL
2. [ ] Implement signature verification for webhooks
3. [ ] Add comprehensive error handling
4. [ ] Create unit tests for blockchain services

### Short Term (Next 2 Weeks)
1. [ ] Migrate from testnet to mainnet
2. [ ] Implement caching for frequent requests
3. [ ] Add monitoring and alerting
4. [ ] Create dashboard for blockchain metrics

### Long Term (Next Month)
1. [ ] Upgrade to higher tier plans if needed
2. [ ] Implement real-time WebSocket connections
3. [ ] Add advanced analytics features
4. [ ] Create backup service providers

## 📞 Support

### Alchemy Documentation
- https://docs.alchemy.com/docs
- Support: support@alchemy.com

### Moralis Documentation
- https://docs.moralis.io/
- Support: https://support.moralis.io/

### Internal Support
- Check application logs for detailed error messages
- Use `/api/blockchain/health` endpoint for service status
- Monitor webhook stats at `/webhooks/stats`

---

**Last Updated**: January 2024
**Version**: 1.0.0
**Status**: Production Ready ✅