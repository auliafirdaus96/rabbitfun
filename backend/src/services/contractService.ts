import { ethers } from 'ethers';
import { BONDING_CURVE_CONFIG } from '../config/constants';
import logger from '../utils/logger';
import WebSocket from 'ws';

// Contract ABI - Extracted from AhiruLaunchpad_fixed.sol
const LAUNCHPAD_ABI = [
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
];

const ERC20_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
  'function name() external view returns (string)'
];

interface ContractConfig {
  rpcUrl: string;
  chainId: number;
  launchpadAddress: string;
  privateKey?: string;
  wsUrl?: string;
}

interface TokenInfo {
  tokenAddress: string;
  name: string;
  symbol: string;
  metadata: string;
  creator: string;
  soldSupply: string;
  totalBNB: string;
  initialPrice: string;
  totalPlatformFees: string;
  totalCreatorFees: string;
  bondingCurveLiquidity: string;
  liquidityPoolAmount: string;
  graduated: boolean;
  exists: boolean;
  createdAt: string;
  lastTradeTime: string;
}

interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  gasUsed?: string;
  events?: any[];
}

interface EventData {
  type: 'TokenCreated' | 'TokenBought' | 'TokenSold' | 'TokenGraduated' | 'DetailedTransaction';
  data: any;
  timestamp: number;
}

class ContractService {
  private provider: ethers.JsonRpcProvider;
  private wallet?: ethers.Wallet;
  private contract: ethers.Contract;
  private wsProvider?: ethers.WebSocketProvider;
  private eventListeners: Map<string, ethers.Contract> = new Map();
  private wsConnections: Map<string, WebSocket> = new Map();

  constructor(private config: ContractConfig) {
    // Initialize HTTP provider
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);

    // Initialize wallet if private key provided
    if (config.privateKey) {
      this.wallet = new ethers.Wallet(config.privateKey, this.provider);
    }

    // Initialize contract
    this.contract = new ethers.Contract(config.launchpadAddress, LAUNCHPAD_ABI, this.wallet || this.provider);

    // Initialize WebSocket provider if available
    if (config.wsUrl) {
      this.wsProvider = new ethers.WebSocketProvider(config.wsUrl);
    }

