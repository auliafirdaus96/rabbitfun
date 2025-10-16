/**
 * Smart Contract Interfaces for RabbitFun Launchpad
 *
 * These interfaces define the structure for interacting with the reward system
 * using the 2-way fee split: 1% platform, 0.25% creator immediate
 */

export interface TokenInfo {
  tokenAddress: string;
  name: string;
  symbol: string;
  totalSupply: string;
  creator: string;
  createdAt: string;
  currentPrice: string;
  marketCap: string;
  volume: string;
  isInBonding: boolean;
  migrationDate?: string;
  liquidityPoolAddress?: string;
}

export interface CreatorRewardData {
  creator: string;
  totalVolume: string;
  immediateRewards: string;
  migrationRewards: string;
  totalRewards: string;
  claimedRewards: string;
  pendingRewards: string;
  tokensCreated: number;
  totalTokensCreated: number;
  tier: CreatorTier;
  achievements: Achievement[];
}

export interface TokenRewardData {
  tokenAddress: string;
  creator: string;
  totalVolume: string;
  immediateRewardsEarned: string;
  migrationRewardsEarned: string;
  migrationRewardsPending: string;
  isMigrated: boolean;
  migrationDate?: string;
  feeDistribution: FeeDistribution;
}

export interface FeeDistribution {
  platformFee: string;  // 1.0% of volume
  creatorFee: string;    // 0.25% of volume
  totalFee: string;      // 1.25% of volume
}

export interface TransactionData {
  hash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string;
  value: string;
  gasUsed: string;
  gasPrice: string;
  type: 'BUY' | 'SELL' | 'CREATE' | 'MIGRATE' | 'CLAIM';
  tokenAddress?: string;
  volume?: string;
  feeBreakdown?: FeeDistribution;
}

export interface CreatorTier {
  level: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';
  requiredVolume: string;
  feeShare: string;
  maxTokensPerMonth: number;
  benefits: string[];
  multiplier: number;
}

export interface Achievement {
  id: string;
  type: 'VOLUME' | 'TOKENS_CREATED' | 'REFERRALS' | 'MIGRATION_SPEED';
  title: string;
  description: string;
  icon: string;
  progress: string;
  target: string;
  reward: string;
  unlockedAt?: string;
  isCompleted: boolean;
}

export interface RewardClaim {
  claimId: string;
  creator: string;
  tokenAddress: string;
  amount: string;
  claimType: 'IMMEDIATE' | 'MIGRATION' | 'BONUS';
  claimStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  transactionHash?: string;
  claimedAt?: string;
  processedAt?: string;
  errorMessage?: string;
}

export interface MigrationEvent {
  tokenAddress: string;
  creator: string;
  migrationPrice: string;
  totalVolume: string;
  migrationRewards: string;
  platformRewards: string;
  timestamp: string;
  blockNumber: number;
  transactionHash: string;
  liquidityAmount: string;
  dexAddress: string;
}

export interface PlatformStats {
  totalVolume: string;
  totalFeesCollected: string;
  totalRewardsPaid: string;
  activeCreators: number;
  totalTokensCreated: number;
  tokensMigrated: number;
  averageVolumePerToken: string;
  topCreator: string;
  totalLiquidity: string;
  revenueDistribution: {
    platform: string;
    creators: string;
    treasury: string;
  };
}

export interface ReferralData {
  referrer: string;
  referred: string;
  tokenAddress: string;
  referralCode: string;
  commissionRate: string;
  totalCommission: string;
  claimedCommission: string;
  referralDate: string;
  isActive: boolean;
}

export interface CreatorAnalytics {
  creator: string;
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  startDate: string;
  endDate: string;
  volume: string;
  fees: string;
  rewards: string;
  tokensCreated: number;
  successfulMigrations: number;
  averageTokenPerformance: string;
  topPerformingToken?: string;
  growthMetrics: {
    volumeGrowth: string;
    rewardGrowth: string;
    tokenCreationGrowth: number;
  };
}

// Contract function interfaces
export interface LaunchpadContract {
  // Token creation functions
  createToken(
    name: string,
    symbol: string,
    totalSupply: string,
    description: string,
    imageUrl: string
  ): Promise<TransactionData>;

  // Trading functions
  buyToken(tokenAddress: string, amount: string): Promise<TransactionData>;
  sellToken(tokenAddress: string, amount: string): Promise<TransactionData>;

  // Migration functions
  migrateToken(tokenAddress: string, dexRouter: string): Promise<TransactionData>;

  // Reward functions
  claimRewards(tokenAddress: string): Promise<TransactionData>;
  claimAllRewards(): Promise<TransactionData>;

  // Query functions
  getTokenInfo(tokenAddress: string): Promise<TokenInfo>;
  getCreatorRewards(creator: string): Promise<CreatorRewardData>;
  getTokenRewards(tokenAddress: string): Promise<TokenRewardData>;
  getPendingRewards(creator: string): Promise<string>;
  getClaimableRewards(creator: string, tokenAddress: string): Promise<string>;

