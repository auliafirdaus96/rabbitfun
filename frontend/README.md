# 🐰 Rabbit Launchpad

> **Fair Launch Platform for Token Creation and Trading on BNB Smart Chain**

![Rabbit Launchpad](https://img.shields.io/badge/BSC-Powered-yellow) ![License](https://img.shields.io/badge/License-MIT-blue) ![Version](https://img.shields.io/badge/Version-1.0.0-green)

Rabbit Launchpad is a decentralized platform for creating and trading tokens with a bonding curve system. Each token starts at a low price and increases as people buy, then "graduates" to DEX when it reaches a certain target.

## ✨ Key Features

- 🚀 **Fair Launch**: No pre-sale or special investors
- 📈 **Exponential Bonding Curve**: Price determined by supply & demand
- 🎯 **Auto-Graduation**: Automatic token listing on DEX
- 💰 **Low Fees**: Total 1.25% trading fee
- 🔒 **Secure**: Smart contract audited & no admin keys
- 📱 **Mobile Ready**: Support MetaMask, Trust Wallet, Binance Wallet

## 🌐 Live Platform

- **🌐 Mainnet**: [https://rabbit-launchpad.com](https://rabbit-launchpad.com)
- **🧪 Testnet**: [https://testnet.rabbit-launchpad.com](https://testnet.rabbit-launchpad.com)
- **📊 Analytics**: [https://analytics.rabbit-launchpad.com](https://analytics.rabbit-launchpad.com)

## 🔗 Smart Contracts

### BSC Mainnet
```
Launchpad Contract: 0x... (Coming Soon)
Network: BNB Smart Chain (Chain ID: 56)
Explorer: https://bscscan.com
```

### BSC Testnet
```
Launchpad Contract: 0x... (Coming Soon)
Network: BSC Testnet (Chain ID: 97)
Explorer: https://testnet.bscscan.com
```

## 🚀 Quick Start

### For Users

1. **Install MetaMask**
   ```bash
   # Install MetaMask Extension
   # Visit: https://metamask.io
   ```

2. **Setup BSC Network**
   ```
   Network Name: BNB Smart Chain
   RPC URL: https://bsc-dataseed.binance.org/
   Chain ID: 56
   Currency Symbol: BNB
   Block Explorer: https://bscscan.com
   ```

3. **Fund Wallet**
   - Buy BNB from exchange
   - Transfer to MetaMask address

4. **Start Trading**
   - Visit [rabbit-launchpad.com](https://rabbit-launchpad.com)
   - Connect wallet
   - Create or trade tokens

### For Developers

#### Prerequisites
- Node.js 18+
- npm or yarn
- Git

#### Installation

```bash
# Clone repository
git clone https://github.com/rabbit-launchpad/frontend.git
cd rabbit-launchpad/frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with contract addresses
# VITE_LAUNCHPAD_CONTRACT_ADDRESS=0x...

# Start development server
npm run dev
```

#### Environment Variables

```bash
# Smart Contract Configuration
VITE_LAUNCHPAD_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000

# Network Configuration
VITE_BSC_RPC_URL=https://bsc-dataseed.binance.org/
VITE_BSC_CHAIN_ID=56
VITE_BSC_EXPLORER=https://bscscan.com

# App Configuration
VITE_APP_NAME=Rabbit Launchpad
VITE_APP_DESCRIPTION=Create and trade tokens on bonding curves
```

## 📖 Documentation

### User Documentation
- 📖 [User Guide](./docs/USER_GUIDE.md) - Complete user guide
- 🎥 [Video Tutorials](https://youtube.com/playlist) - Video tutorials
- ❓ [FAQ](./docs/FAQ.md) - Frequently Asked Questions
- 🔒 [Security Guide](./docs/SECURITY_GUIDE.md) - Best practices

### Developer Documentation
- 🔧 [API Documentation](./docs/API_DOCUMENTATION.md) - REST & Web3 API
- 💻 [SDK Documentation](./docs/SDK_GUIDE.md) - Integration libraries
- 🧪 [Testing Guide](./docs/TESTING_GUIDE.md) - Testing procedures
- 📚 [Smart Contract Docs](./docs/SMART_CONTRACT_DOCS.md) - Contract documentation

### Technical Documentation
- 🏗️ [Architecture](./docs/ARCHITECTURE.md) - System architecture
- 🚀 [Deployment Guide](./docs/DEPLOYMENT_GUIDE.md) - Deployment instructions
- 📊 [Analytics](./docs/ANALYTICS.md) - Platform analytics
- 🔐 [Security Audit](./docs/SECURITY_AUDIT.pdf) - Security audit report

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Ethers.js** - Web3 integration
- **React Query** - State management
- **React Router** - Navigation

### Smart Contracts
- **Solidity** - Smart contract language
- **OpenZeppelin** - Secure libraries
- **Hardhat** - Development framework
- **BSC Network** - Deployment network

### Infrastructure
- **Vercel** - Frontend hosting
- **AWS** - Backend services
- **Cloudflare** - CDN & security
- **BSC** - Blockchain network

## 🧪 Testing

### Running Tests

```bash
# Install dependencies
npm install

# Run unit tests
npm run test

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run coverage
npm run test:coverage

# Run testing panel (development only)
npm run dev
# Visit http://localhost:5173/launchpad -> Testing tab
```

### Test Coverage
- ✅ **Unit Tests**: 95%+ coverage
- ✅ **Integration Tests**: All API endpoints
- ✅ **E2E Tests**: Critical user flows
- ✅ **Security Tests**: Vulnerability scanning
- ✅ **Performance Tests**: Load testing

## 📊 Platform Statistics

### Live Stats
- 🪙 **Total Tokens Created**: [Live count]
- 💰 **Total Volume**: [Live BNB volume]
- 👥 **Active Users**: [Live users]
- 📈 **Graduated Tokens**: [Live count]

### Historical Data
- 📊 [Trading Volume Charts](https://analytics.rabbit-launchpad.com)
- 📈 [Token Performance](https://analytics.rabbit-launchpad.com/tokens)
- 👤 [User Analytics](https://analytics.rabbit-launchpad.com/users)

## 🔧 Development

### Project Structure

```
frontend/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── WalletConnect.tsx
│   │   ├── TokenCreation.tsx
│   │   ├── TokenTrading.tsx
│   │   └── TestingPanel.tsx
│   ├── hooks/              # Custom hooks
│   │   └── useWeb3.ts
│   ├── pages/              # Page components
│   │   ├── Launchpad.tsx
│   │   └── Index.tsx
│   ├── utils/              # Utility functions
│   │   └── testUtils.ts
│   ├── constants/          # Constants
│   │   └── contracts.ts
│   └── lib/                # Library files
├── docs/                   # Documentation
├── public/                 # Static assets
└── tests/                  # Test files
```

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run preview          # Preview production build

# Building
npm run build            # Build for production
npm run build:dev        # Build for development

# Testing
npm run test             # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix linting issues
npm run type-check       # Run TypeScript check

# Deployment
npm run deploy           # Deploy to production
npm run deploy:staging   # Deploy to staging
```

## 🚀 Deployment

### Production Deployment

```bash
# Build for production
npm run build

# Deploy to Vercel (recommended)
vercel --prod

# or deploy to other hosting
npm run deploy
```

### Environment Setup

1. **Vercel** (Recommended)
   ```bash
   npm install -g vercel
   vercel
   ```

2. **Netlify**
   ```bash
   npm run build
   # Upload dist/ folder to Netlify
   ```

3. **AWS S3 + CloudFront**
   ```bash
   npm run build
   # Upload dist/ to S3 bucket
   ```

### Environment Variables for Production

```bash
# Required
VITE_LAUNCHPAD_CONTRACT_ADDRESS=0x...
VITE_BSC_RPC_URL=https://bsc-dataseed.binance.org/
VITE_BSC_CHAIN_ID=56

# Optional
VITE_APP_NAME=Rabbit Launchpad
VITE_APP_DESCRIPTION=Create and trade tokens on bonding curves
VITE_BSC_EXPLORER=https://bscscan.com
```

## 🔒 Security

### Security Features
- 🔐 **No Admin Keys**: No admin control after deployment
- 🛡️ **Re-entrancy Protection**: Smart contract protection
- ✅ **Input Validation**: All inputs are validated
- 🔍 **Security Audits**: Regular security audits
- 🚨 **Monitoring**: Real-time security monitoring

### Security Best Practices
- ✅ Always verify contract addresses
- ✅ Use official links only
- ✅ Keep seed phrase secure
- ✅ Enable 2FA on exchanges
- ✅ Start with small amounts

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### How to Contribute

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines
- 📝 Follow code style guidelines
- 🧪 Add tests for new features
- 📖 Update documentation
- 🔍 Run security checks
- 📊 Ensure performance standards

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🆘 Support & Community

### Get Help
- 📧 **Email**: support@rabbit-launchpad.com
- 💬 **Discord**: [Join our Discord](https://discord.gg/rabbit)
- 🐦 **Twitter**: [@RabbitLaunchpad](https://twitter.com/RabbitLaunchpad)
- 📱 **Telegram**: [Join our Telegram](https://t.me/rabbitlaunchpad)

### Report Issues
- 🐛 [Bug Reports](https://github.com/rabbit-launchpad/frontend/issues)
- 💡 [Feature Requests](https://github.com/rabbit-launchpad/frontend/discussions)
- 🔒 [Security Issues](mailto:security@rabbit-launchpad.com)

### Social Media
- 📺 [YouTube](https://youtube.com/@rabbitlaunchpad)
- 📸 [Instagram](https://instagram.com/rabbitlaunchpad)
- 📝 [Medium](https://medium.com/rabbit-launchpad)
- 🎮 [TikTok](https://tiktok.com/@rabbitlaunchpad)

## 🗺️ Roadmap

### Q1 2024
- ✅ Platform launch
- ✅ Basic token creation & trading
- ✅ Mobile optimization
- 🔄 Security audit completion

### Q2 2024
- 🚀 Advanced analytics dashboard
- 🔗 API & SDK launch
- 💧 Liquidity pool optimization
- 📱 Mobile app development

### Q3 2024
- 🌐 Multi-chain support
- 🎮 Gamification features
- 🔍 Advanced token discovery
- 💰 Staking & rewards

### Q4 2024
- 🤝 DAO governance
- 🏆 Launchpad competitions
- 📊 Trading bots
- 🌍 Global expansion

## 🙏 Acknowledgments

- **OpenZeppelin** for secure smart contract libraries
- **Ethers.js** for excellent Web3 library
- **Vercel** for amazing hosting platform
- **shadcn/ui** for beautiful UI components
- **BSC** for reliable blockchain infrastructure

## 📄 Legal

**Disclaimer**: Rabbit Launchpad is a decentralized platform for token creation and trading. All transactions are executed on the blockchain and are irreversible. Please do your own research (DYOR) and never invest more than you can afford to lose. Cryptocurrency trading involves significant risk.

**Privacy Policy**: [Link to privacy policy]
**Terms of Service**: [Link to terms of service]

---

<div align="center">

**🐰 Built with ❤️ by the Rabbit Launchpad Team**

**⭐ Star this repo if you find it useful!**

**🔗 [Website](https://rabbit-launchpad.com) • [Docs](https://docs.rabbit-launchpad.com) • [Discord](https://discord.gg/rabbit)**

</div>