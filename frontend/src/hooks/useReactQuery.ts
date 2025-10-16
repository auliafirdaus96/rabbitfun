import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiService from '@/services/api';
import type {
  TokenInfo,
  CreateTokenData,
  TokenListResponse,
  BondingCurveConfig,
  TransactionHistory,
  UserProfile,
  UserPortfolio,
  MarketStats,
  TokenAnalytics,
  GlobalAnalytics,
  SearchParams,
  PaginationParams,
  ApiResponse
} from '@/types/api';

// Query keys factory for consistent cache management
export const queryKeys = {
  // Token queries
  tokens: ['tokens'] as const,
  token: (address: string) => ['token', address] as const,
  tokenAnalytics: (address: string) => ['token', address, 'analytics'] as const,
  tokenTransactions: (address: string, params?: PaginationParams) =>
    ['token', address, 'transactions', params] as const,

  // Search queries
  searchTokens: (query: string, params?: SearchParams) =>
    ['search', 'tokens', query, params] as const,
  trendingTokens: ['trending', 'tokens'] as const,
  recentTokens: ['recent', 'tokens'] as const,

  // Bonding curve queries
  bondingCurveConfig: ['bondingCurve', 'config'] as const,
  price: (supply: number) => ['price', supply] as const,
  tokensOut: (bnbAmount: number, supply: number) => ['tokensOut', bnbAmount, supply] as const,
  bnbOut: (tokenAmount: number, supply: number) => ['bnbOut', tokenAmount, supply] as const,
  priceImpact: (amountIn: number, supply: number) => ['priceImpact', amountIn, supply] as const,

  // User queries
  userProfile: (address: string) => ['user', address, 'profile'] as const,
  userPortfolio: (address: string) => ['user', address, 'portfolio'] as const,
  userFavorites: (address: string) => ['user', address, 'favorites'] as const,
  transactionHistory: (address?: string, params?: PaginationParams) =>
    ['transactions', address, params] as const,

  // Market queries
  marketStats: ['market', 'stats'] as const,
  globalAnalytics: ['analytics', 'global'] as const,
  topGainers: (limit?: number) => ['market', 'topGainers', limit] as const,
  topLosers: (limit?: number) => ['market', 'topLosers', limit] as const,
  topVolume: (limit?: number) => ['market', 'topVolume', limit] as const,

  // System queries
  healthCheck: ['health'] as const,
  contractInfo: ['contract', 'info'] as const,
  rateLimit: ['rateLimit'] as const,
} as const;

// Generic query hook with error handling
function useApiQuery<T>(
  queryKey: readonly any[],
  queryFn: () => Promise<ApiResponse<T>>,
  options?: Omit<UseQueryOptions<ApiResponse<T>, Error, T>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ApiResponse<T>, Error, T>({
    queryKey,
    queryFn,
    select: (data: ApiResponse<T>) => data.data!,
    enabled: true,
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false;
      }
      // Retry up to 3 times on other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

// Generic mutation hook with success/error handling
function useApiMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: any, variables: TVariables) => void;
    successMessage?: string;
    errorMessage?: string;
    invalidateQueries?: readonly any[];
  } & Omit<UseMutationOptions<ApiResponse<TData>, any, TVariables, any>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      const response = await mutationFn(variables);
      if (!response.success) {
        throw new Error(response.error || 'Request failed');
      }
      return response;
    },
    onSuccess: (data, variables) => {
      if (options?.successMessage) {
        toast.success(options.successMessage);
      }
      options?.onSuccess?.(data.data, variables);

      // Invalidate related queries
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }
    },
    onError: (error: any, variables) => {
      const errorMessage = options?.errorMessage || error?.response?.data?.message || error?.message || 'An error occurred';
      toast.error(errorMessage);
      options?.onError?.(error, variables);
    },
    ...options,
  });
}

// Token Management Queries
export function useTokens(params?: SearchParams & PaginationParams) {
  return useApiQuery(
    [...queryKeys.tokens, params],
    () => apiService.getTokens(params),
    {
      staleTime: 2 * 60 * 1000, // 2 minutes for token list
    }
  );
}

export function useTokenInfo(tokenAddress: string) {
  return useApiQuery(
    queryKeys.token(tokenAddress),
    () => apiService.getTokenInfo(tokenAddress),
    {
      staleTime: 30 * 1000, // 30 seconds for token info
    }
  );
}

