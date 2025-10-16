import { TokenInfo, TransactionData, ReferralData } from '@/contracts/interfaces';

// Realistic mock tokens with different performance levels
export const mockTokens: TokenInfo[] = [
  // Successful migrated tokens
  {
    tokenAddress: '0x1234567890123456789012345678901234567890',
    name: 'RabbitRocket',
    symbol: 'RABBIT',
    totalSupply: '1000000000000000000000000',
    creator: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    createdAt: '10 hours ago',
    currentPrice: '0.025',
    marketCap: '2500000',
    volume: '487.5',
    isInBonding: false,
    migrationDate: '2024-01-18T15:45:00Z',
    liquidityPoolAddress: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
    description: '🚀 The fastest growing meme token on BSC!'
  },
  {
    tokenAddress: '0x9876543210987654321098765432109876543210',
    name: 'MoonDoge',
    symbol: 'MOONDOGE',
    totalSupply: '500000000000000000000000',
    creator: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    createdAt: '15 days ago',
    currentPrice: '0.018',
    marketCap: '1800000',
    volume: '325.8',
    isInBonding: false,
    migrationDate: '2024-01-12T14:20:00Z',
    liquidityPoolAddress: '0xc0ffee1234567890abcdef1234567890abcdef12',
    description: '🌙 To the moon and beyond! Doge with lunar ambitions.'
  },
  {
    tokenAddress: '0x1111111111111111111111111111111111111111',
    name: 'PepeVibes',
    symbol: 'PEPEV',
    totalSupply: '420690000000000000000000',
    creator: '0x1234567890123456789012345678901234567890',
    createdAt: '17 days ago',
    currentPrice: '0.032',
    marketCap: '13462080',
    volume: '256.4',
    isInBonding: false,
    migrationDate: '2024-01-10T09:30:00Z',
    liquidityPoolAddress: '0xpepevibes6969696969696969696969696969696',
    description: '🐸 Rare Pepe with maximum vibes - based, blessed, and ready!'
  },

  // Currently active tokens in bonding curve
  {
    tokenAddress: '0x2222222222222222222222222222222222222222',
    name: 'ShibaShark',
    symbol: 'SHIBSHARK',
    totalSupply: '1000000000000000000000000',
    creator: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    createdAt: '5 days ago',
    currentPrice: '0.008',
    marketCap: '800000',
    volume: '143.2',
    isInBonding: true,
    migrationDate: undefined,
    liquidityPoolAddress: undefined,
    description: '🦈 The ocean\'s most fierce Shiba - combining dog power with shark dominance!'
  },
  {
    tokenAddress: '0x3333333333333333333333333333333333333333',
    name: 'TurboMeme',
    symbol: 'TURBO',
    totalSupply: '777777777777777777777777',
    creator: '0x1234567890123456789012345678901234567890',
    createdAt: '3 days ago',
    currentPrice: '0.015',
    marketCap: '11666665',
    volume: '89.7',
    isInBonding: true,
    migrationDate: undefined,
    liquidityPoolAddress: undefined,
    description: '⚡ Lightning fast meme coin with turbo-charged gains!'
  },
  {
    tokenAddress: '0x4444444444444444444444444444444444444444',
    name: 'CosmicCat',
    symbol: 'COSMIC',
    totalSupply: '888888888888888888888888888',
    creator: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    createdAt: '4 days ago',
    currentPrice: '0.006',
    marketCap: '5333333',
    volume: '67.5',
    isInBonding: true,
    migrationDate: undefined,
    liquidityPoolAddress: undefined,
    description: '🐱 Galactic feline exploring the crypto cosmos - meow to the moon!'
  },
  {
    tokenAddress: '0x5555555555555555555555555555555555555555',
    name: 'DiamondPaws',
    symbol: 'DIAMOND',
    totalSupply: '100000000000000000000000',
    creator: '0x1234567890123456789012345678901234567890',
    createdAt: '2 days ago',
    currentPrice: '0.045',
    marketCap: '4500000',
    volume: '156.8',
    isInBonding: true,
    migrationDate: undefined,
    liquidityPoolAddress: undefined,
    description: '💎 Premium token with diamond hands community - only the strong survive!'
  },

  // New tokens (low volume)
  {
    tokenAddress: '0x6666666666666666666666666666666666666666',
    name: 'BabyWhale',
    symbol: 'BABYWHALE',
    totalSupply: '200000000000000000000000',
    creator: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    createdAt: '1 day ago',
    currentPrice: '0.003',
    marketCap: '600000',
    volume: '23.4',
    isInBonding: true,
    migrationDate: undefined,
    liquidityPoolAddress: undefined,
    description: '🐋 Tiny whale with huge dreams - making big waves in the ocean of crypto!'
  },
  {
    tokenAddress: '0x7777777777777777777777777777777777777777',
    name: 'StonerSatoshi',
    symbol: 'STONER',
    totalSupply: '420000000000000000000000',
    creator: '0x1234567890123456789012345678901234567890',
    createdAt: '1 day ago',
    currentPrice: '0.007',
    marketCap: '2940000',
    volume: '15.2',
    isInBonding: true,
    migrationDate: undefined,
    liquidityPoolAddress: undefined,
    description: '🌿 Chill vibes and high profits - the most relaxed way to get rich!'
  },
  {
    tokenAddress: '0x8888888888888888888888888888888888888888888',
    name: 'FireFrog',
    symbol: 'FIREFROG',
    totalSupply: '666666666666666666666666',
    creator: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    createdAt: '12 hours ago',
    currentPrice: '0.004',
    marketCap: '2666666',
    volume: '8.9',
    isInBonding: true,
    migrationDate: undefined,
    liquidityPoolAddress: undefined,
    description: '🔥🐸 Hopping through gains with fire in our belly - ribbit to riches!'
  },

  // Tokens from other creators
  {
    tokenAddress: '0x9999999999999999999999999999999999999999',
    name: 'RocketUnicorn',
    symbol: 'RUNI',
    totalSupply: '777777777777777777777777',
    creator: '0x1231231231231231231231231231231231231231',
    createdAt: '11 days ago',
    currentPrice: '0.022',
    marketCap: '17111091',
    volume: '189.3',
    isInBonding: false,
    migrationDate: '2024-01-16T10:20:00Z',
    liquidityPoolAddress: '0xunicornrocketrainbowmagic7777777777777777777',
    description: '🦄🚀 Magical unicorn rocketing through space - sprinkle the rainbow!'
  },
  {
    tokenAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    name: 'DragonPower',
    symbol: 'DRAGON',
    totalSupply: '999999999999999999999999999',
    creator: '0x4564564564564564564564564564564564564564',
    createdAt: '9 days ago',
    currentPrice: '0.011',
    marketCap: '10999999',
    volume: '234.5',
    isInBonding: true,
    migrationDate: undefined,
    liquidityPoolAddress: undefined,
    description: '🐉 Ancient dragon awakening - breathing fire on the charts!'
  },
  {
    tokenAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    name: 'LuckyLeprechaun',
    symbol: 'LUCKY',
    totalSupply: '1000000000000000000000000',
    creator: '0x7897897897897897897897897897897897897897',
    createdAt: '7 days ago',
    currentPrice: '0.009',
    marketCap: '9000000',
    volume: '178.9',
    isInBonding: false,
    migrationDate: '2024-01-19T16:45:00Z',
    liquidityPoolAddress: '0xpotofgoldrainbowluck7777777777777777777777',
    description: '🍀 Finding the pot of gold at the end of the rainbow - lucky gains incoming!'
  },

  // Failed tokens (for realistic data)
  {
    tokenAddress: '0xcccccccccccccccccccccccccccccccccccccccccc',
    name: 'GhostToken',
    symbol: 'GHOST',
    totalSupply: '1000000000000000000000000',
    creator: '0x3213213213213213213213213213213213213213',
    createdAt: '20 days ago',
    currentPrice: '0.0001',
    marketCap: '100000',
    volume: '3.2',
    isInBonding: true,
    migrationDate: undefined,
    liquidityPoolAddress: undefined,
    description: '👻 Spooky token that disappeared... where did everyone go?'
  }
];

