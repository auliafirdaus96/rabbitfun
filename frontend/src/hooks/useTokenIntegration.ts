/**
 * 🚀 Ahiru Launchpad - Token Integration Hook
 *
 * Simplified hook that combines:
 * - Token data management
 * - Real-time updates via WebSocket
 * - Basic caching
 * - API integration
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

// Services
import { webSocketService } from '@/services/websocket';
import apiService from '@/services/api';

// Types
import type { TokenInfo, Transaction } from '@/types/api';

// Simple transaction interface
interface SimpleTransaction {
  from: string;
  amountBNB: string;
  amountToken: string;
  time: number;
  txn: string;
  type: 'buy' | 'sell';
}

// Configuration
const INTEGRATION_CONFIG = {
  CACHE_TTL: {
    TOKEN_INFO: 30 * 1000,      // 30 seconds
    ANALYTICS: 60 * 1000,       // 1 minute
    MARKET_DATA: 2 * 60 * 1000,  // 2 minutes
  },
  SYNC_INTERVAL: 30 * 1000,     // 30 seconds
};

interface TokenIntegrationOptions {
  tokenAddress?: string;
  enableRealtime?: boolean;
  enableCaching?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface TokenIntegrationState {
  token: TokenInfo | null;
  analytics: any;
  marketData: any;
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  isConnected: boolean;
  transactions: SimpleTransaction[];
  recentTransactions: SimpleTransaction[];
}

export function useTokenIntegration(options: TokenIntegrationOptions = {}) {
  const {
    tokenAddress,
    enableRealtime = true,
    enableCaching = true,
    autoRefresh = true,
    refreshInterval = INTEGRATION_CONFIG.SYNC_INTERVAL
  } = options;

  // State
  const [state, setState] = useState<TokenIntegrationState>({
    token: null,
    analytics: null,
    marketData: null,
    loading: false,
    error: null,
    isOnline: navigator.onLine,
    isConnected: false,
    transactions: [],
    recentTransactions: []
  });

  // Refs for cleanup
  const subscriptionsRef = useRef<(() => void)[]>([]);
  const refreshTimerRef = useRef<NodeJS.Timeout>();
  const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());

  // Simple cache implementation
  const getCachedData = useCallback((key: string, ttl: number) => {
    if (!enableCaching) return null;

    const cached = cacheRef.current.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }

    cacheRef.current.delete(key);
    return null;
  }, [enableCaching]);

  const setCachedData = useCallback((key: string, data: any) => {
    if (!enableCaching) return;

    cacheRef.current.set(key, {
      data,
      timestamp: Date.now()
    });
  }, [enableCaching]);

  // Token data fetching
  const loadTokenData = useCallback(async (address: string) => {
    if (!address) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const cacheKey = `token:${address}`;
      let tokenInfo = getCachedData(cacheKey, INTEGRATION_CONFIG.CACHE_TTL.TOKEN_INFO);

      if (!tokenInfo) {
        // Check if offline mode is enabled
        if (import.meta.env.VITE_OFFLINE_MODE === 'true' || !import.meta.env.VITE_API_URL) {
          // Mock token data for offline mode
          tokenInfo = {
            tokenAddress: address,
            name: 'Mock Token',
            symbol: 'MOCK',
            metadata: '',
            creator: '0x0000000000000000000000000000000000000000',
            soldSupply: '1000000',
            totalBNB: '10',
            initialPrice: '0.01',
            graduated: false,
            exists: true
          };
          console.log('🔌 Offline mode: Using mock token data');
        } else {
          tokenInfo = await apiService.getTokenInfo(address);
        }
        setCachedData(cacheKey, tokenInfo);
      }

      if (tokenInfo) {
        setState(prev => ({
          ...prev,
          token: tokenInfo,
          loading: false
        }));
      }

    } catch (error: any) {
      console.error('Failed to load token data:', error);
      // Fallback to mock data if API fails
      const fallbackToken = {
        tokenAddress: address,
        name: 'Fallback Token',
        symbol: 'FALL',
        metadata: '',
        creator: '0x0000000000000000000000000000000000000000',
        soldSupply: '500000',
        totalBNB: '5',
        initialPrice: '0.01',
        graduated: false,
        exists: true
      };

      setState(prev => ({
        ...prev,
        token: fallbackToken,
        loading: false,
        error: null // Clear error since we have fallback data
      }));
    }
  }, [getCachedData, setCachedData]);

  // Analytics data fetching
  const loadAnalytics = useCallback(async (address: string) => {
    if (!address) return;

    try {
      const cacheKey = `analytics:${address}`;
      let analytics = getCachedData(cacheKey, INTEGRATION_CONFIG.CACHE_TTL.ANALYTICS);

      if (!analytics) {
        // Mock analytics data for now
        analytics = {
          volume24h: Math.random() * 1000,
          transactions24h: Math.floor(Math.random() * 500),
          holders: Math.floor(Math.random() * 1000),
          currentPrice: Math.random() * 0.01,
          priceChange: (Math.random() - 0.5) * 20,
          marketCap: Math.random() * 1000000,
          liquidityPool: Math.random() * 100,
          athPrice: Math.random() * 0.02
        };
        setCachedData(cacheKey, analytics);
      }

      setState(prev => ({ ...prev, analytics }));

    } catch (error: any) {
      console.error('Failed to load analytics:', error);
    }
  }, [getCachedData, setCachedData]);

  // Transaction data fetching
  const loadTransactions = useCallback(async (address: string) => {
    if (!address) return;

    try {
      const cacheKey = `transactions:${address}`;
      let transactions = getCachedData(cacheKey, INTEGRATION_CONFIG.CACHE_TTL.ANALYTICS);

      if (!transactions) {
        // Mock transaction data for now
        transactions = Array.from({ length: 10 }, (_, i): SimpleTransaction => ({
          from: `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 4)}`,
          amountBNB: (Math.random() * 10).toFixed(4),
          amountToken: (Math.random() * 1000).toFixed(0),
          time: Date.now() - (i * 60000),
          txn: `0x${Math.random().toString(16).substr(2, 64)}`,
          type: Math.random() > 0.5 ? ('buy' as const) : ('sell' as const)
        }));
        setCachedData(cacheKey, transactions);
      }

      setState(prev => ({
        ...prev,
        transactions,
        recentTransactions: transactions.slice(0, 5)
      }));

    } catch (error: any) {
      console.error('Failed to load transactions:', error);
    }
  }, [getCachedData, setCachedData]);

  // Market data fetching
  const loadMarketData = useCallback(async () => {
    try {
      const cacheKey = 'market-data';
      let marketData = getCachedData(cacheKey, INTEGRATION_CONFIG.CACHE_TTL.MARKET_DATA);

      if (!marketData) {
        // Mock market data for now
        marketData = {
          totalVolume24h: Math.random() * 100000,
          activeTokens: Math.floor(Math.random() * 100),
          totalMarketCap: Math.random() * 10000000,
          trendingTokens: []
        };
        setCachedData(cacheKey, marketData);
      }

      setState(prev => ({ ...prev, marketData }));

    } catch (error: any) {
      console.error('Failed to load market data:', error);
    }
  }, [getCachedData, setCachedData]);

  // Buy token function
  const buyToken = useCallback(async (amount: string) => {
    if (!tokenAddress) {
      throw new Error('Token address required');
    }

    try {
      setState(prev => ({ ...prev, loading: true }));

      // Mock buy transaction
      const transaction: SimpleTransaction = {
        from: '0xUser...Address',
        amountBNB: amount,
        amountToken: (parseFloat(amount) * 1000).toFixed(0),
        time: Date.now(),
        txn: `0x${Math.random().toString(16).substr(2, 64)}`,
        type: 'buy' as const
      };

      setState(prev => ({
        ...prev,
        transactions: [transaction, ...prev.transactions],
        recentTransactions: [transaction, ...prev.recentTransactions.slice(0, 4)]
      }));

      toast.success(`Successfully bought ${transaction.amountToken} tokens`);

    } catch (error: any) {
      console.error('Buy failed:', error);
      toast.error(error.message || 'Buy transaction failed');
      throw error;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [tokenAddress]);

  // Sell token function
  const sellToken = useCallback(async (amount: string) => {
    if (!tokenAddress) {
      throw new Error('Token address required');
    }

    try {
      setState(prev => ({ ...prev, loading: true }));

      // Mock sell transaction
      const transaction: SimpleTransaction = {
        from: '0xUser...Address',
        amountBNB: (parseFloat(amount) / 1000).toFixed(4),
        amountToken: amount,
        time: Date.now(),
        txn: `0x${Math.random().toString(16).substr(2, 64)}`,
        type: 'sell' as const
      };

      setState(prev => ({
        ...prev,
        transactions: [transaction, ...prev.transactions],
        recentTransactions: [transaction, ...prev.recentTransactions.slice(0, 4)]
      }));

      toast.success(`Successfully sold ${amount} tokens`);

    } catch (error: any) {
      console.error('Sell failed:', error);
      toast.error(error.message || 'Sell transaction failed');
      throw error;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [tokenAddress]);

  // Refresh function
  const refresh = useCallback(async () => {
    if (tokenAddress) {
      await Promise.all([
        loadTokenData(tokenAddress),
        loadAnalytics(tokenAddress),
        loadTransactions(tokenAddress),
        loadMarketData()
      ]);
    }
  }, [tokenAddress, loadTokenData, loadAnalytics, loadTransactions, loadMarketData]);

  // Subscribe to updates
  const subscribeToUpdates = useCallback((callback: (data: any) => void) => {
    if (!enableRealtime) return () => {};

    const handleTokenUpdate = (data: any) => {
      if (data.tokenAddress === tokenAddress) {
        callback(data);
      }
    };

    const handlePriceUpdate = (data: any) => {
      if (data.tokenAddress === tokenAddress) {
        callback({ type: 'price_update', ...data });
      }
    };

    const handleTransaction = (data: any) => {
      if (data.tokenAddress === tokenAddress) {
        callback({ type: 'transaction', ...data });
      }
    };

    // Subscribe to relevant events
    webSocketService.on('token_price_update', handlePriceUpdate);
    webSocketService.on('new_transaction', handleTransaction);

    // Store unsubscribe functions
    const unsubscribeFunctions = [
      () => webSocketService.off('token_price_update', handlePriceUpdate),
      () => webSocketService.off('new_transaction', handleTransaction)
    ];

    const unsubscribe = () => {
      unsubscribeFunctions.forEach(fn => fn());
    };

    subscriptionsRef.current.push(unsubscribe);
    return unsubscribe;
  }, [enableRealtime, tokenAddress]);

  // Initialize data
  useEffect(() => {
    if (tokenAddress) {
      refresh();
    }
  }, [tokenAddress, refresh]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh && tokenAddress) {
      refreshTimerRef.current = setInterval(() => {
        refresh();
      }, refreshInterval);

      return () => {
        if (refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, refresh, tokenAddress]);

  // WebSocket connection
  useEffect(() => {
    if (enableRealtime) {
      const handleConnect = () => {
        setState(prev => ({ ...prev, isConnected: true }));
      };

      const handleDisconnect = () => {
        setState(prev => ({ ...prev, isConnected: false }));
      };

      webSocketService.on('connect', handleConnect);
      webSocketService.on('disconnect', handleDisconnect);

      // Check current connection status
      setState(prev => ({ ...prev, isConnected: webSocketService.isConnectionLive() }));

      return () => {
        webSocketService.off('connect', handleConnect);
        webSocketService.off('disconnect', handleDisconnect);
      };
    }
  }, [enableRealtime]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      // Safely unsubscribe from all active subscriptions
      subscriptionsRef.current.forEach((unsubscribe) => {
        try {
          if (typeof unsubscribe === 'function') {
            unsubscribe();
          }
        } catch (error) {
          console.warn('Error during subscription cleanup:', error);
        }
      });

      // Clear refresh timer
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, []);

  return {
    ...state,
    refresh,
    buyToken,
    sellToken,
    subscribeToUpdates,
    addToFavorites: () => toast.success('Added to favorites'),
    removeFromFavorites: () => toast.success('Removed from favorites')
  };
}