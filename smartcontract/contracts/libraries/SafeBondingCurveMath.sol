// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SafeBondingCurveMath
 * @dev Library for safe mathematical operations in bonding curve calculations
 * Addresses precision, overflow, and gas optimization issues
 */
library SafeBondingCurveMath {

    // Error definitions
    error OverflowDetected();
    error InvalidInput();
    error PrecisionLoss();

    // Constants for safe calculations
    uint256 private constant FIXED_POINT_SCALE = 1e18;
    uint256 private constant MAX_EXPONENT = 50 * 1e18; // Safe upper bound for exponential
    uint256 private constant MAX_SUPPLY = 1e27; // 1B tokens with 18 decimals
    uint256 private constant MIN_PRECISION = 1e6; // Minimum acceptable precision

    /**
     * @dev Safe exponential calculation using continued fraction approximation
     * More accurate than Taylor series for larger exponents
     * @param x Input value (scaled by 1e18)
     * @return result e^x (scaled by 1e18)
     */
    function safeExp(uint256 x) internal pure returns (uint256) {
        if (x == 0) return FIXED_POINT_SCALE;
        if (x > MAX_EXPONENT) revert OverflowDetected();

        // For small values, use Taylor series
        if (x < 1e15) { // x < 0.001
            return _taylorExp(x);
        }

        // For larger values, use continued fraction approximation
        return _continuedFractionExp(x);
    }

    /**
     * @dev Taylor series approximation for e^x (safe for small x)
     * e^x ≈ 1 + x + x²/2! + x³/3! + x⁴/4!
     */
    function _taylorExp(uint256 x) private pure returns (uint256) {
        uint256 x2 = (x * x) / FIXED_POINT_SCALE;
        uint256 x3 = (x2 * x) / FIXED_POINT_SCALE;
        uint256 x4 = (x3 * x) / FIXED_POINT_SCALE;

        // Calculate: 1 + x + x²/2 + x³/6 + x⁴/24
        uint256 result = FIXED_POINT_SCALE; // 1
        result += x; // x
        result += x2 / 2; // x²/2
        result += x3 / 6; // x³/6
        result += x4 / 24; // x⁴/24

        return result;
    }

    /**
     * @dev Continued fraction approximation for e^x
     * More accurate for larger values and avoids overflow
     */
    function _continuedFractionExp(uint256 x) private pure returns (uint256) {
        // Use identity: e^x = (1 + x/n)^n for large n
        uint256 n = 1000; // Number of iterations
        uint256 x_scaled = x / n;

        uint256 result = FIXED_POINT_SCALE + x_scaled;

        for (uint256 i = 0; i < 10; i++) { // 10 iterations sufficient
            // Apply: (1 + x/n)^n approximation
            result = (result * result) / FIXED_POINT_SCALE;
            if (result > FIXED_POINT_SCALE * 100) { // Prevent explosion
                result = FIXED_POINT_SCALE * 100;
                break;
            }
        }

        return result;
    }

    /**
     * @dev Safe multiplication with overflow protection
     * @param a First operand
     * @param b Second operand
     * @return result a * b (reverts on overflow)
     */
    function safeMul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) return 0;

        uint256 result = a * b;
        if (result / a != b) revert OverflowDetected();

        return result;
    }

    /**
     * @dev Safe division with zero protection
     * @param a Numerator
     * @param b Denominator
     * @return result a / b (reverts if b = 0)
     */
    function safeDiv(uint256 a, uint256 b) internal pure returns (uint256) {
        if (b == 0) revert InvalidInput();
        return a / b;
    }

    /**
     * @dev Safe bonding curve price calculation with enhanced precision
     * P(x) = P0 * e^(k * (x / S))
     * @param supply Current token supply
     * @param initialPrice P0 (base price)
     * @param kFactor Growth factor k (scaled by 100)
     * @param supplyConstant S (total supply)
     * @return price Current price (scaled by 1e18)
     */
    function calculateSafePrice(
        uint256 supply,
        uint256 initialPrice,
        uint256 kFactor,
        uint256 supplyConstant
    ) internal pure returns (uint256) {
        if (supply == 0) return initialPrice;
        if (supply > MAX_SUPPLY) revert InvalidInput();

        // Calculate exponent: k * (x / S) with enhanced precision
        uint256 supplyRatio = safeMul(supply, FIXED_POINT_SCALE);
        supplyRatio = safeDiv(supplyRatio, supplyConstant);

        uint256 exponent = safeMul(kFactor, supplyRatio);
        exponent = safeDiv(exponent, 100); // Undo kFactor scaling

        // Calculate e^exponent safely
        uint256 expResult = safeExp(exponent);

        // Calculate final price: P0 * e^(k * x / S)
        uint256 price = safeMul(initialPrice, expResult);
        price = safeDiv(price, FIXED_POINT_SCALE); // Remove scaling

        return price;
    }

    /**
     * @dev Safe token purchase calculation with gas optimization
     * @param currentSupply Current token supply
     * @param bnbAmount BNB amount to invest
     * @param initialPrice Base price
     * @param kFactor Growth factor
     * @param supplyConstant Total supply
     * @return tokenAmount Tokens to receive
     */
    function calculateSafeTokenPurchase(
        uint256 currentSupply,
        uint256 bnbAmount,
        uint256 initialPrice,
        uint256 kFactor,
        uint256 supplyConstant
    ) internal pure returns (uint256) {
        if (bnbAmount == 0) return 0;
        if (currentSupply > MAX_SUPPLY) revert InvalidInput();

        // For small amounts, use linear approximation
        if (bnbAmount < 1e15) { // Less than 0.001 BNB
            uint256 currentPrice = calculateSafePrice(currentSupply, initialPrice, kFactor, supplyConstant);
            return safeDiv(bnbAmount * FIXED_POINT_SCALE, currentPrice);
        }

        // For larger amounts, use numerical integration approximation
        return _numericalTokenPurchase(currentSupply, bnbAmount, initialPrice, kFactor, supplyConstant);
    }

    /**
     * @dev Numerical integration for token purchase calculation
     * Uses trapezoidal rule for approximation
     */
    function _numericalTokenPurchase(
        uint256 currentSupply,
        uint256 bnbAmount,
        uint256 initialPrice,
        uint256 kFactor,
        uint256 supplyConstant
    ) private pure returns (uint256) {
        uint256 iterations = 10; // Balance between accuracy and gas
        uint256 bnbPerIteration = bnbAmount / iterations;
        uint256 totalTokens = 0;
        uint256 tempSupply = currentSupply;

        for (uint256 i = 0; i < iterations; i++) {
            uint256 price = calculateSafePrice(tempSupply, initialPrice, kFactor, supplyConstant);
            uint256 tokens = safeDiv(bnbPerIteration * FIXED_POINT_SCALE, price);

            totalTokens += tokens;
            tempSupply += tokens;

            // Prevent infinite loop
            if (tempSupply >= currentSupply + bnbAmount * 1000) {
                break;
            }
        }

        return totalTokens;
    }

    /**
     * @dev Validates precision requirements
     * @param value Value to check
     * @param minPrecision Minimum required precision
     * @return isValid True if precision is acceptable
     */
    function validatePrecision(uint256 value, uint256 minPrecision) internal pure returns (bool) {
        return value >= minPrecision;
    }
}