  // Analytics functions
  getPlatformStats(): Promise<PlatformStats>;
  getCreatorAnalytics(creator: string, period: string): Promise<CreatorAnalytics>;
  getTransactionHistory(tokenAddress: string, limit: number): Promise<TransactionData[]>;

  // Event listeners
  onTokenCreated(callback: (event: TokenInfo) => void): void;
  onTrade(callback: (event: TransactionData) => void): void;
  onMigration(callback: (event: MigrationEvent) => void): void;
  onRewardClaimed(callback: (event: RewardClaim) => void): void;
}

export interface RewardContract {
  // Core reward functions
  calculateRewards(volume: string, creator: string): Promise<FeeDistribution>;
  distributeRewards(tokenAddress: string, volume: string): Promise<void>;
  claimCreatorRewards(tokenAddress: string): Promise<TransactionData>;
  claimPlatformRewards(): Promise<TransactionData>;

  // Migration reward functions
  calculateMigrationRewards(tokenAddress: string): Promise<string>;
  distributeMigrationRewards(tokenAddress: string): Promise<void>;
  getMigrationRewardsStatus(tokenAddress: string): Promise<{
    pending: string;
    claimed: string;
    total: string;
  }>;

  // Tier and achievement functions
  updateCreatorTier(creator: string): Promise<void>;
  getCreatorTier(creator: string): Promise<CreatorTier>;
  unlockAchievement(creator: string, achievementId: string): Promise<void>;
  getCreatorAchievements(creator: string): Promise<Achievement[]>;

  // Referral functions
  createReferralCode(referrer: string): Promise<string>;
  validateReferral(code: string): Promise<boolean>;
  distributeReferralRewards(referred: string, tokenAddress: string): Promise<void>;
  getReferralData(referrer: string): Promise<ReferralData[]>;

  // Query functions
  getTotalRewardsDistributed(): Promise<string>;
  getCreatorTotalRewards(creator: string): Promise<string>;
  getPendingRewards(tokenAddress: string): Promise<string>;
  getRewardHistory(creator: string, limit: number): Promise<RewardClaim[]>;

  // Event listeners
  onRewardsDistributed(callback: (event: { tokenAddress: string; rewards: FeeDistribution }) => void): void;
  onMigrationRewardsClaimed(callback: (event: { tokenAddress: string; amount: string }) => void): void;
  onTierUpdated(callback: (event: { creator: string; newTier: CreatorTier }) => void): void;
}

// Constants for the reward system
export const REWARD_CONSTANTS = {
  // Fee rates (as percentages, represented as basis points for precision)
  TOTAL_FEE_RATE: 125,        // 1.25%
  PLATFORM_FEE_RATE: 100,      // 1.0%
  CREATOR_RATE: 25,           // 0.25%

  // Minimum requirements
  MIN_VOLUME_FOR_REWARDS: 1,   // 1 BNB minimum volume
  MIN_LIQUIDITY_FOR_MIGRATION: 25, // 25 BNB minimum LP
  MIN_TOKENS_FOR_TIER_UPDATE: 1,

  // Tier thresholds (in BNB volume)
  BRONZE_TIER_THRESHOLD: 10,
  SILVER_TIER_THRESHOLD: 50,
  GOLD_TIER_THRESHOLD: 200,
  DIAMOND_TIER_THRESHOLD: 1000,

  // Multipliers for different tiers
  BRONZE_MULTIPLIER: 1.0,
  SILVER_MULTIPLIER: 1.2,
  GOLD_MULTIPLIER: 1.5,
  DIAMOND_MULTIPLIER: 2.0,

  // Maximum values
  MAX_TOKENS_PER_MONTH: {
    BRONZE: 3,
    SILVER: 10,
    GOLD: 20,
    DIAMOND: 50
  }
} as const;

// Error types
export interface RewardError {
  code: string;
  message: string;
  details?: any;
}

export const REWARD_ERRORS = {
  INSUFFICIENT_VOLUME: 'INSUFFICIENT_VOLUME',
  TOKEN_NOT_MIGRATED: 'TOKEN_NOT_MIGRATED',
  ALREADY_CLAIMED: 'ALREADY_CLAIMED',
  INSUFFICIENT_REWARDS: 'INSUFFICIENT_REWARDS',
  UNAUTHORIZED: 'UNAUTHORIZED',
  CONTRACT_ERROR: 'CONTRACT_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR'
} as const;

// Helper functions for conversion
export const convertToWei = (bnb: string): string => {
  return (parseFloat(bnb) * 1e18).toString();
};

export const convertFromWei = (wei: string): string => {
  return (parseFloat(wei) / 1e18).toString();
};

export const calculateBpsFromPercentage = (percentage: number): number => {
  return Math.round(percentage * 100);
};

export const calculatePercentageFromBps = (bps: number): number => {
  return bps / 10000;
};