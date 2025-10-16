# 🐰 Rabbit Launchpad Smart Contracts

BSC Smart Contract for token launchpad system with exponential bonding curve.

## 📂 Project Structure

```
smartcontract/
├── contracts/                     # Smart Contracts
│   ├── RabbitLaunchpad.sol         # Main launchpad contract (Exponential Bonding Curve)
│   ├── RabbitToken.sol             # Token contract template
├── scripts/                       # Testing & Deployment Scripts
│   ├── test-local.ts              # Local testing script
│   ├── test-bonding-fix.ts        # Comprehensive bonding curve test
│   ├── deploy.ts                  # Deployment script
│   └── verify.ts                  # Contract verification
├── test/                          # Test files
├── hardhat.config.ts              # Hardhat configuration
├── package.json
└── .env.example                   # Environment variables template
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn
- MetaMask or other wallet
- BNB for gas fees

### Installation

1. Install dependencies
```bash
npm install
```

2. Environment setup
```bash
cp .env.example .env
```

3. Edit `.env` file:
```bash
# BSC Testnet
BSC_TESTNET_RPC_URL=https://rpc.ankr.com/bsc_testnet
PRIVATE_KEY=your-private-key-here
BSC_TESTNET_EXPLORER=https://testnet.bscscan.com

# BSC Mainnet (when ready)
BSC_MAINNET_RPC_URL=https://rpc.ankr.com/bsc
PRIVATE_KEY_MAINNET=your-mainnet-private-key
BSC_MAINNET_EXPLORER=https://bscscan.com
```

## 🔧 Available Scripts

```bash
# Compile contracts
npm run compile

# Run tests
npm run test

# Local testing (NEW)
npx hardhat run scripts/test-local.ts --network hardhat
npx hardhat run scripts/test-bonding-fix.ts --network hardhat

# Deploy to testnet
npm run deploy:testnet

# Deploy to mainnet
npm run deploy:mainnet

# Verify contracts
npm run verify:testnet
npm run verify:mainnet

# Local node
npm run node
```

### 🧪 Local Testing Scripts

**test-local.ts** - Basic bonding curve testing:
```bash
npx hardhat run scripts/test-local.ts --network hardhat
```

**test-bonding-fix.ts** - Comprehensive testing with debugging:
```bash
npx hardhat run scripts/test-bonding-fix.ts --network hardhat
```

**Testing Results ✅:**
- Token Creation: 0.005 BNB fee ✅
- Bonding Curve: Exponential pricing ✅
- Token Purchase: 987,500 tokens for 0.01 BNB ✅
- BNB Integration: Proper BNB labeling ✅

## 📝 Smart Contracts

### RabbitLaunchpad.sol
Main contract for launchpad with features:
- ✅ Token creation with bonding curve
- ✅ Buy/sell token functionality
- ✅ Graduation to DEX
- ✅ Fee collection and distribution
- ✅ Anti-manipulation mechanisms

### RabbitToken.sol
Token template with features:
- ✅ Standard ERC20 functionality
- ✅ Anti-snipe protection
- ✅ Transaction limits
- ✅ Ownership management

## 🔌 Contract Functions

### Token Creation
```solidity
function createToken(
    string memory name,
    string memory symbol,
    string memory metadata
) external payable returns (address tokenAddress)
```

### Buying Tokens
```solidity
function buy(address tokenAddress)
    external
    payable
    returns (uint256 tokensReceived)
```

### Selling Tokens
```solidity
function sell(address tokenAddress, uint256 tokenAmount)
    external
    returns (uint256 bnbReceived)
```

### Get Token Info
```solidity
function getTokenInfo(address tokenAddress)
    external
    view
    returns (TokenState memory tokenInfo)
```

### Bonding Curve Stats
```solidity
function getBondingCurveStats(address tokenAddress)
    external
    view
    returns (
        uint256 currentPrice,
        uint256 marketCap,
        uint256 progress,
        bool isGraduated
    )
