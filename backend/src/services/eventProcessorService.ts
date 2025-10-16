import logger from '../utils/logger';
import { PrismaClient } from '../generated/prisma';
import ContractService, { EventData } from './contractService';

interface EventProcessorConfig {
  autoStart?: boolean;
  batchSize?: number;
  processingInterval?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

interface ProcessedEvent {
  id: string;
  type: string;
  data: any;
  processedAt: Date;
  blockNumber: number;
  transactionHash: string;
}

interface TokenUpdateData {
  tokenAddress: string;
  name: string;
  symbol: string;
  creator: string;
  soldSupply: string;
  totalBNB: string;
  totalPlatformFees: string;
  totalCreatorFees: string;
  graduated: boolean;
  lastTradeTime: string;
  price?: number;
  volume24h?: number;
  transactions?: number;
}

interface TransactionData {
  id: string;
  tokenAddress: string;
  userAddress: string;
  type: 'buy' | 'sell';
  bnbAmount: string;
  tokenAmount: string;
  platformFee: string;
  creatorFee: string;
  price: string;
  timestamp: Date;
  blockNumber: number;
  transactionHash: string;
}

class EventProcessorService {
  private prisma: PrismaClient;
  private contractService: ContractService;
  private config: Required<EventProcessorConfig>;
  private isRunning: boolean = false;
  private eventQueue: EventData[] = [];
  private processingTimer?: NodeJS.Timeout;
  private tokenCache: Map<string, any> = new Map();
  private analyticsCache: Map<string, any> = new Map();

  constructor(
    contractService: ContractService,
    config: EventProcessorConfig = {}
  ) {
    this.prisma = new PrismaClient();
    this.contractService = contractService;

    this.config = {
      autoStart: config.autoStart ?? true,
      batchSize: config.batchSize ?? 10,
      processingInterval: config.processingInterval ?? 1000,
      retryAttempts: config.retryAttempts ?? 3,
      retryDelay: config.retryDelay ?? 1000
    };

    if (this.config.autoStart) {
      this.start();
    }

    logger.info('EventProcessorService initialized', this.config);
  }

  /**
   * Start the event processor
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('EventProcessorService is already running');
      return;
    }

    try {
      this.isRunning = true;

      // Start contract event listeners
      await this.contractService.startEventListener(this.handleContractEvent.bind(this));

      // Start batch processing
      this.startBatchProcessing();

      // Initialize caches
      await this.initializeCaches();

      logger.info('EventProcessorService started successfully');
    } catch (error) {
      logger.error('Error starting EventProcessorService:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the event processor
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('EventProcessorService is not running');
      return;
    }

    try {
      this.isRunning = false;

      // Stop contract event listeners
      this.contractService.stopAllEventListeners();

      // Stop batch processing
      if (this.processingTimer) {
        clearInterval(this.processingTimer);
      }

      // Process remaining events
      await this.processEventQueue();

      logger.info('EventProcessorService stopped successfully');
    } catch (error) {
      logger.error('Error stopping EventProcessorService:', error);
      throw error;
    }
  }

  /**
   * Handle contract events
   */
  private async handleContractEvent(event: EventData): Promise<void> {
    try {
      this.eventQueue.push(event);
      logger.debug('Event added to queue:', { type: event.type, queueSize: this.eventQueue.length });

      // Process immediately if queue is getting large
      if (this.eventQueue.length >= this.config.batchSize) {
        await this.processEventQueue();
      }
    } catch (error) {
      logger.error('Error handling contract event:', { event, error });
    }
  }

  /**
   * Start batch processing timer
   */
  private startBatchProcessing(): void {
    this.processingTimer = setInterval(
      async () => {
        if (this.eventQueue.length > 0) {
          await this.processEventQueue();
        }
      },
      this.config.processingInterval
    );
  }

