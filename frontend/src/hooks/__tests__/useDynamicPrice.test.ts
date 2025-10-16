/**
 * useDynamicPrice Hook Tests
 * React Testing Library test suite for useDynamicPrice hook and related utilities
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useDynamicPrice,
  useTradingPrice,
  validateTrade,
  formatPrice,
  formatPercentage,
  formatTimeAgo
} from '../useDynamicPrice';

// Mock timers for controlled testing
jest.useFakeTimers();

describe('useDynamicPrice Hook', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('should initialize with correct price data', () => {
      const basePrice = 0.05432;
      const tokenId = 'test-token-1';

      const { result } = renderHook(() => useDynamicPrice(basePrice, tokenId));

      expect(result.current.priceData).toEqual({
        currentPrice: basePrice,
        priceChange24h: 68.31,
        marketCap: 1243955 * basePrice,
        volume24h: 391.49,
        circulatingSupply: 1243955,
        lastUpdated: expect.any(Number)
      });

      expect(result.current.priceHistory).toEqual([]);
    });

    it('should handle different base prices correctly', () => {
      const testCases = [
        { price: 0.001, expected: 1243955 * 0.001 },
        { price: 1.0, expected: 1243955 * 1.0 },
        { price: 100.0, expected: 1243955 * 100.0 }
      ];

      testCases.forEach(({ price, expected }) => {
        const { result } = renderHook(() => useDynamicPrice(price, 'test-token'));
        expect(result.current.priceData.marketCap).toBe(expected);
      });
    });

    it('should initialize with empty price history', () => {
      const { result } = renderHook(() => useDynamicPrice(0.1, 'test-token'));
      expect(result.current.priceHistory).toEqual([]);
    });
  });

  describe('Price Updates', () => {
    it('should update price data on interval', async () => {
      const basePrice = 0.05432;
      const { result } = renderHook(() => useDynamicPrice(basePrice, 'test-token'));

      const initialPrice = result.current.priceData.currentPrice;
      const initialTime = result.current.priceData.lastUpdated;

      // Fast-forward time to trigger price update
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(result.current.priceData.currentPrice).not.toBe(initialPrice);
        expect(result.current.priceData.lastUpdated).toBeGreaterThan(initialTime);
      });
    });

    it('should update price history with new entries', async () => {
      const { result } = renderHook(() => useDynamicPrice(0.1, 'test-token'));

      expect(result.current.priceHistory).toHaveLength(0);

      // Trigger price update
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(result.current.priceHistory).toHaveLength(1);
        expect(result.current.priceHistory[0]).toEqual({
          time: expect.any(Number),
          price: expect.any(Number)
        });
      });
    });

    it('should limit price history to 100 entries', async () => {
      const { result } = renderHook(() => useDynamicPrice(0.1, 'test-token'));

      // Simulate 105 updates to test the limit
      for (let i = 0; i < 105; i++) {
        act(() => {
          jest.advanceTimersByTime(3000);
        });
      }

      await waitFor(() => {
        expect(result.current.priceHistory).toHaveLength(100);
      });
    });

    it('should prevent drastic price drops', async () => {
      const basePrice = 1.0;
      const { result } = renderHook(() => useDynamicPrice(basePrice, 'test-token'));

      const initialPrice = result.current.priceData.currentPrice;

      // Trigger multiple updates to test price drop prevention
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        const newPrice = result.current.priceData.currentPrice;
        // Price should not drop below 90% of initial price
        expect(newPrice).toBeGreaterThanOrEqual(initialPrice * 0.9);
      });
    });

    it('should update volume24h and priceChange24h', async () => {
      const { result } = renderHook(() => useDynamicPrice(0.1, 'test-token'));

      const initialVolume = result.current.priceData.volume24h;
      const initialChange = result.current.priceData.priceChange24h;

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(result.current.priceData.volume24h).not.toBe(initialVolume);
        expect(result.current.priceData.priceChange24h).not.toBe(initialChange);
      });
    });

    it('should recalculate market cap based on new price', async () => {
      const basePrice = 0.1;
      const { result } = renderHook(() => useDynamicPrice(basePrice, 'test-token'));

      const initialMarketCap = result.current.priceData.marketCap;

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        const newPrice = result.current.priceData.currentPrice;
        const expectedMarketCap = newPrice * result.current.priceData.circulatingSupply;
        expect(result.current.priceData.marketCap).toBeCloseTo(expectedMarketCap, 5);
      });
    });

    it('should clean up interval on unmount', () => {
      const { unmount } = renderHook(() => useDynamicPrice(0.1, 'test-token'));

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('Multiple Hook Instances', () => {
    it('should handle multiple independent instances', () => {
      const { result: result1 } = renderHook(() => useDynamicPrice(0.1, 'token-1'));
      const { result: result2 } = renderHook(() => useDynamicPrice(0.2, 'token-2'));

      expect(result1.current.priceData.currentPrice).toBe(0.1);
      expect(result2.current.priceData.currentPrice).toBe(0.2);

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Should update independently
      expect(result1.current.priceData.currentPrice).not.toBe(result2.current.priceData.currentPrice);
    });

    it('should reset interval when tokenId changes', () => {
      const { result, rerender } = renderHook(
        ({ tokenId }) => useDynamicPrice(0.1, tokenId),
        { initialProps: { tokenId: 'token-1' } }
      );

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      rerender({ tokenId: 'token-2' });

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });
});

describe('useTradingPrice Hook', () => {
  describe('Price Calculation', () => {
    it('should calculate trading price for buy orders', () => {
      const { result } = renderHook(() =>
        useTradingPrice(100, true, 0.1, 1)
      );

      const price = result.current.calculatePrice();

      expect(price.price).toBeGreaterThan(0.1); // Buy increases price
      expect(price.receiveAmount).toBeGreaterThan(0);
      expect(price.impact).toBeGreaterThanOrEqual(0);
      expect(price.liquidity).toBe(391.49);
    });

    it('should calculate trading price for sell orders', () => {
      const { result } = renderHook(() =>
        useTradingPrice(100, false, 0.1, 1)
      );

      const price = result.current.calculatePrice();

      expect(price.price).toBeLessThan(0.1); // Sell decreases price
      expect(price.receiveAmount).toBeGreaterThan(0);
      expect(price.impact).toBeGreaterThanOrEqual(0);
    });

    it('should handle zero amount', () => {
      const { result } = renderHook(() =>
        useTradingPrice(0, true, 0.1, 1)
      );

      const price = result.current.calculatePrice();

      expect(price.price).toBe(0.1); // No change
      expect(price.receiveAmount).toBe(0);
      expect(price.impact).toBe(0);
    });

    it('should calculate slippage correctly', () => {
      const { result } = renderHook(() =>
        useTradingPrice(100, true, 0.1, 5) // 5% slippage
      );

      const price = result.current.calculatePrice();

      expect(price.slippageAdjusted).toBeLessThan(price.receiveAmount);
      expect(price.priceImpact).toBeGreaterThan(0);
    });

    it('should limit price impact to maximum 10%', () => {
      const { result } = renderHook(() =>
        useTradingPrice(10000, true, 0.1, 1) // Very large amount
      );

      const price = result.current.calculatePrice();

      expect(price.impact).toBeLessThanOrEqual(0.1);
    });

    it('should handle different slippage values', () => {
      const { result: result1 } = renderHook(() =>
        useTradingPrice(100, true, 0.1, 0.5) // 0.5% slippage
      );
      const { result: result2 } = renderHook(() =>
        useTradingPrice(100, true, 0.1, 10) // 10% slippage
      );

      const price1 = result1.current.calculatePrice();
      const price2 = result2.current.calculatePrice();

      expect(price1.slippageAdjusted).toBeGreaterThan(price2.slippageAdjusted);
    });
  });

  describe('Callback Dependencies', () => {
    it('should recalculate when dependencies change', () => {
      const { result, rerender } = renderHook(
        ({ amount, isBuy, price, slippage }) => useTradingPrice(amount, isBuy, price, slippage),
        {
          initialProps: { amount: 100, isBuy: true, price: 0.1, slippage: 1 }
        }
      );

      const initialPrice = result.current.calculatePrice();

      rerender({ amount: 200, isBuy: true, price: 0.1, slippage: 1 });

      const newPrice = result.current.calculatePrice();
      expect(newPrice.impact).not.toBe(initialPrice.impact);
    });
  });
});

describe('validateTrade Function', () => {
  const defaultValidationParams = {
    walletAddress: '0x1234567890123456789012345678901234567890',
    fromToken: 'BNB',
    toToken: 'TOKEN',
    slippage: 1,
    currentPrice: 0.1
  };

  describe('Wallet Validation', () => {
    it('should reject empty wallet address', () => {
      const error = validateTrade(
        '100',
        '',
        defaultValidationParams.fromToken,
        defaultValidationParams.toToken,
        defaultValidationParams.slippage,
        defaultValidationParams.currentPrice
      );

      expect(error).toBe('Please connect your wallet first');
    });

    it('should accept valid wallet address', () => {
      const error = validateTrade(
        '100',
        defaultValidationParams.walletAddress,
        defaultValidationParams.fromToken,
        defaultValidationParams.toToken,
        defaultValidationParams.slippage,
        defaultValidationParams.currentPrice
      );

      expect(error).toBeNull();
    });
  });

  describe('Amount Validation', () => {
    it('should reject empty amount', () => {
      const error = validateTrade(
        '',
        defaultValidationParams.walletAddress,
        defaultValidationParams.fromToken,
        defaultValidationParams.toToken,
        defaultValidationParams.slippage,
        defaultValidationParams.currentPrice
      );

      expect(error).toBe('Please enter an amount');
    });

    it('should reject zero amount', () => {
      const error = validateTrade(
        '0',
        defaultValidationParams.walletAddress,
        defaultValidationParams.fromToken,
        defaultValidationParams.toToken,
        defaultValidationParams.slippage,
        defaultValidationParams.currentPrice
      );

      expect(error).toBe('Please enter an amount');
    });

    it('should reject negative amount', () => {
      const error = validateTrade(
        '-10',
        defaultValidationParams.walletAddress,
        defaultValidationParams.fromToken,
        defaultValidationParams.toToken,
        defaultValidationParams.slippage,
        defaultValidationParams.currentPrice
      );

      expect(error).toBe('Amount must be greater than 0');
    });

    it('should reject NaN amount', () => {
      const error = validateTrade(
        'invalid',
        defaultValidationParams.walletAddress,
        defaultValidationParams.fromToken,
        defaultValidationParams.toToken,
        defaultValidationParams.slippage,
        defaultValidationParams.currentPrice
      );

      expect(error).toBe('Invalid amount');
    });

    it('should accept MAX amount', () => {
      const error = validateTrade(
        'MAX',
        defaultValidationParams.walletAddress,
        defaultValidationParams.fromToken,
        defaultValidationParams.toToken,
        defaultValidationParams.slippage,
        defaultValidationParams.currentPrice
      );

      expect(error).toBeNull();
    });

    it('should reject amounts too large', () => {
      const error = validateTrade(
        '15000',
        defaultValidationParams.walletAddress,
        defaultValidationParams.fromToken,
        defaultValidationParams.toToken,
        defaultValidationParams.slippage,
        defaultValidationParams.currentPrice
      );

      expect(error).toBe('Amount too large');
    });
  });

  describe('Balance Validation', () => {
    it('should check BNB balance', () => {
      const error = validateTrade(
        '10', // More than mock BNB balance of 5.2
        defaultValidationParams.walletAddress,
        'BNB',
        defaultValidationParams.toToken,
        defaultValidationParams.slippage,
        defaultValidationParams.currentPrice
      );

      expect(error).toBe('Insufficient BNB balance');
    });

    it('should check token balance', () => {
      const error = validateTrade(
        '200000', // More than mock token balance of 125000
        defaultValidationParams.walletAddress,
        'TOKEN',
        defaultValidationParams.toToken,
        defaultValidationParams.slippage,
        defaultValidationParams.currentPrice
      );

      expect(error).toBe('Insufficient TOKEN balance');
    });

    it('should accept amounts within balance', () => {
      const error = validateTrade(
        '5', // Within mock BNB balance
        defaultValidationParams.walletAddress,
        'BNB',
        defaultValidationParams.toToken,
        defaultValidationParams.slippage,
        defaultValidationParams.currentPrice
      );

      expect(error).toBeNull();
    });
  });

  describe('Slippage Validation', () => {
    it('should reject slippage too low', () => {
      const error = validateTrade(
        '100',
        defaultValidationParams.walletAddress,
        defaultValidationParams.fromToken,
        defaultValidationParams.toToken,
        0.05, // Below 0.1%
        defaultValidationParams.currentPrice
      );

      expect(error).toBe('Slippage must be between 0.1% and 50%');
    });

    it('should reject slippage too high', () => {
      const error = validateTrade(
        '100',
        defaultValidationParams.walletAddress,
        defaultValidationParams.fromToken,
        defaultValidationParams.toToken,
        60, // Above 50%
        defaultValidationParams.currentPrice
      );

      expect(error).toBe('Slippage must be between 0.1% and 50%');
    });

    it('should accept valid slippage range', () => {
      const error = validateTrade(
        '100',
        defaultValidationParams.walletAddress,
        defaultValidationParams.fromToken,
        defaultValidationParams.toToken,
        5, // Within valid range
        defaultValidationParams.currentPrice
      );

      expect(error).toBeNull();
    });
  });

  describe('Price Impact Validation', () => {
    it('should reject trades with high price impact', () => {
      const error = validateTrade(
        '1000', // Large amount for high impact
        defaultValidationParams.walletAddress,
        defaultValidationParams.fromToken,
        defaultValidationParams.toToken,
        defaultValidationParams.slippage,
        defaultValidationParams.currentPrice
      );

      expect(error).toBe('Trade size too large (high price impact)');
    });

    it('should accept trades with acceptable price impact', () => {
      const error = validateTrade(
        '10', // Small amount for low impact
        defaultValidationParams.walletAddress,
        defaultValidationParams.fromToken,
        defaultValidationParams.toToken,
        defaultValidationParams.slippage,
        defaultValidationParams.currentPrice
      );

      expect(error).toBeNull();
    });
  });
});

describe('Utility Functions', () => {
  describe('formatPrice', () => {
    it('should format price with default decimals', () => {
      expect(formatPrice(0.123456789)).toBe('0.123457');
      expect(formatPrice(1)).toBe('1.000000');
      expect(formatPrice(0.000001)).toBe('0.000001');
    });

    it('should format price with custom decimals', () => {
      expect(formatPrice(0.123456789, 2)).toBe('0.12');
      expect(formatPrice(0.123456789, 8)).toBe('0.12345679');
      expect(formatPrice(1, 0)).toBe('1');
    });

    it('should handle edge cases', () => {
      expect(formatPrice(0)).toBe('0.000000');
      expect(formatPrice(-1.234)).toBe('-1.234000');
    });
  });

  describe('formatPercentage', () => {
    it('should format positive percentages', () => {
      expect(formatPercentage(5.1234)).toBe('+5.12%');
      expect(formatPercentage(0.1)).toBe('+0.10%');
      expect(formatPercentage(100)).toBe('+100.00%');
    });

    it('should format negative percentages', () => {
      expect(formatPercentage(-5.1234)).toBe('-5.12%');
      expect(formatPercentage(-0.1)).toBe('-0.10%');
      expect(formatPercentage(-100)).toBe('-100.00%');
    });

    it('should format zero percentage', () => {
      expect(formatPercentage(0)).toBe('+0.00%');
    });

    it('should handle decimal precision correctly', () => {
      expect(formatPercentage(5.6789)).toBe('+5.68%');
      expect(formatPercentage(-5.6749)).toBe('-5.67%');
    });
  });

  describe('formatTimeAgo', () => {
    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(1000000000000); // Fixed timestamp
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should format time in minutes', () => {
      const timestamp = 1000000000000 - 5 * 60 * 1000; // 5 minutes ago
      expect(formatTimeAgo(timestamp)).toBe('5m ago');
    });

    it('should format time in hours', () => {
      const timestamp = 1000000000000 - 2 * 60 * 60 * 1000; // 2 hours ago
      expect(formatTimeAgo(timestamp)).toBe('2h ago');
    });

    it('should format time in days', () => {
      const timestamp = 1000000000000 - 3 * 24 * 60 * 60 * 1000; // 3 days ago
      expect(formatTimeAgo(timestamp)).toBe('3d ago');
    });

    it('should handle very recent times', () => {
      const timestamp = 1000000000000 - 30 * 1000; // 30 seconds ago
      expect(formatTimeAgo(timestamp)).toBe('0m ago');
    });

    it('should handle future timestamps', () => {
      const timestamp = 1000000000000 + 5 * 60 * 1000; // 5 minutes in future
      expect(formatTimeAgo(timestamp)).toBe('0m ago');
    });
  });
});

describe('Integration Tests', () => {
  it('should work together for complete trading scenario', () => {
    // Mock current time
    jest.spyOn(Date, 'now').mockReturnValue(1000000000000);

    // Set up price hook
    const { result: priceResult } = renderHook(() => useDynamicPrice(0.1, 'test-token'));

    // Set up trading hook
    const { result: tradingResult } = renderHook(() =>
      useTradingPrice(100, true, priceResult.current.priceData.currentPrice, 1)
    );

    // Calculate trading price
    const tradingPrice = tradingResult.current.calculatePrice();

    // Validate the trade
    const validationError = validateTrade(
      '100',
      '0x1234567890123456789012345678901234567890',
      'BNB',
      'TOKEN',
      1,
      priceResult.current.priceData.currentPrice
    );

    // Format display values
    const formattedPrice = formatPrice(tradingPrice.price);
    const formattedImpact = formatPercentage(tradingPrice.priceImpact);

    expect(validationError).toBeNull();
    expect(formattedPrice).toMatch(/^\d+\.\d+$/);
    expect(formattedImpact).toMatch(/^[+-]\d+\.\d+%$/);
    expect(tradingPrice.receiveAmount).toBeGreaterThan(0);

    jest.restoreAllMocks();
  });

  it('should handle edge case trading scenarios', () => {
    // Test with very small price
    const { result: priceResult } = renderHook(() => useDynamicPrice(0.0001, 'test-token'));

    const { result: tradingResult } = renderHook(() =>
      useTradingPrice(1, false, priceResult.current.priceData.currentPrice, 0.1)
    );

    const tradingPrice = tradingResult.current.calculatePrice();

    expect(tradingPrice.price).toBeLessThanOrEqual(0.0001);
    expect(tradingPrice.receiveAmount).toBeGreaterThanOrEqual(0);
  });
});