export function useTokenAnalytics(tokenAddress: string) {
  return useApiQuery(
    queryKeys.tokenAnalytics(tokenAddress),
    () => apiService.getTokenAnalytics(tokenAddress),
    {
      staleTime: 60 * 1000, // 1 minute for analytics
    }
  );
}

export function useTrendingTokens() {
  return useApiQuery(
    queryKeys.trendingTokens,
    () => apiService.getTrendingTokens(),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes for trending tokens
    }
  );
}

export function useRecentTokens() {
  return useApiQuery(
    queryKeys.recentTokens,
    () => apiService.getRecentTokens(),
    {
      staleTime: 2 * 60 * 1000, // 2 minutes for recent tokens
    }
  );
}

// Search Queries
export function useSearchTokens(query: string, params?: SearchParams & PaginationParams) {
  return useApiQuery(
    queryKeys.searchTokens(query, params),
    () => apiService.searchTokens(query, params),
    {
      enabled: query.trim().length > 0,
      staleTime: 30 * 1000, // 30 seconds for search results
    }
  );
}

// Bonding Curve Queries
export function useBondingCurveConfig() {
  return useApiQuery(
    queryKeys.bondingCurveConfig,
    () => apiService.getBondingCurveConfig(),
    {
      staleTime: 60 * 60 * 1000, // 1 hour for config (doesn't change often)
    }
  );
}

export function useCalculatePrice(supply: number) {
  return useApiQuery(
    queryKeys.price(supply),
    () => apiService.calculatePrice(supply),
    {
      enabled: supply > 0,
      staleTime: 10 * 1000, // 10 seconds for price calculations
    }
  );
}

export function useCalculateTokensOut(bnbAmount: number, supply: number) {
  return useApiQuery(
    queryKeys.tokensOut(bnbAmount, supply),
    () => apiService.calculateTokensOut(bnbAmount, supply),
    {
      enabled: bnbAmount > 0 && supply >= 0,
      staleTime: 5 * 1000, // 5 seconds for calculations
    }
  );
}

export function useCalculateBNBOut(tokenAmount: number, supply: number) {
  return useApiQuery(
    queryKeys.bnbOut(tokenAmount, supply),
    () => apiService.calculateBNBOut(tokenAmount, supply),
    {
      enabled: tokenAmount > 0 && supply >= 0,
      staleTime: 5 * 1000, // 5 seconds for calculations
    }
  );
}

// User Management Queries
export function useUserProfile(address: string) {
  return useApiQuery(
    queryKeys.userProfile(address),
    () => apiService.getUserProfile(address),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes for profile
    }
  );
}

export function useUserPortfolio(address: string) {
  return useApiQuery(
    queryKeys.userPortfolio(address),
    () => apiService.getUserPortfolio(address),
    {
      staleTime: 30 * 1000, // 30 seconds for portfolio
    }
  );
}

export function useUserFavorites(address: string) {
  return useApiQuery(
    queryKeys.userFavorites(address),
    () => apiService.getUserFavorites(address),
    {
      staleTime: 2 * 60 * 1000, // 2 minutes for favorites
    }
  );
}

export function useTransactionHistory(address?: string, params?: PaginationParams) {
  return useApiQuery(
    queryKeys.transactionHistory(address, params),
    () => apiService.getTransactionHistory(address, params),
    {
      staleTime: 15 * 1000, // 15 seconds for transactions
    }
  );
}

// Market Data Queries
export function useMarketStats() {
  return useApiQuery(
    queryKeys.marketStats,
    () => apiService.getMarketStats(),
    {
      staleTime: 60 * 1000, // 1 minute for market stats
    }
  );
}

export function useGlobalAnalytics() {
  return useApiQuery(
    queryKeys.globalAnalytics,
    () => apiService.getGlobalAnalytics(),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes for global analytics
    }
  );
}

export function useTopGainers(limit?: number) {
  return useApiQuery(
    queryKeys.topGainers(limit),
    () => apiService.getTopGainers(limit),
    {
      staleTime: 2 * 60 * 1000, // 2 minutes for top gainers
    }
  );
}

export function useTopLosers(limit?: number) {
  return useApiQuery(
    queryKeys.topLosers(limit),
    () => apiService.getTopLosers(limit),
    {
      staleTime: 2 * 60 * 1000, // 2 minutes for top losers
    }
  );
}

export function useTopVolume(limit?: number) {
  return useApiQuery(
    queryKeys.topVolume(limit),
    () => apiService.getTopVolume(limit),
    {
      staleTime: 2 * 60 * 1000, // 2 minutes for top volume
    }
  );
}

