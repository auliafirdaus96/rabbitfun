import { ethers } from 'ethers';

// Bonding Curve Configuration (Pump.fun Style)
export const BONDING_CURVE_CONFIG = {
  // Base Parameters
  P0: 0.00000001, // Initial price in BNB (1e-8 BNB)
  S: 1_000_000_000, // Total supply in tokens (1 billion)
  k: 5.43, // Growth factor

  // Fee Structure
  PLATFORM_FEE: 0.01, // 1% platform fee
  CREATOR_FEE: 0.0025, // 0.25% creator fee
  TOTAL_FEE: 0.0125, // 1.25% total fee

  // Distribution
  BONDING_CURVE_SPLIT: 0.8, // 80% to bonding curve
  LP_SPLIT: 0.2, // 20% to liquidity pool

  // Fundraising
  GROSS_RAISE: 35, // 35 BNB gross raise
  NET_RAISE: 35 * (1 - 0.0125), // 34.56 BNB net raise
  BONDING_CURVE_POOL: 35 * (1 - 0.0125) * 0.8, // 27.65 BNB
  LP_POOL: 35 * (1 - 0.0125) * 0.2, // 6.91 BNB
} as const;

export interface BondingCurveData {
  currentSupply: number;
  totalRaised: number;
  currentPrice: number;
  marketCap: number;
  progress: number;
  priceChange: number;
  bondingCurvePool: number;
  liquidityPool: number;
  platformFees: number;
  creatorFees: number;
}

export interface TradeCalculation {
  amountIn: number;
  amountOut: number;
  priceImpact: number;
  fee: number;
  platformFee: number;
  creatorFee: number;
  netAmount: number;
}

/**
 * Calculate price based on exponential bonding curve
 * P(x) = P0 * e^(k * (x / S))
 */
export function calculatePrice(supply: number): number {
  const { P0, k, S } = BONDING_CURVE_CONFIG;
  return P0 * Math.exp(k * (supply / S));
}

/**
 * Calculate how many tokens you get for a given BNB amount
 * Using integral of exponential curve
 */
export function calculateTokensOut(bnbAmount: number, currentSupply: number): number {
  const { P0, k, S } = BONDING_CURVE_CONFIG;
  const fee = bnbAmount * BONDING_CURVE_CONFIG.TOTAL_FEE;
  const netAmount = bnbAmount - fee;

  // Integral: ∫ (1 / (P0 * e^(k*x/S))) dx = (S/k) * e^(-k*x/S)
  const x1 = currentSupply;
  const x2 = x1 + (netAmount / calculatePrice(x1));

  // For small amounts, use linear approximation
  if (bnbAmount < 0.1) {
    return netAmount / calculatePrice(currentSupply);
  }

  // Calculate using the integral
  const supplyChange = (S / k) * (Math.exp(k * x2 / S) - Math.exp(k * x1 / S));
  return supplyChange;
}

/**
 * Calculate how much BNB you get for selling tokens
 */
export function calculateBNBOut(tokenAmount: number, currentSupply: number): number {
  const { P0, k, S } = BONDING_CURVE_CONFIG;
  const fee = 0; // No fee for selling

  // Calculate BNB out before fees
  const bnbOut = (P0 * S / k) * (Math.exp(k * currentSupply / S) - Math.exp(k * (currentSupply - tokenAmount) / S));

  // Apply selling fee if needed
  return bnbOut * (1 - fee);
}

/**
 * Calculate price impact of a trade
 */
export function calculatePriceImpact(amountIn: number, currentSupply: number): number {
  const currentPrice = calculatePrice(currentSupply);
  const newSupply = currentSupply + calculateTokensOut(amountIn, currentSupply);
  const newPrice = calculatePrice(newSupply);

  return ((newPrice - currentPrice) / currentPrice) * 100;
}

/**
 * Calculate trade details for buy order
 */
export function calculateBuyTrade(bnbAmount: number, currentSupply: number): TradeCalculation {
  const fee = bnbAmount * BONDING_CURVE_CONFIG.TOTAL_FEE;
  const platformFee = bnbAmount * BONDING_CURVE_CONFIG.PLATFORM_FEE;
  const creatorFee = bnbAmount * BONDING_CURVE_CONFIG.CREATOR_FEE;
  const netAmount = bnbAmount - fee;

  const tokensOut = calculateTokensOut(bnbAmount, currentSupply);
  const priceImpact = calculatePriceImpact(bnbAmount, currentSupply);

  return {
    amountIn: bnbAmount,
    amountOut: tokensOut,
    priceImpact,
    fee,
    platformFee,
    creatorFee,
    netAmount
  };
}

