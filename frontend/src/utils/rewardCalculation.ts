/**
 * Simple 2-way fee split calculation system
 * 1.25% total fee split into:
 * - 1.0% platform (80%)
 * - 0.25% creator immediate (20%)
 */

export interface FeeCalculation {
  totalVolume: number;
  totalFee: number;
  platformFee: number;
  creatorFee: number;
}

export interface CreatorRewards {
  tokenAddress: string;
  totalVolume: number;
  rewards: number;
  totalRewards: number;
}

export interface RewardSummary {
  // Lifetime rewards across all tokens
  totalVolume: number;
  totalRewards: number;
  totalPaidRewards: number;
}

// Constants for fee calculation (aligned with smart contract)
export const FEE_RATES = {
  TOTAL_FEE: 0.0125,              // 1.25% total trading fee
  PLATFORM_FEE: 0.01,             // 1.0% platform fee
  CREATOR_FEE: 0.0025             // 0.25% creator fee
} as const;

/**
 * Calculate fee distribution for a given trading volume
 */
export const calculateFeeDistribution = (volume: number): FeeCalculation => {
  const totalFee = volume * FEE_RATES.TOTAL_FEE;
  const platformFee = volume * FEE_RATES.PLATFORM_FEE;
  const creatorFee = volume * FEE_RATES.CREATOR_FEE;

  return {
    totalVolume: volume,
    totalFee,
    platformFee,
    creatorFee
  };
};

/**
 * Calculate creator rewards for a specific token
 */
export const calculateTokenRewards = (
  tokenAddress: string,
  currentVolume: number
): CreatorRewards => {
  const calculation = calculateFeeDistribution(currentVolume);

  return {
    tokenAddress,
    totalVolume: currentVolume,
    rewards: calculation.creatorFee,
    totalRewards: calculation.creatorFee
  };
};

/**
 * Calculate total creator rewards across multiple tokens
 */
export const calculateTotalRewards = (tokens: CreatorRewards[]): RewardSummary => {
  const summary = tokens.reduce(
    (acc, token) => {
      acc.totalVolume += token.totalVolume;
      acc.totalRewards += token.rewards;
      acc.totalPaidRewards += token.rewards;

      return acc;
    },
    {
      totalVolume: 0,
      totalRewards: 0,
      totalPaidRewards: 0
    }
  );

  return summary;
};

/**
 * Format BNB amount for display
 */
export const formatBNB = (amount: number | undefined | null, decimals: number = 4): string => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '0';
  }
  return amount.toFixed(decimals);
};

/**
 * Format USD amount (assuming BNB price)
 */
export const formatUSD = (bnbAmount: number | undefined | null, bnbPrice: number = 300, decimals: number = 2): string => {
  if (bnbAmount === undefined || bnbAmount === null || isNaN(bnbAmount)) {
    return '0';
  }
  const usdAmount = bnbAmount * bnbPrice;
  return usdAmount.toFixed(decimals);
};

/**
 * Calculate revenue projections for volume targets
 */
export const calculateProjections = (volumeTargets: number[]): Array<{ volume: number; creator: number; platform: number }> => {
  return volumeTargets.map(volume => {
    const calc = calculateFeeDistribution(volume);
    return {
      volume,
      creator: calc.creatorFee,
      platform: calc.platformFee
    };
  });
};

/**
 * Migration volume targets for gamification
 */
export const MILESTONES = [
  { volume: 10, label: "10 BNB", reward: 0.025 },   // 0.25% * 10 = 0.025 BNB
  { volume: 25, label: "25 BNB", reward: 0.0625 },  // 0.25% * 25 = 0.0625 BNB
  { volume: 50, label: "50 BNB", reward: 0.125 },   // 0.25% * 50 = 0.125 BNB
  { volume: 100, label: "100 BNB", reward: 0.25 },  // 0.25% * 100 = 0.25 BNB
  { volume: 200, label: "200 BNB", reward: 0.5 },   // 0.25% * 200 = 0.5 BNB
  { volume: 500, label: "500 BNB", reward: 1.25 },  // 0.25% * 500 = 1.25 BNB
  { volume: 1000, label: "1000 BNB", reward: 2.5 }  // 0.25% * 1000 = 2.5 BNB
] as const;

/**
 * Get next milestone for gamification
 */
export const getNextMilestone = (currentVolume: number): (typeof MILESTONES)[number] | null => {
  return MILESTONES.find(milestone => milestone.volume > currentVolume) || null;
};

/**
 * Get completed milestones
 */
export const getCompletedMilestones = (currentVolume: number): (typeof MILESTONES)[number][] => {
  return MILESTONES.filter(milestone => milestone.volume <= currentVolume);
};