import { useState, useEffect } from 'react';
import { useWeb3 } from './useWeb3';
import { useApi } from './useApi';
import * as useReactQuery from './useReactQuery';
import { useWebSocket } from './useWebSocket';
import type { TokenInfo, BondingCurveState } from '@/types/api';

interface UseTokenDataOptions {
  enableRealTime?: boolean;
  enablePriceCalculations?: boolean;
  refreshInterval?: number;
}

export function useTokenData(tokenAddress: string, options: UseTokenDataOptions = {}) {
  const { enableRealTime = true, enablePriceCalculations = true, refreshInterval = 30000 } = options;

  // Web3 integration for direct contract calls
  const { isConnected, getTokenBalance, getBNBBalance } = useWeb3();

  // React Query for cached API data
  const { data: tokenInfo, error: tokenError, isLoading: tokenLoading } = useReactQuery.useTokenInfo(tokenAddress);
  const { data: analytics, isLoading: analyticsLoading } = useReactQuery.useTokenAnalytics(tokenAddress);

  // WebSocket for real-time updates
  const { isConnected: wsConnected, subscribeToToken } = useWebSocket();

  // State for real-time data
  const [realTimeData, setRealTimeData] = useState<{
    price?: number;
    priceChange24h?: number;
    volume24h?: number;
    lastUpdate?: number;
  }>({});

  // Local state for balances
  const [userTokenBalance, setUserTokenBalance] = useState('0');
  const [userBNBBalance, setUserBNBBalance] = useState('0');

  // Subscribe to real-time updates
  useEffect(() => {
    if (enableRealTime && wsConnected) {
      subscribeToToken(tokenAddress);

      // Listen for price updates
      const handlePriceUpdate = (data: any) => {
        if (data.tokenAddress === tokenAddress) {
          setRealTimeData(prev => ({
            ...prev,
            price: data.price,
            priceChange24h: data.priceChange24h,
            volume24h: data.volume24h,
            lastUpdate: Date.now()
          }));
        }
      };

      webSocketService.on('token_price_update', handlePriceUpdate);

      // Listen for new transactions
      const handleNewTransaction = (data: any) => {
        if (data.tokenAddress === tokenAddress) {
          // Refresh token info when new transaction occurs
          // This will trigger React Query to refetch
          const queryClient = useReactQuery.useQueryClient();
          queryClient.invalidateQueries(useReactQuery.queryKeys.token(tokenAddress));
        }
      };

      webSocketService.on('new_transaction', handleNewTransaction);

      // Cleanup
      return () => {
        webSocketService.off('token_price_update', handlePriceUpdate);
        webSocketService.off('new_transaction', handleNewTransaction);
      };
    }
  }, [enableRealTime, wsConnected, tokenAddress]);

  // Load user balances when connected
  useEffect(() => {
    if (isConnected && tokenInfo) {
      loadUserBalances();
    }
  }, [isConnected, tokenInfo?.tokenAddress]);

  const loadUserBalances = async () => {
    try {
      const [tokenBalance, bnbBalance] = await Promise.all([
        getTokenBalance(tokenAddress),
        getBNBBalance()
      ]);
      setUserTokenBalance(tokenBalance);
      setUserBNBBalance(bnbBalance);
    } catch (error) {
      console.error('Error loading balances:', error);
    }
  };

  // Calculate bonding curve state using API
  const { data: bondingCurveState, isLoading: curveLoading } = useApi(
    () => apiService.getBondingCurveState(
      parseFloat(tokenInfo?.totalBNB || '0'),
      parseFloat(tokenInfo?.soldSupply || '0')
    ),
    [tokenInfo?.totalBNB, tokenInfo?.soldSupply]
  );

  // Price calculations
  const { calculations, calculating, calculateTokensOut, calculateBNBOut } = useApi.usePriceCalculator();

  // Refetch function
  const refetch = async () => {
    const queryClient = useReactQuery.useQueryClient();

    // Refetch all related queries
    await Promise.all([
      queryClient.invalidateQueries(useReactQuery.queryKeys.token(tokenAddress)),
      queryClient.invalidateQueries(useReactQuery.queryKeys.tokenAnalytics(tokenAddress))
    ]);

    // Reload balances
    if (isConnected) {
      await loadUserBalances();
    }
  };

  // Combined loading state
  const isLoading = tokenLoading || analyticsLoading || curveLoading;

  // Error state
  const error = tokenError;

  // Combined data
  const data = {
    tokenInfo: {
      ...tokenInfo,
      // Merge real-time price data
      ...(realTimeData.price && { currentPrice: realTimeData.price }),
      ...(realTimeData.priceChange24h !== undefined && { priceChange24h: realTimeData.priceChange24h }),
      ...(realTimeData.volume24h && { volume24h: realTimeData.volume24h }),
      lastUpdate: realTimeData.lastUpdate
    },
    analytics,
    bondingCurveState,
    userBalances: {
      tokenBalance: userTokenBalance,
      bnbBalance: userBNBBalance
    },
    realTimeData,
    calculations
  };

  return {
    data,
    isLoading,
    error,
    refetch,
    isConnected: isConnected && wsConnected,
    calculateTokensOut,
    calculateBNBOut,
    loadUserBalances
  };
}

