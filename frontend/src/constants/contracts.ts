// Smart Contract Configuration
export const CONTRACTS = {
  LAUNCHPAD: {
    ADDRESS: import.meta.env.VITE_LAUNCHPAD_CONTRACT_ADDRESS || "",
    ABI: [
      {
        "inputs": [
          {"internalType": "address", "name": "_treasury", "type": "address"},
          {"internalType": "address", "name": "_dexRouter", "type": "address"}
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
      },
      {
        "anonymous": false,
        "inputs": [
          {"indexed": true, "internalType": "address", "name": "tokenAddress", "type": "address"},
          {"indexed": true, "internalType": "address", "name": "buyer", "type": "address"},
          {"indexed": false, "internalType": "uint256", "name": "bnbAmount", "type": "uint256"},
          {"indexed": false, "internalType": "uint256", "name": "tokenAmount", "type": "uint256"},
          {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
        ],
        "name": "TokenBought",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {"indexed": true, "internalType": "address", "name": "tokenAddress", "type": "address"},
          {"indexed": true, "internalType": "address", "name": "lpPair", "type": "address"},
          {"indexed": false, "internalType": "uint256", "name": "lpBNB", "type": "uint256"},
          {"indexed": false, "internalType": "uint256", "name": "lpTokens", "type": "uint256"},
          {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
        ],
        "name": "TokenGraduated",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {"indexed": true, "internalType": "address", "name": "tokenAddress", "type": "address"},
          {"indexed": true, "internalType": "address", "name": "seller", "type": "address"},
          {"indexed": false, "internalType": "uint256", "name": "tokenAmount", "type": "uint256"},
          {"indexed": false, "internalType": "uint256", "name": "bnbAmount", "type": "uint256"},
          {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
        ],
        "name": "TokenSold",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {"indexed": true, "internalType": "address", "name": "tokenAddress", "type": "address"},
          {"indexed": false, "internalType": "string", "name": "name", "type": "string"},
          {"indexed": false, "internalType": "string", "name": "symbol", "type": "string"},
          {"indexed": true, "internalType": "address", "name": "creator", "type": "address"},
          {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
        ],
        "name": "TokenCreated",
        "type": "event"
      },
      {
        "inputs": [
          {"internalType": "string", "name": "name", "type": "string"},
          {"internalType": "string", "name": "symbol", "type": "string"},
          {"internalType": "string", "name": "metadata", "type": "string"}
        ],
        "name": "createToken",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
      },
      {
        "inputs": [
          {"internalType": "address", "name": "tokenAddress", "type": "address"}
        ],
        "name": "buy",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
      },
      {
        "inputs": [
          {"internalType": "address", "name": "tokenAddress", "type": "address"},
          {"internalType": "uint256", "name": "tokenAmount", "type": "uint256"}
        ],
        "name": "sell",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {"internalType": "address", "name": "tokenAddress", "type": "address"}
        ],
        "name": "graduate",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {"internalType": "address", "name": "tokenAddress", "type": "address"}
        ],
        "name": "getTokenInfo",
        "outputs": [
          {
            "components": [
              {"internalType": "address", "name": "tokenAddress", "type": "address"},
              {"internalType": "string", "name": "name", "type": "string"},
              {"internalType": "string", "name": "symbol", "type": "string"},
              {"internalType": "string", "name": "metadata", "type": "string"},
              {"internalType": "address", "name": "creator", "type": "address"},
              {"internalType": "uint256", "name": "soldSupply", "type": "uint256"},
              {"internalType": "uint256", "name": "totalBNB", "type": "uint256"},
              {"internalType": "uint256", "name": "initialPrice", "type": "uint256"},
              {"internalType": "uint256", "name": "totalPlatformFees", "type": "uint256"},
              {"internalType": "uint256", "name": "totalCreatorFees", "type": "uint256"},
              {"internalType": "uint256", "name": "bondingCurveLiquidity", "type": "uint256"},
              {"internalType": "uint256", "name": "liquidityPoolAmount", "type": "uint256"},
              {"internalType": "bool", "name": "graduated", "type": "bool"},
              {"internalType": "bool", "name": "exists", "type": "bool"}
            ],
            "internalType": "struct RabbitLaunchpad.TokenState",
            "name": "",
            "type": "tuple"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "getAllTokens",
        "outputs": [
          {"internalType": "address[]", "name": "tokenList", "type": "address[]"}
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "treasury",
        "outputs": [
          {"internalType": "address", "name": "", "type": "address"}
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "globalState",
        "outputs": [
          {
            "components": [
              {"internalType": "uint256", "name": "totalTokensCreated", "type": "uint256"},
              {"internalType": "uint256", "name": "totalFeesCollected", "type": "uint256"},
              {"internalType": "address", "name": "dexRouter", "type": "address"}
            ],
            "internalType": "struct AhiruLaunchpad.GlobalState",
            "name": "",
            "type": "tuple"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {"internalType": "uint256", "name": "currentSupply", "type": "uint256"},
          {"internalType": "uint256", "name": "bnbAmount", "type": "uint256"},
          {"internalType": "uint256", "name": "initialPrice", "type": "uint256"},
          {"internalType": "uint256", "name": "slope", "type": "uint256"}
        ],
        "name": "calculateTokenPurchase",
        "outputs": [
          {"internalType": "uint256", "name": "tokenAmount", "type": "uint256"}
        ],
        "stateMutability": "pure",
        "type": "function"
      },
      {
        "inputs": [
          {"internalType": "uint256", "name": "currentSupply", "type": "uint256"},
          {"internalType": "uint256", "name": "tokenAmount", "type": "uint256"},
          {"internalType": "uint256", "name": "initialPrice", "type": "uint256"},
          {"internalType": "uint256", "name": "slope", "type": "uint256"}
        ],
        "name": "calculateTokenSale",
        "outputs": [
          {"internalType": "uint256", "name": "bnbAmount", "type": "uint256"}
        ],
        "stateMutability": "pure",
        "type": "function"
      }
    ]
  },
  TOKEN: {
    ABI: [
      {
        "inputs": [
          {"internalType": "string", "name": "name", "type": "string"},
          {"internalType": "string", "name": "symbol", "type": "string"},
          {"internalType": "address", "name": "initialOwner", "type": "address"},
          {"internalType": "uint256", "name": "initialSupply", "type": "uint256"}
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
      },
      {
        "anonymous": false,
        "inputs": [
          {"indexed": true, "internalType": "address", "name": "owner", "type": "address"},
          {"indexed": true, "internalType": "address", "name": "spender", "type": "address"},
          {"indexed": false, "internalType": "uint256", "name": "value", "type": "uint256"}
        ],
        "name": "Approval",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {"indexed": true, "internalType": "address", "name": "from", "type": "address"},
          {"indexed": true, "internalType": "address", "name": "to", "type": "address"},
          {"indexed": false, "internalType": "uint256", "name": "value", "type": "uint256"}
        ],
        "name": "Transfer",
        "type": "event"
      },
      {
        "inputs": [
          {"internalType": "address", "name": "owner", "type": "address"},
          {"internalType": "address", "name": "spender", "type": "address"}
        ],
        "name": "allowance",
        "outputs": [
          {"internalType": "uint256", "name": "", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {"internalType": "address", "name": "spender", "type": "address"},
          {"internalType": "uint256", "name": "amount", "type": "uint256"}
        ],
        "name": "approve",
        "outputs": [
          {"internalType": "bool", "name": "", "type": "bool"}
        ],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {"internalType": "address", "name": "account", "type": "address"}
        ],
        "name": "balanceOf",
        "outputs": [
          {"internalType": "uint256", "name": "", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "decimals",
        "outputs": [
          {"internalType": "uint8", "name": "", "type": "uint8"}
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {"internalType": "address", "name": "spender", "type": "address"},
          {"internalType": "uint256", "name": "subtractedValue", "type": "uint256"}
        ],
        "name": "decreaseAllowance",
        "outputs": [
          {"internalType": "bool", "name": "", "type": "bool"}
        ],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {"internalType": "uint256", "name": "amount", "type": "uint256"}
        ],
        "name": "burn",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {"internalType": "address", "name": "account", "type": "address"},
          {"internalType": "uint256", "name": "amount", "type": "uint256"}
        ],
        "name": "burnFrom",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {"internalType": "address", "name": "to", "type": "address"},
          {"internalType": "uint256", "name": "amount", "type": "uint256"}
        ],
        "name": "mint",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "name",
        "outputs": [
          {"internalType": "string", "name": "", "type": "string"}
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "owner",
        "outputs": [
          {"internalType": "address", "name": "", "type": "address"}
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {"internalType": "address", "name": "spender", "type": "address"},
          {"internalType": "uint256", "name": "addedValue", "type": "uint256"}
        ],
        "name": "increaseAllowance",
        "outputs": [
          {"internalType": "bool", "name": "", "type": "bool"}
        ],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "symbol",
        "outputs": [
          {"internalType": "string", "name": "", "type": "string"}
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "totalSupply",
        "outputs": [
          {"internalType": "uint256", "name": "", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {"internalType": "address", "name": "to", "type": "address"},
          {"internalType": "uint256", "name": "amount", "type": "uint256"}
        ],
        "name": "transfer",
        "outputs": [
          {"internalType": "bool", "name": "", "type": "bool"}
        ],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {"internalType": "address", "name": "from", "type": "address"},
          {"internalType": "address", "name": "to", "type": "address"},
          {"internalType": "uint256", "name": "amount", "type": "uint256"}
        ],
        "name": "transferFrom",
        "outputs": [
          {"internalType": "bool", "name": "", "type": "bool"}
        ],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {"internalType": "address", "name": "newOwner", "type": "address"}
        ],
        "name": "transferOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ]
  }
};

export const NETWORKS = {
  BSC: {
    chainId: 56,
    chainName: "BNB Smart Chain",
    rpcUrls: ["https://bsc-dataseed.binance.org/"],
    nativeCurrency: {
      name: "BNB",
      symbol: "BNB",
      decimals: 18,
    },
    blockExplorerUrls: ["https://bscscan.com/"],
  },
  BSC_TESTNET: {
    chainId: 97,
    chainName: "BNB Smart Chain Testnet",
    rpcUrls: ["https://data-seed-prebsc-1-s1.binance.org:8545/"],
    nativeCurrency: {
      name: "BNB",
      symbol: "BNB",
      decimals: 18,
    },
    blockExplorerUrls: ["https://testnet.bscscan.com/"],
  },
};

export const DEFAULT_NETWORK = NETWORKS.BSC;