// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./RabbitToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title RabbitLaunchpad - Optimized Version
 * @dev Optimized smart contract for token launchpad with exponential bonding curve
 * Gas optimizations implemented:
 * - Custom errors instead of string messages
 * - Packed structs for storage efficiency
 * - Immutable variables for constants
 * - Cached calculations
 * - Optimized events
 * - Reduced external calls
 */

// Custom errors for gas efficiency
error InvalidAmount();
error InvalidAddress();
error TokenNotFound();
error TokenNotGraduated();
error InsufficientFunds();
error InsufficientLiquidity();
error TransferFailed();
error AlreadyGraduated();
error ContractPaused();
error MaxTokensReached();
error Unauthorized();
error InvalidSlippage();
error EmergencyModeActive();

// Packed structs for storage optimization
struct TokenInfo {
    address tokenAddress;     // 20 bytes
    address creator;          // 20 bytes
    uint256 soldSupply;       // 32 bytes
    uint256 totalBNB;         // 32 bytes
    uint256 initialPrice;     // 32 bytes
    uint256 lastTradeTime;    // 32 bytes
    uint32 createdBlock;      // 4 bytes
    uint32 tradeCount;        // 4 bytes
    bool graduated;           // 1 byte
    bool exists;              // 1 byte
}

struct Fees {
    uint16 platformFeeRate;   // 2 bytes (basis points)
    uint16 creatorFeeRate;    // 2 bytes (basis points)
    uint8 decimals;           // 1 byte
    bool active;              // 1 byte
}

// Optimized events
event TokenCreated(
    address indexed tokenAddress,
    address indexed creator,
    uint32 timestamp,
    bytes32 indexed metadataHash
);

event TokenBought(
    address indexed tokenAddress,
    address indexed buyer,
    uint256 bnbAmount,
    uint256 tokenAmount,
    uint32 timestamp
);

event TokenSold(
    address indexed tokenAddress,
    address indexed seller,
    uint256 tokenAmount,
    uint256 bnbAmount,
    uint32 timestamp
);

event TokenGraduated(
    address indexed tokenAddress,
    uint256 totalRaised,
    uint256 liquidityAmount,
    address indexed liquidityPool,
    uint32 timestamp
);

