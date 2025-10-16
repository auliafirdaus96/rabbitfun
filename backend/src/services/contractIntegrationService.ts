import dotenv from 'dotenv';
import ContractService from './contractService';
import EventProcessorService from './eventProcessorService';
import RealtimeService from './realtimeService';
import logger from '../utils/logger';

// Load environment variables
dotenv.config();

interface ContractIntegrationConfig {
  // Contract configuration
  rpcUrl: string;
  wsUrl: string;
  launchpadAddress: string;
  privateKey?: string;
  chainId: number;

  // Event processor configuration
  eventProcessor: {
    autoStart: boolean;
    batchSize: number;
    processingInterval: number;
    retryAttempts: number;
    retryDelay: number;
  };

  // Realtime service configuration
  realtime: {
    port: number;
    heartbeatInterval: number;
    maxConnections: number;
    enableCompression: boolean;
  };
}

class ContractIntegrationService {
  private contractService?: ContractService;
  private eventProcessor?: EventProcessorService;
  private realtimeService?: RealtimeService;
  private config: ContractIntegrationConfig;
  private isInitialized: boolean = false;

  constructor(config?: Partial<ContractIntegrationConfig>) {
    this.config = this.mergeConfig(config);
    logger.info('ContractIntegrationService initialized');
  }

  /**
   * Merge provided config with defaults
   */
  private mergeConfig(providedConfig?: Partial<ContractIntegrationConfig>): ContractIntegrationConfig {
    const defaultConfig: ContractIntegrationConfig = {
      // Contract configuration
      rpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/',
      wsUrl: process.env.BSC_WS_URL || 'wss://bsc-ws-node.nariox.org:443',
      launchpadAddress: process.env.LAUNCHPAD_CONTRACT_ADDRESS || '',
      privateKey: process.env.PRIVATE_KEY,
      chainId: parseInt(process.env.BSC_CHAIN_ID || '56'),

      // Event processor configuration
      eventProcessor: {
        autoStart: true,
        batchSize: 10,
        processingInterval: 1000,
        retryAttempts: 3,
        retryDelay: 1000
      },

      // Realtime service configuration
      realtime: {
        port: parseInt(process.env.WS_PORT || '8081'),
        heartbeatInterval: 30000,
        maxConnections: 1000,
        enableCompression: true
      }
    };

    return {
      ...defaultConfig,
      ...providedConfig,
      eventProcessor: { ...defaultConfig.eventProcessor, ...providedConfig?.eventProcessor },
      realtime: { ...defaultConfig.realtime, ...providedConfig?.realtime }
    };
  }

  /**
   * Initialize all services
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('ContractIntegrationService already initialized');
      return;
    }

    try {
      logger.info('Initializing contract integration services...');

      // Validate configuration
      this.validateConfig();

      // Initialize contract service
      this.contractService = new ContractService({
        rpcUrl: this.config.rpcUrl,
        wsUrl: this.config.wsUrl,
        launchpadAddress: this.config.launchpadAddress,
        privateKey: this.config.privateKey,
        chainId: this.config.chainId
      });

      // Initialize event processor
      this.eventProcessor = new EventProcessorService(
        this.contractService,
        this.config.eventProcessor
      );

      // Initialize realtime service
      this.realtimeService = new RealtimeService(
        this.contractService,
        this.eventProcessor,
        this.config.realtime
      );

      // Start services
      await this.realtimeService.start();

      this.isInitialized = true;
      logger.info('Contract integration services initialized successfully');

    } catch (error) {
      logger.error('Error initializing contract integration services:', error);
      throw error;
    }
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!this.config.launchpadAddress) {
      throw new Error('Launchpad contract address is required');
    }

    if (!this.config.rpcUrl) {
      throw new Error('RPC URL is required');
    }

    if (!this.config.wsUrl) {
      throw new Error('WebSocket URL is required');
    }

    logger.info('Configuration validated successfully');
  }

  /**
   * Get contract service instance
   */
  getContractService(): ContractService {
    if (!this.contractService) {
      throw new Error('ContractService not initialized. Call initialize() first.');
    }
    return this.contractService;
  }

  /**
   * Get event processor instance
   */
  getEventProcessor(): EventProcessorService {
    if (!this.eventProcessor) {
      throw new Error('EventProcessorService not initialized. Call initialize() first.');
    }
    return this.eventProcessor;
  }

