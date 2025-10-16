export interface Project {
  id: string;
  name: string;
  ticker: string;
  logo: string;
  marketCap: string;
  progress: number;
  isLive: boolean;
  bnbCollected: string;
  contract: string;
  priceChange: number;
}

export interface FeaturedCoin {
  id: string;
  name: string;
  ticker: string;
  contract: string;
  marketCap: string;
  progress: number;
  logo: string;
  priceChange: number;
}

export const hotProjects: Project[] = [
  {
    id: "1",
    name: "Moon Rabbit",
    ticker: "MRAB",
    logo: "🐰",
    marketCap: "245K",
    progress: 78,
    isLive: true,
    bnbCollected: "12.5",
    contract: "0x1234567890123456789012345678901234567890",
    priceChange: 15.3,
  },
  {
    id: "2",
    name: "Cyber Bunny",
    ticker: "CYBN",
    logo: "🤖",
    marketCap: "189K",
    progress: 65,
    isLive: true,
    bnbCollected: "9.8",
    contract: "0x2345678901234567890123456789012345678901",
    priceChange: -8.2,
  },
  {
    id: "3",
    name: "Rocket Hare",
    ticker: "RHAR",
    logo: "🚀",
    marketCap: "312K",
    progress: 92,
    isLive: true,
    bnbCollected: "15.2",
    contract: "0x3456789012345678901234567890123456789012",
    priceChange: 28.7,
  },
  {
    id: "4",
    name: "Diamond Paws",
    ticker: "DPAW",
    logo: "💎",
    marketCap: "156K",
    progress: 45,
    isLive: true,
    bnbCollected: "7.3",
    contract: "0x4567890123456789012345678901234567890123",
    priceChange: -3.5,
  },
  {
    id: "5",
    name: "Neon Leap",
    ticker: "NLEP",
    logo: "⚡",
    marketCap: "428K",
    progress: 88,
    isLive: true,
    bnbCollected: "18.9",
    contract: "0x5678901234567890123456789012345678901234",
    priceChange: 42.1,
  },
];

export const featuredCoins: FeaturedCoin[] = [
  {
    id: "1",
    name: "Alpha Rabbit",
    ticker: "ARAB",
    contract: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    marketCap: "1.2M",
    progress: 100,
    logo: "🏆",
    priceChange: 125.6,
  },
  {
    id: "2",
    name: "Turbo Hop",
    ticker: "THOP",
    contract: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
    marketCap: "890K",
    progress: 100,
    logo: "⚡",
    priceChange: 78.4,
  },
  {
    id: "3",
    name: "Galaxy Bunny",
    ticker: "GBNV",
    contract: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
    marketCap: "756K",
    progress: 100,
    logo: "🌌",
    priceChange: 56.2,
  },
  {
    id: "4",
    name: "Quantum Jump",
    ticker: "QJMP",
    contract: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    marketCap: "623K",
    progress: 100,
    logo: "🔮",
    priceChange: -12.3,
  },
  {
    id: "5",
    name: "Stellar Hop",
    ticker: "SHOP",
    contract: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    marketCap: "534K",
    progress: 100,
    logo: "⭐",
    priceChange: 34.8,
  },
  {
    id: "6",
    name: "Cosmic Carrot",
    ticker: "CCAR",
    contract: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    marketCap: "487K",
    progress: 100,
    logo: "🥕",
    priceChange: -5.7,
  },
];