  /**
   * Process event queue
   */
  private async processEventQueue(): Promise<void> {
    if (this.eventQueue.length === 0) {
      return;
    }

    const batchSize = Math.min(this.config.batchSize, this.eventQueue.length);
    const events = this.eventQueue.splice(0, batchSize);

    logger.debug('Processing event batch:', { batchSize, remainingInQueue: this.eventQueue.length });

    try {
      const processedEvents: ProcessedEvent[] = [];

      for (const event of events) {
        const processedEvent = await this.processEvent(event);
        if (processedEvent) {
          processedEvents.push(processedEvent);
        }
      }

      // Send real-time updates to connected clients
      if (processedEvents.length > 0) {
        await this.broadcastUpdates(processedEvents);
      }

      logger.debug('Event batch processed successfully:', { processedCount: processedEvents.length });
    } catch (error) {
      logger.error('Error processing event batch:', error);

      // Re-add failed events to queue for retry
      this.eventQueue.unshift(...events);
    }
  }

  /**
   * Process individual event
   */
  private async processEvent(event: EventData): Promise<ProcessedEvent | null> {
    try {
      let processedEvent: ProcessedEvent | null = null;

      switch (event.type) {
        case 'TokenCreated':
          processedEvent = await this.processTokenCreated(event);
          break;
        case 'TokenBought':
          processedEvent = await this.processTokenBought(event);
          break;
        case 'TokenSold':
          processedEvent = await this.processTokenSold(event);
          break;
        case 'TokenGraduated':
          processedEvent = await this.processTokenGraduated(event);
          break;
        case 'DetailedTransaction':
          processedEvent = await this.processDetailedTransaction(event);
          break;
        default:
          logger.warn('Unknown event type:', { type: event.type });
          return null;
      }

      if (processedEvent) {
        // Update caches
        await this.updateCaches(event);
      }

      return processedEvent;
    } catch (error) {
      logger.error('Error processing event:', { event, error });
      return null;
    }
  }

  /**
   * Process TokenCreated event
   */
  private async processTokenCreated(event: EventData): Promise<ProcessedEvent | null> {
    try {
      const { tokenAddress, name, symbol, creator, timestamp } = event.data;

      // Create token in database
      const token = await this.prisma.token.create({
        data: {
          address: tokenAddress,
          name,
          symbol,
          creatorId: creator, // Use creatorId instead of creator
          creatorAddress: creator,
          metadata: '', // Will be populated later
          soldSupply: '0',
          totalBNB: '0',
          initialPrice: '0',
          totalPlatformFees: '0',
          totalCreatorFees: '0',
          bondingCurveLiquidity: '0',
          liquidityPoolAmount: '0',
          graduated: false,
          exists: true,
          createdAt: new Date(parseInt(timestamp) * 1000)
        }
      });

      // Create initial analytics
      await this.prisma.tokenAnalytics.create({
        data: {
          tokenId: tokenAddress, // Use tokenId instead of tokenAddress
          date: new Date(),
          totalVolume: '0',
          totalTrades: 0,
          totalBuyers: 0,
          totalSellers: 0,
          openPrice: '0',
          closePrice: '0',
          highPrice: '0',
          lowPrice: '0',
          marketCap: '0',
          liquidity: '0'
        }
      });

      logger.info('Token created in database:', { tokenAddress, name, symbol });

      return {
        id: `token-created-${tokenAddress}`,
        type: event.type,
        data: event.data,
        processedAt: new Date(),
        blockNumber: event.data.blockNumber,
        transactionHash: event.data.transactionHash
      };
    } catch (error) {
      logger.error('Error processing TokenCreated event:', { event, error });
      throw error;
    }
  }

