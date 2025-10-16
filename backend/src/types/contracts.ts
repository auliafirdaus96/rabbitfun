// Contract ABI from RabbitLaunchpad
export const LAUNCHPAD_ABI = [
  // Read Functions
  'function getTokenInfo(address tokenAddress) external view returns (tuple(address tokenAddress, string name, string symbol, string metadata, address creator, uint256 soldSupply, uint256 totalBNB, uint256 initialPrice, uint256 totalPlatformFees, uint256 totalCreatorFees, uint256 bondingCurveLiquidity, uint256 liquidityPoolAmount, bool graduated, bool exists, uint256 createdAt, uint256 lastTradeTime))',
  'function getGlobalState() external view returns (uint256 totalTokensCreated, uint256 totalFeesCollected, address dexRouter, address[] memory tokenList)',
  'function getSecurityStatus() external view returns (bool paused, bool emergencyMode, address treasury, uint256 deploymentTime, uint256 lastEmergencyWithdraw)',

  // Write Functions
  'function createToken(string memory name, string memory symbol, string memory metadata) external payable returns (address)',
  'function buy(address tokenAddress, uint256 minTokensOut) external payable',
  'function sell(address tokenAddress, uint256 tokenAmount, uint256 minBNBOut) external',

  // Events
  'event TokenCreated(address indexed tokenAddress, string name, string symbol, address indexed creator, uint256 timestamp)',
  'event TokenBought(address indexed tokenAddress, address indexed buyer, uint256 bnbAmount, uint256 tokenAmount, uint256 platformFee, uint256 creatorFee, uint256 timestamp)',
  'event TokenSold(address indexed tokenAddress, address indexed seller, uint256 tokenAmount, uint256 bnbAmount, uint256 platformFee, uint256 creatorFee, uint256 timestamp)',
  'event TokenGraduated(address indexed tokenAddress, uint256 totalRaised, uint256 liquidityPoolAmount, address indexed liquidityPool, uint256 timestamp)',
  'event DetailedTransaction(address indexed tokenAddress, address indexed user, string transactionType, uint256 bnbAmount, uint256 tokenAmount, uint256 price, uint256 timestamp)'
] as const;

export const ERC20_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
  'function name() external view returns (string)'
] as const;