// Mock transactions for realistic trading activity
export const mockTransactions: TransactionData[] = [
  {
    hash: '0x1111111111111111111111111111111111111111111111111111111111111111',
    blockNumber: 12345,
    timestamp: Date.now() - 3600000,
    from: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    to: '0x1234567890123456789012345678901234567890',
    value: '1500000000000000000',
    gasUsed: '21000',
    gasPrice: '20000000000',
    type: 'BUY',
    tokenAddress: '0x1234567890123456789012345678901234567890',
    volume: '1.5',
    feeBreakdown: {
      platformFee: '0.015',
      creatorImmediate: '0.00375',
      creatorMigration: '0.00375',
      totalFee: '0.0225'
    }
  },
  {
    hash: '0x2222222222222222222222222222222222222222222222222222222222222222',
    blockNumber: 12346,
    timestamp: Date.now() - 7200000,
    from: '0x1234567890123456789012345678901234567890',
    to: '0x9876543210987654321098765432109876543210',
    value: '3200000000000000000',
    gasUsed: '25000',
    gasPrice: '21000000000',
    type: 'BUY',
    tokenAddress: '0x9876543210987654321098765432109876543210',
    volume: '3.2',
    feeBreakdown: {
      platformFee: '0.032',
      creatorImmediate: '0.008',
      creatorMigration: '0.008',
      totalFee: '0.048'
    }
  },
  {
    hash: '0x3333333333333333333333333333333333333333333333333333333333333333',
    blockNumber: 12347,
    timestamp: Date.now() - 10800000,
    from: '0x4564564564564564564564564564564564564564',
    to: '0x1111111111111111111111111111111111111111',
    value: '890000000000000000',
    gasUsed: '22000',
    gasPrice: '22000000000',
    type: 'SELL',
    tokenAddress: '0x1111111111111111111111111111111111111111',
    volume: '0.89',
    feeBreakdown: {
      platformFee: '0.0089',
      creatorImmediate: '0.002225',
      creatorMigration: '0.002225',
      totalFee: '0.01335'
    }
  },
  {
    hash: '0x4444444444444444444444444444444444444444444444444444444444444',
    blockNumber: 12348,
    timestamp: Date.now() - 14400000,
    from: '0x7897897897897897897897897897897897897897',
    to: '0x9999999999999999999999999999999999999999',
    value: '2100000000000000000',
    gasUsed: '24000',
    gasPrice: '23000000000',
    type: 'BUY',
    tokenAddress: '0x9999999999999999999999999999999999999999',
    volume: '2.1',
    feeBreakdown: {
      platformFee: '0.021',
      creatorImmediate: '0.00525',
      creatorMigration: '0.00525',
      totalFee: '0.0315'
    }
  },
  {
    hash: '0x5555555555555555555555555555555555555555555555555555555555555',
    blockNumber: 12349,
    timestamp: Date.now() - 18000000,
    from: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    to: '0x2222222222222222222222222222222222222222',
    value: '5000000000000000000',
    gasUsed: '26000',
    gasPrice: '25000000000',
    type: 'BUY',
    tokenAddress: '0x2222222222222222222222222222222222222222',
    volume: '5.0',
    feeBreakdown: {
      platformFee: '0.05',
      creatorImmediate: '0.0125',
      creatorMigration: '0.0125',
      totalFee: '0.075'
    }
  }
];

