export interface MockCoin {
  id: string;
  name: string;
  ticker: string;
  image: string;
  logo: string; // for backward compatibility with card components
  contractAddress?: string;
  contract: string; // for backward compatibility with seed interfaces
  marketCap: string;
  progress: number;
  priceChange: number;
  bnbCollected?: string;
  isLive?: boolean;
  created_at?: string; // Added for time ago functionality
  creatorId?: string; // Wallet address of creator
  creatorName?: string; // Display name of creator
  creatorAvatar?: string; // Creator's avatar/image
}

// Creator data structure for comprehensive user profiles
export interface Creator {
  walletAddress: string; // Primary identifier (wallet address)
  displayName: string; // Display name for UI
  username?: string; // Unique username
  avatar?: string; // Profile image URL
  bio?: string; // Short bio
  verified?: boolean; // Verified status
  isPlatformCreator?: boolean; // Platform special status
  socialLinks?: {
    twitter?: string;
    telegram?: string;
    website?: string;
    instagram?: string;
  };
  stats?: {
    totalTokensCreated: number;
    totalMarketCap: string;
    followers: number;
  };
  joinedAt?: string;
}

// Mock creator data for comprehensive profiles
export const mockCreators: Creator[] = [
  {
    walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    displayName: "CryptoWhale",
    username: "cryptowhale",
    avatar: "https://picsum.photos/seed/cryptowhale/200/200.jpg",
    bio: "🚀 Full-time degen | Token launcher | Building the future of meme coins",
    verified: true,
    isPlatformCreator: false,
    socialLinks: {
      twitter: "cryptowhale",
      telegram: "cryptowhale_official",
      website: "cryptowhale.io"
    },
    stats: {
      totalTokensCreated: 12,
      totalMarketCap: "$15.5M",
      followers: 2847
    },
    joinedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString() // 6 months ago
  },
  {
    walletAddress: "0x8ba1f109551bD432803012645Hac136c",
    displayName: "Moonshot Mike",
    username: "moonshotmike",
    avatar: "https://picsum.photos/seed/moonshotmike/200/200.jpg",
    bio: "🌙 To the moon! | Professional token creator | 100+ successful launches",
    verified: true,
    isPlatformCreator: false,
    socialLinks: {
      twitter: "moonshotmike",
      telegram: "moonshot_mike"
    },
    stats: {
      totalTokensCreated: 28,
      totalMarketCap: "$22.3M",
      followers: 5621
    },
    joinedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year ago
  },
  {
    walletAddress: "0x19d2e8bD3bF8c8c2E8a5a6b7c8d9e0f1a2b3c4d5e6f7",
    displayName: "MemeQueen",
    username: "memequeen",
    avatar: "https://picsum.photos/seed/memequeen/200/200.jpg",
    bio: "👑 Queen of memes | Creating viral tokens since 2024",
    verified: false,
    isPlatformCreator: false,
    socialLinks: {
      twitter: "memequeen_crypto",
      instagram: "memequeen"
    },
    stats: {
      totalTokensCreated: 5,
      totalMarketCap: "$3.2M",
      followers: 1234
    },
    joinedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() // 2 months ago
  },
  {
    walletAddress: "0x0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1",
    displayName: "RabbitFun Platform",
    username: "rabbitfun",
    avatar: "https://picsum.photos/seed/rabbitfun/200/200.jpg",
    bio: "🐰 Official RabbitFun creator | Platform tokens and partnerships",
    verified: true,
    isPlatformCreator: true,
    socialLinks: {
      twitter: "rabbitfun_io",
      telegram: "rabbitfun",
      website: "rabbitfun.io"
    },
    stats: {
      totalTokensCreated: 3,
      totalMarketCap: "$8.7M",
      followers: 15000
    },
    joinedAt: new Date(Date.now() - 720 * 24 * 60 * 60 * 1000).toISOString() // 2 years ago
  },
  {
    walletAddress: "0x123456789abcdef1234567890abcdef1234567890",
    displayName: "Diamond Hands Dave",
    username: "diamondhands",
    avatar: "https://picsum.photos/seed/diamondhands/200/200.jpg",
    bio: "💎 Diamond hands enthusiast | Long-term HODLER",
    verified: false,
    isPlatformCreator: false,
    socialLinks: {
      twitter: "diamondhands_dave"
    },
    stats: {
      totalTokensCreated: 3,
      totalMarketCap: "$5.8M",
      followers: 892
    },
    joinedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString() // 3 months ago
  }
];