  /**
   * Process TokenBought event
   */
  private async processTokenBought(event: EventData): Promise<ProcessedEvent | null> {
    try {
      const { tokenAddress, buyer, bnbAmount, tokenAmount, platformFee, creatorFee, timestamp } = event.data;

      // Update token state
      await this.updateTokenState(tokenAddress, {
        totalBNB: bnbAmount,
        soldSupply: tokenAmount,
        totalPlatformFees: platformFee,
        totalCreatorFees: creatorFee,
        // lastTradeTime: new Date(parseInt(timestamp) * 1000).toISOString() // Commented out - field doesn't exist in schema
      });

      // Create transaction record
      const transaction = await this.prisma.transaction.create({
        data: {
          hash: event.data.transactionHash,
          blockNumber: event.data.blockNumber.toString(),
          blockHash: '0x0000000000000000000000000000000000000000000000000000000000000000', // placeholder
          transactionIndex: 0,
          type: 'BUY', // Use uppercase enum value
          tokenId: tokenAddress,
          tokenAddress,
          traderAddress: buyer,
          tokenAmount,
          bnbAmount,
          price: (parseFloat(bnbAmount) / parseFloat(tokenAmount)).toString(),
          platformFee,
          creatorFee,
          totalFee: (parseFloat(platformFee) + parseFloat(creatorFee)).toString(),
          priceImpact: '0',
          status: 'CONFIRMED', // Use proper enum value
          confirmedAt: new Date(parseInt(timestamp) * 1000)
        }
      });

      // Update analytics - commented out for now
      // await this.updateAnalytics(tokenAddress, {
      //   volume24h: bnbAmount,
      //   transactions: 1,
      //   price: (parseFloat(bnbAmount) / parseFloat(tokenAmount)).toString()
      // });

      // Update or create user portfolio - commented out for now
      // await this.updateUserPortfolio(buyer, tokenAddress, tokenAmount, 'buy');

      logger.info('Token buy processed:', { tokenAddress, buyer, bnbAmount, tokenAmount });

      return {
        id: `token-bought-${event.data.transactionHash}`,
        type: event.type,
        data: event.data,
        processedAt: new Date(),
        blockNumber: event.data.blockNumber,
        transactionHash: event.data.transactionHash
      };
    } catch (error) {
      logger.error('Error processing TokenBought event:', { event, error });
      throw error;
    }
  }

  /**
   * Process TokenSold event
   */
  private async processTokenSold(event: EventData): Promise<ProcessedEvent | null> {
    try {
      const { tokenAddress, seller, tokenAmount, bnbAmount, platformFee, creatorFee, timestamp } = event.data;

      // Update token state (reduce sold supply)
      await this.updateTokenState(tokenAddress, {
        soldSupply: (-parseFloat(tokenAmount)).toString(),
        totalPlatformFees: platformFee,
        totalCreatorFees: creatorFee,
        // lastTradeTime: new Date(parseInt(timestamp) * 1000).toISOString() // Commented out - field doesn't exist in schema
      });

      // Create transaction record
      const transaction = await this.prisma.transaction.create({
        data: {
          hash: event.data.transactionHash,
          blockNumber: event.data.blockNumber.toString(),
          blockHash: '0x0000000000000000000000000000000000000000000000000000000000000000', // placeholder
          transactionIndex: 0,
          type: 'SELL', // Use uppercase enum value
          tokenId: tokenAddress,
          tokenAddress,
          traderAddress: seller,
          tokenAmount,
          bnbAmount,
          price: (parseFloat(bnbAmount) / parseFloat(tokenAmount)).toString(),
          platformFee,
          creatorFee,
          totalFee: (parseFloat(platformFee) + parseFloat(creatorFee)).toString(),
          priceImpact: '0',
          status: 'CONFIRMED', // Use proper enum value
          confirmedAt: new Date(parseInt(timestamp) * 1000)
        }
      });

      // Update analytics - commented out for now
      // await this.updateAnalytics(tokenAddress, {
      //   volume24h: bnbAmount,
      //   transactions: 1,
      //   price: (parseFloat(bnbAmount) / parseFloat(tokenAmount)).toString()
      // });

      // Update or create user portfolio - commented out for now
      // await this.updateUserPortfolio(seller, tokenAddress, tokenAmount, 'sell');

      logger.info('Token sell processed:', { tokenAddress, seller, bnbAmount, tokenAmount });

      return {
        id: `token-sold-${event.data.transactionHash}`,
        type: event.type,
        data: event.data,
        processedAt: new Date(),
        blockNumber: event.data.blockNumber,
        transactionHash: event.data.transactionHash
      };
    } catch (error) {
      logger.error('Error processing TokenSold event:', { event, error });
      throw error;
    }
  }

