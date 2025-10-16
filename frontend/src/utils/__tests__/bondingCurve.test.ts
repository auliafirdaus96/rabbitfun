import {
  BONDING_CURVE_CONFIG,
  calculatePrice,
  calculateTokensOut,
  calculateBNBOut,
  calculatePriceImpact,
  formatPrice,
  formatPercentage,
  getProgressPercentage,
  validateTradeAmount,
  estimateGasForTrade,
  getBondingCurveInfo,
} from '../bondingCurve';

describe('Bonding Curve Utilities', () => {
  describe('BONDING_CURVE_CONFIG', () => {
    it('should have correct configuration values', () => {
      expect(BONDING_CURVE_CONFIG.INITIAL_PRICE).toBe(0.00000001);
      expect(BONDING_CURVE_CONFIG.GROSS_RAISE).toBe(100000);
      expect(BONDING_CURVE_CONFIG.GRADUATION_SUPPLY).toBe(200000);
      expect(BONDING_CURVE_CONFIG.K_VALUE).toBe(0.000015);
      expect(BONDING_CURVE_CONFIG.FEE_RATE).toBe(0.0125); // 1.25%
      expect(BONDING_CURVE_CONFIG.CREATOR_FEE_RATE).toBe(0.0025); // 0.25%
      expect(BONDING_CURVE_CONFIG.PLATFORM_FEE_RATE).toBe(0.01); // 1%
      expect(BONDING_CURVE_CONFIG.MIN_TRADE_AMOUNT).toBe(0.001);
      expect(BONDING_CURVE_CONFIG.MAX_TRADE_AMOUNT).toBe(1000);
    });
  });

  describe('calculatePrice', () => {
    it('should calculate correct price for given supply', () => {
      const supply = 100000; // 50% of graduation
      const expectedPrice = BONDING_CURVE_CONFIG.INITIAL_PRICE * Math.exp(BONDING_CURVE_CONFIG.K_VALUE * (supply / BONDING_CURVE_CONFIG.GRADUATION_SUPPLY));
      const price = calculatePrice(supply);
      expect(price).toBeCloseTo(expectedPrice, 8);
    });

    it('should handle zero supply', () => {
      const price = calculatePrice(0);
      expect(price).toBe(BONDING_CURVE_CONFIG.INITIAL_PRICE);
    });

    it('should handle maximum supply (graduation)', () => {
      const supply = BONDING_CURVE_CONFIG.GRADUATION_SUPPLY;
      const price = calculatePrice(supply);
      expect(price).toBeGreaterThan(BONDING_CURVE_CONFIG.INITIAL_PRICE);
    });

    it('should handle negative supply gracefully', () => {
      expect(() => calculatePrice(-1000)).not.toThrow();
      expect(calculatePrice(-1000)).toBeLessThan(BONDING_CURVE_CONFIG.INITIAL_PRICE);
    });

    it('should handle very large supply values', () => {
      const largeSupply = BONDING_CURVE_CONFIG.GRADUATION_SUPPLY * 10;
      expect(() => calculatePrice(largeSupply)).not.toThrow();
      const price = calculatePrice(largeSupply);
      expect(price).toBeGreaterThan(0);
    });
  });

  describe('calculateTokensOut', () => {
    it('should calculate correct token amount for BNB input', () => {
      const bnbAmount = 1;
      const currentSupply = 50000;
      const tokensOut = calculateTokensOut(bnbAmount, currentSupply);
      expect(tokensOut).toBeGreaterThan(0);
      expect(tokensOut).toBeLessThan(BONDING_CURVE_CONFIG.GRADUATION_SUPPLY);
    });

    it('should handle zero BNB amount', () => {
      const tokensOut = calculateTokensOut(0, 50000);
      expect(tokensOut).toBe(0);
    });

    it('should handle negative BNB amount', () => {
      const tokensOut = calculateTokensOut(-1, 50000);
      expect(tokensOut).toBe(0);
    });

    it('should increase with larger BNB amounts', () => {
      const currentSupply = 50000;
      const tokensOut1 = calculateTokensOut(1, currentSupply);
      const tokensOut2 = calculateTokensOut(2, currentSupply);
      expect(tokensOut2).toBeGreaterThan(tokensOut1);
    });

    it('should decrease with higher current supply', () => {
      const bnbAmount = 1;
      const tokensOut1 = calculateTokensOut(bnbAmount, 10000);
      const tokensOut2 = calculateTokensOut(bnbAmount, 100000);
      expect(tokensOut2).toBeLessThan(tokensOut1);
    });
  });

  describe('calculateBNBOut', () => {
    it('should calculate correct BNB amount for token input', () => {
      const tokenAmount = 10000;
      const currentSupply = 50000;
      const bnbOut = calculateBNBOut(tokenAmount, currentSupply);
      expect(bnbOut).toBeGreaterThan(0);
    });

    it('should handle zero token amount', () => {
      const bnbOut = calculateBNBOut(0, 50000);
      expect(bnbOut).toBe(0);
    });

    it('should handle negative token amount', () => {
      const bnbOut = calculateBNBOut(-1000, 50000);
      expect(bnbOut).toBe(0);
    });

    it('should prevent selling more than available supply', () => {
      const currentSupply = 10000;
      const bnbOut = calculateBNBOut(20000, currentSupply);
      expect(bnbOut).toBe(0);
    });

    it('should increase with larger token amounts', () => {
      const currentSupply = 50000;
      const bnbOut1 = calculateBNBOut(1000, currentSupply);
      const bnbOut2 = calculateBNBOut(2000, currentSupply);
      expect(bnbOut2).toBeGreaterThan(bnbOut1);
    });
  });

  describe('calculatePriceImpact', () => {
    it('should calculate price impact for trades', () => {
      const amountIn = 1;
      const currentSupply = 50000;
      const priceImpact = calculatePriceImpact(amountIn, currentSupply);
      expect(priceImpact).toBeGreaterThan(0);
      expect(priceImpact).toBeLessThan(1); // Should be less than 100%
    });

    it('should handle zero amount', () => {
      const priceImpact = calculatePriceImpact(0, 50000);
      expect(priceImpact).toBe(0);
    });

    it('should handle negative amount', () => {
      const priceImpact = calculatePriceImpact(-1, 50000);
      expect(priceImpact).toBe(0);
    });

    it('should increase with larger trade sizes', () => {
      const currentSupply = 50000;
      const impact1 = calculatePriceImpact(1, currentSupply);
      const impact2 = calculatePriceImpact(10, currentSupply);
      expect(impact2).toBeGreaterThan(impact1);
    });

    it('should be higher when supply is lower', () => {
      const amount = 1;
      const impact1 = calculatePriceImpact(amount, 10000);
      const impact2 = calculatePriceImpact(amount, 100000);
      expect(impact1).toBeGreaterThan(impact2);
    });
  });

  describe('formatPrice', () => {
    it('should format prices correctly', () => {
      expect(formatPrice(0.00000001)).toBe('0.00000001');
      expect(formatPrice(0.001)).toBe('0.001');
      expect(formatPrice(1)).toBe('1.00');
      expect(formatPrice(1234.5678)).toBe('1,234.57');
    });

    it('should handle very small numbers', () => {
      expect(formatPrice(0.000000001)).toBe('0.000000001');
      expect(formatPrice(1e-10)).toBe('0.0000000001');
    });

    it('should handle very large numbers', () => {
      expect(formatPrice(1000000)).toBe('1,000,000.00');
      expect(formatPrice(1234567890)).toBe('1,234,567,890.00');
    });

    it('should handle zero', () => {
      expect(formatPrice(0)).toBe('0.00');
    });

    it('should handle negative numbers', () => {
      expect(formatPrice(-1.2345)).toBe('-1.23');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentages correctly', () => {
      expect(formatPercentage(0.01)).toBe('1.00%');
      expect(formatPercentage(0.1234)).toBe('12.34%');
      expect(formatPercentage(1)).toBe('100.00%');
    });

    it('should handle small percentages', () => {
      expect(formatPercentage(0.0001)).toBe('0.01%');
      expect(formatPercentage(0.000001)).toBe('0.00%');
    });

    it('should handle large percentages', () => {
      expect(formatPercentage(2.5)).toBe('250.00%');
      expect(formatPercentage(10)).toBe('1,000.00%');
    });

    it('should handle zero', () => {
      expect(formatPercentage(0)).toBe('0.00%');
    });

    it('should handle negative percentages', () => {
      expect(formatPercentage(-0.05)).toBe('-5.00%');
    });
  });

  describe('getProgressPercentage', () => {
    it('should calculate progress correctly', () => {
      expect(getProgressPercentage(0)).toBe(0);
      expect(getProgressPercentage(100000)).toBe(50); // 50% of graduation
      expect(getProgressPercentage(200000)).toBe(100); // 100% = graduation
    });

    it('should handle values beyond graduation', () => {
      expect(getProgressPercentage(300000)).toBe(100); // Cap at 100%
    });

    it('should handle negative values', () => {
      expect(getProgressPercentage(-1000)).toBe(0); // Cap at 0%
    });

    it('should handle decimal values', () => {
      expect(getProgressPercentage(50000.5)).toBeCloseTo(25.0025, 4);
    });
  });

  describe('validateTradeAmount', () => {
    it('should validate valid trade amounts', () => {
      expect(validateTradeAmount(1, 'buy')).toEqual({ valid: true });
      expect(validateTradeAmount(0.1, 'sell')).toEqual({ valid: true });
    });

    it('should reject amounts below minimum', () => {
      const result = validateTradeAmount(0.0001, 'buy');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Minimum trade amount');
    });

    it('should reject amounts above maximum', () => {
      const result = validateTradeAmount(2000, 'buy');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Maximum trade amount');
    });

    it('should reject zero amounts', () => {
      const result = validateTradeAmount(0, 'buy');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be greater than');
    });

    it('should reject negative amounts', () => {
      const result = validateTradeAmount(-1, 'buy');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be greater than');
    });

    it('should handle NaN amounts', () => {
      const result = validateTradeAmount(NaN, 'buy');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid amount');
    });

    it('should handle infinity amounts', () => {
      const result = validateTradeAmount(Infinity, 'buy');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid amount');
    });
  });

  describe('estimateGasForTrade', () => {
    it('should estimate gas for buy trades', () => {
      const gasEstimate = estimateGasForTrade('buy', 1);
      expect(gasEstimate).toBeGreaterThan(0);
      expect(typeof gasEstimate).toBe('number');
    });

    it('should estimate gas for sell trades', () => {
      const gasEstimate = estimateGasForTrade('sell', 1000);
      expect(gasEstimate).toBeGreaterThan(0);
      expect(typeof gasEstimate).toBe('number');
    });

    it('should handle invalid trade type', () => {
      const gasEstimate = estimateGasForTrade('invalid' as any, 1);
      expect(gasEstimate).toBe(0);
    });

    it('should vary based on trade size', () => {
      const gas1 = estimateGasForTrade('buy', 1);
      const gas2 = estimateGasForTrade('buy', 100);
      expect(gas2).toBeGreaterThan(gas1);
    });
  });

  describe('getBondingCurveInfo', () => {
    it('should return complete bonding curve information', () => {
      const currentSupply = 100000;
      const info = getBondingCurveInfo(currentSupply);

      expect(info).toHaveProperty('currentPrice');
      expect(info).toHaveProperty('progress');
      expect(info).toHaveProperty('canGraduate');
      expect(info).toHaveProperty('raisedAmount');
      expect(info).toHaveProperty('remainingAmount');

      expect(info.currentPrice).toBeGreaterThan(0);
      expect(info.progress).toBe(50); // 50% of graduation
      expect(info.canGraduate).toBe(false);
      expect(info.raisedAmount).toBeGreaterThan(0);
      expect(info.remainingAmount).toBeGreaterThan(0);
    });

    it('should identify graduation eligibility', () => {
      const info = getBondingCurveInfo(BONDING_CURVE_CONFIG.GRADUATION_SUPPLY);
      expect(info.canGraduate).toBe(true);
      expect(info.progress).toBe(100);
    });

    it('should handle zero supply', () => {
      const info = getBondingCurveInfo(0);
      expect(info.currentPrice).toBe(BONDING_CURVE_CONFIG.INITIAL_PRICE);
      expect(info.progress).toBe(0);
      expect(info.canGraduate).toBe(false);
    });

    it('should calculate raised and remaining amounts correctly', () => {
      const currentSupply = BONDING_CURVE_CONFIG.GRADUATION_SUPPLY / 2;
      const info = getBondingCurveInfo(currentSupply);

      expect(info.raisedAmount + info.remainingAmount).toBe(BONDING_CURVE_CONFIG.GROSS_RAISE);
      expect(info.raisedAmount).toBe(BONDING_CURVE_CONFIG.GROSS_RAISE / 2);
      expect(info.remainingAmount).toBe(BONDING_CURVE_CONFIG.GROSS_RAISE / 2);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid inputs gracefully', () => {
      expect(() => calculatePrice(NaN)).not.toThrow();
      expect(() => calculatePrice(Infinity)).not.toThrow();
      expect(() => calculateTokensOut(NaN, 1000)).not.toThrow();
      expect(() => calculateBNBOut(NaN, 1000)).not.toThrow();
    });

    it('should return sensible values for edge cases', () => {
      expect(calculatePrice(NaN)).toBe(BONDING_CURVE_CONFIG.INITIAL_PRICE);
      expect(calculateTokensOut(NaN, 1000)).toBe(0);
      expect(calculateBNBOut(NaN, 1000)).toBe(0);
    });

    it('should handle very precise decimal calculations', () => {
      const precisePrice = calculatePrice(12345.6789);
      expect(typeof precisePrice).toBe('number');
      expect(isFinite(precisePrice)).toBe(true);
    });

    it('should maintain mathematical consistency', () => {
      const bnbAmount = 1;
      const currentSupply = 50000;

      const tokensOut = calculateTokensOut(bnbAmount, currentSupply);
      const bnbOut = calculateBNBOut(tokensOut, currentSupply + tokensOut);

      // Due to fees and slippage, bnbOut should be less than original bnbAmount
      expect(bnbOut).toBeLessThan(bnbAmount);
      expect(bnbOut).toBeGreaterThan(0);
    });
  });

  describe('Integration Tests', () => {
    it('should complete full trade simulation', () => {
      const initialSupply = 10000;
      const bnbAmount = 2;

      // Get initial state
      const initialInfo = getBondingCurveInfo(initialSupply);
      const initialPrice = initialInfo.currentPrice;

      // Calculate trade
      const tokensOut = calculateTokensOut(bnbAmount, initialSupply);
      const priceImpact = calculatePriceImpact(bnbAmount, initialSupply);

      // Validate trade
      const validation = validateTradeAmount(bnbAmount, 'buy');

      // Check results
      expect(tokensOut).toBeGreaterThan(0);
      expect(priceImpact).toBeGreaterThan(0);
      expect(validation.valid).toBe(true);
      expect(initialPrice).toBeGreaterThan(0);
    });

    it('should simulate progression to graduation', () => {
      let currentSupply = 0;
      let totalBNBInvested = 0;

      // Simulate multiple buys
      while (currentSupply < BONDING_CURVE_CONFIG.GRADUATION_SUPPLY) {
        const buyAmount = 5; // 5 BNB per buy
        const tokensOut = calculateTokensOut(buyAmount, currentSupply);

        if (tokensOut === 0) break; // Can't buy more

        currentSupply += tokensOut;
        totalBNBInvested += buyAmount;

        const info = getBondingCurveInfo(currentSupply);
        expect(info.progress).toBeLessThanOrEqual(100);
      }

      // Should reach or approach graduation
      expect(currentSupply).toBeCloseTo(BONDING_CURVE_CONFIG.GRADUATION_SUPPLY, 0);
      expect(totalBNBInvested).toBeCloseTo(BONDING_CURVE_CONFIG.GROSS_RAISE, 0);
    });
  });
});