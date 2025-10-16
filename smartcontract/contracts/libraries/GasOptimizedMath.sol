// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title GasOptimizedMath
 * @dev Library for gas-optimized mathematical operations
 */
library GasOptimizedMath {

    /**
     * @dev Optimized square root using binary search instead of Newton's method
     * More gas efficient for large numbers
     */
    function sqrt(uint256 n) internal pure returns (uint256) {
        if (n == 0) return 0;
        if (n == 1) return 1;

        uint256 low = 1;
        uint256 high = n / 2 + 1; // sqrt(n) <= n/2 + 1 for n > 1

        while (low <= high) {
            uint256 mid = (low + high) >> 1; // Using shift instead of division
            uint256 square = mid * mid;

            if (square == n) {
                return mid;
            } else if (square < n) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        return high; // Floor of sqrt
    }

    /**
     * @dev Optimized min function
     */
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    /**
     * @dev Optimized max function
     */
    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a : b;
    }

    /**
     * @dev Safe division with zero check
     */
    function safeDiv(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b > 0, "Division by zero");
        return a / b;
    }

    /**
     * @dev Check if addition would overflow
     */
    function safeAdd(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "Addition overflow");
        return c;
    }

    /**
     * @dev Check if multiplication would overflow
     */
    function safeMul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) return 0;
        uint256 c = a * b;
        require(c / a == b, "Multiplication overflow");
        return c;
    }
}