# 🔑 API Keys Setup Guide

## 📋 Overview

This guide will help you set up the necessary API keys for Rabbit Launchpad backend to function properly with blockchain integration.

## 🚨 Required API Keys

### 1. **Alchemy API Key** (HIGH PRIORITY)
**Purpose**: Blockchain data provider for BSC network
**Required for**: Block number fetching, transaction monitoring, contract interactions

#### How to Get Alchemy API Key:
1. Go to [https://dashboard.alchemy.com/](https://dashboard.alchemy.com/)
2. Sign up / Login
3. Create a new app
4. Select "Blockchain" → "BSC" (Binance Smart Chain)
5. Choose network: "Mainnet" or "Testnet"
6. Copy the API key
7. Add to `.env.development`:
   ```
   ALCHEMY_API_KEY=your-alchemy-api-key-here
   ```

### 2. **Moralis API Key** (HIGH PRIORITY)
**Purpose**: Web3 APIs and streams for blockchain data
**Required for**: Real-time blockchain events, DeFi data, NFT data

#### How to Get Moralis API Key:
1. Go to [https://admin.moralis.io/](https://admin.moralis.io/)
2. Sign up / Login
3. Go to "Account" → "API Keys"
4. Create a new API key
5. Copy the API key
6. Add to `.env.development`:
   ```
   MORALIS_API_KEY=your-moralis-api-key-here
   ```

## 📊 Optional API Keys (Enhanced Features)

### 3. **BSCScan API Key**
**Purpose**: BSC blockchain explorer API
**Required for**: Transaction verification, contract details, token information

#### How to Get BSCScan API Key:
1. Go to [https://bscscan.com/apis](https://bscscan.com/apis)
2. Sign up / Login
3. Create a free API key
4. Add to `.env.development`:
   ```
   BSCSCAN_API_KEY=your-bscscan-api-key-here
   ```

### 4. **CoinGecko API Key**
**Purpose**: Cryptocurrency price data
**Required for**: Token prices, market data, price charts

#### How to Get CoinGecko API Key:
1. Go to [https://www.coingecko.com/en/api](https://www.coingecko.com/en/api)
2. Sign up for a free account
3. Get your free API key (100 calls/month free)
4. Add to `.env.development`:
   ```
   COINGECKO_API_KEY=your-coingecko-api-key-here
   ```

### 5. **Infura Project ID**
**Purpose**: Alternative blockchain infrastructure provider
**Required for**: Backup RPC endpoints, enhanced reliability

#### How to Get Infura Project ID:
1. Go to [https://infura.io/](https://infura.io/)
2. Sign up / Login
3. Create a new project
4. Select "Web3 API" → "BSC"
5. Copy the Project ID
6. Add to `.env.development`:
   ```
   INFURA_PROJECT_ID=your-infura-project-id-here
   ```

## 🧪 Quick Setup for Development

If you want to get started quickly without all API keys, you can use mock configuration:

```bash
# For immediate testing with mock data
ALCHEMY_API_KEY=demo-key-for-testing
MORALIS_API_KEY=demo-key-for-testing
```

## ✅ Verification Steps

After setting up API keys, verify they work:

### 1. Check Health Endpoint
```bash
curl http://localhost:3001/health
```
Look for:
```json
{
  "services": {
    "blockchain": {
      "alchemy": "connected",
      "moralis": "connected"
    }
  }
}
```

### 2. Test Blockchain Connection
```bash
curl http://localhost:3001/api/blockchain/health
```

### 3. Check Server Logs
Look for these messages in server logs:
- ✅ "Alchemy connection successful"
- ✅ "Moralis connection successful"
- ✅ "Blockchain services initialized"

## 🔧 Troubleshooting

### Common Issues:

1. **"Must be authenticated!" Error**
   - Cause: Invalid or missing Alchemy API key
   - Solution: Verify Alchemy API key is correct and active

2. **"ENOTFOUND api.moralis.io" Error**
   - Cause: Missing or invalid Moralis API key
   - Solution: Check Moralis API key and internet connection

3. **Rate Limit Errors**
   - Cause: Too many API calls
   - Solution: Wait and retry, or upgrade API plan

4. **Network Connection Issues**
   - Cause: Firewall or network restrictions
   - Solution: Check internet connection and firewall settings

## 📞 Support

If you encounter issues:
1. Check the server logs for detailed error messages
2. Verify API keys are correctly copied (no extra spaces)
3. Ensure API keys are for the correct network (BSC Mainnet/Testnet)
4. Check API key usage limits and billing status

## 🔄 Next Steps

After API keys are set up:
1. Restart the development server
2. Test all blockchain endpoints
3. Verify smart contract interactions
4. Run the full test suite

---

**Security Note**: Never commit actual API keys to version control. Always use environment variables.