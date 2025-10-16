import type { TokenInfo } from '@/types/api';

export interface TrendingTokenData {
  id: string;
  name: string;
  ticker: string;
  image_url: string;
  change_24h: number;
  bonding_progress?: number;
  contract_address: string;
  created_at?: string;
}

export interface FeaturedTokenData {
  id: string;
  name: string;
  ticker: string;
  image_url: string;
  creator: string;
  market_cap: string;
  change_24h: number;
  description: string;
  contract_address: string;
  bonding_progress?: number;
  created_at?: string;
  volume_24h?: string;
  holders?: number;
}

/**
 * Mengkonversi TokenInfo ke format TrendingTokenData
 */
export const convertToTrendingToken = (token: TokenInfo): TrendingTokenData => {
  // Generate random change 24h between -20% to +50%
  const change_24h = Math.floor(Math.random() * 70) - 20;

  // Generate bonding progress based on graduated status and totalBNB
  const totalBNB = parseFloat(token.totalBNB || '0');
  const bonding_progress = token.graduated
    ? 100
    : Math.min(Math.max((totalBNB / 510) * 100, 5), 95);

  return {
    id: token.tokenAddress,
    name: token.name,
    ticker: token.symbol,
    image_url: token.metadata || `https://picsum.photos/seed/${token.symbol}/200/200.jpg`,
    change_24h,
    bonding_progress,
    contract_address: token.tokenAddress,
    created_at: token.createdAt
  };
};

/**
 * Mengkonversi TokenInfo ke format FeaturedTokenData
 */
export const convertToFeaturedToken = (token: TokenInfo): FeaturedTokenData => {
  // Generate random change 24h between -30% to +60%
  const change_24h = Math.floor(Math.random() * 90) - 30;

  // Calculate market cap from soldSupply and current price
  const soldSupply = parseFloat(token.soldSupply || '0');
  const totalBNB = parseFloat(token.totalBNB || '0');
  const currentPrice = soldSupply > 0 ? totalBNB / soldSupply : 0.0001;
  const marketCap = soldSupply * currentPrice;

  // Generate volume 24h (30-80% of totalBNB)
  const volume_24h = (totalBNB * (0.3 + Math.random() * 0.5)).toFixed(2);

  // Generate holders count (100-5000)
  const holders = Math.floor(Math.random() * 4900) + 100;

  // Generate bonding progress
  const bonding_progress = token.graduated
    ? 100
    : Math.min(Math.max((totalBNB / 510) * 100, 10), 90);

  // Generate description based on token properties
  const descriptions = [
    `Experience the future of decentralized finance with ${token.name}, a revolutionary token built on the Binance Smart Chain. With innovative tokenomics and strong community backing, ${token.name} is poised for exponential growth.`,
    `${token.name} represents the next generation of digital assets. Our mission is to create sustainable value through strategic partnerships and cutting-edge blockchain technology.`,
    `Join the ${token.name} revolution! This innovative token combines the power of decentralized finance with real-world utility. Strong fundamentals and active development team.`
  ];
  const description = descriptions[Math.floor(Math.random() * descriptions.length)];

  return {
    id: token.tokenAddress,
    name: token.name,
    ticker: token.symbol,
    image_url: token.metadata || `https://picsum.photos/seed/${token.symbol}/200/200.jpg`,
    creator: token.creator || 'Unknown Creator',
    market_cap: `$${marketCap.toFixed(2)}`,
    change_24h,
    description,
    contract_address: token.tokenAddress,
    bonding_progress,
    created_at: token.createdAt,
    volume_24h: `$${volume_24h}`,
    holders
  };
};

/**
 * Filter tokens untuk featured (yang terbaik)
 */
export const getFeaturedTokens = (tokens: TokenInfo[], limit: number = 3): FeaturedTokenData[] => {
  return tokens
    .filter(token => parseFloat(token.totalBNB || '0') > 50) // Minimum 50 BNB
    .sort((a, b) => parseFloat(b.totalBNB || '0') - parseFloat(a.totalBNB || '0'))
    .slice(0, limit)
    .map(convertToFeaturedToken);
};

/**
 * Filter tokens untuk trending (volume tinggi)
 */
export const getTrendingTokens = (tokens: TokenInfo[], limit: number = 12): TrendingTokenData[] => {
  return tokens
    .filter(token => parseFloat(token.totalBNB || '0') > 10) // Minimum 10 BNB
    .sort((a, b) => parseFloat(b.totalBNB || '0') - parseFloat(a.totalBNB || '0'))
    .slice(0, limit)
    .map(convertToTrendingToken);
};