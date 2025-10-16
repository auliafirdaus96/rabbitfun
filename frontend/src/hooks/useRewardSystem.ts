import { useState, useEffect, useCallback } from 'react';
import {
  TokenInfo,
  CreatorRewardData,
  TokenRewardData,
  TransactionData,
  RewardClaim,
  MigrationEvent,
  PlatformStats,
  CreatorAnalytics,
  FeeDistribution,
  convertFromWei,
  REWARD_CONSTANTS
} from '@/contracts/interfaces';
import {
  calculateFeeDistribution,
  calculateTokenRewards,
  calculateTotalRewards,
  CreatorRewards,
  FEE_RATES
} from '@/utils/rewardCalculation';
import {
  mockTokens,
  mockTransactions,
  mockReferrals,
  mockMarketData,
  getTokensByCreator,
  getTokenByAddress,
  getTrendingTokens,
  getMigratedTokens,
  getBondingTokens
} from '@/data/mockTokens';

const convertToWei = (bnb: string): string => {
  return (parseFloat(bnb) * 1e18).toString();
};

export const useRewardSystem = (creatorAddress?: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [pendingRewards, setPendingRewards] = useState<RewardClaim[]>([]);

  // Load creator's tokens
  const loadCreatorTokens = useCallback(async () => {
    if (!creatorAddress) return;

    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Filter tokens created by this address
      const creatorTokens = getTokensByCreator(creatorAddress);

      setTokens(creatorTokens);
    } catch (err) {
      setError('Failed to load creator tokens');
      console.error('Error loading tokens:', err);
    } finally {
      setIsLoading(false);
    }
  }, [creatorAddress]);

  // Calculate creator rewards
  const calculateCreatorRewards = useCallback((): CreatorRewardData => {
    if (!creatorAddress) {
      throw new Error('Creator address is required');
    }

    // Convert mock tokens to reward calculation format
    const tokenRewards: CreatorRewards[] = tokens.map(token => ({
      tokenAddress: token.tokenAddress,
      totalVolume: parseFloat(token.volume),
      rewards: parseFloat(token.volume) * FEE_RATES.CREATOR_FEE,
      totalRewards: parseFloat(token.volume) * FEE_RATES.CREATOR_FEE,
      isMigrated: !token.isInBonding,
      migrationDate: token.migrationDate
    }));

    const summary = calculateTotalRewards(tokenRewards);

    return {
      creator: creatorAddress,
      totalVolume: summary.totalVolume.toString(),
      immediateRewards: summary.totalRewards.toString(),
      migrationRewards: '0',
      totalRewards: summary.totalRewards.toString(),
      claimedRewards: summary.totalPaidRewards.toString(),
      pendingRewards: '0',
      tokensCreated: tokenRewards.length,
      totalTokensCreated: tokenRewards.length,
      tier: {
        level: summary.totalVolume > 100 ? 'GOLD' : summary.totalVolume > 25 ? 'SILVER' : 'BRONZE',
        requiredVolume: summary.totalVolume > 100 ? '100' : summary.totalVolume > 25 ? '25' : '10',
        feeShare: summary.totalVolume > 100 ? '0.0075' : summary.totalVolume > 25 ? '0.006' : '0.005',
        maxTokensPerMonth: summary.totalVolume > 100 ? 20 : summary.totalVolume > 25 ? 10 : 3,
        benefits: summary.totalVolume > 100 ?
          ['Enhanced visibility', 'Priority support', 'Lower fees', 'Analytics access'] :
          summary.totalVolume > 25 ?
          ['Basic visibility', 'Standard support', 'Moderate fees'] :
          ['Limited visibility', 'Community support'],
        multiplier: summary.totalVolume > 100 ? 1.5 : summary.totalVolume > 25 ? 1.2 : 1.0
      },
      achievements: [
        {
          id: 'first_token',
          type: 'TOKENS_CREATED',
          title: 'First Token Created',
          description: 'Created your first token on RabbitFun',
          icon: '🎯',
          progress: '1',
          target: '1',
          reward: '0.1',
          unlockedAt: new Date(tokens[0]?.createdAt || Date.now()).toISOString(),
          isCompleted: true
        },
        {
          id: 'volume_milestone',
          type: 'VOLUME',
          title: 'Volume Milestone',
          description: 'Reached 50 BNB trading volume',
          icon: '📊',
          progress: Math.min(summary.totalVolume, 50).toString(),
          target: '50',
          reward: '0.5',
          isCompleted: summary.totalVolume >= 50
        }
      ]
    };
  }, [creatorAddress, tokens]);

  // Get specific token rewards
  const getTokenRewards = useCallback((tokenAddress: string): TokenRewardData => {
    const token = tokens.find(t => t.tokenAddress === tokenAddress);
    if (!token) {
      throw new Error('Token not found');
    }

    const volume = parseFloat(token.volume);
    const calculation = calculateFeeDistribution(volume);

    return {
      tokenAddress: token.tokenAddress,
      creator: token.creator,
      totalVolume: volume.toString(),
      immediateRewardsEarned: calculation.creatorFee.toString(),
      migrationRewardsEarned: token.isInBonding ? '0' : '0',
      migrationRewardsPending: token.isInBonding ? '0' : '0',
      isMigrated: !token.isInBonding,
      migrationDate: token.migrationDate,
      feeDistribution: {
        platformFee: calculation.platformFee.toString(),
        creatorImmediate: calculation.creatorFee.toString(),
        creatorMigration: '0',
        totalFee: calculation.totalFee.toString()
      }
    };
  }, [tokens]);

  // Claim rewards for a specific token
  const claimRewards = useCallback(async (tokenAddress: string): Promise<TransactionData> => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate transaction delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      const tokenRewards = getTokenRewards(tokenAddress);
      const claimAmount = tokenRewards.isMigrated ?
        tokenRewards.migrationRewardsEarned :
        '0';

      const transaction: TransactionData = {
        hash: `0x${Math.random().toString(16).substr(2, 64)}`,
        blockNumber: 12345 + Math.floor(Math.random() * 1000),
        timestamp: Date.now(),
        from: creatorAddress || '',
        to: tokenAddress,
        value: claimAmount,
        gasUsed: '50000',
        gasPrice: '20000000000',
        type: 'CLAIM',
        tokenAddress,
        volume: tokenRewards.totalVolume,
        feeBreakdown: tokenRewards.feeDistribution
      };

      // Update token status if claiming migration rewards
      if (!tokenRewards.isMigrated && parseFloat(claimAmount) > 0) {
        setTokens(prev => prev.map(token =>
          token.tokenAddress === tokenAddress
            ? { ...token, isInBonding: false, migrationDate: new Date().toISOString() }
            : token
        ));
      }

      return transaction;
    } catch (err) {
      setError('Failed to claim rewards');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [creatorAddress, getTokenRewards]);

  // Claim all available rewards
  const claimAllRewards = useCallback(async (): Promise<TransactionData[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const claims: TransactionData[] = [];

      for (const token of tokens) {
        if (token.isInBonding || !creatorAddress || token.creator.toLowerCase() !== creatorAddress.toLowerCase()) {
          continue;
        }

        try {
          const claim = await claimRewards(token.tokenAddress);
          claims.push(claim);
        } catch (err) {
          console.error(`Failed to claim rewards for ${token.tokenAddress}:`, err);
        }
      }

      return claims;
    } catch (err) {
      setError('Failed to claim all rewards');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [creatorAddress, tokens, claimRewards]);

  // Get transaction history
  const getTransactionHistory = useCallback(async (limit: number = 10): Promise<TransactionData[]> => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      return mockTransactions.slice(0, limit);
    } catch (err) {
      setError('Failed to fetch transaction history');
      return [];
    }
  }, []);

  // Get platform statistics
  const getPlatformStats = useCallback(async (): Promise<PlatformStats> => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      const totalVolume = tokens.reduce((sum, token) => sum + parseFloat(token.volume), 0);
      const totalFees = totalVolume * FEE_RATES.TOTAL_FEE; // 1.25% total fee
      const creatorRewards = totalFees * (FEE_RATES.CREATOR_FEE / FEE_RATES.TOTAL_FEE); // 20% to creators
      const platformRewards = totalFees * (FEE_RATES.PLATFORM_FEE / FEE_RATES.TOTAL_FEE); // 80% to platform

      return {
        totalVolume: totalVolume.toString(),
        totalFeesCollected: totalFees.toString(),
        totalRewardsPaid: creatorRewards.toString(),
        activeCreators: 1, // Mock data
        totalTokensCreated: tokens.length,
        tokensMigrated: tokens.filter(t => !t.isInBonding).length,
        averageVolumePerToken: (totalVolume / tokens.length).toString(),
        topCreator: creatorAddress || '',
        totalLiquidity: '1000', // Mock data
        revenueDistribution: {
          platform: platformRewards.toString(),
          creators: creatorRewards.toString(),
          treasury: '0'
        }
      };
    } catch (err) {
      setError('Failed to fetch platform statistics');
      throw err;
    }
  }, [tokens, creatorAddress]);

  // Load initial data
  useEffect(() => {
    loadCreatorTokens();
  }, [loadCreatorTokens]);

  return {
    // State
    isLoading,
    error,
    tokens,
    transactions,
    pendingRewards,

    // Methods
    loadCreatorTokens,
    calculateCreatorRewards,
    getTokenRewards,
    claimRewards,
    claimAllRewards,
    getTransactionHistory,
    getPlatformStats,

    // Utilities
    refresh: () => {
      loadCreatorTokens();
    },
    clearError: () => setError(null)
  };
};