// Mock referral data
export const mockReferrals: ReferralData[] = [
  {
    referrer: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    referred: '0x1231231231231231231231231231231231231231',
    tokenAddress: '0x1234567890123456789012345678901234567890',
    referralCode: 'RABBIT2024',
    commissionRate: '0.05',
    totalCommission: '0.125',
    claimedCommission: '0.05',
    referralDate: '2024-01-16T10:30:00Z',
    isActive: true
  },
  {
    referrer: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    referred: '0x4564564564564564564564564564564564564564',
    tokenAddress: '0x9876543210987654321098765432109876543210',
    referralCode: 'RABBIT2024',
    commissionRate: '0.05',
    totalCommission: '0.0875',
    claimedCommission: '0.0325',
    referralDate: '2024-01-17T14:20:00Z',
    isActive: true
  }
];

// Mock market data for charts and analytics
export const mockMarketData = {
  dailyVolumes: [
    { date: '2024-01-15', volume: 45.2 },
    { date: '2024-01-16', volume: 67.8 },
    { date: '2024-01-17', volume: 89.3 },
    { date: '2024-01-18', volume: 123.5 },
    { date: '2024-01-19', volume: 156.7 },
    { date: '2024-01-20', volume: 189.2 },
    { date: '2024-01-21', volume: 234.8 },
    { date: '2024-01-22', volume: 267.4 },
    { date: '2024-01-23', volume: 312.9 },
    { date: '2024-01-24', volume: 389.6 },
    { date: '2024-01-25', volume: 445.3 }
  ],
  topGainers: [
    { token: 'DiamondPaws', symbol: 'DIAMOND', change: '+450%', volume: '156.8' },
    { token: 'RabbitRocket', symbol: 'RABBIT', change: '+250%', volume: '487.5' },
    { token: 'RocketUnicorn', symbol: 'RUNI', change: '+180%', volume: '189.3' },
    { token: 'DragonPower', symbol: 'DRAGON', change: '+120%', volume: '234.5' },
    { token: 'TurboMeme', symbol: 'TURBO', change: '+90%', volume: '89.7' }
  ],
  topLosers: [
    { token: 'GhostToken', symbol: 'GHOST', change: '-85%', volume: '3.2' },
    { token: 'BabyWhale', symbol: 'BABYWHALE', change: '-45%', volume: '23.4' },
    { token: 'StonerSatoshi', symbol: 'STONER', change: '-30%', volume: '15.2' }
  ]
};