    logger.info('ContractService initialized', {
      chainId: config.chainId,
      launchpadAddress: config.launchpadAddress,
      hasWallet: !!this.wallet,
      hasWebSocket: !!this.wsProvider
    });
  }

  // ==================== READ OPERATIONS ====================

  /**
   * Get token information from contract
   */
  async getTokenInfo(tokenAddress: string): Promise<TokenInfo | null> {
    try {
      const result = await this.contract.getTokenInfo(tokenAddress);

      if (!result.exists) {
        return null;
      }

      return {
        tokenAddress: result.tokenAddress,
        name: result.name,
        symbol: result.symbol,
        metadata: result.metadata,
        creator: result.creator,
        soldSupply: result.soldSupply.toString(),
        totalBNB: result.totalBNB.toString(),
        initialPrice: result.initialPrice.toString(),
        totalPlatformFees: result.totalPlatformFees.toString(),
        totalCreatorFees: result.totalCreatorFees.toString(),
        bondingCurveLiquidity: result.bondingCurveLiquidity.toString(),
        liquidityPoolAmount: result.liquidityPoolAmount.toString(),
        graduated: result.graduated,
        exists: result.exists,
        createdAt: result.createdAt.toString(),
        lastTradeTime: result.lastTradeTime.toString()
      };
    } catch (error) {
      logger.error('Error getting token info:', { tokenAddress, error });
      return null;
    }
  }

  /**
   * Get global state of the launchpad
   */
  async getGlobalState() {
    try {
      const result = await this.contract.getGlobalState();
      return {
        totalTokensCreated: result.totalTokensCreated.toString(),
        totalFeesCollected: result.totalFeesCollected.toString(),
        dexRouter: result.dexRouter,
        tokenList: result.tokenList
      };
    } catch (error) {
      logger.error('Error getting global state:', error);
      throw error;
    }
  }

  /**
   * Get security status
   */
  async getSecurityStatus() {
    try {
      return await this.contract.getSecurityStatus();
    } catch (error) {
      logger.error('Error getting security status:', error);
      throw error;
    }
  }

  /**
   * Get ERC20 token balance
   */
  async getTokenBalance(tokenAddress: string, userAddress: string): Promise<string> {
    try {
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
      const balance = await tokenContract.balanceOf(userAddress);
      return balance.toString();
    } catch (error) {
      logger.error('Error getting token balance:', { tokenAddress, userAddress, error });
      return '0';
    }
  }

  /**
   * Get BNB balance
   */
  async getBNBBalance(address: string): Promise<string> {
    try {
      const balance = await this.provider.getBalance(address);
      return balance.toString();
    } catch (error) {
      logger.error('Error getting BNB balance:', { address, error });
      return '0';
    }
  }

  // ==================== BONDING CURVE CALCULATIONS ====================

  /**
   * Calculate tokens out for BNB amount
   */
  calculateTokensOut(bnbAmount: number, currentSupply: number): number {
    const netAmount = bnbAmount * (1 - BONDING_CURVE_CONFIG.TOTAL_FEE);
    const currentPrice = BONDING_CURVE_CONFIG.P0 * Math.exp(BONDING_CURVE_CONFIG.k * (currentSupply / BONDING_CURVE_CONFIG.S));
    return netAmount / currentPrice;
  }

  /**
   * Calculate BNB out for token amount
   */
  calculateBNBOut(tokenAmount: number, currentSupply: number): number {
    const currentPrice = BONDING_CURVE_CONFIG.P0 * Math.exp(BONDING_CURVE_CONFIG.k * (currentSupply / BONDING_CURVE_CONFIG.S));
    return tokenAmount * currentPrice * (1 - BONDING_CURVE_CONFIG.TOTAL_FEE);
  }

  /**
   * Calculate current price
   */
  calculatePrice(supply: number): number {
    return BONDING_CURVE_CONFIG.P0 * Math.exp(BONDING_CURVE_CONFIG.k * (supply / BONDING_CURVE_CONFIG.S));
  }

  /**
   * Calculate price impact
   */
  calculatePriceImpact(amountIn: number, currentSupply: number): number {
    const currentPrice = this.calculatePrice(currentSupply);
    const newSupply = currentSupply + this.calculateTokensOut(amountIn, currentSupply);
    const newPrice = this.calculatePrice(newSupply);
    return ((newPrice - currentPrice) / currentPrice) * 100;
  }

  // ==================== WRITE OPERATIONS ====================

  /**
   * Create a new token
   */
  async createToken(
    name: string,
    symbol: string,
    metadata: string,
    creatorPrivateKey?: string
  ): Promise<TransactionResult> {
    try {
      const wallet = creatorPrivateKey
        ? new ethers.Wallet(creatorPrivateKey, this.provider)
        : this.wallet;

      if (!wallet) {
        throw new Error('No wallet available for transaction');
      }

      const contractWithSigner = this.contract.connect(wallet);

      // Estimate gas
      const gasEstimate = await (contractWithSigner as any).createToken.estimateGas(
        name,
        symbol,
        metadata,
        { value: ethers.parseEther('0.005') } // 0.005 BNB creation fee
      );

      // Execute transaction
      const tx = await (contractWithSigner as any).createToken(
        name,
        symbol,
        metadata,
        {
          value: ethers.parseEther('0.005'),
          gasLimit: gasEstimate + BigInt(100000) // Add buffer
        }
      );

      logger.info('Token creation transaction submitted:', {
        hash: tx.hash,
        from: wallet.address,
        name,
        symbol
      });

      const receipt = await tx.wait();
      const events = receipt?.logs || [];

      return {
        success: true,
        transactionHash: tx.hash,
        gasUsed: receipt?.gasUsed?.toString(),
        events
      };

    } catch (error: any) {
      logger.error('Error creating token:', { name, symbol, error });
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Buy tokens
   */
  async buyTokens(
    tokenAddress: string,
    bnbAmount: string,
    minTokensOut?: string,
    buyerPrivateKey?: string
  ): Promise<TransactionResult> {
    try {
      const wallet = buyerPrivateKey
        ? new ethers.Wallet(buyerPrivateKey, this.provider)
        : this.wallet;

      if (!wallet) {
        throw new Error('No wallet available for transaction');
      }

      const contractWithSigner = this.contract.connect(wallet);

      // Calculate minimum tokens out if not provided
      const tokenInfo = await this.getTokenInfo(tokenAddress);
      if (!tokenInfo) {
        throw new Error('Token not found');
      }

      const currentSupply = parseFloat(tokenInfo.soldSupply);
      const estimatedTokens = this.calculateTokensOut(parseFloat(bnbAmount), currentSupply);
      const minTokens = minTokensOut || Math.floor(estimatedTokens * 0.95).toString(); // 5% slippage

      // Estimate gas
      const gasEstimate = await (contractWithSigner as any).buy.estimateGas(
        tokenAddress,
        ethers.parseEther(minTokens),
        { value: ethers.parseEther(bnbAmount) }
      );

      // Execute transaction
      const tx = await (contractWithSigner as any).buy(
        tokenAddress,
        ethers.parseEther(minTokens),
        {
          value: ethers.parseEther(bnbAmount),
          gasLimit: gasEstimate + BigInt(100000)
        }
      );

      logger.info('Token purchase transaction submitted:', {
        hash: tx.hash,
        from: wallet.address,
        tokenAddress,
        bnbAmount
      });

      const receipt = await tx.wait();
      const events = receipt?.logs || [];

      return {
        success: true,
        transactionHash: tx.hash,
        gasUsed: receipt?.gasUsed?.toString(),
        events
      };

    } catch (error: any) {
      logger.error('Error buying tokens:', { tokenAddress, bnbAmount, error });
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Sell tokens
   */
  async sellTokens(
    tokenAddress: string,
    tokenAmount: string,
    minBNBOut?: string,
    sellerPrivateKey?: string
  ): Promise<TransactionResult> {
    try {
      const wallet = sellerPrivateKey
        ? new ethers.Wallet(sellerPrivateKey, this.provider)
        : this.wallet;

      if (!wallet) {
        throw new Error('No wallet available for transaction');
      }

      const contractWithSigner = this.contract.connect(wallet);

      // Calculate minimum BNB out if not provided
      const tokenInfo = await this.getTokenInfo(tokenAddress);
      if (!tokenInfo) {
        throw new Error('Token not found');
      }

      const currentSupply = parseFloat(tokenInfo.soldSupply);
      const estimatedBNB = this.calculateBNBOut(parseFloat(tokenAmount), currentSupply);
      const minBNB = minBNBOut || Math.floor(estimatedBNB * 0.95).toString(); // 5% slippage

      // Check and approve token if needed
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
      const allowance = await tokenContract.allowance(wallet.address, this.config.launchpadAddress);

      if (allowance < BigInt(tokenAmount)) {
        logger.info('Approving tokens for sale:', { tokenAddress, amount: tokenAmount });
        const approveTx = await tokenContract.approve(this.config.launchpadAddress, tokenAmount);
        await approveTx.wait();
      }

      // Estimate gas
      const gasEstimate = await (contractWithSigner as any).sell.estimateGas(
        tokenAddress,
        tokenAmount,
        ethers.parseEther(minBNB)
      );

      // Execute transaction
      const tx = await (contractWithSigner as any).sell(
        tokenAddress,
        tokenAmount,
        ethers.parseEther(minBNB),
        { gasLimit: gasEstimate + BigInt(100000) }
      );

      logger.info('Token sale transaction submitted:', {
        hash: tx.hash,
        from: wallet.address,
        tokenAddress,
        tokenAmount
      });

      const receipt = await tx.wait();
      const events = receipt?.logs || [];

      return {
        success: true,
        transactionHash: tx.hash,
        gasUsed: receipt?.gasUsed?.toString(),
        events
      };

    } catch (error: any) {
      logger.error('Error selling tokens:', { tokenAddress, tokenAmount, error });
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  // ==================== EVENT LISTENING ====================

  /**
   * Start listening to contract events
   */
  async startEventListener(callback: (event: EventData) => void): Promise<void> {
    if (!this.wsProvider) {
      throw new Error('WebSocket provider not available');
    }

    try {
      const wsContract = new ethers.Contract(
        this.config.launchpadAddress,
        LAUNCHPAD_ABI,
        this.wsProvider
      );

      // Listen to TokenCreated events
      wsContract.on('TokenCreated', (tokenAddress, name, symbol, creator, timestamp, event) => {
        callback({
          type: 'TokenCreated',
          data: {
            tokenAddress,
            name,
            symbol,
            creator,
            timestamp: timestamp.toString(),
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash
          },
          timestamp: Date.now()
        });
      });

      // Listen to TokenBought events
      wsContract.on('TokenBought', (tokenAddress, buyer, bnbAmount, tokenAmount, platformFee, creatorFee, timestamp, event) => {
        callback({
          type: 'TokenBought',
          data: {
            tokenAddress,
            buyer,
            bnbAmount: ethers.formatEther(bnbAmount),
            tokenAmount: ethers.formatEther(tokenAmount),
            platformFee: ethers.formatEther(platformFee),
            creatorFee: ethers.formatEther(creatorFee),
            timestamp: timestamp.toString(),
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash
          },
          timestamp: Date.now()
        });
      });

      // Listen to TokenSold events
      wsContract.on('TokenSold', (tokenAddress, seller, tokenAmount, bnbAmount, platformFee, creatorFee, timestamp, event) => {
        callback({
          type: 'TokenSold',
          data: {
            tokenAddress,
            seller,
            tokenAmount: ethers.formatEther(tokenAmount),
            bnbAmount: ethers.formatEther(bnbAmount),
            platformFee: ethers.formatEther(platformFee),
            creatorFee: ethers.formatEther(creatorFee),
            timestamp: timestamp.toString(),
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash
          },
          timestamp: Date.now()
        });
      });

      // Listen to TokenGraduated events
      wsContract.on('TokenGraduated', (tokenAddress, totalRaised, liquidityPoolAmount, liquidityPool, timestamp, event) => {
        callback({
          type: 'TokenGraduated',
          data: {
            tokenAddress,
            totalRaised: ethers.formatEther(totalRaised),
            liquidityPoolAmount: ethers.formatEther(liquidityPoolAmount),
            liquidityPool,
            timestamp: timestamp.toString(),
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash
          },
          timestamp: Date.now()
        });
      });

      // Listen to DetailedTransaction events
      wsContract.on('DetailedTransaction', (tokenAddress, user, transactionType, bnbAmount, tokenAmount, price, timestamp, event) => {
        callback({
          type: 'DetailedTransaction',
          data: {
            tokenAddress,
            user,
            transactionType,
            bnbAmount: ethers.formatEther(bnbAmount),
            tokenAmount: ethers.formatEther(tokenAmount),
            price: ethers.formatEther(price),
            timestamp: timestamp.toString(),
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash
          },
          timestamp: Date.now()
        });
      });

      this.eventListeners.set('main', wsContract);
      logger.info('Event listeners started successfully');

    } catch (error) {
      logger.error('Error starting event listeners:', error);
      throw error;
    }
  }

  /**
   * Start listening to events for a specific token
   */
  async startTokenEventListener(
    tokenAddress: string,
    callback: (event: EventData) => void
  ): Promise<void> {
    if (!this.wsProvider) {
      throw new Error('WebSocket provider not available');
    }

    try {
      const wsContract = new ethers.Contract(
        this.config.launchpadAddress,
        LAUNCHPAD_ABI,
        this.wsProvider
      );

      // Create filters for specific token
      const tokenCreatedFilter = wsContract.filters.TokenCreated(tokenAddress);
      const tokenBoughtFilter = wsContract.filters.TokenBought(tokenAddress);
      const tokenSoldFilter = wsContract.filters.TokenSold(tokenAddress);
      const tokenGraduatedFilter = wsContract.filters.TokenGraduated(tokenAddress);
      const detailedTransactionFilter = wsContract.filters.DetailedTransaction(tokenAddress);

      // Listen to filtered events
      wsContract.on(tokenCreatedFilter, (name, symbol, creator, timestamp, event) => {
        callback({
          type: 'TokenCreated',
          data: {
            tokenAddress,
            name,
            symbol,
            creator,
            timestamp: timestamp.toString(),
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash
          },
          timestamp: Date.now()
        });
      });

      wsContract.on(tokenBoughtFilter, (buyer, bnbAmount, tokenAmount, platformFee, creatorFee, timestamp, event) => {
        callback({
          type: 'TokenBought',
          data: {
            tokenAddress,
            buyer,
            bnbAmount: ethers.formatEther(bnbAmount),
            tokenAmount: ethers.formatEther(tokenAmount),
            platformFee: ethers.formatEther(platformFee),
            creatorFee: ethers.formatEther(creatorFee),
            timestamp: timestamp.toString(),
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash
          },
          timestamp: Date.now()
        });
      });

      wsContract.on(tokenSoldFilter, (seller, tokenAmount, bnbAmount, platformFee, creatorFee, timestamp, event) => {
        callback({
          type: 'TokenSold',
          data: {
            tokenAddress,
            seller,
            tokenAmount: ethers.formatEther(tokenAmount),
            bnbAmount: ethers.formatEther(bnbAmount),
            platformFee: ethers.formatEther(platformFee),
            creatorFee: ethers.formatEther(creatorFee),
            timestamp: timestamp.toString(),
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash
          },
          timestamp: Date.now()
        });
      });

      wsContract.on(tokenGraduatedFilter, (totalRaised, liquidityPoolAmount, liquidityPool, timestamp, event) => {
        callback({
          type: 'TokenGraduated',
          data: {
            tokenAddress,
            totalRaised: ethers.formatEther(totalRaised),
            liquidityPoolAmount: ethers.formatEther(liquidityPoolAmount),
            liquidityPool,
            timestamp: timestamp.toString(),
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash
          },
          timestamp: Date.now()
        });
      });

      wsContract.on(detailedTransactionFilter, (user, transactionType, bnbAmount, tokenAmount, price, timestamp, event) => {
        callback({
          type: 'DetailedTransaction',
          data: {
            tokenAddress,
            user,
            transactionType,
            bnbAmount: ethers.formatEther(bnbAmount),
            tokenAmount: ethers.formatEther(tokenAmount),
            price: ethers.formatEther(price),
            timestamp: timestamp.toString(),
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash
          },
          timestamp: Date.now()
        });
      });

      this.eventListeners.set(tokenAddress, wsContract);
      logger.info('Token event listener started:', { tokenAddress });

    } catch (error) {
      logger.error('Error starting token event listener:', { tokenAddress, error });
      throw error;
    }
  }

  /**
   * Stop listening to events
   */
  stopEventListener(listenerKey: string = 'main'): void {
    const listener = this.eventListeners.get(listenerKey);
    if (listener) {
      listener.removeAllListeners();
      this.eventListeners.delete(listenerKey);
      logger.info('Event listener stopped:', { listenerKey });
    }
  }

  /**
   * Stop all event listeners
   */
  stopAllEventListeners(): void {
    for (const [key] of this.eventListeners) {
      this.stopEventListener(key);
    }
    logger.info('All event listeners stopped');
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash: string) {
    try {
      return await this.provider.getTransactionReceipt(txHash);
    } catch (error) {
      logger.error('Error getting transaction receipt:', { txHash, error });
      return null;
    }
  }

  /**
   * Get current block number
   */
  async getBlockNumber(): Promise<number> {
    try {
      return await this.provider.getBlockNumber();
    } catch (error) {
      logger.error('Error getting block number:', error);
      return 0;
    }
  }

  /**
   * Check if transaction was successful
   */
  async isTransactionSuccessful(txHash: string): Promise<boolean> {
    try {
      const receipt = await this.getTransactionReceipt(txHash);
      return receipt?.status === 1;
    } catch (error) {
      logger.error('Error checking transaction success:', { txHash, error });
      return false;
    }
  }

  /**
   * Estimate gas for transaction
   */
  async estimateGas(
    method: string,
    params: any[],
    from?: string
  ): Promise<string> {
    try {
      const estimate = await this.contract[method].estimateGas(...params, { from });
      return estimate.toString();
    } catch (error) {
      logger.error('Error estimating gas:', { method, params, error });
      throw error;
    }
  }

  /**
   * Get contract instance
   */
  getContract(): ethers.Contract {
    return this.contract;
  }

  /**
   * Get provider instance
   */
  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.stopAllEventListeners();

    if (this.wsProvider) {
      await this.wsProvider.destroy();
    }

    logger.info('ContractService cleaned up');
  }
}

export default ContractService;
export { ContractService, type TokenInfo, type TransactionResult, type EventData, type ContractConfig };