// Hook for token list with search and filtering
export function useTokenList(initialParams: any = {}) {
  const [params, setParams] = useState(initialParams);
  const [searchQuery, setSearchQuery] = useState('');

  // Use React Query for cached data
  const {
    data: tokensData,
    isLoading,
    error,
    refetch
  } = useReactQuery.useTokens(params);

  // Search functionality
  const {
    searchResults,
    searchLoading,
    searchQuery: currentSearchQuery,
    setSearchQuery: setSearchQueryHandler
  } = useApi.useTokenSearch();

  // Combined tokens (search results or regular list)
  const tokens = searchQuery ? searchResults : tokensData?.tokens || [];

  const updateParams = (newParams: any) => {
    setParams(prev => ({ ...prev, ...newParams }));
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query) {
      setSearchQueryHandler(query);
      updateParams({ ...params, query, page: 1 });
    } else {
      setSearchQueryHandler('');
      const { query, ...rest } = params;
      updateParams(rest);
    }
  };

  return {
    tokens,
    isLoading: isLoading || searchLoading,
    error,
    refetch,
    params,
    updateParams,
    searchQuery,
    handleSearch,
    totalCount: tokensData?.totalTokens || 0,
    pagination: tokensData?.pagination
  };
}

// Hook for user portfolio
export function useUserPortfolio(address: string) {
  const { data: portfolio, isLoading, error, refetch } = useReactQuery.useUserPortfolio(address);
  const { data: profile } = useReactQuery.useUserProfile(address);

  // WebSocket subscription for portfolio updates
  const { subscribeToUser } = useWebSocket();

  useEffect(() => {
    if (address) {
      subscribeToUser(address);

      const handlePortfolioUpdate = (data: any) => {
        if (data.userAddress === address) {
          refetch();
        }
      };

      webSocketService.on('portfolio_update', handlePortfolioUpdate);

      return () => {
        webSocketService.off('portfolio_update', handlePortfolioUpdate);
      };
    }
  }, [address, refetch, subscribeToUser]);

  return {
    portfolio,
    profile,
    isLoading,
    error,
    refetch
  };
}

// Hook for market data
export function useMarketData() {
  const { data: stats, isLoading: statsLoading } = useReactQuery.useMarketStats();
  const { data: trending, isLoading: trendingLoading } = useReactQuery.useTrendingTokens();
  const { data: recent, isLoading: recentLoading } = useReactQuery.useRecentTokens();
  const { data: topGainers, isLoading: gainersLoading } = useReactQuery.useTopGainers(10);
  const { data: topLosers, isLoading: losersLoading } = useReactQuery.useTopLosers(10);

  // WebSocket for market updates
  const { subscribeToMarket } = useWebSocket();

  useEffect(() => {
    subscribeToMarket();

    const handleMarketUpdate = (data: any) => {
      // Refresh market stats when update received
      const queryClient = useReactQuery.useQueryClient();
      queryClient.invalidateQueries(useReactQuery.queryKeys.marketStats);
    };

    webSocketService.on('market_update', handleMarketUpdate);

    return () => {
      webSocketService.off('market_update', handleMarketUpdate);
    };
  }, [subscribeToMarket]);

  return {
    stats,
    trending,
    recent,
    topGainers,
    topLosers,
    isLoading: statsLoading || trendingLoading || recentLoading || gainersLoading || losersLoading
  };
}

// Hook for bonding curve calculations
export function useBondingCurve(tokenAddress: string) {
  const { data: tokenInfo } = useReactQuery.useTokenInfo(tokenAddress);
  const { data: config } = useReactQuery.useBondingCurveConfig();

  const {
    calculations,
    calculating,
    calculatePrice,
    calculateTokensOut,
    calculateBNBOut,
    calculatePriceImpact
  } = useApi.usePriceCalculator();

  // Calculate current state
  const calculateCurrentState = useCallback(() => {
    if (!tokenInfo || !config) return null;

    const soldSupply = parseFloat(tokenInfo.soldSupply || '0');
    const totalBNB = parseFloat(tokenInfo.totalBNB || '0');

    // Use API calculation for more accuracy
    return {
      currentPrice: calculations.price || 0,
      marketCap: calculations.price ? calculations.price * soldSupply : 0,
      progress: (totalBNB / config.NET_RAISE) * 100,
      totalRaised: totalBNB,
      soldSupply,
      priceImpact: calculations.priceImpact || 0
    };
  }, [tokenInfo, config, calculations]);

  return {
    config,
    state: calculateCurrentState(),
    calculations,
    calculating,
    calculatePrice,
    calculateTokensOut,
    calculateBNBOut,
    calculatePriceImpact
  };
}