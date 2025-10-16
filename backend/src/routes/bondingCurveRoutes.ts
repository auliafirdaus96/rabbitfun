import { Router } from 'express';
import { validate } from '../middleware/validation';
import { generalLimiter } from '../middleware/rateLimit';
import {
  BONDING_CURVE_CONFIG,
  calculatePrice,
  calculateTokensOut,
  calculateBNBOut,
  calculatePriceImpact,
  getBondingCurveState
} from '../config/constants';

const router = Router();

// GET /api/bonding-curve/config - Get bonding curve configuration
router.get('/config', generalLimiter, (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        P0: BONDING_CURVE_CONFIG.P0,
        S: BONDING_CURVE_CONFIG.S,
        k: BONDING_CURVE_CONFIG.k,
        PLATFORM_FEE: BONDING_CURVE_CONFIG.PLATFORM_FEE,
        CREATOR_FEE: BONDING_CURVE_CONFIG.CREATOR_FEE,
        TOTAL_FEE: BONDING_CURVE_CONFIG.TOTAL_FEE,
        GROSS_RAISE: BONDING_CURVE_CONFIG.GROSS_RAISE,
        NET_RAISE: BONDING_CURVE_CONFIG.NET_RAISE,
        INITIAL_PRICE_WEI: BONDING_CURVE_CONFIG.INITIAL_PRICE_WEI,
        TOTAL_SUPPLY_TOKENS: BONDING_CURVE_CONFIG.TOTAL_SUPPLY_TOKENS,
        TRADING_SUPPLY_TOKENS: BONDING_CURVE_CONFIG.TRADING_SUPPLY_TOKENS,
        GRADUATION_SUPPLY_TOKENS: BONDING_CURVE_CONFIG.GRADUATION_SUPPLY_TOKENS,
      }
    });
  } catch (error) {
    console.error('Error fetching bonding curve config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bonding curve config'
    });
  }
});

// GET /api/bonding-curve/price - Calculate current price
router.get('/price', generalLimiter, (req, res) => {
  try {
    const { supply } = req.query;

    if (!supply || isNaN(Number(supply))) {
      return res.status(400).json({
        success: false,
        error: 'Valid supply parameter is required'
      });
    }

    const price = calculatePrice(Number(supply));

    return res.json({
      success: true,
      data: {
        supply: Number(supply),
        price,
        priceBNB: price,
        priceWei: BigInt(Math.floor(price * 1e18)).toString()
      }
    });
  } catch (error) {
    console.error('Error calculating price:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate price'
    });
  }
});

// GET /api/bonding-curve/calculate/buy - Calculate tokens received for BNB amount
router.get('/calculate/buy', generalLimiter, (req, res) => {
  try {
    const { bnbAmount, currentSupply } = req.query;

    if (!bnbAmount || !currentSupply ||
        isNaN(Number(bnbAmount)) || isNaN(Number(currentSupply))) {
      return res.status(400).json({
        success: false,
        error: 'Valid bnbAmount and currentSupply parameters are required'
      });
    }

    const bnbAmountNum = Number(bnbAmount);
    const currentSupplyNum = Number(currentSupply);

    const tokensOut = calculateTokensOut(bnbAmountNum, currentSupplyNum);
    const priceImpact = calculatePriceImpact(bnbAmountNum, currentSupplyNum);
    const fee = bnbAmountNum * BONDING_CURVE_CONFIG.TOTAL_FEE;
    const platformFee = bnbAmountNum * BONDING_CURVE_CONFIG.PLATFORM_FEE;
    const creatorFee = bnbAmountNum * BONDING_CURVE_CONFIG.CREATOR_FEE;
    const netAmount = bnbAmountNum - fee;

    return res.json({
      success: true,
      data: {
        bnbAmount: bnbAmountNum,
        tokensOut,
        priceImpact,
        fee,
        platformFee,
        creatorFee,
        netAmount,
        currentPrice: calculatePrice(currentSupplyNum),
        newPrice: calculatePrice(currentSupplyNum + tokensOut)
      }
    });
  } catch (error) {
    console.error('Error calculating buy trade:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate buy trade'
    });
  }
});

// GET /api/bonding-curve/calculate/sell - Calculate BNB received for token amount
router.get('/calculate/sell', generalLimiter, (req, res) => {
  try {
    const { tokenAmount, currentSupply } = req.query;

    if (!tokenAmount || !currentSupply ||
        isNaN(Number(tokenAmount)) || isNaN(Number(currentSupply))) {
      return res.status(400).json({
        success: false,
        error: 'Valid tokenAmount and currentSupply parameters are required'
      });
    }

    const tokenAmountNum = Number(tokenAmount);
    const currentSupplyNum = Number(currentSupply);

    const bnbOut = calculateBNBOut(tokenAmountNum, currentSupplyNum);
    const priceImpact = -Math.abs(calculatePriceImpact(bnbOut, currentSupplyNum - tokenAmountNum));
    const fee = bnbOut * BONDING_CURVE_CONFIG.TOTAL_FEE;
    const platformFee = bnbOut * BONDING_CURVE_CONFIG.PLATFORM_FEE;
    const creatorFee = bnbOut * BONDING_CURVE_CONFIG.CREATOR_FEE;
    const netAmount = bnbOut - fee;

    return res.json({
      success: true,
      data: {
        tokenAmount: tokenAmountNum,
        bnbOut,
        priceImpact,
        fee,
        platformFee,
        creatorFee,
        netAmount,
        currentPrice: calculatePrice(currentSupplyNum),
        newPrice: calculatePrice(Math.max(0, currentSupplyNum - tokenAmountNum))
      }
    });
  } catch (error) {
    console.error('Error calculating sell trade:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate sell trade'
    });
  }
});

// GET /api/bonding-curve/state/:tokenAddress - Get bonding curve state for token
router.get('/state/:tokenAddress', generalLimiter, async (req, res) => {
  try {
    const { tokenAddress } = req.params;

    // Mock implementation - in production, fetch from database
    const raisedAmount = 0; // Fetch from analytics
    const currentSupply = BONDING_CURVE_CONFIG.TRADING_SUPPLY_TOKENS; // Fetch from token state

    const bondingCurveState = getBondingCurveState(raisedAmount, currentSupply);

    res.json({
      success: true,
      data: {
        tokenAddress,
        bondingCurve: bondingCurveState
      }
    });
  } catch (error) {
    console.error('Error fetching bonding curve state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bonding curve state'
    });
  }
});

export default router;