  /**
   * Get realtime service instance
   */
  getRealtimeService(): RealtimeService {
    if (!this.realtimeService) {
      throw new Error('RealtimeService not initialized. Call initialize() first.');
    }
    return this.realtimeService;
  }

  
  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      config: {
        chainId: this.config.chainId,
        launchpadAddress: this.config.launchpadAddress,
        hasPrivateKey: !!this.config.privateKey,
        rpcUrl: this.config.rpcUrl,
        wsUrl: this.config.wsUrl
      },
      services: {
        contractService: !!this.contractService,
        eventProcessor: this.eventProcessor?.getStatus() || null,
        realtime: this.realtimeService?.getStats() || null
      }
    };
  }

  /**
   * Start listening to a specific token
   */
  async startTokenListening(tokenAddress: string): Promise<void> {
    if (!this.contractService || !this.eventProcessor) {
      throw new Error('Services not initialized');
    }

    try {
      // Start event listener for the token
      await this.contractService.startTokenEventListener(tokenAddress, async (event) => {
        // Process event through event processor
        logger.debug('Token event received:', { tokenAddress, type: event.type });

        // Event will be automatically processed by the main event processor
        // This is just for additional token-specific handling if needed
      });

      logger.info('Started listening to token events:', { tokenAddress });
    } catch (error) {
      logger.error('Error starting token listening:', { tokenAddress, error });
      throw error;
    }
  }

  /**
   * Stop listening to a specific token
   */
  stopTokenListening(tokenAddress: string): void {
    if (!this.contractService) {
      throw new Error('ContractService not initialized');
    }

    this.contractService.stopEventListener(tokenAddress);
    logger.info('Stopped listening to token events:', { tokenAddress });
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: any): number {
    if (!this.realtimeService) {
      throw new Error('RealtimeService not initialized');
    }

    return this.realtimeService.broadcast({
      type: message.type || 'broadcast',
      data: message.data || message,
      timestamp: Date.now()
    });
  }

  /**
   * Broadcast message to token subscribers
   */
  broadcastToToken(tokenAddress: string, message: any): number {
    if (!this.realtimeService) {
      throw new Error('RealtimeService not initialized');
    }

    return this.realtimeService.broadcastToToken(tokenAddress, {
      type: message.type || 'token_update',
      data: message.data || message,
      timestamp: Date.now()
    });
  }

  /**
   * Broadcast message to market subscribers
   */
  broadcastToMarket(message: any): number {
    if (!this.realtimeService) {
      throw new Error('RealtimeService not initialized');
    }

    return this.realtimeService.broadcastToMarket({
      type: message.type || 'market_update',
      data: message.data || message,
      timestamp: Date.now()
    });
  }

  /**
   * Get real-time token information
   */
  async getTokenInfo(tokenAddress: string): Promise<any> {
    if (!this.contractService) {
      throw new Error('ContractService not initialized');
    }

    try {
      // Try to get from cache first
      if (this.eventProcessor) {
        const cached = this.eventProcessor.getCachedToken(tokenAddress);
        if (cached) {
          return cached;
        }
      }

      // Get from contract
      const tokenInfo = await this.contractService.getTokenInfo(tokenAddress);
      return tokenInfo;
    } catch (error) {
      logger.error('Error getting token info:', { tokenAddress, error });
      throw error;
    }
  }

  /**
   * Get market statistics
   */
  async getMarketStats(): Promise<any> {
    if (!this.contractService) {
      throw new Error('ContractService not initialized');
    }

    try {
      const globalState = await this.contractService.getGlobalState();
      const securityStatus = await this.contractService.getSecurityStatus();
      const blockNumber = await this.contractService.getBlockNumber();

      return {
        globalState,
        securityStatus,
        currentBlock: blockNumber,
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error('Error getting market stats:', error);
      throw error;
    }
  }

  /**
   * Perform health check on all services
   */
  async healthCheck(): Promise<any> {
    const health: any = {
      status: 'healthy',
      timestamp: Date.now(),
      services: {}
    };

    try {
      // Check contract service
      if (this.contractService) {
        try {
          const blockNumber = await this.contractService.getBlockNumber();
          health.services.contract = {
            status: 'healthy',
            blockNumber,
            connected: true
          };
        } catch (error) {
          health.services.contract = {
            status: 'unhealthy',
            error: error.message,
            connected: false
          };
          health.status = 'degraded';
        }
      }

      // Check event processor
      if (this.eventProcessor) {
        const processorStatus = this.eventProcessor.getStatus();
        health.services.eventProcessor = {
          status: processorStatus.isRunning ? 'healthy' : 'unhealthy',
          ...processorStatus
        };
        if (!processorStatus.isRunning) {
          health.status = 'degraded';
        }
      }

      // Check realtime service
      if (this.realtimeService) {
        const realtimeStats = this.realtimeService.getStats();
        health.services.realtime = {
          status: 'healthy',
          ...realtimeStats
        };
      }

      
    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
    }

    return health;
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      logger.warn('ContractIntegrationService not initialized');
      return;
    }

    try {
      logger.info('Shutting down contract integration services...');

      // Stop realtime service
      if (this.realtimeService) {
        await this.realtimeService.stop();
      }

      // Stop event processor
      if (this.eventProcessor) {
        await this.eventProcessor.stop();
      }

      // Cleanup contract service
      if (this.contractService) {
        await this.contractService.cleanup();
      }

      this.isInitialized = false;
      logger.info('Contract integration services shut down successfully');

    } catch (error) {
      logger.error('Error shutting down contract integration services:', error);
      throw error;
    }
  }
}

// Create singleton instance
const contractIntegrationService = new ContractIntegrationService();

export default contractIntegrationService;
export { ContractIntegrationService, type ContractIntegrationConfig };