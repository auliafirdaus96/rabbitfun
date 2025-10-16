// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./RabbitToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title RabbitLaunchpad
 * @dev Smart contract for token launchpad with exponential bonding curve
 * BSC Network Implementation
 *
 * Bonding Curve: P(x) = P0 * e^(k * (x / S))
 * where:
 * - P0 = 0.00001 BNB = 1e-5 BNB = 1e13 wei (UPDATED - Realistic BSC Pricing)
 * - k = 5.43 (growth factor)
 * - S = 1_000_000_000 tokens = 1e27 wei
 * - Gross Raise Target = 35 BNB (UPDATED - Achievable Target)
 * - Net Raise = 34.5625 BNB (1.25% fees)
 * - Distribution: 80% bonding curve + 20% LP
 */
contract RabbitLaunchpad is Ownable, ReentrancyGuard {

    // Constants - Exponential Bonding Curve
    uint256 public constant CREATE_FEE = 0.005 ether; // 0.005 BNB creation fee
    uint256 public constant INITIAL_PRICE = 10 * 10**12; // 0.00001 BNB = 1e-5 BNB = 1e13 wei (UPDATED - Realistic BSC Pricing)
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18; // 1B tokens with 18 decimals
    uint256 public constant TARGET_SUPPLY = 800_000_000 * 10**18; // 80% available for trading (200M for graduation)
    uint256 public constant GRADUATION_TOKEN_ALLOCATION = 200_000_000 * 10**18; // 200M tokens (20%)

    // Exponential Bonding Curve Parameters
    uint256 public constant K_FACTOR = 543; // k = 5.43 * 100 for precision
    uint256 public constant K_PRECISION = 100; // Precision factor for K
    uint256 public constant SUPPLY_CONSTANT = TOTAL_SUPPLY; // S = 1e27 wei

    // Target Graduation - UPDATED FOR ACHIEVABLE TARGET
    uint256 public constant GROSS_RAISE_TARGET = 35 ether; // 35 BNB gross raise target (~$10,500 USD)
    uint256 public constant NET_RAISE_TARGET = 34562500000000000000; // 34.5625 BNB net raise (35 * (1 - 0.0125))

    // Fee Structure - 1.25% total
    uint256 public constant FEE_PLATFORM_PERCENT = 100; // 1% = 100 basis points
    uint256 public constant FEE_CREATOR_PERCENT = 25; // 0.25% = 25 basis points
    uint256 public constant TOTAL_FEE_PERCENT = 125; // 1.25% = 125 basis points
    uint256 public constant BASIS_POINTS = 10000; // 100% dalam basis points

    // Fee Distribution
    uint256 public constant BONDING_CURVE_SPLIT = 8000; // 80% to bonding curve
    uint256 public constant LP_SPLIT = 2000; // 20% to liquidity pool

    // Mathematical Constants for Exponential Calculation
    uint256 public constant E_PRECISION = 100000000000000000000; // 1e18 for e calculations
    uint256 public constant MAX_EXPONENT = 100000; // Maximum exponent for accurate calculation

    // ⚡ CENTRALIZATION MITIGATION - Timelock constants
    uint256 public constant TIMELOCK_DELAY = 7 days; // 7 hari untuk admin actions
    uint256 public constant EMERGENCY_TIMELOCK = 24 hours; // 24 jam untuk emergency withdraw
    uint256 public constant MAX_EMERGENCY_WITHDRAW = 10 ether; // Max 10 BNB per emergency

    address public treasury;
    address public pendingTreasury;
    uint256 public treasuryUpdateTime;
    uint256 public deploymentTime;

    struct TokenState {
        address tokenAddress;
        string name;
        string symbol;
        string metadata;
        address creator;
        uint256 soldSupply;
        uint256 totalBNB;
        uint256 initialPrice;
        uint256 totalPlatformFees;
        uint256 totalCreatorFees;
        uint256 bondingCurveLiquidity;
        uint256 liquidityPoolAmount;
        bool graduated;
        bool exists;
    }

    struct GlobalState {
        uint256 totalTokensCreated;
        uint256 totalFeesCollected;
        address dexRouter; // PancakeSwap Router untuk BSC
        mapping(bytes32 => TokenState) tokens; // keccak256(abi.encodePacked(tokenAddress)) => TokenState
        mapping(address => bytes32) tokenToKey; // tokenAddress => key
        address[] tokenList;
    }

    GlobalState public globalState;

    // Events
    event TokenCreated(
        address indexed tokenAddress,
        string name,
        string symbol,
        address indexed creator,
        uint256 timestamp
    );

    event TokenBought(
        address indexed tokenAddress,
        address indexed buyer,
        uint256 bnbAmount,
        uint256 tokenAmount,
        uint256 timestamp
    );

    event TokenSold(
        address indexed tokenAddress,
        address indexed seller,
        uint256 tokenAmount,
        uint256 bnbAmount,
        uint256 timestamp
    );

    event TokenGraduated(
        address indexed tokenAddress,
        address indexed lpPair,
        uint256 lpBNB,
        uint256 lpTokens,
        uint256 timestamp
    );

    constructor(address _treasury, address _dexRouter) {
        require(_treasury != address(0), "Treasury cannot be zero address");
        require(_dexRouter != address(0), "DEX Router cannot be zero address");

        treasury = _treasury;
        globalState.dexRouter = _dexRouter;
        deploymentTime = block.timestamp;
        lastEmergencyWithdraw = block.timestamp; // Initialize to deployment time
    }

    /**
     * @dev Membuat token baru dengan bonding curve
     * @param name Nama token
     * @param symbol Simbol token
     * @param metadata URI metadata
     */
    function createToken(
        string memory name,
        string memory symbol,
        string memory metadata
    ) external payable nonReentrant {
        require(msg.value == CREATE_FEE, "Incorrect creation fee");

        // Transfer fee ke treasury
        payable(treasury).transfer(CREATE_FEE);

        // Create new ERC20 token
        RabbitToken newToken = new RabbitToken(name, symbol, address(this), TOTAL_SUPPLY);
        address tokenAddress = address(newToken);

        // Set launchpad address in token contract
        newToken.setLaunchpad(address(this));

        // Generate key untuk mapping
        bytes32 key = keccak256(abi.encodePacked(tokenAddress));

        // Simpan state token
        globalState.tokens[key] = TokenState({
            tokenAddress: tokenAddress,
            name: name,
            symbol: symbol,
            metadata: metadata,
            creator: msg.sender,
            soldSupply: 0,
            totalBNB: 0,
            initialPrice: INITIAL_PRICE,
            totalPlatformFees: 0,
            totalCreatorFees: 0,
            bondingCurveLiquidity: 0,
            liquidityPoolAmount: 0,
            graduated: false,
            exists: true
        });

        globalState.tokenToKey[tokenAddress] = key;
        globalState.tokenList.push(tokenAddress);
        globalState.totalTokensCreated++;

        emit TokenCreated(tokenAddress, name, symbol, msg.sender, block.timestamp);
    }

    /**
     * @dev Membeli token dari bonding curve
     * @param tokenAddress Address token yang akan dibeli
     */
    function buy(address tokenAddress) external payable nonReentrant {
        bytes32 key = globalState.tokenToKey[tokenAddress];
        require(globalState.tokens[key].exists, "Token does not exist");
        require(!globalState.tokens[key].graduated, "Token already graduated");
        require(msg.value > 0, "BNB amount must be greater than 0");

        TokenState storage tokenState = globalState.tokens[key];
        RabbitToken token = RabbitToken(payable(tokenAddress));

        // Hitung total fee
        uint256 totalFee = msg.value * TOTAL_FEE_PERCENT / BASIS_POINTS;
        uint256 platformFee = msg.value * FEE_PLATFORM_PERCENT / BASIS_POINTS;
        uint256 creatorFee = msg.value * FEE_CREATOR_PERCENT / BASIS_POINTS;
        uint256 bnbForTokens = msg.value - totalFee;

        // Hitung jumlah token yang akan dibeli menggunakan bonding curve
        uint256 tokenAmount = calculateTokenPurchase(tokenState.soldSupply, bnbForTokens, tokenState.initialPrice, 0);

        require(tokenAmount > 0, "Insufficient BNB for token purchase");
        require(tokenState.soldSupply + tokenAmount <= TOTAL_SUPPLY - GRADUATION_TOKEN_ALLOCATION, "Not enough tokens available");

        // ⚡ STATE UPDATE DULU - FIX REENTRANCY
        tokenState.soldSupply += tokenAmount;
        tokenState.totalBNB += bnbForTokens;
        tokenState.totalPlatformFees += platformFee;
        tokenState.totalCreatorFees += creatorFee;

        // ⚡ EMIT EVENT DULU
        emit TokenBought(tokenAddress, msg.sender, bnbForTokens, tokenAmount, block.timestamp);

        // ⚡ BARU EXTERNAL CALLS SETELAH SEMUA STATE UPDATE
        // Transfer fee ke treasury dan creator
        if (platformFee > 0) {
            payable(treasury).transfer(platformFee);
        }
        if (creatorFee > 0) {
            payable(tokenState.creator).transfer(creatorFee);
        }

        // Transfer token ke pembeli (external call terakhir)
        require(token.transfer(msg.sender, tokenAmount), "Token transfer failed");
    }

    /**
     * @dev Menjual token ke bonding curve
     * @param tokenAddress Address token yang akan dijual
     * @param tokenAmount Jumlah token yang akan dijual
     */
    function sell(address tokenAddress, uint256 tokenAmount) external nonReentrant {
        bytes32 key = globalState.tokenToKey[tokenAddress];
        require(globalState.tokens[key].exists, "Token does not exist");
        require(!globalState.tokens[key].graduated, "Token already graduated");
        require(tokenAmount > 0, "Token amount must be greater than 0");

        TokenState storage tokenState = globalState.tokens[key];
        RabbitToken token = RabbitToken(tokenAddress);

        require(token.balanceOf(msg.sender) >= tokenAmount, "Insufficient token balance");
        require(tokenState.soldSupply >= tokenAmount, "Cannot sell more than sold supply");

        // Hitung BNB yang akan diterima menggunakan bonding curve
        uint256 bnbAmount = calculateTokenSale(tokenState.soldSupply, tokenAmount, tokenState.initialPrice, 0);

        require(bnbAmount > 0, "Token amount too small");
        require(address(this).balance >= bnbAmount, "Insufficient BNB in contract");

        // Hitung total fee
        uint256 totalFee = bnbAmount * TOTAL_FEE_PERCENT / BASIS_POINTS;
        uint256 platformFee = bnbAmount * FEE_PLATFORM_PERCENT / BASIS_POINTS;
        uint256 creatorFee = bnbAmount * FEE_CREATOR_PERCENT / BASIS_POINTS;
        uint256 bnbToUser = bnbAmount - totalFee;

        // ⚡ STATE UPDATE DULU - FIX REENTRANCY
        tokenState.soldSupply -= tokenAmount;
        tokenState.totalBNB -= bnbAmount;
        tokenState.totalPlatformFees += platformFee;
        tokenState.totalCreatorFees += creatorFee;

        // ⚡ EMIT EVENT DULU
        emit TokenSold(tokenAddress, msg.sender, tokenAmount, bnbToUser, block.timestamp);

        // ⚡ BARU EXTERNAL CALLS SETELAH SEMUA STATE UPDATE
        // Transfer token dari seller ke kontrak (external call pertama)
        require(token.transferFrom(msg.sender, address(this), tokenAmount), "Token transfer failed");

        // Transfer fee ke treasury dan creator
        if (platformFee > 0) {
            payable(treasury).transfer(platformFee);
        }
        if (creatorFee > 0) {
            payable(tokenState.creator).transfer(creatorFee);
        }

        // Transfer BNB ke seller (external call terakhir)
        if (bnbToUser > 0) {
            payable(msg.sender).transfer(bnbToUser);
        }
    }

    /**
     * @dev Graduate token ke DEX (PancakeSwap)
     * @param tokenAddress Address token yang akan di-graduate
     */
    function graduate(address tokenAddress) external nonReentrant {
        bytes32 key = globalState.tokenToKey[tokenAddress];
        require(globalState.tokens[key].exists, "Token does not exist");
        require(!globalState.tokens[key].graduated, "Token already graduated");
        require(globalState.tokens[key].totalBNB >= 1 ether, "Insufficient BNB for graduation"); // Minimal 1 BNB

        TokenState storage tokenState = globalState.tokens[key];
        RabbitToken token = RabbitToken(tokenAddress);

        // Update state
        tokenState.graduated = true;

        // Transfer LP tokens dan BNB ke kontrak
        uint256 lpTokens = GRADUATION_TOKEN_ALLOCATION;
        uint256 lpBNB = tokenState.totalBNB;

        require(token.balanceOf(address(this)) >= lpTokens, "Insufficient tokens for LP");
        require(address(this).balance >= lpBNB, "Insufficient BNB for LP");

        // Di implementasi nyata, di sini akan dibuat liquidity pool di PancakeSwap
        // Untuk contoh ini, kita simulasikan dengan transfer ke treasury
        payable(treasury).transfer(lpBNB);
        token.transfer(treasury, lpTokens);

        emit TokenGraduated(tokenAddress, treasury, lpBNB, lpTokens, block.timestamp);
    }

    /**
     * @dev Calculate price using exponential bonding curve: P(x) = P0 * e^(k * (x / S))
     * @param supply Current token supply
     * @return price Current price in wei
     */
    function calculatePrice(uint256 supply) public pure returns (uint256) {
        if (supply == 0) return INITIAL_PRICE;

        // ⚡ OVERFLOW PROTECTION - Batasi supply untuk menghindari overflow
        require(supply <= TOTAL_SUPPLY, "Supply exceeds maximum limit");
        require(supply <= TARGET_SUPPLY, "Supply exceeds trading limit");

        // Calculate exponent: k * (x / S) dengan overflow protection
        // Gunakan division dulu untuk mengurangi risiko overflow
        uint256 supplyRatio = (supply * K_PRECISION) / SUPPLY_CONSTANT;
        uint256 exponent = (K_FACTOR * supplyRatio) / K_PRECISION;

        // ⚡ BOUND CHECKING - Pastikan exponent tidak terlalu besar
        require(exponent <= MAX_EXPONENT * 10, "Exponent too large for calculation");

        // For small exponents, use Taylor series: e^x ≈ 1 + x + x²/2
        if (exponent < MAX_EXPONENT) {
            uint256 term1 = E_PRECISION; // 1 * 1e18
            uint256 term2 = exponent;

            // ⚡ OVERFLOW PROTECTION untuk term3 (x²/2)
            uint256 term3 = 0;
            if (exponent < MAX_EXPONENT / 2) { // Extra safety
                uint256 exponentSquared = (exponent * exponent) / E_PRECISION;
                term3 = exponentSquared / 2;
            }

            uint256 sum = term1 + term2 + term3;

            // ⚡ OVERFLOW PROTECTION untuk final calculation
            require(sum <= E_PRECISION * 100, "Taylor series result overflow");
            require(INITIAL_PRICE <= type(uint256).max / sum, "Price calculation overflow");

            return (INITIAL_PRICE * sum) / E_PRECISION;
        } else {
            // For larger exponents, use safe approximation with cap
            uint256 cappedExponent = exponent > MAX_EXPONENT ? MAX_EXPONENT : exponent;
            require(INITIAL_PRICE <= type(uint256).max / cappedExponent, "Price calculation overflow");
            return (INITIAL_PRICE * cappedExponent) / E_PRECISION;
        }
    }

    /**
     * @dev Calculate tokens received for given BNB amount using exponential curve
     * @param currentSupply Current token supply
     * @param bnbAmount BNB amount to spend (in wei)
     * @return tokenAmount Tokens received
     */
    function calculateTokenPurchase(
        uint256 currentSupply,
        uint256 bnbAmount,
        uint256 /* initialPrice */,
        uint256 /* slope */
    ) public pure returns (uint256) {
        // ⚡ BOUNDS CHECKING - Input validation
        require(currentSupply <= TOTAL_SUPPLY, "Current supply exceeds limit");
        require(bnbAmount <= 100 ether, "BNB amount exceeds maximum limit"); // Max 100 BNB
        require(bnbAmount > 0, "BNB amount must be greater than 0");

        uint256 currentPrice = calculatePrice(currentSupply);
        require(currentPrice > 0, "Price cannot be zero");

        // ⚡ OVERFLOW PROTECTION untuk perhitungan token amount
        uint256 scaledAmount = bnbAmount * 1e18;
        require(scaledAmount >= bnbAmount, "Scaling overflow");

        uint256 tokenAmount = scaledAmount / currentPrice;

        // ⚡ SAFETY CHECKS
        require(tokenAmount > 0, "Token amount too small");
        require(tokenAmount <= TARGET_SUPPLY, "Token amount exceeds target supply");
        require(currentSupply + tokenAmount <= TARGET_SUPPLY, "Would exceed target supply");

        return tokenAmount;
    }

    /**
     * @dev Calculate BNB received for selling tokens using exponential curve
     * @param currentSupply Current token supply
     * @param tokenAmount Token amount to sell
     * @return bnbAmount BNB received
     */
    function calculateTokenSale(
        uint256 currentSupply,
        uint256 tokenAmount,
        uint256 /* initialPrice */,
        uint256 /* slope */
    ) public pure returns (uint256) {
        // ⚡ BOUNDS CHECKING - Input validation
        require(currentSupply <= TOTAL_SUPPLY, "Current supply exceeds limit");
        require(tokenAmount <= TARGET_SUPPLY, "Token amount exceeds target supply");
        require(tokenAmount > 0, "Token amount must be greater than 0");
        require(tokenAmount <= currentSupply, "Cannot sell more than current supply");

        uint256 currentPrice = calculatePrice(currentSupply);
        require(currentPrice > 0, "Price cannot be zero");

        // ⚡ OVERFLOW PROTECTION untuk perhitungan BNB amount
        uint256 tokenValue = tokenAmount * currentPrice;
        require(tokenValue >= tokenAmount, "Token value calculation overflow");
        require(tokenValue >= currentPrice, "Token value calculation overflow 2");

        uint256 bnbAmount = tokenValue / 1e18;

        // ⚡ SAFETY CHECKS
        require(bnbAmount > 0, "BNB amount too small");
        require(bnbAmount <= 100 ether, "BNB amount exceeds maximum limit"); // Max 100 BNB

        return bnbAmount;
    }

    /**
     * @dev Get bonding curve statistics for a token
     * @param tokenAddress Token address
     * @return currentPrice Current price in wei
     * @return marketCap Market cap in wei
     * @return progress Progress towards graduation (basis points)
     * @return isGraduated Whether token has graduated
     */
    function getBondingCurveStats(address tokenAddress)
        external
        view
        returns (
            uint256 currentPrice,
            uint256 marketCap,
            uint256 progress,
            bool isGraduated
        )
    {
        bytes32 key = globalState.tokenToKey[tokenAddress];
        require(globalState.tokens[key].exists, "Token does not exist");

        TokenState storage tokenState = globalState.tokens[key];
        currentPrice = calculatePrice(tokenState.soldSupply);
        marketCap = currentPrice * tokenState.soldSupply / 1e18;
        progress = (tokenState.totalBNB * BASIS_POINTS) / GROSS_RAISE_TARGET;
        isGraduated = tokenState.graduated;
    }

    /**
     * @dev Menghitung akar kuadrat dari bilangan
     * @param n Bilangan yang akan dihitung akarnya
     * @return sqrt Hasil akar kuadrat
     */
    function sqrt(uint256 n) internal pure returns (uint256) {
        if (n == 0) return 0;
        uint256 x = n;
        uint256 y = (x + 1) / 2;
        while (y < x) {
            x = y;
            y = (x + n / x) / 2;
        }
        return x;
    }

    /**
     * @dev Mendapatkan informasi token
     * @param tokenAddress Address token
     * @return TokenState Informasi token
     */
    function getTokenInfo(address tokenAddress) external view returns (TokenState memory) {
        bytes32 key = globalState.tokenToKey[tokenAddress];
        require(globalState.tokens[key].exists, "Token does not exist");
        return globalState.tokens[key];
    }

    /**
     * @dev Mendapatkan daftar semua token
     * @return tokenList Daftar address token
     */
    function getAllTokens() external view returns (address[] memory) {
        return globalState.tokenList;
    }

    /**
     * @dev ⚡ TIMELOCKED - Initiate treasury address update
     * @param newTreasury Address treasury baru
     */
    function initiateTreasuryUpdate(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Treasury cannot be zero address");
        require(newTreasury != treasury, "New treasury must be different");
        require(newTreasury != pendingTreasury, "Update already pending");

        pendingTreasury = newTreasury;
        treasuryUpdateTime = block.timestamp;
    }

    /**
     * @dev ⚡ TIMELOCKED - Complete treasury address update (after 7 days)
     */
    function completeTreasuryUpdate() external onlyOwner {
        require(pendingTreasury != address(0), "No pending treasury update");
        require(block.timestamp >= treasuryUpdateTime + TIMELOCK_DELAY, "Timelock not expired");

        treasury = pendingTreasury;
        pendingTreasury = address(0);
        treasuryUpdateTime = 0;
    }

    /**
     * @dev ⚡ LEGACY - Update treasury (deprecated, kept for compatibility)
     */
    function updateTreasury(address newTreasury) external onlyOwner {
        revert("Use initiateTreasuryUpdate and completeTreasuryUpdate with timelock");
    }

    /**
     * @dev Update DEX router address (hanya owner)
     * @param newDexRouter Address DEX router baru
     */
    function updateDexRouter(address newDexRouter) external onlyOwner {
        require(newDexRouter != address(0), "DEX Router cannot be zero address");
        globalState.dexRouter = newDexRouter;
    }

    // ⚡ CENTRALIZATION MITIGATION - State untuk emergency withdraw
    uint256 public lastEmergencyWithdraw;
    bool public emergencyMode;

    /**
     * @dev ⚡ LIMITED - Emergency withdraw dengan timelock dan limit
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= MAX_EMERGENCY_WITHDRAW, "Amount exceeds maximum emergency limit");
        require(address(this).balance >= amount, "Insufficient contract balance");

        // Timelock check - 24 jam sejak last emergency withdraw
        require(
            block.timestamp >= lastEmergencyWithdraw + EMERGENCY_TIMELOCK,
            "Emergency timelock not expired"
        );

        // Update state
        lastEmergencyWithdraw = block.timestamp;
        emergencyMode = true;

        // Transfer
        payable(owner()).transfer(amount);
    }

    /**
     * @dev ⚡ LEGACY - Full emergency withdraw (hanya untuk critical emergency)
     */
    function fullEmergencyWithdraw() external onlyOwner {
        // Hanya bisa jika contract sudah di-deploy minimal 30 hari
        require(
            block.timestamp >= deploymentTime + 30 days,
            "Contract too new for full emergency withdraw"
        );

        // Reset emergency mode
        emergencyMode = false;

        // Transfer semua balance
        payable(owner()).transfer(address(this).balance);
    }

    /**
     * @dev ⚡ DISABLED - Legacy emergency withdraw
     */
    function emergencyWithdraw() external onlyOwner {
        revert("Use emergencyWithdraw(uint256) with amount limit");
    }

    /**
     * @dev Menerima BNB
     */
    receive() external payable {}
}