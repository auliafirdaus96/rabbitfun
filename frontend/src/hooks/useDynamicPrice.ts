import { useState, useEffect, useCallback } from 'react';

export interface PriceData {
  currentPrice: number;
  priceChange24h: number;
  marketCap: number;
  volume24h: number;
  circulatingSupply: number;
  lastUpdated: number;
}

export interface TradingPrice {
  price: number;
  impact: number;
  receiveAmount: number;
  slippageAdjusted: number;
  priceImpact: number;
  liquidity: number;
}

// Simulate price volatility with market dynamics
export const useDynamicPrice = (basePrice: number, tokenId: string) => {
  const [priceData, setPriceData] = useState<PriceData>({
    currentPrice: basePrice,
    priceChange24h: 68.31,
    marketCap: 1243955 * basePrice,
    volume24h: 391.49,
    circulatingSupply: 1243955,
    lastUpdated: Date.now()
  });

  const [priceHistory, setPriceHistory] = useState<{ time: number; price: number }[]>([]);

  // Simulate real-time price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setPriceData(prev => {
        // Simulate price movement with random walk
        const volatility = 0.02; // 2% volatility
        const trend = Math.random() > 0.45 ? 1 : -1; // Slight upward trend
        const randomFactor = (Math.random() - 0.45) * volatility;
        const priceChange = trend * randomFactor * prev.currentPrice;

        const newPrice = Math.max(prev.currentPrice + priceChange, prev.currentPrice * 0.9); // Prevent too drastic drops

        // Update price history for chart
        setPriceHistory(history => {
          const newEntry = { time: Date.now(), price: newPrice };
          const updated = [...history, newEntry].slice(-100); // Keep last 100 entries
          return updated;
        });

        return {
          ...prev,
          currentPrice: newPrice,
          priceChange24h: prev.priceChange24h + (Math.random() - 0.5) * 0.1,
          marketCap: newPrice * prev.circulatingSupply,
          volume24h: prev.volume24h + (Math.random() - 0.5) * 10,
          lastUpdated: Date.now()
        };
      });
    }, 2000 + Math.random() * 3000); // Random interval between 2-5 seconds

    return () => clearInterval(interval);
  }, [tokenId]);

  return { priceData, priceHistory };
};

// Calculate trading price with bonding curve and slippage
export const useTradingPrice = (
  amount: number,
  isBuy: boolean,
  currentPrice: number,
  slippage: number
) => {
  const calculatePrice = useCallback((): TradingPrice => {
    // Bonding curve formula: price = basePrice * (1 + (volume * factor))
    const liquidity = 391.49; // BNB in liquidity pool
    const tokenSupply = 1243955;
    const bondingCurveFactor = 0.00001;

    let priceImpact = 0;
    let receiveAmount = 0;
    let price = currentPrice;

    if (amount > 0) {
      // Calculate price impact based on trade size
      const tradeSizeRatio = amount / liquidity;
      priceImpact = Math.min(tradeSizeRatio * 0.05, 0.1); // Max 10% impact

      if (isBuy) {
        // Buying increases price
        price = currentPrice * (1 + priceImpact);
        receiveAmount = (amount / price) * (1 - slippage / 100);
      } else {
        // Selling decreases price
        price = currentPrice * (1 - priceImpact);
        receiveAmount = amount * price * (1 - slippage / 100);
      }
    }

    const slippageAdjusted = receiveAmount * (1 - slippage / 100);

    return {
      price,
      impact: priceImpact,
      receiveAmount,
      slippageAdjusted,
      priceImpact: priceImpact * 100,
      liquidity
    };
  }, [amount, isBuy, currentPrice, slippage]);

  return { calculatePrice };
};

// Validate trade parameters
export const validateTrade = (
  amount: string,
  walletAddress: string,
  fromToken: string,
  toToken: string,
  slippage: number,
  currentPrice: number
): string | null => {
  if (!walletAddress) return "Please connect your wallet first";
  if (!amount || amount === "0" || amount === "") return "Please enter an amount";
  if (amount === "MAX") return null;

  const amt = Number(amount);
  if (Number.isNaN(amt)) return "Invalid amount";
  if (amt <= 0) return "Amount must be greater than 0";
  if (amt > 10000) return "Amount too large";

  // Simulate balance check (in real app, this would check actual wallet balance)
  const mockBalance = fromToken === "BNB" ? 5.2 : 125000;
  if (amt > mockBalance) return `Insufficient ${fromToken} balance`;

  if (slippage < 0.1 || slippage > 50) return "Slippage must be between 0.1% and 50%";

  // Check for extreme price impact
  const priceImpact = (amt / 391.49) * 0.05;
  if (priceImpact > 0.1) return "Trade size too large (high price impact)";

  return null;
};

// Format display values
export const formatPrice = (price: number, decimals: number = 6): string => {
  return price.toFixed(decimals);
};

export const formatPercentage = (value: number): string => {
  const abs = Math.abs(value);
  const sign = value >= 0 ? '+' : '';
  return `${sign}${abs.toFixed(2)}%`;
};

export const formatTimeAgo = (timestamp: number): string => {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${minutes}m ago`;
};