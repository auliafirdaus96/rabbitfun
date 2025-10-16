import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import apiService from '@/services/api';
import type {
  TokenInfo,
  TokenListResponse,
  BondingCurveConfig,
  PriceCalculation,
  BondingCurveState,
  TransactionHistory,
  UserProfile,
  UserPortfolio,
  MarketStats,
  TokenAnalytics,
  GlobalAnalytics,
  SearchParams,
  PaginationParams,
  FilterOptions
} from '@/types/api';

// Generic API hook for fetching data
export function useApi<T>(
  fetcher: () => Promise<any>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetcher();
      if (response.success) {
        setData(response.data);
      } else {
        setError(response.error || 'Failed to fetch data');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Token Management Hooks
export function useTokens(params?: SearchParams & PaginationParams) {
  return useApi<TokenListResponse>(
    () => apiService.getTokens(params),
    [JSON.stringify(params)]
  );
}

export function useTokenInfo(tokenAddress: string) {
  return useApi<TokenInfo>(
    () => apiService.getTokenInfo(tokenAddress),
    [tokenAddress]
  );
}

export function useTokenAnalytics(tokenAddress: string) {
  return useApi<TokenAnalytics>(
    () => apiService.getTokenAnalytics(tokenAddress),
    [tokenAddress]
  );
}

export function useTrendingTokens() {
  return useApi<TokenInfo[]>(
    () => apiService.getTrendingTokens(),
    []
  );
}

export function useRecentTokens() {
  return useApi<TokenInfo[]>(
    () => apiService.getRecentTokens(),
    []
  );
}

export function useTokenSearch() {
  const [searchResults, setSearchResults] = useState<TokenInfo[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const searchTokens = useCallback(async (query: string, params?: SearchParams & PaginationParams) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      const response = await apiService.searchTokens(query, params);
      if (response.success && response.data) {
        setSearchResults(response.data.tokens);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchTokens(searchQuery);
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchTokens]);

  return {
    searchResults,
    searchLoading,
    searchQuery,
    setSearchQuery,
    searchTokens
  };
}

// Bonding Curve Hooks
export function useBondingCurveConfig() {
  return useApi<BondingCurveConfig>(
    () => apiService.getBondingCurveConfig(),
    []
  );
}

export function usePriceCalculator() {
  const [calculations, setCalculations] = useState<{
    price?: number;
    tokensOut?: number;
    bnbOut?: number;
    priceImpact?: number;
  }>({});
  const [calculating, setCalculating] = useState(false);

  const calculatePrice = useCallback(async (supply: number) => {
    try {
      setCalculating(true);
      const response = await apiService.calculatePrice(supply);
      if (response.success && response.data) {
        setCalculations(prev => ({ ...prev, price: response.data.price }));
      }
    } catch (error) {
      console.error('Price calculation error:', error);
    } finally {
      setCalculating(false);
    }
  }, []);

  const calculateTokensOut = useCallback(async (bnbAmount: number, currentSupply: number) => {
    try {
      setCalculating(true);
      const response = await apiService.calculateTokensOut(bnbAmount, currentSupply);
      if (response.success && response.data) {
        setCalculations(prev => ({ ...prev, tokensOut: response.data.tokens }));
      }
    } catch (error) {
      console.error('Tokens calculation error:', error);
    } finally {
      setCalculating(false);
    }
  }, []);

  const calculateBNBOut = useCallback(async (tokenAmount: number, currentSupply: number) => {
    try {
      setCalculating(true);
      const response = await apiService.calculateBNBOut(tokenAmount, currentSupply);
      if (response.success && response.data) {
        setCalculations(prev => ({ ...prev, bnbOut: response.data.bnb }));
      }
    } catch (error) {
      console.error('BNB calculation error:', error);
    } finally {
      setCalculating(false);
    }
  }, []);

  const calculatePriceImpact = useCallback(async (amountIn: number, currentSupply: number) => {
    try {
      setCalculating(true);
      const response = await apiService.calculatePriceImpact(amountIn, currentSupply);
      if (response.success && response.data) {
        setCalculations(prev => ({ ...prev, priceImpact: response.data.impact }));
      }
    } catch (error) {
      console.error('Price impact calculation error:', error);
    } finally {
      setCalculating(false);
    }
  }, []);

  return {
    calculations,
    calculating,
    calculatePrice,
    calculateTokensOut,
    calculateBNBOut,
    calculatePriceImpact,
    resetCalculations: () => setCalculations({})
  };
}

// Transaction Hooks
export function useTransactionHistory(userAddress?: string, params?: PaginationParams) {
  return useApi<TransactionHistory>(
    () => apiService.getTransactionHistory(userAddress, params),
    [userAddress, JSON.stringify(params)]
  );
}

export function useTokenTransactions(tokenAddress: string, params?: PaginationParams) {
  return useApi<TransactionHistory>(
    () => apiService.getTokenTransactions(tokenAddress, params),
    [tokenAddress, JSON.stringify(params)]
  );
}

// User Management Hooks
export function useUserProfile(address: string) {
  return useApi<UserProfile>(
    () => apiService.getUserProfile(address),
    [address]
  );
}

export function useUserPortfolio(address: string) {
  return useApi<UserPortfolio>(
    () => apiService.getUserPortfolio(address),
    [address]
  );
}

export function useUserFavorites(address: string) {
  const { data: favorites, loading, error, refetch } = useApi<string[]>(
    () => apiService.getUserFavorites(address),
    [address]
  );

  const addToFavorites = useCallback(async (tokenAddress: string) => {
    try {
      await apiService.addToFavorites(address, tokenAddress);
      toast.success('Added to favorites');
      refetch();
    } catch (error) {
      console.error('Add to favorites error:', error);
    }
  }, [address, refetch]);

  const removeFromFavorites = useCallback(async (tokenAddress: string) => {
    try {
      await apiService.removeFromFavorites(address, tokenAddress);
      toast.success('Removed from favorites');
      refetch();
    } catch (error) {
      console.error('Remove from favorites error:', error);
    }
  }, [address, refetch]);

  return {
    favorites,
    loading,
    error,
    refetch,
    addToFavorites,
    removeFromFavorites,
    isFavorite: (tokenAddress: string) => favorites?.includes(tokenAddress) || false
  };
}

// Market Data Hooks
export function useMarketStats() {
  return useApi<MarketStats>(
    () => apiService.getMarketStats(),
    []
  );
}

export function useGlobalAnalytics() {
  return useApi<GlobalAnalytics>(
    () => apiService.getGlobalAnalytics(),
    []
  );
}

export function useTopGainers(limit?: number) {
  return useApi<TokenInfo[]>(
    () => apiService.getTopGainers(limit),
    [limit]
  );
}

export function useTopLosers(limit?: number) {
  return useApi<TokenInfo[]>(
    () => apiService.getTopLosers(limit),
    [limit]
  );
}

export function useTopVolume(limit?: number) {
  return useApi<TokenInfo[]>(
    () => apiService.getTopVolume(limit),
    [limit]
  );
}

// Paginated Data Hook
export function usePaginatedData<T>(
  fetcher: (params: PaginationParams) => Promise<any>,
  initialParams: PaginationParams = { page: 1, limit: 10 }
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: initialParams.page,
    limit: initialParams.limit,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  const fetchData = useCallback(async (params: PaginationParams = initialParams) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetcher(params);
      if (response.success && response.data) {
        setData(response.data.data || response.data);
        setPagination(response.data.pagination || {
          page: params.page,
          limit: params.limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        });
      } else {
        setError(response.error || 'Failed to fetch data');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [fetcher, initialParams]);

  const nextPage = useCallback(() => {
    if (pagination.hasNext) {
      fetchData({ ...pagination, page: pagination.page + 1 });
    }
  }, [pagination, fetchData]);

  const prevPage = useCallback(() => {
    if (pagination.hasPrev) {
      fetchData({ ...pagination, page: pagination.page - 1 });
    }
  }, [pagination, fetchData]);

  const goToPage = useCallback((page: number) => {
    fetchData({ ...pagination, page });
  }, [pagination, fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    pagination,
    refetch: fetchData,
    nextPage,
    prevPage,
    goToPage
  };
}

// Real-time Data Hook (for WebSocket updates)
export function useRealtimeData<T>(initialData: T | null = null) {
  const [data, setData] = useState<T | null>(initialData);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback((url: string) => {
    try {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        console.log('WebSocket connected');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const newData = JSON.parse(event.data);
          setData(newData);
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        console.log('WebSocket disconnected');
        // Auto reconnect after 3 seconds
        setTimeout(() => connect(url), 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    data,
    isConnected,
    connect,
    disconnect,
    sendMessage
  };
}

// Cache Hook for API responses
export function useApiCache<T>(key: string, fetcher: () => Promise<any>, ttl: number = 5 * 60 * 1000) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<{ data: T; timestamp: number } | null>(null);

  const isCacheValid = useCallback(() => {
    return cacheRef.current && Date.now() - cacheRef.current.timestamp < ttl;
  }, [ttl]);

  const fetchData = useCallback(async (forceRefresh = false) => {
    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && isCacheValid()) {
      setData(cacheRef.current!.data);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetcher();
      if (response.success && response.data) {
        const newData = response.data;
        setData(newData);
        cacheRef.current = { data: newData, timestamp: Date.now() };
      } else {
        setError(response.error || 'Failed to fetch data');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [fetcher, isCacheValid]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const invalidateCache = useCallback(() => {
    cacheRef.current = null;
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    invalidateCache
  };
}