contract RabbitLaunchpad_Optimized is Ownable, ReentrancyGuard {
    // Constants as immutable for gas efficiency
    uint256 public immutable CREATION_FEE;
    uint256 public immutable MIN_LIQUIDITY;
    uint256 public immutable MAX_TOKENS;
    uint256 public immutable GRADUATION_THRESHOLD;
    address public immutable PANCAKE_ROUTER;
    address public immutable WBNB;

    // Optimized structs
    TokenInfo[] public tokens;
    mapping(address => uint256) public tokenIndex;
    mapping(address => Fees) public fees;

    // Cached calculations
    uint256 private constant PRICE_PRECISION = 1e18;
    uint256 private constant BASIS_POINTS = 10000;

    // State variables
    address public treasury;
    address public pancakeswapPool;
    bool public paused;
    bool public emergencyMode;
    uint256 public totalTokensCreated;

    // Gas-optimized arrays for batch operations
    address[] private recentTokenList;
    uint256 private constant MAX_RECENT_TOKENS = 100;

    constructor(
        address _treasury,
        address _pancakeRouter,
        address _wbnb
    ) {
        CREATION_FEE = 0.005 ether; // 0.005 BNB
        MIN_LIQUIDITY = 1 ether; // 1 BNB
        MAX_TOKENS = 1000;
        GRADUATION_THRESHOLD = 200_000 * 1e18; // 200K tokens
        PANCAKE_ROUTER = _pancakeRouter;
        WBNB = _wbnb;
        treasury = _treasury;

        // Initialize default fees
        fees[_wbnb] = Fees({
            platformFeeRate: 100,    // 1%
            creatorFeeRate: 25,      // 0.25%
            decimals: 18,
            active: true
        });
    }

    // Optimized token creation with gas savings
    function createToken(
        string memory name,
        string memory symbol,
        string memory metadata
    ) external payable nonReentrant returns (address tokenAddress) {
        if (msg.value != CREATION_FEE) revert InvalidAmount();
        if (paused) revert ContractPaused();
        if (totalTokensCreated >= MAX_TOKENS) revert MaxTokensReached();

        bytes32 metadataHash = keccak256(abi.encodePacked(name, symbol, metadata));

        // Create token contract
        RabbitToken token = new RabbitToken(name, symbol);
        tokenAddress = address(token);

        // Optimized struct storage
        TokenInfo storage tokenInfo = tokens.push();
        tokenInfo.tokenAddress = tokenAddress;
        tokenInfo.creator = msg.sender;
        tokenInfo.initialPrice = 1e10; // 0.00000001 BNB
        tokenInfo.lastTradeTime = block.timestamp;
        tokenInfo.createdBlock = uint32(block.number);
        tokenInfo.exists = true;

        tokenIndex[tokenAddress] = tokens.length - 1;
        totalTokensCreated++;

        // Update recent tokens (gas optimized)
        _updateRecentTokens(tokenAddress);

        // Mint initial supply to this contract
        token.mint(address(this), GRADUATION_THRESHOLD);

        // Handle creation fee
        if (CREATION_FEE > 0) {
            (bool success, ) = treasury.call{value: CREATION_FEE}("");
            if (!success) revert TransferFailed();
        }

        // Optimized event emission
        emit TokenCreated(tokenAddress, msg.sender, uint32(block.timestamp), metadataHash);

        return tokenAddress;
    }

    // Optimized buy function with gas savings
    function buy(
        address tokenAddress,
        uint256 minTokensOut
    ) external payable nonReentrant {
        if (msg.value == 0) revert InvalidAmount();
        if (paused) revert ContractPaused();
        if (emergencyMode) revert EmergencyModeActive();

        uint256 index = tokenIndex[tokenAddress];
        if (index == 0) revert TokenNotFound();

        TokenInfo storage token = tokens[index - 1];
        if (token.graduated) revert AlreadyGraduated();

        // Cached fee calculation
        Fees storage feeInfo = fees[WBNB];
        uint256 platformFee = (msg.value * feeInfo.platformFeeRate) / BASIS_POINTS;
        uint256 creatorFee = (msg.value * feeInfo.creatorFeeRate) / BASIS_POINTS;
        uint256 totalFee = platformFee + creatorFee;
        uint256 netAmount = msg.value - totalFee;

        // Optimized bonding curve calculation
        uint256 tokenAmount = _calculateTokensOut(netAmount, token.soldSupply);
        if (tokenAmount < minTokensOut) revert InvalidSlippage();

        // Update token state
        token.soldSupply += tokenAmount;
        token.totalBNB += netAmount;
        token.lastTradeTime = block.timestamp;
        token.tradeCount++;

        // Transfer tokens
        RabbitToken(tokenAddress).transfer(msg.sender, tokenAmount);

        // Distribute fees
        if (platformFee > 0) {
            (bool success, ) = treasury.call{value: platformFee}("");
            if (!success) revert TransferFailed();
        }

        if (creatorFee > 0) {
            (bool success, ) = token.creator.call{value: creatorFee}("");
            if (!success) revert TransferFailed();
        }

        emit TokenBought(tokenAddress, msg.sender, netAmount, tokenAmount, uint32(block.timestamp));
    }

    // Optimized sell function
    function sell(
        address tokenAddress,
        uint256 tokenAmount,
        uint256 minBNBOut
    ) external nonReentrant {
        if (tokenAmount == 0) revert InvalidAmount();
        if (paused) revert ContractPaused();

        uint256 index = tokenIndex[tokenAddress];
        if (index == 0) revert TokenNotFound();

        TokenInfo storage token = tokens[index - 1];
        if (token.graduated) revert AlreadyGraduated();

        // Calculate BNB out with bonding curve
        uint256 bnbAmount = _calculateBNBOut(tokenAmount, token.soldSupply);
        if (bnbAmount < minBNBOut) revert InvalidSlippage();

        // Calculate fees
        Fees storage feeInfo = fees[WBNB];
        uint256 platformFee = (bnbAmount * feeInfo.platformFeeRate) / BASIS_POINTS;
        uint256 creatorFee = (bnbAmount * feeInfo.creatorFeeRate) / BASIS_POINTS;
        uint256 totalFee = platformFee + creatorFee;
        uint256 netAmount = bnbAmount - totalFee;

        // Check contract balance
        if (address(this).balance < netAmount + totalFee) revert InsufficientFunds();

        // Update token state
        token.soldSupply -= tokenAmount;
        token.totalBNB -= netAmount;
        token.lastTradeTime = block.timestamp;
        token.tradeCount++;

        // Transfer tokens from user
        RabbitToken(tokenAddress).transferFrom(msg.sender, address(this), tokenAmount);

        // Burn tokens
        RabbitToken(tokenAddress).burn(tokenAmount);

        // Transfer BNB to user
        (bool success, ) = msg.sender.call{value: netAmount}("");
        if (!success) revert TransferFailed();

        // Distribute fees
        if (platformFee > 0) {
            (bool success, ) = treasury.call{value: platformFee}("");
            if (!success) revert TransferFailed();
        }

        if (creatorFee > 0) {
            (bool success, ) = token.creator.call{value: creatorFee}("");
            if (!success) revert TransferFailed();
        }

        emit TokenSold(tokenAddress, msg.sender, tokenAmount, netAmount, uint32(block.timestamp));
    }

    // Optimized graduation function
    function graduate(address tokenAddress) external onlyOwner {
        uint256 index = tokenIndex[tokenAddress];
        if (index == 0) revert TokenNotFound();

        TokenInfo storage token = tokens[index - 1];
        if (token.graduated) revert AlreadyGraduated();
        if (token.totalBNB < MIN_LIQUIDITY) revert InsufficientLiquidity();

        token.graduated = true;

        // Approve tokens for PancakeSwap
        RabbitToken(tokenAddress).approve(PANCAKE_ROUTER, token.soldSupply);

        emit TokenGraduated(
            tokenAddress,
            token.totalBNB,
            token.soldSupply,
            pancakeswapPool,
            uint32(block.timestamp)
        );
    }

    // Optimized internal functions
    function _calculateTokensOut(uint256 bnbAmount, uint256 currentSupply)
        internal
        pure
        returns (uint256)
    {
        if (bnbAmount == 0) return 0;
        if (currentSupply == 0) return bnbAmount * PRICE_PRECISION;

        // Simplified calculation for gas efficiency
        uint256 k = 1e8; // Growth rate constant
        uint256 S = GRADUATION_THRESHOLD;
        uint256 P0 = 1e10;

        uint256 exponent = (currentSupply * k) / S;
        uint256 currentPrice = P0 * (1000000000000000000 + exponent) / 1000000000000000000;

        return (bnbAmount * PRICE_PRECISION) / currentPrice;
    }

    function _calculateBNBOut(uint256 tokenAmount, uint256 currentSupply)
        internal
        pure
        returns (uint256)
    {
        if (tokenAmount == 0) return 0;
        if (currentSupply == 0) return 0;

        // Simplified reverse calculation
        uint256 k = 1e8; // Growth rate constant
        uint256 S = GRADUATION_THRESHOLD;
        uint256 P0 = 1e10;

        uint256 exponent = ((currentSupply - tokenAmount) * k) / S;
        uint256 averagePrice = P0 * (1000000000000000000 + exponent) / 1000000000000000000;

        return (tokenAmount * averagePrice) / PRICE_PRECISION;
    }

    function _updateRecentTokens(address tokenAddress) internal {
        if (recentTokenList.length >= MAX_RECENT_TOKENS) {
            // Remove oldest token (gas efficient)
            for (uint256 i = 0; i < recentTokenList.length - 1; i++) {
                recentTokenList[i] = recentTokenList[i + 1];
            }
            recentTokenList[recentTokenList.length - 1] = tokenAddress;
        } else {
            recentTokenList.push(tokenAddress);
        }
    }

    // View functions - optimized for gas
    function getRecentTokens(uint256 count) external view returns (address[] memory) {
        uint256 actualCount = count > recentTokenList.length ? recentTokenList.length : count;
        address[] memory result = new address[](actualCount);

        for (uint256 i = 0; i < actualCount; i++) {
            result[i] = recentTokenList[i];
        }

        return result;
    }

    function getTokenInfo(address tokenAddress) external view returns (TokenInfo memory) {
        uint256 index = tokenIndex[tokenAddress];
        if (index == 0) revert TokenNotFound();

        return tokens[index - 1];
    }

    // Owner functions
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    function setEmergencyMode(bool _emergencyMode) external onlyOwner {
        emergencyMode = _emergencyMode;
    }

    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert InvalidAddress();
        treasury = _treasury;
    }

    function setFees(
        address paymentToken,
        uint16 platformFeeRate,
        uint16 creatorFeeRate
    ) external onlyOwner {
        require(platformFeeRate <= 500 && creatorFeeRate <= 200, "Fee rates too high");

        fees[paymentToken] = Fees({
            platformFeeRate: platformFeeRate,
            creatorFeeRate: creatorFeeRate,
            decimals: 18,
            active: true
        });
    }

    function emergencyWithdraw() external onlyOwner {
        emergencyMode = true;
        uint256 balance = address(this).balance;
        if (balance > 0) {
            (bool success, ) = treasury.call{value: balance}("");
            if (!success) revert TransferFailed();
        }
    }

    // Receive function for BNB
    receive() external payable {
        // Handle BNB transfers
    }

    // Fallback function
    fallback() external payable {
        // Handle unknown function calls
    }
}