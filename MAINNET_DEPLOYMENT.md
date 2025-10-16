# 🚀 Smart Contract Mainnet Deployment Guide

## 📋 Prerequisites

### **Requirements:**
- **BNB Balance**: 0.1 BNB for gas fees
- **BSC Wallet**: MetaMask or Trust Wallet
- **Development Environment**: Node.js + Hardhat
- **Network Access**: BSC Mainnet RPC

### **Cost Estimates:**
- **Gas Fees**: ~0.05 BNB (~$15-20)
- **Contract Verification**: Free (via BscScan)
- **Total**: ~$20-30

## 🔧 Configuration Setup

### 1. Environment Configuration
```bash
# Copy environment template
cp .env.production.example .env.production

# Edit mainnet configuration
nano .env.production
```

### 2. Mainnet Environment Variables
```bash
# BSC Mainnet Configuration
BSC_NETWORK=mainnet
BSC_RPC_URL=https://bsc-dataseed1.binance.org
BSC_CHAIN_ID=56
BSC_EXPLORER=https://bscscan.com

# Private Key (DEPLOYER_WALLET_PRIVATE_KEY)
DEPLOYER_PRIVATE_KEY=your_private_key_here

# Contract Configuration
INITIAL_SUPPLY=1000000000000000000000000000
TARGET_RAISE=35000000000000000000
CREATE_FEE=5000000000000000
```

### 3. Security Setup
```bash
# Secure environment file
chmod 600 .env.production
chown $USER:$USER .env.production

# Never commit .env.production to git
echo ".env.production" >> .gitignore
```

## 📦 Smart Contract Deployment

### 1. Compile Contracts
```bash
cd smartcontract

# Install dependencies
npm install

# Compile contracts
npm run compile

# Run tests
npm run test
```

### 2. Deploy to BSC Mainnet
```bash
# Deploy launchpad contract
npm run deploy:mainnet

# Expected output:
# 🎯 RabbitLaunchpad deployed to: 0x1234567890abcdef1234567890abcdef12345678
# ✅ Contract verified on BscScan
# 📊 Deployment completed successfully
```

### 3. Contract Verification
```bash
# Automatic verification (recommended)
npm run verify:mainnet

# Manual verification (if automatic fails)
npx hardhat verify --network mainnet 0xCONTRACT_ADDRESS

# BscScan verification URL:
# https://bscscan.com/address/0xCONTRACT_ADDRESS#code
```

## 🔍 Post-Deployment Checklist

### ✅ **Contract Verification**
- [ ] Contract source code verified on BscScan
- [ ] Constructor parameters visible
- [ ] Read functions accessible
- [ ] Contract interaction working

### ✅ **Frontend Integration**
```bash
# Update frontend contract addresses
nano frontend/src/constants/contracts.ts

# Update environment variables
nano frontend/.env.production

# Redeploy frontend
cd frontend
vercel --prod
```

### ✅ **Backend Integration**
```bash
# Update backend contract addresses
nano backend/src/config/contracts.ts

# Update environment variables
nano backend/.env.production

# Update RPC URLs for mainnet
BSC_RPC_URL=https://bsc-dataseed1.binance.org
```

## 📊 Contract Configuration

### **RabbitLaunchpad Contract**
```javascript
// Mainnet deployment parameters
const config = {
  INITIAL_PRICE: "10000000000", // 0.00000001 BNB
  TOTAL_SUPPLY: "1000000000000000000000000000", // 1B tokens
  TARGET_SUPPLY: "800000000000000000000000000", // 800M tokens
  CREATE_FEE: "5000000000000000", // 0.005 BNB
  GROSS_RAISE_TARGET: "35000000000000000000", // 35 BNB
  PLATFORM_FEE_PERCENT: 100, // 1%
  CREATOR_FEE_PERCENT: 25, // 0.25%
};
```

### **Contract Addresses (After Deployment)**
```javascript
// Update these values after deployment
export const CONTRACT_ADDRESSES = {
  mainnet: {
    launchpad: "0xCONTRACT_ADDRESS_HERE",
    rabbitToken: "0xRABBIT_TOKEN_ADDRESS_HERE",
  },
  testnet: {
    launchpad: "0xTESTNET_ADDRESS_HERE",
    rabbitToken: "0xTESTNET_RABBIT_ADDRESS_HERE",
  }
};
```

## 🔐 Security Considerations

### **Security Checklist**
- ✅ **Private Key Security**: Store securely, never share
- ✅ **Contract Ownership**: Transfer to multisig or company wallet
- ✅ **Pause Functionality**: Test emergency pause mechanisms
- ✅ **Fee Distribution**: Verify fee recipients are correct
- ✅ **Graduation Logic**: Test DEX liquidity pool creation

### **Post-Deployment Security**
```bash
# Transfer ownership (if needed)
npx hardhat run scripts/transfer-ownership.js --network mainnet

# Set up timelock (for governance)
npx hardhat run scripts/setup-timelock.js --network mainnet

# Verify pause functionality
npx hardhat run scripts/test-pause.js --network mainnet
```

## 📈 Monitoring & Analytics

### **BscScan Integration**
- **Contract URL**: https://bscscan.com/address/0xCONTRACT_ADDRESS
- **Token Tracker**: Set up for created tokens
- **Event Monitoring**: Monitor all contract events
- **Transaction Tracking**: Track all buy/sell transactions

### **Real-time Monitoring**
```bash
# Set up event listeners
cd backend
npm run start:production

# Monitor contract events
npm run monitor:events

# Track transaction metrics
npm run monitor:transactions
```

## 🚨 Emergency Procedures

### **Emergency Pause**
```bash
# Pause contract (emergency only)
npx hardhat run scripts/emergency-pause.js --network mainnet

# Unpause contract
npx hardhat run scripts/emergency-unpause.js --network mainnet
```

### **Emergency Withdraw**
```bash
# Emergency withdrawal (if needed)
npx hardhat run scripts/emergency-withdraw.js --network mainnet
```

## 📞 Support & Maintenance

### **Contract Maintenance**
- **Monitor Gas Prices**: Optimize deployment timing
- **Track Performance**: Monitor contract usage
- **Update Documentation**: Keep all addresses current
- **Backup Private Keys**: Store securely offline

### **Regular Tasks**
- **Monitor Contract Balance**: Check collected fees
- **Review Transaction Volume**: Track platform usage
- **Update Frontend**: Ensure all data is accurate
- **Security Audits**: Regular security reviews

## 🎯 Investor Presentation Benefits

### **Key Selling Points**
- ✅ **Live on BSC Mainnet**: Real deployment, not testnet
- ✅ **Verified Contracts**: Transparent code on BscScan
- ✅ **Real Transactions**: Actual buy/sell functionality
- ✅ **Working Platform**: End-to-end functionality
- ✅ **Professional Setup**: Security best practices

### **Demo Scenarios**
1. **Token Creation**: Create new token on mainnet
2. **Bonding Curve**: Show real price mechanics
3. **Trading**: Execute real buy/sell transactions
4. **Graduation**: Demonstrate DEX liquidity creation
5. **Fee Distribution**: Show platform revenue

## 🚀 Next Steps

1. **Deploy to BSC Mainnet**: Follow this guide
2. **Update Frontend**: Point to mainnet contracts
3. **Test Full Flow**: Verify all functionality
4. **Prepare Demo**: Create investor demo scenarios
5. **Documentation**: Update all documentation

---

**⚠️ Warning: This involves real cryptocurrency transactions. Test thoroughly on testnet before mainnet deployment.**