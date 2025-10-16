// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Token Related Types
export interface TokenInfo {
  tokenAddress: string;
  name: string;
  symbol: string;
  metadata: string;
  creator: string;
  soldSupply: string;
  totalBNB: string;
  initialPrice: string;
  slope?: string;
  graduated: boolean;
  exists: boolean;
  createdAt?: string;
  lastTradeTime?: string;
  totalPlatformFees?: string;
  totalCreatorFees?: string;
  bondingCurveLiquidity?: string;
  liquidityPoolAmount?: string;
}

export interface CreateTokenData {
  name: string;
  symbol: string;
  metadata: string;
}

export interface TokenListResponse {
  tokens: TokenInfo[];
  totalTokens: number;
  page?: number;
  limit?: number;
}

// Bonding Curve Types
export interface BondingCurveConfig {
  P0: number;
  S: number;
  k: number;
  PLATFORM_FEE: number;
  CREATOR_FEE: number;
  TOTAL_FEE: number;
  GROSS_RAISE: number;
  NET_RAISE: number;
  INITIAL_PRICE_WEI: number;
  TOTAL_SUPPLY_TOKENS: number;
  TRADING_SUPPLY_TOKENS: number;
  GRADUATION_SUPPLY_TOKENS: number;
}

export interface PriceCalculation {
  currentPrice: number;
  tokensOut: number;
  bnbOut: number;
  priceImpact: number;
  fee: number;
  platformFee: number;
  creatorFee: number;
  netAmount: number;
}

export interface BondingCurveState {
  currentSupply: number;
  totalRaised: number;
  currentPrice: number;
  marketCap: number;
  progress: number;
  priceChange: number;
  bondingCurvePool: number;
  liquidityPool: number;
  platformFees: number;
  creatorFees: number;
}

// Transaction Types
export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasUsed: string;
  gasPrice: string;
  status: 'pending' | 'success' | 'failed';
  timestamp: string;
  blockNumber?: number;
  type: 'buy' | 'sell' | 'create' | 'graduate';
  tokenAddress?: string;
  tokenAmount?: string;
  bnbAmount?: string;
}

export interface TransactionHistory {
  transactions: Transaction[];
  totalCount: number;
  page?: number;
  limit?: number;
}

// User Related Types
export interface UserProfile {
  address: string;
  totalTokensCreated: number;
  totalInvested: string;
  totalEarned: string;
  favoriteTokens: string[];
  createdAt: string;
  lastActiveAt: string;
}

export interface UserPortfolio {
  address: string;
  tokens: {
    tokenAddress: string;
    name: string;
    symbol: string;
    balance: string;
    valueInBNB: string;
    valueInUSD?: string;
    priceChange24h?: number;
  }[];
  totalValueInBNB: string;
  totalValueInUSD?: string;
  totalProfitLoss?: string;
  totalProfitLossPercent?: number;
}

// Market Data Types
export interface MarketStats {
  totalTokensCreated: number;
  totalVolume24h: string;
  totalFeesCollected: string;
  activeTokens24h: number;
  topGainers: {
    tokenAddress: string;
    name: string;
    symbol: string;
    priceChange24h: number;
    volume24h: string;
  }[];
  topLosers: {
    tokenAddress: string;
    name: string;
    symbol: string;
    priceChange24h: number;
    volume24h: string;
  }[];
}

// Analytics Types
export interface TokenAnalytics {
  tokenAddress: string;
  holders: number;
  transactions: number;
  volume24h: string;
  priceHistory: {
    timestamp: string;
    price: number;
    volume: string;
  }[];
  holderDistribution: {
    range: string;
    count: number;
    percentage: number;
  }[];
  topHolders: {
    address: string;
    balance: string;
    percentage: number;
  }[];
}

export interface GlobalAnalytics {
  totalUsers: number;
  totalTransactions: number;
  totalVolume: string;
  dailyActiveUsers: number;
  dailyVolume: string;
  popularTokens: {
    tokenAddress: string;
    name: string;
    symbol: string;
    volume24h: string;
    holders: number;
  }[];
}

// Search & Filter Types
export interface SearchParams {
  query?: string;
  sortBy?: 'created' | 'volume' | 'price' | 'holders';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  category?: string;
  minMarketCap?: number;
  maxMarketCap?: number;
}

export interface FilterOptions {
  priceRange: [number, number];
  volumeRange: [number, number];
  holderRange: [number, number];
  categories: string[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// Error Types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// Pagination Types
export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// WebSocket Event Types
export interface WebSocketEvent {
  type: 'token_price_update' | 'new_transaction' | 'token_created' | 'token_graduated';
  data: any;
  timestamp: string;
}

export interface TokenPriceUpdate {
  tokenAddress: string;
  price: number;
  priceChange24h: number;
  volume24h: string;
}

export interface NewTransactionEvent {
  hash: string;
  type: 'buy' | 'sell' | 'create' | 'graduate';
  tokenAddress: string;
  from: string;
  value: string;
  timestamp: string;
}