  /**
   * Process TokenGraduated event
   */
  private async processTokenGraduated(event: EventData): Promise<ProcessedEvent | null> {
    try {
      const { tokenAddress, totalRaised, liquidityPoolAmount, liquidityPool, timestamp } = event.data;

      // Update token graduation status
      await this.prisma.token.update({
        where: { address: tokenAddress },
        data: {
          graduated: true,
          liquidityPoolAmount,
          updatedAt: new Date()
        }
      });

      // Update analytics
      await this.updateAnalytics(tokenAddress, {
        graduated: true
      });

      logger.info('Token graduation processed:', { tokenAddress, totalRaised, liquidityPoolAmount });

      return {
        id: `token-graduated-${tokenAddress}`,
        type: event.type,
        data: event.data,
        processedAt: new Date(),
        blockNumber: event.data.blockNumber,
        transactionHash: event.data.transactionHash
      };
    } catch (error) {
      logger.error('Error processing TokenGraduated event:', { event, error });
      throw error;
    }
  }

  /**
   * Process DetailedTransaction event
   */
  private async processDetailedTransaction(event: EventData): Promise<ProcessedEvent | null> {
    try {
      const { tokenAddress, user, transactionType, bnbAmount, tokenAmount, price, timestamp } = event.data;

      // This is a redundant event for logging purposes
      // We might use it for analytics or additional tracking

      logger.debug('Detailed transaction processed:', {
        tokenAddress,
        user,
        transactionType,
        bnbAmount,
        tokenAmount,
        price
      });

      return {
        id: `detailed-transaction-${event.data.transactionHash}`,
        type: event.type,
        data: event.data,
        processedAt: new Date(),
        blockNumber: event.data.blockNumber,
        transactionHash: event.data.transactionHash
      };
    } catch (error) {
      logger.error('Error processing DetailedTransaction event:', { event, error });
      throw error;
    }
  }

  /**
   * Update token state in database
   */
  private async updateTokenState(tokenAddress: string, updates: Partial<TokenUpdateData>): Promise<void> {
    const updateData: any = { updatedAt: new Date() };

    if (updates.soldSupply !== undefined) {
      updateData.soldSupply = {
        increment: parseFloat(updates.soldSupply)
      };
    }

    if (updates.totalBNB !== undefined) {
      updateData.totalBNB = {
        increment: parseFloat(updates.totalBNB)
      };
    }

    if (updates.totalPlatformFees !== undefined) {
      updateData.totalPlatformFees = {
        increment: parseFloat(updates.totalPlatformFees)
      };
    }

    if (updates.totalCreatorFees !== undefined) {
      updateData.totalCreatorFees = {
        increment: parseFloat(updates.totalCreatorFees)
      };
    }

    // Remove lastTradeTime update - field doesn't exist in schema

    if (updates.graduated !== undefined) {
      updateData.graduated = updates.graduated;
    }

    await this.prisma.token.update({
      where: { address: tokenAddress },
      data: updateData
    });
  }

  /**
   * Update analytics
   */
  private async updateAnalytics(tokenAddress: string, updates: any): Promise<void> {
    const analytics = await this.prisma.analytics.findUnique({
      where: { tokenAddress }
    });

    if (!analytics) {
      // Create analytics if doesn't exist
      await this.prisma.analytics.create({
        data: {
          tokenAddress,
          holders: 0,
          transactions: updates.transactions || 0,
          volume24h: updates.volume24h || '0',
          price: updates.price || '0',
          marketCap: '0',
          createdAt: new Date(),
          updatedAt: new Date(),
          graduated: updates.graduated || false
        }
      });
    } else {
      // Update existing analytics
      const updateData: any = { updatedAt: new Date() };

      if (updates.volume24h !== undefined) {
        updateData.volume24h = {
          increment: parseFloat(updates.volume24h)
        };
      }

      if (updates.transactions !== undefined) {
        updateData.transactions = {
          increment: updates.transactions
        };
      }

      if (updates.price !== undefined) {
        updateData.price = updates.price;
      }

      if (updates.graduated !== undefined) {
        updateData.graduated = updates.graduated;
      }

      await this.prisma.analytics.update({
        where: { tokenAddress },
        data: updateData
      });
    }
  }