```

## 📊 Technical Specifications

### Bonding Curve (Exponential)
- **Initial Price (P0)**: 0.00000001 BNB per token (1e-8 BNB)
- **Total Supply**: 1,000,000,000 tokens (1B)
- **Exponential Formula**: P(x) = P0 * e^(k * (x / S))
  - k = 5.43 (growth factor)
  - S = 1,000,000,000 tokens (supply constant)
- **Target Supply**: 800M tokens (80% for trading)
- **Graduation Supply**: 200M tokens (20% for LP)

### Fee Structure
- **Create Fee**: 0.005 BNB (fixed)
- **Transaction Fee**: 1.25% total
  - 1% to platform treasury
  - 0.25% to creator wallet

### Graduation to DEX
- **Threshold**: 35 BNB gross raise target
- **Net Raise**: 34.56 BNB (after fees)
- **LP Allocation**:
  - 80% BNB from bonding curve
  - 20% of total supply (200M tokens)

### Token Economics
- **Token Name**: Custom per token creation
- **Token Symbol**: Custom per token creation
- **Decimals**: 18 (standard ERC20)
- **Network**: BNB Smart Chain (BSC)

## 📊 Contract Addresses

### BSC Testnet
```
Launchpad Contract: 0x1234... (Deploy after running npm run deploy:testnet)
Network: BSC Testnet (Chain ID: 97)
Explorer: https://testnet.bscscan.com
```

### BSC Mainnet
```
Launchpad Contract: 0xabcd... (Deploy after production)
Network: BSC Mainnet (Chain ID: 56)
Explorer: https://bscscan.com
```

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run specific test file
npx hardhat test test/Launchpad.test.ts

# Run tests with gas reporting
REPORT_GAS=true npm run test

# Run tests with coverage
npm run coverage
```

## 🚀 Deployment

### Local Deployment
```bash
# Start local Hardhat node
npm run node

# Deploy to local network (in separate terminal)
npx hardhat run scripts/deploy.ts --network localhost
```

### Testnet Deployment
```bash
# Deploy to BSC Testnet
npm run deploy:testnet

# Verify on testnet explorer
npm run verify:testnet
```

### Mainnet Deployment
```bash
# Deploy to BSC Mainnet
npm run deploy:mainnet

# Verify on mainnet explorer
npm run verify:mainnet
```

## 🔧 Configuration

### Hardhat Config
```typescript
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    bscTestnet: {
      url: process.env.BSC_TESTNET_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 97
    },
    bscMainnet: {
      url: process.env.BSC_MAINNET_RPC_URL,
      accounts: [process.env.PRIVATE_KEY_MAINNET],
      chainId: 56
    }
  }
};
```

## 🔒 Security Features

- ✅ **Re-entrancy Protection**
- ✅ **Integer Overflow Protection**
- ✅ **Access Control**
- ✅ **Emergency Functions**
- ✅ **Anti-Manipulation**
- ✅ **Time-locked Functions**

## 📈 Gas Optimization

- ✅ Optimized contract size
- ✅ Efficient storage patterns
- ✅ Minimal external calls
- ✅ Batch operations where possible

## 📊 Contract Analytics

### Events
```solidity
event TokenCreated(address indexed tokenAddress, string name, string symbol);
event TokensPurchased(address indexed buyer, address tokenAddress, uint256 amount, uint256 cost);
event TokensSold(address indexed seller, address tokenAddress, uint256 amount, uint256 received);
event TokenGraduated(address indexed tokenAddress, uint256 finalPrice);
```

### State Variables
```solidity
struct TokenInfo {
    address tokenAddress;
    string name;
    string symbol;
    uint256 totalSupply;
    uint256 soldSupply;
    uint256 currentPrice;
    uint256 targetPrice;
    bool graduated;
    address creator;
    uint256 createdAt;
}
```

## 🔍 Contract Verification

### Automatic Verification
```bash
# Verify after deployment
npx hardhat verify --network bscTestnet <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

### Manual Verification
1. Go to BSCScan/BSC Testnet Explorer
2. Navigate to contract address
3. Click "Verify and Publish"
4. Select compiler version and optimization settings
5. Upload source code and ABI

## 🚨 Important Notes

### Security
- Private keys must be stored securely
- Always verify contract address on explorer
- Test thoroughly on testnet before mainnet deployment
- Follow security best practices

### Gas Fees
- Deploying to mainnet requires BNB for gas fees
- Testnet deployment uses testnet BNB (free)
- Gas optimization is important for cost efficiency

### Upgradeability
- Contracts use proxy pattern for upgradeability
- Storage is separated from logic for flexibility
- Upgrade process requires governance approval

## 📚 References

- [OpenZeppelin Documentation](https://docs.openzeppelin.com/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [BSC Documentation](https://docs.binance.org/smart-chain/developer/)
- [Solidity Documentation](https://docs.soliditylang.org/)

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit Pull Request

## 📜 License

MIT License - see [LICENSE](../LICENSE) file for details

## ⚠️ Disclaimer

- Smart contracts have been tested but use at your own risk
- Always do your own research (DYOR) before investing
- Make sure to test on testnet before mainnet deployment
- Prices in bonding curve can be highly volatile

---

<div align="center">

**🐰 Rabbit Launchpad Smart Contracts**

**Built with ❤️ for the Rabbit Launchpad ecosystem**

**⚠️ Always audit contracts before mainnet deployment**

</div>