// Helper function to get tokens by creator
export const getTokensByCreator = (creatorAddress: string): TokenInfo[] => {
  return mockTokens.filter(token =>
    token.creator.toLowerCase() === creatorAddress.toLowerCase()
  );
};

// Helper function to get token by address
export const getTokenByAddress = (address: string): TokenInfo | undefined => {
  return mockTokens.find(token =>
    token.tokenAddress.toLowerCase() === address.toLowerCase()
  );
};

// Helper function to get trending tokens
export const getTrendingTokens = (limit: number = 10): TokenInfo[] => {
  return mockTokens
    .sort((a, b) => parseFloat(b.volume) - parseFloat(a.volume))
    .slice(0, limit);
};

// Helper function to get new tokens
export const getNewTokens = (limit: number = 10): TokenInfo[] => {
  return mockTokens
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
};

// Helper function to get migrated tokens
export const getMigratedTokens = (): TokenInfo[] => {
  return mockTokens.filter(token => !token.isInBonding);
};

// Helper function to get tokens in bonding curve
export const getBondingTokens = (): TokenInfo[] => {
  return mockTokens.filter(token => token.isInBonding);
};

// Helper function to search tokens
export const searchTokens = (query: string): TokenInfo[] => {
  const lowerQuery = query.toLowerCase();
  return mockTokens.filter(token =>
    token.name.toLowerCase().includes(lowerQuery) ||
    token.symbol.toLowerCase().includes(lowerQuery)
  );
};