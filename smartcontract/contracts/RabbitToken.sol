// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RabbitToken
 * @dev ERC20 token for RabbitLaunchpad with exponential bonding curve
 *
 * Features:
 * - Standard ERC20 functionality
 * - Controlled minting by launchpad contract
 * - Burn functionality for token sales
 * - Optimized for bonding curve operations
 * - Total supply: 1B tokens with 18 decimals
 */
contract RabbitToken is ERC20, Ownable {

    // Constants
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18; // 1B tokens
    uint256 public constant TRADING_SUPPLY = 800_000_000 * 10**18; // 80% available for trading
    uint256 public constant GRADUATION_SUPPLY = 200_000_000 * 10**18; // 20% for LP

    // State variables
    address public launchpad;
    bool public isGraduated;

    // Events
    event TokensMinted(address indexed to, uint256 amount, uint256 timestamp);
    event TokensBurned(address indexed from, uint256 amount, uint256 timestamp);
    event Graduated(uint256 timestamp);
    event LaunchpadUpdated(address indexed newLaunchpad, uint256 timestamp);

    // Modifiers
    modifier onlyLaunchpad() {
        require(msg.sender == launchpad, "Only launchpad can call this function");
        _;
    }

    modifier notGraduated() {
        require(!isGraduated, "Token has already graduated");
        _;
    }

    constructor(
        string memory name,
        string memory symbol,
        address initialOwner,
        uint256 initialSupply
    ) ERC20(name, symbol) Ownable() {
        require(initialSupply == TOTAL_SUPPLY, "Initial supply must be exactly 1B tokens");
        transferOwnership(initialOwner);

        // Mint initial supply to launchpad (will be transferred to users via bonding curve)
        _mint(initialOwner, initialSupply);

        // Mark initial supply as reserved for bonding curve
        emit TokensMinted(initialOwner, initialSupply, block.timestamp);
    }

    /**
     * @dev Set launchpad contract address (only owner)
     * @param _launchpad Address of the launchpad contract
     */
    function setLaunchpad(address _launchpad) external onlyOwner {
        require(_launchpad != address(0), "Launchpad cannot be zero address");
        launchpad = _launchpad;
        emit LaunchpadUpdated(_launchpad, block.timestamp);
    }

    /**
     * @dev Mint tokens to address (only launchpad)
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyLaunchpad notGraduated returns (bool) {
        require(to != address(0), "Cannot mint to zero address");
        require(totalSupply() + amount <= TOTAL_SUPPLY, "Would exceed total supply");
        require(amount > 0, "Amount must be greater than 0");

        _mint(to, amount);
        emit TokensMinted(to, amount, block.timestamp);
        return true;
    }

    /**
     * @dev Burn tokens from sender (only launchpad)
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external onlyLaunchpad notGraduated returns (bool) {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(address(this)) >= amount, "Insufficient balance to burn");

        _burn(address(this), amount);
        emit TokensBurned(address(this), amount, block.timestamp);
        return true;
    }

    /**
     * @dev Burn tokens from specific address (only launchpad)
     * @param account Account to burn from
     * @param amount Amount to burn
     */
    function burnFrom(address account, uint256 amount) external onlyLaunchpad notGraduated returns (bool) {
        require(account != address(0), "Cannot burn from zero address");
        require(amount > 0, "Amount must be greater than 0");

        uint256 currentAllowance = allowance(account, msg.sender);
        require(currentAllowance >= amount, "ERC20: burn amount exceeds allowance");

        _approve(account, msg.sender, currentAllowance - amount);
        _burn(account, amount);
        emit TokensBurned(account, amount, block.timestamp);
        return true;
    }

    /**
     * @dev Graduate token (only launchpad)
     * Transfers graduation supply to launchpad for LP creation
     */
    function graduate() external onlyLaunchpad returns (bool) {
        require(!isGraduated, "Token already graduated");

        isGraduated = true;

        // Transfer graduation supply to launchpad
        uint256 graduationAmount = GRADUATION_SUPPLY;
        require(balanceOf(address(this)) >= graduationAmount, "Insufficient graduation tokens");

        _transfer(address(this), launchpad, graduationAmount);
        emit Graduated(block.timestamp);
        emit TokensMinted(launchpad, graduationAmount, block.timestamp);

        return true;
    }

    /**
     * @dev Check if address is launchpad
     * @param account Address to check
     * @return isLaunchpad Whether address is launchpad
     */
    function isLaunchpad(address account) external view returns (bool) {
        return account == launchpad;
    }

    /**
     * @dev Get available supply for trading
     * @return availableSupply Available tokens for bonding curve
     */
    function getAvailableSupply() external view returns (uint256) {
        if (isGraduated) {
            return 0;
        }
        return TRADING_SUPPLY - (TOTAL_SUPPLY - balanceOf(address(this)));
    }

    /**
     * @dev Get graduation progress
     * @return progress Progress towards graduation (basis points: 10000 = 100%)
     */
    function getGraduationProgress() external view returns (uint256) {
        if (isGraduated) {
            return 10000; // 100%
        }

        uint256 soldSupply = TOTAL_SUPPLY - balanceOf(address(this));
        if (soldSupply == 0) return 0;

        return (soldSupply * 10000) / TRADING_SUPPLY; // Convert to basis points
    }

    /**
     * @dev Get token statistics
     * @return totalSupply Total token supply
     * @return circulatingSupply Current circulating supply
     * @return _isGraduated Graduation status
     * @return _tradingSupply Available for trading
     */
    function getTokenStats() external view returns (
        uint256 totalSupply,
        uint256 circulatingSupply,
        bool _isGraduated,
        uint256 _tradingSupply
    ) {
        return (
            TOTAL_SUPPLY,
            TOTAL_SUPPLY - balanceOf(address(this)),
            isGraduated,
            isGraduated ? 0 : (TRADING_SUPPLY - (TOTAL_SUPPLY - balanceOf(address(this))))
        );
    }

    /**
     * @dev Override transfer to include validation
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        address owner = _msgSender();
        _transfer(owner, to, amount);
        return true;
    }

    /**
     * @dev Override transferFrom to include validation
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, amount);
        _transfer(from, to, amount);
        return true;
    }
}