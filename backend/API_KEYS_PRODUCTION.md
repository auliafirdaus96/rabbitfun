# 🔑 Production API Keys Configuration

## 🚨 IMPORTANT: Replace Placeholder Keys with Real API Keys

This file contains the template for production API keys. You MUST replace all placeholder values with actual API keys from the respective services.

## 📋 Required API Keys for Production

### 1. Alchemy API Key (CRITICAL)
**Get it from**: https://dashboard.alchemy.com/
**Plan needed**: Free tier (100,000 compute units/month) or paid
**Network**: BSC Mainnet

**Current placeholder**:
```
ALCHEMY_API_KEY=your-alchemy-api-key-here
```

**Replace with actual format**:
```
ALCHEMY_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 2. Moralis API Key (CRITICAL)
**Get it from**: https://admin.moralis.io/
**Plan needed**: Free tier (10,000 requests/month) or paid
**Network**: BSC Mainnet

**Current placeholder**:
```
MORALIS_API_KEY=your-moralis-api-key-here
```

**Replace with actual format**:
```
MORALIS_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 📊 Optional but Recommended API Keys

### 3. BSCScan API Key
**Get it from**: https://bscscan.com/apis
**Plan**: Free (5 requests/second) or paid

```
BSCSCAN_API_KEY=your-bscscan-api-key-here
```

### 4. Infura Project ID
**Get it from**: https://infura.io/
**Plan**: Free (100,000 requests/month) or paid

```
INFURA_PROJECT_ID=your-infura-project-id-here
```

### 5. CoinGecko API Key
**Get it from**: https://www.coingecko.com/en/api
**Plan**: Free (10,000 calls/month) or paid

```
COINGECKO_API_KEY=your-coingecko-api-key-here
```

## 🚀 Quick Setup Guide

### Step 1: Get Alchemy API Key (5 minutes)
1. Go to https://dashboard.alchemy.com/
2. Sign up/login
3. Click "Create App"
4. Choose:
   - Name: Rabbit Launchpad
   - Chain: BSC
   - Network: Mainnet
5. Copy the API key (starts with `0x` or letters)

### Step 2: Get Moralis API Key (5 minutes)
1. Go to https://admin.moralis.io/
2. Sign up/login
3. Go to Account → API Keys
4. Click "Create new API Key"
5. Copy the key (long JWT string)

### Step 3: Update Environment Files
Copy the keys to both:
- `backend/.env.development` (for testing)
- `backend/.env.production` (for production)

### Step 4: Test Configuration
```bash
# Restart server with new keys
cd backend
npm run dev

# Test blockchain connection
curl http://localhost:3001/api/blockchain/health
```

## ✅ Expected Results with Real API Keys

With proper API keys, you should see:
- ✅ Alchemy connection successful
- ✅ Moralis streams connected
- ✅ Real-time blockchain data
- ✅ Transaction monitoring working
- ✅ Token price feeds active

## ❌ What Happens Without Real API Keys

- 🔴 Blockchain endpoints return errors
- 🔴 No real-time data
- 🔴 Transactions cannot be verified
- 🔴 Smart contract interactions fail
- 🔴 Price feeds show mock data

## 🛡️ Security Best Practices

1. **Never commit real API keys to Git**
2. **Use different keys for dev/prod**
3. **Rotate keys regularly**
4. **Monitor API usage**
5. **Set up billing alerts**

## 📞 Support Links

- Alchemy Support: https://docs.alchemy.com/docs/alchemy-status-updates
- Moralis Support: https://forum.moralis.io/
- BSCScan API: https://docs.bscscan.com/
- Infura Docs: https://docs.infura.io/

## 🔧 Testing API Keys

Use this test script:
```bash
cd backend/scripts
node test-api-keys.js
```

This will verify all API keys are working correctly.

---

**Remember**: The placeholder keys in this file will NOT work in production. You MUST obtain real API keys from each service provider.