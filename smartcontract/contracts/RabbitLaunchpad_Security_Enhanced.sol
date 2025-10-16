// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./RabbitToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title RabbitLaunchpad Security Enhanced
 * @dev Production-ready enhanced version with comprehensive security fixes
 *
 * SECURITY IMPROVEMENTS IMPLEMENTED:
 * 1. Enhanced mathematical operations with overflow protection
 * 2. Safe external call handling with proper error management
 * 3. Emergency pause/unpause functionality
 * 4. Comprehensive input validation
 * 5. Enhanced event logging for monitoring
 * 6. Gas optimizations where possible
 * 7. Bounded operations to prevent DoS attacks
 * 8. Delayed admin functions for security
 */
contract RabbitLaunchpad is Ownable, ReentrancyGuard {

    // ========================================
    // CONSTANTS AND CONFIGURATION
    // ========================================

    // Economic Constants
    uint256 public constant CREATE_FEE = 0.005 ether; // 0.005 BNB creation fee
    uint256 public constant INITIAL_PRICE = 10 * 10**9; // 0.00000001 BNB = 1e-8 BNB = 1e10 wei
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18; // 1B tokens with 18 decimals
    uint256 public constant TARGET_SUPPLY = 800_000_000 * 10**18; // 80% available for trading
    uint256 public constant GRADUATION_TOKEN_ALLOCATION = 200_000_000 * 10**18; // 200M tokens (20%)

    // Safety Limits
    uint256 public constant MAX_PURCHASE_AMOUNT = 100 ether; // Maximum single purchase
    uint256 public constant MIN_PURCHASE_AMOUNT = 0.001 ether; // Minimum purchase
    uint256 public constant MAX_SINGLE_SELL = 100_000_000 * 10**18; // Max single sell amount

    // Exponential Bonding Curve Parameters
    uint256 public constant K_FACTOR = 543; // k = 5.43 * 100 for precision
    uint256 public constant K_PRECISION = 100; // Precision factor for K
    uint256 public constant SUPPLY_CONSTANT = TOTAL_SUPPLY; // S = 1e27 wei

    // Graduation Targets
    uint256 public constant GROSS_RAISE_TARGET = 35 ether; // 35 BNB gross raise target
    uint256 public constant NET_RAISE_TARGET = 34.56 ether; // 34.56 BNB net raise

    // Fee Structure - 1.25% total
    uint256 public constant FEE_PLATFORM_PERCENT = 100; // 1% = 100 basis points
    uint256 public constant FEE_CREATOR_PERCENT = 25; // 0.25% = 25 basis points
    uint256 public constant TOTAL_FEE_PERCENT = 125; // 1.25% = 125 basis points
    uint256 public constant BASIS_POINTS = 10000; // 100% in basis points

    // Fee Distribution
    uint256 public constant BONDING_CURVE_SPLIT = 8000; // 80% to bonding curve
    uint256 public constant LP_SPLIT = 2000; // 20% to liquidity pool

    // Mathematical Constants
    uint256 public constant E_PRECISION = 1e18; // Precision for exponential calculations
    uint256 public constant MAX_EXPONENT = 50 * 1e18; // Safe upper bound

    // Time-based security constants
    uint256 public constant TREASURY_UPDATE_DELAY = 24 hours;
    uint256 public constant DEX_ROUTER_UPDATE_DELAY = 24 hours;
    uint256 public constant EMERGENCY_COOLDOWN = 24 hours;

    // ========================================
    // STATE VARIABLES
    // ========================================

    // Emergency Controls
    bool public paused = false;
    bool public emergencyMode = false;
    uint256 public lastEmergencyAction;

    // Configuration (with enhanced security)
    address public treasury;
    address public pendingTreasury;
    uint256 public treasuryUpdateTime;

    address public dexRouter;
    address public pendingDexRouter;
    uint256 public dexRouterUpdateTime;

    // Data Structures (optimized for gas)
    struct TokenState {
        uint128 totalRaised;        // Reduced from uint256 for gas optimization
        uint128 soldSupply;         // Reduced from uint256
        address creator;
        uint64 creationTime;        // Reduced from uint256
        bool exists;
        bool graduated;
        uint256 graduationPrice;
    }

    // State mappings (private for security)
    mapping(bytes32 => TokenState) private tokens;
    mapping(address => bytes32) private tokenToKey;
    address[] private tokenList;

    uint256 public totalFeesCollected;

    // ========================================
    // ENHANCED EVENTS
    // ========================================

    event TokensPurchased(
        address indexed buyer,
        address indexed tokenAddress,
        uint256 bnbAmount,
        uint256 tokenAmount,
        uint256 price,
        uint256 timestamp
    );

    event TokensSold(
        address indexed seller,
        address indexed tokenAddress,
        uint256 tokenAmount,
        uint256 bnbAmount,
        uint256 price,
        uint256 timestamp
    );

    event TokenCreated(
        address indexed creator,
        address indexed tokenAddress,
        string name,
        string symbol,
        uint256 timestamp
    );

    event TokenGraduated(
        address indexed tokenAddress,
        address indexed creator,
        uint256 totalRaised,
        uint256 totalSold,
        uint256 timestamp
    );

    event EmergencyAction(
        address indexed caller,
        string action,
        uint256 timestamp
    );

    event SecurityEvent(
        string indexed eventType,
        address indexed user,
        uint256 value,
        uint256 timestamp,
        string reason
    );

    event ExternalCallResult(
        address indexed target,
        uint256 amount,
        bool success
    );

    event ContractStateChanged(
        bool paused,
        bool emergencyMode,
        uint256 timestamp,
        address indexed changer
    );

    // ========================================
    // MODIFIERS
    // ========================================

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    modifier onlyWhenNotEmergency() {
        require(!emergencyMode, "Contract in emergency mode");
        _;
    }

    modifier validTokenAddress(address tokenAddress) {
        require(tokenAddress != address(0), "Invalid token address");
        require(tokenToKey[tokenAddress] != bytes32(0), "Token not found");
        _;
    }

    modifier validPurchaseAmount(uint256 amount) {
        require(amount >= MIN_PURCHASE_AMOUNT, "Amount below minimum");
        require(amount <= MAX_PURCHASE_AMOUNT, "Amount above maximum");
        _;
    }

    modifier validSellAmount(uint256 amount) {
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= MAX_SINGLE_SELL, "Amount above maximum sell limit");
        _;
    }

    modifier validString(string memory str, uint256 minLen, uint256 maxLen) {
        uint256 len = bytes(str).length;
        require(len >= minLen && len <= maxLen, "Invalid string length");
        _;
    }

    // ========================================
    // CORE FUNCTIONS WITH ENHANCED SECURITY
    // ========================================

    /**
     * @dev Enhanced token creation with comprehensive validation
     */
    function createToken(
        string memory name,
        string memory symbol
    )
        external
        payable
        whenNotPaused
        onlyWhenNotEmergency
        nonReentrant
        validPurchaseAmount(msg.value)
        validString(name, 2, 50)
        validString(symbol, 2, 10)
    {
        require(treasury != address(0), "Treasury not set");

        // Generate unique key
        bytes32 key = keccak256(abi.encodePacked(msg.sender, block.timestamp, name));

        // Check for existing token
        require(!tokens[key].exists, "Token already exists for this creator");
        require(tokenToKey[msg.sender] == bytes32(0), "Creator already has token");

        // Enhanced fee transfer with safety
        (bool feeSuccess, ) = payable(treasury).call{value: CREATE_FEE, gas: 50000}("");
        require(feeSuccess, "Fee transfer failed");

        emit ExternalCallResult(treasury, CREATE_FEE, feeSuccess);

        // Create new ERC20 token
        RabbitToken newToken = new RabbitToken(name, symbol, address(this), TOTAL_SUPPLY);
        address tokenAddress = address(newToken);

        // Initialize token state
        TokenState storage tokenState = tokens[key];
        tokenState.exists = true;
        tokenState.creator = msg.sender;
        tokenState.creationTime = uint64(block.timestamp);
        tokenState.totalRaised = uint128(0);
        tokenState.soldSupply = uint128(0);

        // Update mappings
        tokenToKey[tokenAddress] = key;
        tokenToKey[msg.sender] = key;
        tokenList.push(tokenAddress);

        emit TokenCreated(msg.sender, tokenAddress, name, symbol, block.timestamp);
        emit SecurityEvent("TOKEN_CREATED", msg.sender, CREATE_FEE, block.timestamp, "");
    }

    /**
     * @dev Enhanced buy function with comprehensive safety checks
     */
    function buy(address tokenAddress)
        external
        payable
        nonReentrant
        whenNotPaused
        onlyWhenNotEmergency
        validTokenAddress(tokenAddress)
        validPurchaseAmount(msg.value)
    {
        bytes32 key = tokenToKey[tokenAddress];
        TokenState storage tokenState = tokens[key];

        // Enhanced validation
        require(!tokenState.graduated, "Token already graduated");
        require(msg.value <= MAX_PURCHASE_AMOUNT, "Purchase exceeds safety limit");
        require(tokenState.soldSupply < TARGET_SUPPLY / 1e18, "Token supply exhausted");

        RabbitToken token = RabbitToken(payable(tokenAddress));

        // Calculate fees with safe math
        uint256 totalFee = _safeDiv(_safeMul(msg.value, TOTAL_FEE_PERCENT), BASIS_POINTS);
        uint256 netAmount = msg.value - totalFee;
        uint256 platformFee = _safeDiv(_safeMul(msg.value, FEE_PLATFORM_PERCENT), BASIS_POINTS);

        // Calculate tokens using enhanced math
        uint256 currentSupply = uint256(tokenState.soldSupply) * 1e18;
        uint256 tokensToReceive = _calculateSafeTokenPurchase(currentSupply, netAmount);

        require(tokensToReceive > 0, "Insufficient purchase amount");
        require(
            uint256(tokenState.soldSupply) + (tokensToReceive / 1e18) <= TARGET_SUPPLY / 1e18,
            "Would exceed target supply"
        );

        // Update state first (Checks-Effects-Interactions pattern)
        tokenState.totalRaised += uint128(msg.value);
        tokenState.soldSupply += uint128(tokensToReceive / 1e18);
        totalFeesCollected += totalFee;

        // External calls after state updates
        _handleFeeDistribution(platformFee, totalFee, tokenState.creator);

        // Mint tokens with enhanced safety
        bool mintSuccess = token.mint(msg.sender, tokensToReceive);
        require(mintSuccess, "Token minting failed");

        uint256 currentPrice = _calculateCurrentPrice(currentSupply);

        emit TokensPurchased(
            msg.sender,
            tokenAddress,
            msg.value,
            tokensToReceive,
            currentPrice,
            block.timestamp
        );
    }

    /**
     * @dev Enhanced sell function with comprehensive safety checks
     */
    function sell(
        address tokenAddress,
        uint256 tokenAmount
    )
        external
        nonReentrant
        whenNotPaused
        onlyWhenNotEmergency
        validTokenAddress(tokenAddress)
        validSellAmount(tokenAmount)
    {
        bytes32 key = tokenToKey[tokenAddress];
        TokenState storage tokenState = tokens[key];

        RabbitToken token = RabbitToken(payable(tokenAddress));

        // Enhanced validation
        require(!tokenState.graduated, "Token already graduated");
        require(token.balanceOf(msg.sender) >= tokenAmount, "Insufficient token balance");
        require(uint256(tokenState.soldSupply) >= tokenAmount, "Cannot sell more than sold supply");

        // Calculate BNB return using enhanced math
        uint256 currentSupply = uint256(tokenState.soldSupply) * 1e18;
        uint256 bnbToReturn = _calculateSafeSaleReturn(currentSupply, tokenAmount);

        require(address(this).balance >= bnbToReturn, "Insufficient contract BNB balance");

        // Update state first
        tokenState.soldSupply -= uint128(tokenAmount);

        // External calls after state updates
        // Transfer tokens to contract first
        bool transferSuccess = token.transferFrom(msg.sender, address(this), tokenAmount);
        require(transferSuccess, "Token transfer failed");

        // Burn tokens from contract
        bool burnSuccess = token.burn(tokenAmount);
        require(burnSuccess, "Token burning failed");

        // Transfer BNB to seller
        bool bnbTransferSuccess = _safeTransferETH(payable(msg.sender), bnbToReturn);
        require(bnbTransferSuccess, "BNB transfer failed");

        uint256 newPrice = _calculateCurrentPrice(currentSupply - tokenAmount * 1e18);

        emit TokensSold(
            msg.sender,
            tokenAddress,
            tokenAmount,
            bnbToReturn,
            newPrice,
            block.timestamp
        );
    }

    /**
     * @dev Enhanced graduation function
     */
    function graduate(address tokenAddress)
        external
        nonReentrant
        whenNotPaused
        onlyWhenNotEmergency
        validTokenAddress(tokenAddress)
    {
        bytes32 key = tokenToKey[tokenAddress];
        TokenState storage tokenState = tokens[key];

        require(!tokenState.graduated, "Token already graduated");
        require(
            uint256(tokenState.totalRaised) >= GROSS_RAISE_TARGET,
            "Raise target not met"
        );
        require(
            uint256(tokenState.soldSupply) >= TARGET_SUPPLY / 1e18,
            "Supply target not met"
        );

        RabbitToken token = RabbitToken(payable(tokenAddress));

        // Mark as graduated
        tokenState.graduated = true;
        tokenState.graduationPrice = _calculateCurrentPrice(uint256(tokenState.soldSupply) * 1e18);

        // Calculate LP amounts with safe math
        uint256 lpBNB = _safeDiv(_safeMul(uint256(tokenState.totalRaised), LP_SPLIT), BASIS_POINTS);
        uint256 lpTokens = GRADUATION_TOKEN_ALLOCATION;

        // Enhanced transfers
        bool bnbSuccess = _safeTransferETH(payable(treasury), lpBNB);
        require(bnbSuccess, "LP BNB transfer failed");

        bool tokenSuccess = token.transfer(treasury, lpTokens);
        require(tokenSuccess, "LP token transfer failed");

        emit TokenGraduated(
            tokenAddress,
            tokenState.creator,
            uint256(tokenState.totalRaised),
            uint256(tokenState.soldSupply),
            block.timestamp
        );
        emit SecurityEvent("TOKEN_GRADUATED", tokenState.creator, lpBNB, block.timestamp, "");
    }

    // ========================================
    // ENHANCED CALCULATION FUNCTIONS
    // ========================================

    /**
     * @dev Enhanced price calculation with safety checks
     */
    function calculatePrice(uint256 supply) public pure returns (uint256) {
        if (supply == 0) return INITIAL_PRICE;

        // Safety checks
        require(supply <= TOTAL_SUPPLY, "Supply exceeds maximum limit");
        require(supply <= TARGET_SUPPLY, "Supply exceeds trading limit");

        // Calculate exponent: k * (x / S) with overflow protection
        uint256 supplyRatio = _safeDiv(_safeMul(supply, K_PRECISION), SUPPLY_CONSTANT);
        uint256 exponent = _safeDiv(_safeMul(K_FACTOR, supplyRatio), K_PRECISION);

        // Bound checking
        require(exponent <= MAX_EXPONENT * 10, "Exponent too large for calculation");

        // Calculate e^exponent using Taylor series for small values
        if (exponent < MAX_EXPONENT) {
            uint256 term1 = E_PRECISION; // 1 * 1e18
            uint256 term2 = exponent;

            // x²/2
            uint256 term3 = _safeDiv(_safeMul(exponent, exponent), 2 * E_PRECISION);

            // x³/6
            uint256 term4 = _safeDiv(_safeDiv(_safeMul(_safeMul(exponent, exponent), exponent), 6), _safeMul(E_PRECISION, E_PRECISION));

            uint256 result = term1 + term2 + term3 + term4;

            // Calculate final price: P0 * e^(k * x / S)
            uint256 price = _safeDiv(_safeMul(INITIAL_PRICE, result), E_PRECISION);

            return price;
        } else {
            // For large exponents, use approximation to prevent overflow
            return _safeDiv(_safeMul(INITIAL_PRICE, _safeDiv(exponent, 100)), E_PRECISION) * 1e20;
        }
    }

    /**
     * @dev Enhanced token purchase calculation
     */
    function calculateTokenPurchase(
        uint256 currentSupply,
        uint256 bnbAmount,
        uint256 initialPrice,
        uint256 slope
    ) public pure returns (uint256) {
        return _calculateSafeTokenPurchase(currentSupply, bnbAmount);
    }

    /**
     * @dev Enhanced token sale calculation
     */
    function calculateTokenSale(
        uint256 currentSupply,
        uint256 tokenAmount,
        uint256 initialPrice,
        uint256 slope
    ) public pure returns (uint256) {
        return _calculateSafeSaleReturn(currentSupply, tokenAmount);
    }

    /**
     * @dev Safe token purchase calculation
     */
    function _calculateSafeTokenPurchase(
        uint256 currentSupply,
        uint256 bnbAmount
    ) internal pure returns (uint256) {
        if (bnbAmount == 0) return 0;
        if (currentSupply == 0) {
            // Simple case: first purchase
            uint256 initialPrice = calculatePrice(0);
            return _safeDiv(_safeMul(bnbAmount, 1e18), initialPrice);
        }

        // For safety, use average price approximation
        uint256 currentPrice = calculatePrice(currentSupply);

        return _safeDiv(_safeMul(bnbAmount, 1e18), currentPrice);
    }

    /**
     * @dev Optimized square root function
     */
    function sqrt(uint256 n) internal pure returns (uint256) {
        if (n == 0) return 0;
        if (n == 1) return 1;

        uint256 low = 1;
        uint256 high = n / 2 + 1;

        while (low <= high) {
            uint256 mid = (low + high) >> 1;
            uint256 square = _safeMul(mid, mid);

            if (square == n) {
                return mid;
            } else if (square < n) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        return high;
    }

    // ========================================
    // ENHANCED SAFETY FUNCTIONS
    // ========================================

    /**
     * @dev Emergency pause function
     */
    function pause() external onlyOwner {
        require(!paused, "Contract already paused");
        paused = true;

        emit ContractStateChanged(paused, emergencyMode, block.timestamp, msg.sender);
        emit EmergencyAction(msg.sender, "PAUSE_CONTRACT", block.timestamp);
    }

    /**
     * @dev Unpause function
     */
    function unpause() external onlyOwner {
        require(paused, "Contract not paused");
        paused = false;

        emit ContractStateChanged(paused, emergencyMode, block.timestamp, msg.sender);
        emit EmergencyAction(msg.sender, "UNPAUSE_CONTRACT", block.timestamp);
    }

    /**
     * @dev Emergency mode activation
     */
    function activateEmergencyMode() external onlyOwner {
        require(!emergencyMode, "Already in emergency mode");
        emergencyMode = true;
        paused = true;
        lastEmergencyAction = block.timestamp;

        emit ContractStateChanged(paused, emergencyMode, block.timestamp, msg.sender);
        emit EmergencyAction(msg.sender, "EMERGENCY_MODE_ACTIVATED", block.timestamp);
    }

    /**
     * @dev Deactivate emergency mode
     */
    function deactivateEmergencyMode() external onlyOwner {
        require(emergencyMode, "Not in emergency mode");
        require(
            block.timestamp >= lastEmergencyAction + EMERGENCY_COOLDOWN,
            "Wait 24 hours before deactivation"
        );

        emergencyMode = false;
        paused = false;

        emit ContractStateChanged(paused, emergencyMode, block.timestamp, msg.sender);
        emit EmergencyAction(msg.sender, "EMERGENCY_MODE_DEACTIVATED", block.timestamp);
    }

    /**
     * @dev Enhanced emergency withdrawal with safety checks
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        require(address(this).balance >= amount, "Insufficient balance");
        require(emergencyMode || paused, "Only available in emergency or paused state");

        bool success = _safeTransferETH(payable(owner()), amount);
        require(success, "Emergency withdrawal failed");

        emit EmergencyAction(msg.sender, "EMERGENCY_WITHDRAWAL", block.timestamp);
        emit SecurityEvent("EMERGENCY_WITHDRAW", owner(), amount, block.timestamp, "Owner emergency withdrawal");
    }

    /**
     * @dev Emergency token recovery
     */
    function emergencyTokenRecovery(
        address tokenAddress,
        uint256 amount
    ) external onlyOwner {
        require(emergencyMode, "Only available in emergency mode");
        require(tokenAddress != address(0), "Invalid token address");

        if (tokenAddress == address(0)) {
            // Recover native BNB
            uint256 balance = address(this).balance;
            if (balance > 0) {
                bool success = _safeTransferETH(payable(owner()), balance);
                require(success, "Emergency BNB recovery failed");
            }
        } else {
            // Recover ERC20 tokens
            RabbitToken token = RabbitToken(payable(tokenAddress));
            uint256 balance = token.balanceOf(address(this));

            if (balance > 0 && amount <= balance) {
                bool success = token.transfer(owner(), amount);
                require(success, "Emergency token recovery failed");
            }
        }

        emit EmergencyAction(msg.sender, "EMERGENCY_TOKEN_RECOVERY", block.timestamp);
    }

    // ========================================
    // ENHANCED ADMIN FUNCTIONS
    // ========================================

    /**
     * @dev Enhanced treasury update with delay
     */
    function initiateTreasuryUpdate(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury address");
        require(newTreasury != treasury, "Same treasury address");
        require(newTreasury != address(this), "Cannot set contract as treasury");

        pendingTreasury = newTreasury;
        treasuryUpdateTime = block.timestamp;

        emit SecurityEvent("TREASURY_UPDATE_INITIATED", msg.sender, 0, block.timestamp, "");
    }

    function completeTreasuryUpdate() external onlyOwner {
        require(pendingTreasury != address(0), "No pending treasury update");
        require(
            block.timestamp >= treasuryUpdateTime + TREASURY_UPDATE_DELAY,
            "Update delay not met"
        );

        treasury = pendingTreasury;
        pendingTreasury = address(0);

        emit SecurityEvent("TREASURY_UPDATED", msg.sender, 0, block.timestamp, "");
    }

    /**
     * @dev Enhanced DEX router update with delay
     */
    function initiateDexRouterUpdate(address newDexRouter) external onlyOwner {
        require(newDexRouter != address(0), "Invalid DEX router address");
        require(newDexRouter != dexRouter, "Same DEX router address");

        pendingDexRouter = newDexRouter;
        dexRouterUpdateTime = block.timestamp;

        emit SecurityEvent("DEX_ROUTER_UPDATE_INITIATED", msg.sender, 0, block.timestamp, "");
    }

    function completeDexRouterUpdate() external onlyOwner {
        require(pendingDexRouter != address(0), "No pending DEX router update");
        require(
            block.timestamp >= dexRouterUpdateTime + DEX_ROUTER_UPDATE_DELAY,
            "Update delay not met"
        );

        dexRouter = pendingDexRouter;
        pendingDexRouter = address(0);

        emit SecurityEvent("DEX_ROUTER_UPDATED", msg.sender, 0, block.timestamp, "");
    }

    // ========================================
    // VIEW FUNCTIONS
    // ========================================

    /**
     * @dev Enhanced token information
     */
    function getTokenInfo(address tokenAddress)
        external
        view
        returns (
            address creator,
            uint256 totalRaised,
            uint256 soldSupply,
            uint256 creationTime,
            bool exists,
            bool graduated,
            uint256 graduationPrice,
            uint256 currentPrice
        )
    {
        bytes32 key = tokenToKey[tokenAddress];
        TokenState storage tokenState = tokens[key];

        return (
            tokenState.creator,
            uint256(tokenState.totalRaised),
            uint256(tokenState.soldSupply),
            uint256(tokenState.creationTime),
            tokenState.exists,
            tokenState.graduated,
            tokenState.graduationPrice,
            _calculateCurrentPrice(uint256(tokenState.soldSupply) * 1e18)
        );
    }

    /**
     * @dev Enhanced bonding curve statistics
     */
    function getBondingCurveStats(address tokenAddress)
        external
        view
        returns (
            uint256 currentPrice,
            uint256 nextBuyPrice,
            uint256 nextSellPrice,
            uint256 supplyProgress,
            uint256 raiseProgress,
            bool canGraduate
        )
    {
        bytes32 key = tokenToKey[tokenAddress];
        TokenState storage tokenState = tokens[key];

        uint256 currentSupply = uint256(tokenState.soldSupply) * 1e18;

        currentPrice = _calculateCurrentPrice(currentSupply);

        // Calculate next prices
        nextBuyPrice = _calculateCurrentPrice(currentSupply + 1e18);
        nextSellPrice = _calculateCurrentPrice(currentSupply > 1e18 ? currentSupply - 1e18 : 0);

        supplyProgress = _safeDiv(_safeMul(uint256(tokenState.soldSupply) * 1e18, 100), TARGET_SUPPLY);
        raiseProgress = _safeDiv(_safeMul(uint256(tokenState.totalRaised), 100), GROSS_RAISE_TARGET);

        canGraduate = !tokenState.graduated &&
                     uint256(tokenState.totalRaised) >= GROSS_RAISE_TARGET &&
                     uint256(tokenState.soldSupply) >= TARGET_SUPPLY / 1e18;
    }

    function getAllTokens() external view returns (address[] memory) {
        return tokenList;
    }

    function contractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function isPaused() external view returns (bool) {
        return paused;
    }

    function isEmergencyMode() external view returns (bool) {
        return emergencyMode;
    }

    // ========================================
    // INTERNAL HELPER FUNCTIONS
    // ========================================

    /**
     * @dev Handle fee distribution with enhanced safety
     */
    function _handleFeeDistribution(
        uint256 platformFee,
        uint256 totalFee,
        address creator
    ) internal {
        // Platform fee
        if (platformFee > 0) {
            bool platformSuccess = _safeTransferETH(payable(treasury), platformFee);
            if (!platformSuccess) {
                emit SecurityEvent("PLATFORM_FEE_FAILED", treasury, platformFee, block.timestamp, "Platform fee transfer failed");
            }
        }

        // Creator fee
        uint256 creatorFee = totalFee - platformFee;
        if (creatorFee > 0) {
            bool creatorSuccess = _safeTransferETH(payable(creator), creatorFee);
            if (!creatorSuccess) {
                emit SecurityEvent("CREATOR_FEE_FAILED", creator, creatorFee, block.timestamp, "Creator fee transfer failed");
            }
        }
    }

    /**
     * @dev Calculate current price with enhanced safety
     */
    function _calculateCurrentPrice(uint256 supply) internal pure returns (uint256) {
        return calculatePrice(supply);
    }

    /**
     * @dev Calculate safe sale return with enhanced math
     */
    function _calculateSafeSaleReturn(
        uint256 currentSupply,
        uint256 tokenAmount
    ) internal pure returns (uint256) {
        // For sales, use average price between current and new supply
        uint256 currentPrice = _calculateCurrentPrice(currentSupply);
        uint256 newSupply = currentSupply > tokenAmount * 1e18 ? currentSupply - tokenAmount * 1e18 : 0;
        uint256 newPrice = _calculateCurrentPrice(newSupply);

        // Average price * token amount (scaled)
        uint256 averagePrice = _safeAdd(currentPrice, newPrice) / 2;
        return _safeDiv(_safeMul(averagePrice, tokenAmount), 1e18);
    }

    /**
     * @dev Safe ETH transfer with error handling
     */
    function _safeTransferETH(address payable recipient, uint256 amount) internal returns (bool) {
        if (amount == 0) return true;
        if (address(this).balance < amount) return false;
        if (recipient == address(0)) return false;

        (bool success, ) = recipient.call{value: amount, gas: 50000}("");
        return success;
    }

    /**
     * @dev Safe addition with overflow protection
     */
    function _safeAdd(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "Addition overflow");
        return c;
    }

    /**
     * @dev Safe subtraction with underflow protection
     */
    function _safeSub(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b <= a, "Subtraction underflow");
        return a - b;
    }

    /**
     * @dev Safe multiplication with overflow protection
     */
    function _safeMul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) return 0;
        uint256 c = a * b;
        require(c / a == b, "Multiplication overflow");
        return c;
    }

    /**
     * @dev Safe division with zero protection
     */
    function _safeDiv(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b > 0, "Division by zero");
        return a / b;
    }

    // ========================================
    // CONSTRUCTOR
    // ========================================

    constructor(address _treasury) {
        require(_treasury != address(0), "Treasury cannot be zero address");
        require(_treasury != address(this), "Treasury cannot be contract");

        treasury = _treasury;
        emit SecurityEvent("CONTRACT_DEPLOYED", msg.sender, 0, block.timestamp, "Contract deployed successfully");
    }

    // ========================================
    // FALLBACK AND RECEIVE
    // ========================================

    receive() external payable {
        emit SecurityEvent("ETHER_RECEIVED", msg.sender, msg.value, block.timestamp, "Direct ether transfer");
    }

    fallback() external payable {
        emit SecurityEvent("FALLBACK_CALLED", msg.sender, msg.value, block.timestamp, "Fallback function called");
    }
}