/**
 * Calculate trade details for sell order
 */
export function calculateSellTrade(tokenAmount: number, currentSupply: number): TradeCalculation {
  const bnbOut = calculateBNBOut(tokenAmount, currentSupply);
  const fee = bnbOut * BONDING_CURVE_CONFIG.TOTAL_FEE;
  const platformFee = bnbOut * BONDING_CURVE_CONFIG.PLATFORM_FEE;
  const creatorFee = bnbOut * BONDING_CURVE_CONFIG.CREATOR_FEE;
  const netAmount = bnbOut - fee;

  const priceImpact = -calculatePriceImpact(bnbOut, currentSupply - tokenAmount);

  return {
    amountIn: tokenAmount,
    amountOut: bnbOut,
    priceImpact,
    fee,
    platformFee,
    creatorFee,
    netAmount
  };
}

/**
 * Get current bonding curve state
 */
export function getBondingCurveState(raisedAmount: number, currentSupply: number): BondingCurveData {
  const config = BONDING_CURVE_CONFIG;
  const currentPrice = calculatePrice(currentSupply);
  const marketCap = currentPrice * currentSupply;
  const progress = calculateBondingCurveProgress(raisedAmount);

  // Calculate price change (mock calculation for now - could be enhanced with historical data)
  const initialPrice = config.P0;
  const priceChange = ((currentPrice - initialPrice) / initialPrice) * 100;

  const totalFees = raisedAmount * config.TOTAL_FEE;
  const platformFees = totalFees * (config.PLATFORM_FEE / config.TOTAL_FEE);
  const creatorFees = totalFees * (config.CREATOR_FEE / config.TOTAL_FEE);

  const bondingCurvePool = raisedAmount * config.BONDING_CURVE_SPLIT;
  const liquidityPool = raisedAmount * config.LP_SPLIT;

  return {
    currentSupply,
    totalRaised: raisedAmount,
    currentPrice,
    marketCap,
    progress,
    priceChange,
    bondingCurvePool,
    liquidityPool,
    platformFees,
    creatorFees
  };
}

/**
 * Format numbers with appropriate precision
 */
export function formatBNB(amount: number): string {
  if (amount < 0.000001) {
    return `${(amount * 1000000).toFixed(2)} μBNB`;
  } else if (amount < 0.001) {
    return `${(amount * 1000).toFixed(2)} mBNB`;
  } else {
    return `${amount.toFixed(6)} BNB`;
  }
}

export function formatTokens(amount: number): string {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(2)}M`;
  } else if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(2)}K`;
  } else {
    return amount.toFixed(2);
  }
}

/**
 * Calculate bonding curve progress percentage based on BNB raised
 * This is the centralized function for all progress calculations
 */
export function calculateBondingCurveProgress(raisedAmount: number): number {
  const { NET_RAISE } = BONDING_CURVE_CONFIG;
  return Math.min((raisedAmount / NET_RAISE) * 100, 100);
}

/**
 * Calculate bonding curve progress based on token supply (alternative method)
 */
export function calculateProgressFromSupply(soldSupply: number): number {
  const maxSold = 800_000_000; // 800M tokens (80% of 1B)
  return Math.min((soldSupply / maxSold) * 100, 100);
}

/**
 * Get progress status and color based on percentage
 */
export function getProgressStatus(progress: number): {
  color: string;
  bgColor: string;
  status: string;
  isCompleted: boolean;
} {
  if (progress >= 100) {
    return {
      color: 'text-green-500',
      bgColor: 'bg-green-500',
      status: 'Graduated',
      isCompleted: true
    };
  } else if (progress >= 75) {
    return {
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500',
      status: 'Almost There',
      isCompleted: false
    };
  } else if (progress >= 50) {
    return {
      color: 'text-blue-500',
      bgColor: 'bg-blue-500',
      status: 'Progressing',
      isCompleted: false
    };
  } else {
    return {
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500',
      status: 'Starting',
      isCompleted: false
    };
  }
}