// System Queries
export function useHealthCheck() {
  return useApiQuery(
    queryKeys.healthCheck,
    () => apiService.healthCheck(),
    {
      staleTime: 30 * 1000, // 30 seconds for health check
      refetchInterval: 30 * 1000, // Refetch every 30 seconds
    }
  );
}

export function useContractInfo() {
  return useApiQuery(
    queryKeys.contractInfo,
    () => apiService.getContractInfo(),
    {
      staleTime: 60 * 60 * 1000, // 1 hour for contract info
    }
  );
}

// Mutations
export function useCreateToken() {
  const queryClient = useQueryClient();

  return useApiMutation(
    (tokenData: CreateTokenData) => apiService.createToken(tokenData),
    {
      successMessage: 'Token created successfully!',
      errorMessage: 'Failed to create token',
      invalidateQueries: [
        queryKeys.tokens,
        queryKeys.recentTokens,
        queryKeys.marketStats
      ],
      onSuccess: () => {
        // Invalidate multiple queries
        queryClient.invalidateQueries({ queryKey: queryKeys.tokens });
        queryClient.invalidateQueries({ queryKey: queryKeys.recentTokens });
        queryClient.invalidateQueries({ queryKey: queryKeys.marketStats });
      }
    }
  );
}

export function useAddToFavorites() {
  const queryClient = useQueryClient();

  return useApiMutation(
    ({ userAddress, tokenAddress }: { userAddress: string; tokenAddress: string }) =>
      apiService.addToFavorites(userAddress, tokenAddress),
    {
      successMessage: 'Added to favorites!',
      errorMessage: 'Failed to add to favorites',
      invalidateQueries: [
        (userAddress: string) => queryKeys.userFavorites(userAddress)
      ],
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.userFavorites(variables.userAddress) });
      }
    }
  );
}

export function useRemoveFromFavorites() {
  const queryClient = useQueryClient();

  return useApiMutation(
    ({ userAddress, tokenAddress }: { userAddress: string; tokenAddress: string }) =>
      apiService.removeFromFavorites(userAddress, tokenAddress),
    {
      successMessage: 'Removed from favorites!',
      errorMessage: 'Failed to remove from favorites',
      invalidateQueries: [
        (userAddress: string) => queryKeys.userFavorites(userAddress)
      ],
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.userFavorites(variables.userAddress) });
      }
    }
  );
}

// Utility hook for prefetching data
export function usePrefetch() {
  const queryClient = useQueryClient();

  const prefetchTokenInfo = useCallback((tokenAddress: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.token(tokenAddress),
      queryFn: () => apiService.getTokenInfo(tokenAddress),
      staleTime: 30 * 1000,
    });
  }, [queryClient]);

  const prefetchTokens = useCallback((params?: SearchParams & PaginationParams) => {
    queryClient.prefetchQuery({
      queryKey: [...queryKeys.tokens, params],
      queryFn: () => apiService.getTokens(params),
      staleTime: 2 * 60 * 1000,
    });
  }, [queryClient]);

  const prefetchMarketStats = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.marketStats,
      queryFn: () => apiService.getMarketStats(),
      staleTime: 60 * 1000,
    });
  }, [queryClient]);

  return {
    prefetchTokenInfo,
    prefetchTokens,
    prefetchMarketStats,
  };
}

// Hook for invalidating queries
export function useInvalidateQueries() {
  const queryClient = useQueryClient();

  const invalidateTokenQueries = useCallback((tokenAddress?: string) => {
    if (tokenAddress) {
      queryClient.invalidateQueries({ queryKey: queryKeys.token(tokenAddress) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tokenAnalytics(tokenAddress) });
    } else {
      queryClient.invalidateQueries({ queryKey: queryKeys.tokens });
    }
  }, [queryClient]);

  const invalidateUserQueries = useCallback((address: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.userProfile(address) });
    queryClient.invalidateQueries({ queryKey: queryKeys.userPortfolio(address) });
    queryClient.invalidateQueries({ queryKey: queryKeys.userFavorites(address) });
  }, [queryClient]);

  const invalidateMarketQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.marketStats });
    queryClient.invalidateQueries({ queryKey: queryKeys.trendingTokens });
    queryClient.invalidateQueries({ queryKey: queryKeys.topGainers() });
    queryClient.invalidateQueries({ queryKey: queryKeys.topLosers() });
  }, [queryClient]);

  return {
    invalidateTokenQueries,
    invalidateUserQueries,
    invalidateMarketQueries,
    invalidateAll: () => queryClient.invalidateQueries(),
  };
}