// Rich mock token data for vibrant UI
export const mockCoins: MockCoin[] = [
  // Successfully migrated tokens (high progress, high price changes)
  {
    id: "0x1234567890123456789012345678901234567890",
    name: "RabbitRocket",
    ticker: "RABBIT",
    image: "",
    logo: "RABBIT",
    contractAddress: "0x1234567890123456789012345678901234567890",
    contract: "0x1234567890123456789012345678901234567890",
    marketCap: "2.5M",
    progress: 100,
    priceChange: 450.2,
    bnbCollected: "487.5",
    isLive: true,
    created_at: '10 hours ago', // Simple format
    creatorId: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    creatorName: "CryptoWhale",
    creatorAvatar: "https://picsum.photos/seed/cryptowhale/200/200.jpg"
  },
  {
    id: "0x9876543210987654321098765432109876543210",
    name: "MoonDoge",
    ticker: "MOONDOGE",
    image: "",
    logo: "MOONDOGE",
    contractAddress: "0x9876543210987654321098765432109876543210",
    contract: "0x9876543210987654321098765432109876543210",
    marketCap: "1.8M",
    progress: 100,
    priceChange: 320.8,
    bnbCollected: "325.8",
    isLive: true,
    created_at: '15 days ago', // Simple format
    creatorId: "0x8ba1f109551bD432803012645Hac136c",
    creatorName: "Moonshot Mike",
    creatorAvatar: "https://picsum.photos/seed/moonshotmike/200/200.jpg"
  },
  {
    id: "0x1111111111111111111111111111111111111111111",
    name: "Unity Token",
    ticker: "UNITY",
    image: "",
    logo: "UNITY",
    contractAddress: "0x1111111111111111111111111111111111111111111",
    contract: "0x1111111111111111111111111111111111111111111",
    marketCap: "13.46M",
    progress: 100,
    priceChange: 180.5,
    bnbCollected: "256.4",
    isLive: true,
    created_at: '17 days ago', // Simple format
    creatorId: "0x19d2e8bD3bF8c8c2E8a5a6b7c8d9e0f1a2b3c4d5e6f7",
    creatorName: "MemeQueen",
    creatorAvatar: "https://picsum.photos/seed/memequeen/200/200.jpg"
  },

  // Active bonding tokens (medium progress, various price changes)
  {
    id: "0x2222222222222222222222222222222222222222222",
    name: "Binary Token",
    ticker: "BINARY",
    image: "",
    logo: "BINARY",
    contractAddress: "0x2222222222222222222222222222222222222222222",
    contract: "0x2222222222222222222222222222222222222222222",
    marketCap: "800K",
    progress: 65,
    priceChange: 89.3,
    bnbCollected: "143.2",
    isLive: true,
    created_at: '5 days ago', // Simple format
    creatorId: "0x123456789abcdef1234567890abcdef1234567890",
    creatorName: "Diamond Hands Dave",
    creatorAvatar: "https://picsum.photos/seed/diamondhands/200/200.jpg"
  },
  {
    id: "0x3333333333333333333333333333333333333333333",
    name: "Triplet Token",
    ticker: "TRIPLE",
    image: "",
    logo: "TRIPLE",
    contractAddress: "0x3333333333333333333333333333333333333333333",
    contract: "0x3333333333333333333333333333333333333333333",
    marketCap: "11.66M",
    progress: 45,
    priceChange: 45.7,
    bnbCollected: "89.7",
    isLive: true,
    created_at: '3 days ago', // Simple format
    creatorId: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    creatorName: "CryptoWhale",
    creatorAvatar: "https://picsum.photos/seed/cryptowhale/200/200.jpg"
  },
  {
    id: "0x4444444444444444444444444444444444444",
    name: "Quadrant Token",
    ticker: "QUAD",
    image: "",
    logo: "QUAD",
    contractAddress: "0x4444444444444444444444444444444444444",
    contract: "0x4444444444444444444444444444444444444",
    marketCap: "5.33M",
    progress: 35,
    priceChange: 23.1,
    bnbCollected: "67.5",
    isLive: true,
    created_at: '4 days ago', // Simple format
    creatorId: "0x19d2e8bD3bF8c8c2E8a5a6b7c8d9e0f1a2b3c4d5e6f7",
    creatorName: "MemeQueen",
    creatorAvatar: "https://picsum.photos/seed/memequeen/200/200.jpg"
  },

  // Additional featured tokens with creator info
  {
    id: "0x5555555555555555555555555555555555555555",
    name: "DiamondPaws",
    ticker: "DIAMOND",
    image: "",
    logo: "DIAMOND",
    contractAddress: "0x5555555555555555555555555555555555555555",
    contract: "0x5555555555555555555555555555555555555555",
    marketCap: "4.5M",
    progress: 78,
    priceChange: 156.8,
    bnbCollected: "156.8",
    isLive: true,
    created_at: '2 days ago', // Simple format
    creatorId: "0x123456789abcdef1234567890abcdef1234567890",
    creatorName: "Diamond Hands Dave",
    creatorAvatar: "https://picsum.photos/seed/diamondhands/200/200.jpg"
  },
  {
    id: "0x6666666666666666666666666666666666666666",
    name: "BabyWhale",
    ticker: "BABYWHALE",
    image: "",
    logo: "BABYWHALE",
    contractAddress: "0x6666666666666666666666666666666666666666",
    contract: "0x6666666666666666666666666666666666666666",
    marketCap: "600K",
    progress: 15,
    priceChange: 12.3,
    bnbCollected: "23.4",
    isLive: true,
    created_at: '1 day ago', // Simple format
    creatorId: "0x8ba1f109551bD432803012645Hac136c",
    creatorName: "Moonshot Mike",
    creatorAvatar: "https://picsum.photos/seed/moonshotmike/200/200.jpg"
  },
  {
    id: "0x7777777777777777777777777777777777777777",
    name: "StonerSatoshi",
    ticker: "STONER",
    image: "",
    logo: "STONER",
    contractAddress: "0x7777777777777777777777777777777777777777",
    contract: "0x7777777777777777777777777777777777777777",
    marketCap: "2.94M",
    progress: 8,
    priceChange: -5.2,
    bnbCollected: "15.2",
    isLive: true,
    created_at: '1 day ago', // Simple format
    creatorId: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    creatorName: "CryptoWhale",
    creatorAvatar: "https://picsum.photos/seed/cryptowhale/200/200.jpg"
  },
  {
    id: "0x8888888888888888888888888888888888888888888888",
    name: "FireFrog",
    ticker: "FIREFROG",
    image: "",
    logo: "FIREFROG",
    contractAddress: "0x8888888888888888888888888888888888888888888888",
    contract: "0x8888888888888888888888888888888888888888888888",
    marketCap: "2.66M",
    progress: 5,
    priceChange: -12.8,
    bnbCollected: "8.9",
    isLive: true,
    created_at: '12 hours ago', // Simple format
    creatorId: "0x19d2e8bD3bF8c8c2E8a5a6b7c8d9e0f1a2b3c4d5e6f7",
    creatorName: "MemeQueen",
    creatorAvatar: "https://picsum.photos/seed/memequeen/200/200.jpg"
  },

  // Your created token
  {
    id: "0x26a2bbaa6724591478a1fec2fec7a7ee4ec4fe54",
    name: "Pluto",
    ticker: "PLUTO",
    image: "",
    logo: "PLUTO",
    contractAddress: "0x26a2bbaa6724591478a1fec2fec7a7ee4ec4fe54",
    contract: "0x26a2bbaa6724591478a1fec2fec7a7ee4ec4fe54",
    marketCap: "10K",
    progress: 0,
    priceChange: 12.5,
    bnbCollected: "0.001",
    isLive: true,
    created_at: 'Just now', // Simple format
    creatorId: "0x0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1",
    creatorName: "RabbitFun Platform",
    creatorAvatar: "https://picsum.photos/seed/rabbitfun/200/200.jpg"
  },

  // Bakpao Token - Successfully Tested Token
  {
    id: "0xa16E02E87b7454126E5E10d957A927A7F5B5d2be",
    name: "Bakpao Token",
    ticker: "BAKPAO",
    image: "",
    logo: "🥟", // Bakpao emoji
    contractAddress: "0xa16E02E87b7454126E5E10d957A927A7F5B5d2be",
    contract: "0xa16E02E87b7454126E5E10d957A927A7F5B5d2be",
    marketCap: "0.05K",
    progress: 0.14,
    priceChange: 25.8,
    bnbCollected: "0.049",
    isLive: true,
    created_at: 'Just now', // Simple format
    creatorId: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Deployer address from test
    creatorName: "Test Creator",
    creatorAvatar: "https://picsum.photos/seed/bakpao-creator/200/200.jpg"
  }
];

// Helper function to get creator by wallet address
export const getCreatorByAddress = (address: string): Creator | undefined => {
  return mockCreators.find(creator => creator.walletAddress.toLowerCase() === address.toLowerCase());
};

// Helper function to get tokens by creator
export const getTokensByCreator = (creatorAddress: string): MockCoin[] => {
  return mockCoins.filter(coin => coin.creatorId?.toLowerCase() === creatorAddress.toLowerCase());
};