  /**
   * Update user portfolio
   */
  private async updateUserPortfolio(
    userAddress: string,
    tokenAddress: string,
    tokenAmount: string,
    type: 'buy' | 'sell'
  ): Promise<void> {
    const portfolio = await this.prisma.portfolio.findFirst({
      where: {
        userAddress,
        tokenAddress
      }
    });

    const amountChange = type === 'buy'
      ? parseFloat(tokenAmount)
      : -parseFloat(tokenAmount);

    if (!portfolio) {
      // Create new portfolio entry
      await this.prisma.portfolio.create({
        data: {
          userAddress,
          tokenAddress,
          tokenAmount: Math.max(0, amountChange).toString(),
          averageBuyPrice: '0', // Will be calculated later
          totalInvested: type === 'buy' ? tokenAmount : '0',
          currentValue: '0',
          pnl: '0',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    } else {
      // Update existing portfolio
      const newAmount = parseFloat(portfolio.tokenAmount) + amountChange;

      if (newAmount <= 0) {
        // Remove portfolio entry if no tokens left
        await this.prisma.portfolio.delete({
          where: { id: portfolio.id }
        });
      } else {
        await this.prisma.portfolio.update({
          where: { id: portfolio.id },
          data: {
            tokenAmount: newAmount.toString(),
            updatedAt: new Date()
          }
        });
      }
    }
  }

  /**
   * Broadcast updates to connected clients
   */
  private async broadcastUpdates(events: ProcessedEvent[]): Promise<void> {
    try {
      // TODO: Implement WebSocket broadcasting when RealtimeService is available
      logger.debug('Events processed:', { eventCount: events.length });

      for (const event of events) {
        logger.debug('Processed event:', {
          type: event.type,
          tokenAddress: event.data.tokenAddress,
          timestamp: event.processedAt
        });
      }
    } catch (error) {
      logger.error('Error broadcasting updates:', error);
    }
  }

  /**
   * Initialize caches
   */
  private async initializeCaches(): Promise<void> {
    try {
      // Cache all active tokens
      const tokens = await this.prisma.token.findMany({
        where: { exists: true, graduated: false }
      });

      for (const token of tokens) {
        this.tokenCache.set(token.address, token);
      }

      // Cache analytics
      const analytics = await this.prisma.analytics.findMany();
      for (const analytic of analytics) {
        this.analyticsCache.set(analytic.tokenAddress, analytic);
      }

      logger.info('Caches initialized:', {
        tokensCached: this.tokenCache.size,
        analyticsCached: this.analyticsCache.size
      });
    } catch (error) {
      logger.error('Error initializing caches:', error);
    }
  }

  /**
   * Update caches
   */
  private async updateCaches(event: EventData): Promise<void> {
    try {
      const tokenAddress = event.data.tokenAddress;

      // Update token cache
      if (tokenAddress && this.tokenCache.has(tokenAddress)) {
        const updatedToken = await this.prisma.token.findUnique({
          where: { address: tokenAddress }
        });

        if (updatedToken) {
          this.tokenCache.set(tokenAddress, updatedToken);
        }
      }

      // Update analytics cache
      if (tokenAddress && this.analyticsCache.has(tokenAddress)) {
        const updatedAnalytics = await this.prisma.analytics.findUnique({
          where: { tokenAddress }
        });

        if (updatedAnalytics) {
          this.analyticsCache.set(tokenAddress, updatedAnalytics);
        }
      }
    } catch (error) {
      logger.error('Error updating caches:', error);
    }
  }

  /**
   * Get cached token data
   */
  getCachedToken(tokenAddress: string): any {
    return this.tokenCache.get(tokenAddress);
  }

  /**
   * Get cached analytics
   */
  getCachedAnalytics(tokenAddress: string): any {
    return this.analyticsCache.get(tokenAddress);
  }

  /**
   * Get processor status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      queueSize: this.eventQueue.length,
      tokensCached: this.tokenCache.size,
      analyticsCached: this.analyticsCache.size,
      config: this.config
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.stop();
    await this.prisma.$disconnect();
    logger.info('EventProcessorService cleaned up');
  }
}

export default EventProcessorService;
export { EventProcessorService, type EventProcessorConfig, type ProcessedEvent, type TokenUpdateData, type TransactionData };