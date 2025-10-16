// Exponential Bonding Curve Configuration (Pump.fun Style)
export const BONDING_CURVE_CONFIG = {
  P0: 0.00000001, // Initial price in BNB (1e-8 BNB)
  S: 1_000_000_000, // Total supply in tokens (1 billion)
  k: 5.43, // Growth factor
  PLATFORM_FEE: 0.01, // 1% platform fee
  CREATOR_FEE: 0.0025, // 0.25% creator fee
  TOTAL_FEE: 0.0125, // 1.25% total fee
  GROSS_RAISE: 35, // 35 BNB gross raise
  NET_RAISE: 35 * (1 - 0.0125), // 34.56 BNB net raise
  INITIAL_PRICE_WEI: 10000000000, // 0.00000001 BNB = 1e10 wei
  TOTAL_SUPPLY_TOKENS: 1000000000, // 1B tokens
  TRADING_SUPPLY_TOKENS: 800000000, // 800M tokens for trading
  GRADUATION_SUPPLY_TOKENS: 200000000, // 200M tokens for LP
};

// Exponential Bonding Curve Functions
export const calculatePrice = (supply: number): number => {
  const { P0, k, S } = BONDING_CURVE_CONFIG;
  return P0 * Math.exp(k * (supply / S));
};

export const calculateTokensOut = (bnbAmount: number, currentSupply: number): number => {
  const { TOTAL_FEE } = BONDING_CURVE_CONFIG;
  const netAmount = bnbAmount * (1 - TOTAL_FEE);

  // Integral approximation for exponential curve
  const currentPrice = calculatePrice(currentSupply);
  return netAmount / currentPrice;
};

export const calculateBNBOut = (tokenAmount: number, currentSupply: number): number => {
  const currentPrice = calculatePrice(currentSupply);
  return tokenAmount * currentPrice * (1 - BONDING_CURVE_CONFIG.TOTAL_FEE);
};

export const calculatePriceImpact = (amountIn: number, currentSupply: number): number => {
  const currentPrice = calculatePrice(currentSupply);
  const newSupply = currentSupply + calculateTokensOut(amountIn, currentSupply);
  const newPrice = calculatePrice(newSupply);

  return ((newPrice - currentPrice) / currentPrice) * 100;
};

export const getBondingCurveState = (raisedAmount: number, currentSupply: number) => {
  const config = BONDING_CURVE_CONFIG;
  const currentPrice = calculatePrice(currentSupply);
  const marketCap = currentPrice * currentSupply;
  const progress = (raisedAmount / config.NET_RAISE) * 100;

  const totalFees = raisedAmount * config.TOTAL_FEE;
  const platformFees = totalFees * (config.PLATFORM_FEE / config.TOTAL_FEE);
  const creatorFees = totalFees * (config.CREATOR_FEE / config.TOTAL_FEE);

  return {
    currentSupply,
    totalRaised: raisedAmount,
    currentPrice,
    marketCap,
    progress,
    platformFees,
    creatorFees,
    bondingCurvePool: raisedAmount * 0.8,
    liquidityPool: raisedAmount * 0.2,
    isGraduated: raisedAmount >= config.NET_RAISE,
  };
};

// Format helpers
export const formatBNB = (value: string | number, decimals: number = 6): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toFixed(decimals);
};

export const formatTokens = (value: string | number, decimals: number = 2): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toFixed(decimals);
};

export const shortenAddress = (address: string, chars: number = 4): string => {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};