/**
 * useApi Hook Tests
 * React Testing Library test suite for useApi hook and related utilities
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useApi,
  useTokens,
  useTokenInfo,
  useTokenAnalytics,
  useTrendingTokens,
  useRecentTokens,
  useTokenSearch,
  useBondingCurveConfig,
  usePriceCalculator,
  useTransactionHistory,
  useTokenTransactions,
  useUserProfile,
  useUserPortfolio,
  useUserFavorites,
  useMarketStats,
  useGlobalAnalytics,
  useTopGainers,
  useTopLosers,
  useTopVolume,
  usePaginatedData,
  useRealtimeData,
  useApiCache
} from '../useApi';

// Mock the apiService
const mockApiService = {
  getTokens: jest.fn(),
  getTokenInfo: jest.fn(),
  getTokenAnalytics: jest.fn(),
  getTrendingTokens: jest.fn(),
  getRecentTokens: jest.fn(),
  searchTokens: jest.fn(),
  getBondingCurveConfig: jest.fn(),
  calculatePrice: jest.fn(),
  calculateTokensOut: jest.fn(),
  calculateBNBOut: jest.fn(),
  calculatePriceImpact: jest.fn(),
  getTransactionHistory: jest.fn(),
  getTokenTransactions: jest.fn(),
  getUserProfile: jest.fn(),
  getUserPortfolio: jest.fn(),
  getUserFavorites: jest.fn(),
  addToFavorites: jest.fn(),
  removeFromFavorites: jest.fn(),
  getMarketStats: jest.fn(),
  getGlobalAnalytics: jest.fn(),
  getTopGainers: jest.fn(),
  getTopLosers: jest.fn(),
  getTopVolume: jest.fn(),
};

// Mock the apiService module
jest.mock('@/services/api', () => mockApiService);

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock WebSocket
class MockWebSocket {
  static OPEN = 1;
  readyState = 0;
  onopen: ((event: any) => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onclose: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  url: string;

  constructor(url: string) {
    this.url = url;
    // Simulate connection success after a short delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen({ type: 'open' });
      }
    }, 10);
  }

  send(data: string) {
    // Mock send implementation
  }

  close() {
    this.readyState = 3; // CLOSED
    if (this.onclose) {
      this.onclose({ type: 'close' });
    }
  }
}

global.WebSocket = MockWebSocket as any;

describe('useApi Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic API Hook', () => {
    it('should fetch data successfully', async () => {
      const mockData = { id: 1, name: 'Test Token' };
      const mockFetcher = jest.fn().mockResolvedValue({
        success: true,
        data: mockData
      });

      const { result } = renderHook(() => useApi(mockFetcher));

      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBe(null);
      expect(result.current.error).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.data).toEqual(mockData);
        expect(result.current.error).toBe(null);
      });

      expect(mockFetcher).toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      const mockFetcher = jest.fn().mockResolvedValue({
        success: false,
        error: 'API Error'
      });

      const { result } = renderHook(() => useApi(mockFetcher));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.data).toBe(null);
        expect(result.current.error).toBe('API Error');
      });
    });

    it('should handle network errors', async () => {
      const mockFetcher = jest.fn().mockRejectedValue(new Error('Network Error'));

      const { result } = renderHook(() => useApi(mockFetcher));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.data).toBe(null);
        expect(result.current.error).toBe('Network Error');
      });
    });

    it('should refetch data when refetch is called', async () => {
      const mockData = { id: 1, name: 'Test Token' };
      const mockFetcher = jest.fn().mockResolvedValue({
        success: true,
        data: mockData
      });

      const { result } = renderHook(() => useApi(mockFetcher));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
      });

      expect(mockFetcher).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
      });

      expect(mockFetcher).toHaveBeenCalledTimes(2);
    });

    it('should handle empty dependencies array', async () => {
      const mockFetcher = jest.fn().mockResolvedValue({
        success: true,
        data: 'test'
      });

      renderHook(() => useApi(mockFetcher, []));

      await waitFor(() => {
        expect(mockFetcher).toHaveBeenCalledTimes(1);
      });
    });

    it('should refetch when dependencies change', async () => {
      const mockFetcher = jest.fn().mockResolvedValue({
        success: true,
        data: 'test'
      });

      const { rerender } = renderHook(
        ({ dep }) => useApi(mockFetcher, [dep]),
        { initialProps: { dep: 'initial' } }
      );

      await waitFor(() => {
        expect(mockFetcher).toHaveBeenCalledTimes(1);
      });

      rerender({ dep: 'changed' });

      await waitFor(() => {
        expect(mockFetcher).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Token Management Hooks', () => {
    it('useTokens should call getTokens with params', async () => {
      const mockTokensResponse = {
        data: [{ id: 1, name: 'Token1' }],
        pagination: { page: 1, limit: 10, total: 1 }
      };
      mockApiService.getTokens.mockResolvedValue({
        success: true,
        data: mockTokensResponse
      });

      const params = { page: 1, limit: 10, search: 'test' };
      const { result } = renderHook(() => useTokens(params));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockTokensResponse);
      });

      expect(mockApiService.getTokens).toHaveBeenCalledWith(params);
    });

    it('useTokenInfo should call getTokenInfo with address', async () => {
      const mockTokenInfo = { id: 1, address: '0x123', name: 'Test Token' };
      mockApiService.getTokenInfo.mockResolvedValue({
        success: true,
        data: mockTokenInfo
      });

      const tokenAddress = '0x123';
      const { result } = renderHook(() => useTokenInfo(tokenAddress));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockTokenInfo);
      });

      expect(mockApiService.getTokenInfo).toHaveBeenCalledWith(tokenAddress);
    });

    it('useTokenAnalytics should call getTokenAnalytics', async () => {
      const mockAnalytics = { volume: 1000, price: 1.5 };
      mockApiService.getTokenAnalytics.mockResolvedValue({
        success: true,
        data: mockAnalytics
      });

      const { result } = renderHook(() => useTokenAnalytics('0x123'));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockAnalytics);
      });

      expect(mockApiService.getTokenAnalytics).toHaveBeenCalledWith('0x123');
    });

    it('useTrendingTokens should call getTrendingTokens', async () => {
      const mockTrending = [{ id: 1, name: 'Trending Token' }];
      mockApiService.getTrendingTokens.mockResolvedValue({
        success: true,
        data: mockTrending
      });

      const { result } = renderHook(() => useTrendingTokens());

      await waitFor(() => {
        expect(result.current.data).toEqual(mockTrending);
      });

      expect(mockApiService.getTrendingTokens).toHaveBeenCalled();
    });
  });

  describe('useTokenSearch Hook', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should search tokens with debouncing', async () => {
      const mockSearchResults = { tokens: [{ id: 1, name: 'Search Result' }] };
      mockApiService.searchTokens.mockResolvedValue({
        success: true,
        data: mockSearchResults
      });

      const { result } = renderHook(() => useTokenSearch());

      act(() => {
        result.current.setSearchQuery('test');
      });

      // Should not search immediately (debouncing)
      expect(mockApiService.searchTokens).not.toHaveBeenCalled();

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockApiService.searchTokens).toHaveBeenCalledWith('test', undefined);
        expect(result.current.searchResults).toEqual(mockSearchResults.tokens);
      });
    });

    it('should clear results when query is empty', () => {
      const { result } = renderHook(() => useTokenSearch());

      act(() => {
        result.current.setSearchQuery('');
      });

      expect(result.current.searchResults).toEqual([]);
    });

    it('should handle search errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockApiService.searchTokens.mockRejectedValue(new Error('Search Error'));

      const { result } = renderHook(() => useTokenSearch());

      act(() => {
        result.current.setSearchQuery('test');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.searchResults).toEqual([]);
        expect(result.current.searchLoading).toBe(false);
      });

      expect(consoleSpy).toHaveBeenCalledWith('Search error:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should search with custom params', async () => {
      const mockSearchResults = { tokens: [] };
      mockApiService.searchTokens.mockResolvedValue({
        success: true,
        data: mockSearchResults
      });

      const { result } = renderHook(() => useTokenSearch());

      const searchParams = { limit: 5, sortBy: 'volume' };

      act(() => {
        result.current.searchTokens('test', searchParams);
      });

      await waitFor(() => {
        expect(mockApiService.searchTokens).toHaveBeenCalledWith('test', searchParams);
      });
    });
  });

  describe('usePriceCalculator Hook', () => {
    it('should calculate price', async () => {
      const mockPriceResponse = { price: 1.5 };
      mockApiService.calculatePrice.mockResolvedValue({
        success: true,
        data: mockPriceResponse
      });

      const { result } = renderHook(() => usePriceCalculator());

      act(() => {
        result.current.calculatePrice(1000);
      });

      await waitFor(() => {
        expect(result.current.calculations.price).toBe(1.5);
        expect(result.current.calculating).toBe(false);
      });

      expect(mockApiService.calculatePrice).toHaveBeenCalledWith(1000);
    });

    it('should calculate tokens out', async () => {
      const mockTokensResponse = { tokens: 500 };
      mockApiService.calculateTokensOut.mockResolvedValue({
        success: true,
        data: mockTokensResponse
      });

      const { result } = renderHook(() => usePriceCalculator());

      act(() => {
        result.current.calculateTokensOut(1, 1000);
      });

      await waitFor(() => {
        expect(result.current.calculations.tokensOut).toBe(500);
      });

      expect(mockApiService.calculateTokensOut).toHaveBeenCalledWith(1, 1000);
    });

    it('should calculate BNB out', async () => {
      const mockBnbResponse = { bnb: 0.5 };
      mockApiService.calculateBNBOut.mockResolvedValue({
        success: true,
        data: mockBnbResponse
      });

      const { result } = renderHook(() => usePriceCalculator());

      act(() => {
        result.current.calculateBNBOut(100, 1000);
      });

      await waitFor(() => {
        expect(result.current.calculations.bnbOut).toBe(0.5);
      });

      expect(mockApiService.calculateBNBOut).toHaveBeenCalledWith(100, 1000);
    });

    it('should calculate price impact', async () => {
      const mockImpactResponse = { impact: 0.05 };
      mockApiService.calculatePriceImpact.mockResolvedValue({
        success: true,
        data: mockImpactResponse
      });

      const { result } = renderHook(() => usePriceCalculator());

      act(() => {
        result.current.calculatePriceImpact(10, 1000);
      });

      await waitFor(() => {
        expect(result.current.calculations.priceImpact).toBe(0.05);
      });

      expect(mockApiService.calculatePriceImpact).toHaveBeenCalledWith(10, 1000);
    });

    it('should reset calculations', () => {
      const { result } = renderHook(() => usePriceCalculator());

      // Set some calculations
      act(() => {
        result.current.resetCalculations();
      });

      expect(result.current.calculations).toEqual({});
    });

    it('should handle calculation errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockApiService.calculatePrice.mockRejectedValue(new Error('Calculation Error'));

      const { result } = renderHook(() => usePriceCalculator());

      act(() => {
        result.current.calculatePrice(1000);
      });

      await waitFor(() => {
        expect(result.current.calculating).toBe(false);
      });

      expect(consoleSpy).toHaveBeenCalledWith('Price calculation error:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('useUserFavorites Hook', () => {
    it('should get user favorites', async () => {
      const mockFavorites = ['0x123', '0x456'];
      mockApiService.getUserFavorites.mockResolvedValue({
        success: true,
        data: mockFavorites
      });

      const { result } = renderHook(() => useUserFavorites('0x789'));

      await waitFor(() => {
        expect(result.current.favorites).toEqual(mockFavorites);
      });

      expect(mockApiService.getUserFavorites).toHaveBeenCalledWith('0x789');
    });

    it('should add to favorites', async () => {
      const mockFavorites = ['0x123', '0x456'];
      mockApiService.getUserFavorites.mockResolvedValue({
        success: true,
        data: mockFavorites
      });
      mockApiService.addToFavorites.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useUserFavorites('0x789'));

      await waitFor(() => {
        expect(result.current.favorites).toEqual(mockFavorites);
      });

      act(() => {
        result.current.addToFavorites('0x999');
      });

      expect(mockApiService.addToFavorites).toHaveBeenCalledWith('0x789', '0x999');
    });

    it('should remove from favorites', async () => {
      const mockFavorites = ['0x123', '0x456'];
      mockApiService.getUserFavorites.mockResolvedValue({
        success: true,
        data: mockFavorites
      });
      mockApiService.removeFromFavorites.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useUserFavorites('0x789'));

      await waitFor(() => {
        expect(result.current.favorites).toEqual(mockFavorites);
      });

      act(() => {
        result.current.removeFromFavorites('0x123');
      });

      expect(mockApiService.removeFromFavorites).toHaveBeenCalledWith('0x789', '0x123');
    });

    it('should check if token is favorite', async () => {
      const mockFavorites = ['0x123', '0x456'];
      mockApiService.getUserFavorites.mockResolvedValue({
        success: true,
        data: mockFavorites
      });

      const { result } = renderHook(() => useUserFavorites('0x789'));

      await waitFor(() => {
        expect(result.current.isFavorite('0x123')).toBe(true);
        expect(result.current.isFavorite('0x999')).toBe(false);
      });
    });

    it('should handle favorite errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockFavorites = ['0x123'];
      mockApiService.getUserFavorites.mockResolvedValue({
        success: true,
        data: mockFavorites
      });
      mockApiService.addToFavorites.mockRejectedValue(new Error('Add Error'));

      const { toast } = require('sonner');
      const { result } = renderHook(() => useUserFavorites('0x789'));

      await waitFor(() => {
        expect(result.current.favorites).toEqual(mockFavorites);
      });

      act(() => {
        result.current.addToFavorites('0x999');
      });

      // Should not show toast on error
      expect(toast.success).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('usePaginatedData Hook', () => {
    it('should fetch paginated data', async () => {
      const mockData = [{ id: 1 }, { id: 2 }];
      const mockFetcher = jest.fn().mockResolvedValue({
        success: true,
        data: {
          data: mockData,
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      });

      const { result } = renderHook(() =>
        usePaginatedData(mockFetcher, { page: 1, limit: 10 })
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
        expect(result.current.pagination.page).toBe(1);
        expect(result.current.pagination.total).toBe(2);
      });
    });

    it('should navigate to next page', async () => {
      const mockPage1Data = [{ id: 1 }];
      const mockPage2Data = [{ id: 2 }];
      const mockFetcher = jest.fn()
        .mockResolvedValueOnce({
          success: true,
          data: {
            data: mockPage1Data,
            pagination: {
              page: 1,
              limit: 1,
              total: 2,
              totalPages: 2,
              hasNext: true,
              hasPrev: false
            }
          }
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            data: mockPage2Data,
            pagination: {
              page: 2,
              limit: 1,
              total: 2,
              totalPages: 2,
              hasNext: false,
              hasPrev: true
            }
          }
        });

      const { result } = renderHook(() =>
        usePaginatedData(mockFetcher, { page: 1, limit: 1 })
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockPage1Data);
        expect(result.current.pagination.hasNext).toBe(true);
      });

      act(() => {
        result.current.nextPage();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockPage2Data);
        expect(result.current.pagination.page).toBe(2);
      });
    });

    it('should navigate to previous page', async () => {
      const mockPage1Data = [{ id: 1 }];
      const mockPage2Data = [{ id: 2 }];
      const mockFetcher = jest.fn()
        .mockResolvedValueOnce({
          success: true,
          data: {
            data: mockPage2Data,
            pagination: {
              page: 2,
              limit: 1,
              total: 2,
              totalPages: 2,
              hasNext: false,
              hasPrev: true
            }
          }
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            data: mockPage1Data,
            pagination: {
              page: 1,
              limit: 1,
              total: 2,
              totalPages: 2,
              hasNext: true,
              hasPrev: false
            }
          }
        });

      const { result } = renderHook(() =>
        usePaginatedData(mockFetcher, { page: 2, limit: 1 })
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockPage2Data);
        expect(result.current.pagination.hasPrev).toBe(true);
      });

      act(() => {
        result.current.prevPage();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockPage1Data);
        expect(result.current.pagination.page).toBe(1);
      });
    });

    it('should go to specific page', async () => {
      const mockPageData = [{ id: 3 }];
      const mockFetcher = jest.fn().mockResolvedValue({
        success: true,
        data: {
          data: mockPageData,
          pagination: {
            page: 3,
            limit: 10,
            total: 30,
            totalPages: 3,
            hasNext: false,
            hasPrev: true
          }
        }
      });

      const { result } = renderHook(() =>
        usePaginatedData(mockFetcher, { page: 1, limit: 10 })
      );

      act(() => {
        result.current.goToPage(3);
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockPageData);
        expect(result.current.pagination.page).toBe(3);
      });
    });

    it('should handle pagination errors', async () => {
      const mockFetcher = jest.fn().mockRejectedValue(new Error('Pagination Error'));

      const { result } = renderHook(() =>
        usePaginatedData(mockFetcher, { page: 1, limit: 10 })
      );

      await waitFor(() => {
        expect(result.current.error).toBe('Pagination Error');
        expect(result.current.data).toEqual([]);
      });
    });
  });

  describe('useRealtimeData Hook', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should connect to WebSocket', async () => {
      const { result } = renderHook(() => useRealtimeData());

      act(() => {
        result.current.connect('ws://localhost:8080');
      });

      act(() => {
        jest.advanceTimersByTime(20); // Wait for connection
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });

    it('should receive messages', async () => {
      const { result } = renderHook(() => useRealtimeData());

      act(() => {
        result.current.connect('ws://localhost:8080');
      });

      act(() => {
        jest.advanceTimersByTime(20);
      });

      // Simulate receiving a message
      const mockData = { type: 'update', data: 'test' };
      act(() => {
        // Find the WebSocket instance and trigger message event
        const wsInstances = (global.WebSocket as any).mock.instances;
        const latestInstance = wsInstances[wsInstances.length - 1];
        if (latestInstance && latestInstance.onmessage) {
          latestInstance.onmessage({
            data: JSON.stringify(mockData)
          });
        }
      });

      expect(result.current.data).toEqual(mockData);
    });

    it('should send messages', async () => {
      const { result } = renderHook(() => useRealtimeData());

      act(() => {
        result.current.connect('ws://localhost:8080');
      });

      act(() => {
        jest.advanceTimersByTime(20);
      });

      const message = { type: 'subscribe', channel: 'prices' };
      act(() => {
        result.current.sendMessage(message);
      });

      // WebSocket send should be called (this is a basic test)
      expect(result.current.isConnected).toBe(true);
    });

    it('should disconnect', async () => {
      const { result } = renderHook(() => useRealtimeData());

      act(() => {
        result.current.connect('ws://localhost:8080');
      });

      act(() => {
        jest.advanceTimersByTime(20);
      });

      act(() => {
        result.current.disconnect();
      });

      expect(result.current.isConnected).toBe(false);
    });

    it('should handle connection errors', async () => {
      const { result } = renderHook(() => useRealtimeData());

      act(() => {
        result.current.connect('invalid-url');
      });

      // Should handle error gracefully
      expect(result.current.isConnected).toBe(false);
    });

    it('should auto-reconnect on disconnect', async () => {
      const { result } = renderHook(() => useRealtimeData());

      act(() => {
        result.current.connect('ws://localhost:8080');
      });

      act(() => {
        jest.advanceTimersByTime(20);
      });

      expect(result.current.isConnected).toBe(true);

      // Simulate disconnect
      act(() => {
        const wsInstances = (global.WebSocket as any).mock.instances;
        const latestInstance = wsInstances[wsInstances.length - 1];
        if (latestInstance && latestInstance.onclose) {
          latestInstance.onclose({ type: 'close' });
        }
      });

      expect(result.current.isConnected).toBe(false);

      // Wait for auto-reconnect
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });

    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => useRealtimeData());

      act(() => {
        unmount();
      });

      // Should not throw error
    });
  });

  describe('useApiCache Hook', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should cache data', async () => {
      const mockData = { id: 1, cached: true };
      const mockFetcher = jest.fn().mockResolvedValue({
        success: true,
        data: mockData
      });

      const { result } = renderHook(() => useApiCache('test-key', mockFetcher, 5000));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
      });

      expect(mockFetcher).toHaveBeenCalledTimes(1);

      // Second call should use cache
      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
      });

      expect(mockFetcher).toHaveBeenCalledTimes(1); // Should not call again
    });

    it('should invalidate cache when forceRefresh is true', async () => {
      const mockData1 = { id: 1, version: 1 };
      const mockData2 = { id: 1, version: 2 };
      const mockFetcher = jest.fn()
        .mockResolvedValueOnce({
          success: true,
          data: mockData1
        })
        .mockResolvedValueOnce({
          success: true,
          data: mockData2
        });

      const { result } = renderHook(() => useApiCache('test-key', mockFetcher, 5000));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData1);
      });

      expect(mockFetcher).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.refetch(true); // Force refresh
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData2);
      });

      expect(mockFetcher).toHaveBeenCalledTimes(2);
    });

    it('should expire cache after TTL', async () => {
      const mockData1 = { id: 1, version: 1 };
      const mockData2 = { id: 1, version: 2 };
      const mockFetcher = jest.fn()
        .mockResolvedValueOnce({
          success: true,
          data: mockData1
        })
        .mockResolvedValueOnce({
          success: true,
          data: mockData2
        });

      const { result } = renderHook(() => useApiCache('test-key', mockFetcher, 1000));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData1);
      });

      expect(mockFetcher).toHaveBeenCalledTimes(1);

      // Fast-forward past TTL
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData2);
      });

      expect(mockFetcher).toHaveBeenCalledTimes(2);
    });

    it('should invalidate cache manually', async () => {
      const mockData1 = { id: 1, version: 1 };
      const mockData2 = { id: 1, version: 2 };
      const mockFetcher = jest.fn()
        .mockResolvedValueOnce({
          success: true,
          data: mockData1
        })
        .mockResolvedValueOnce({
          success: true,
          data: mockData2
        });

      const { result } = renderHook(() => useApiCache('test-key', mockFetcher, 5000));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData1);
      });

      expect(mockFetcher).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.invalidateCache();
      });

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData2);
      });

      expect(mockFetcher).toHaveBeenCalledTimes(2);
    });

    it('should handle cache errors', async () => {
      const mockFetcher = jest.fn().mockRejectedValue(new Error('Cache Error'));

      const { result } = renderHook(() => useApiCache('test-key', mockFetcher));

      await waitFor(() => {
        expect(result.current.error).toBe('Cache Error');
        expect(result.current.data).toBe(null);
      });
    });
  });

  describe('Hook Integration', () => {
    it('should work with multiple hooks together', async () => {
      // Setup multiple mock responses
      mockApiService.getTokens.mockResolvedValue({
        success: true,
        data: {
          data: [{ id: 1, name: 'Token1' }],
          pagination: { page: 1, limit: 10, total: 1 }
        }
      });

      mockApiService.getMarketStats.mockResolvedValue({
        success: true,
        data: { totalVolume: 1000000, totalTokens: 100 }
      });

      const { result: tokensResult } = renderHook(() => useTokens());
      const { result: statsResult } = renderHook(() => useMarketStats());

      await waitFor(() => {
        expect(tokensResult.current.data).toBeDefined();
        expect(statsResult.current.data).toBeDefined();
      });

      expect(tokensResult.current.data.data).toHaveLength(1);
      expect(statsResult.current.data.totalTokens).toBe(100);
    });

    it('should handle concurrent requests', async () => {
      const mockFetcher1 = jest.fn().mockResolvedValue({
        success: true,
        data: 'data1'
      });

      const mockFetcher2 = jest.fn().mockResolvedValue({
        success: true,
        data: 'data2'
      });

      const { result: result1 } = renderHook(() => useApi(mockFetcher1));
      const { result: result2 } = renderHook(() => useApi(mockFetcher2));

      await waitFor(() => {
        expect(result1.current.data).toBe('data1');
        expect(result2.current.data).toBe('data2');
      });

      expect(mockFetcher1).toHaveBeenCalled();
      expect(mockFetcher2).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty response data', async () => {
      const mockFetcher = jest.fn().mockResolvedValue({
        success: true,
        data: null
      });

      const { result } = renderHook(() => useApi(mockFetcher));

      await waitFor(() => {
        expect(result.current.data).toBe(null);
        expect(result.current.loading).toBe(false);
      });
    });

    it('should handle undefined response data', async () => {
      const mockFetcher = jest.fn().mockResolvedValue({
        success: true,
        data: undefined
      });

      const { result } = renderHook(() => useApi(mockFetcher));

      await waitFor(() => {
        expect(result.current.data).toBe(undefined);
        expect(result.current.loading).toBe(false);
      });
    });

    it('should handle response without success field', async () => {
      const mockFetcher = jest.fn().mockResolvedValue({
        data: 'test data'
      });

      const { result } = renderHook(() => useApi(mockFetcher));

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch data');
        expect(result.current.data).toBe(null);
      });
    });

    it('should handle empty error response', async () => {
      const mockFetcher = jest.fn().mockResolvedValue({
        success: false
      });

      const { result } = renderHook(() => useApi(mockFetcher));

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch data');
      });
    });
  });
});