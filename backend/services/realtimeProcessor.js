const EventEmitter = require('events');
const { ethers } = require('ethers');
const websocketService = require('./websocketService');
const analyticsController = require('../controllers/analyticsController');
const {
  AhiruLaunchpad,
  AhiruToken
} = require('../contracts');
const config = require('../config');

class RealtimeProcessor extends EventEmitter {
  constructor() {
    super();
    this.providers = new Map();
    this.contracts = new Map();
    this.listeners = new Map();
    this.isRunning = false;
    this.processingQueue = [];
    this.batchSize = 50;
    this.batchTimeout = 5000; // 5 seconds

    this.initialize();
  }

  async initialize() {
    try {
      // Setup BSC provider
      await this.setupProvider('bsc', config.blockchain.bsc.rpcUrl);

      // Setup backup provider
      await this.setupProvider('bsc_backup', config.blockchain.bsc.rpcBackup);

      // Initialize contracts
      await this.initializeContracts();

      // Setup event listeners
      this.setupEventListeners();

      // Start processing queue
      this.startQueueProcessor();

      console.log('✅ Real-time processor initialized');
    } catch (error) {
      console.error('❌ Failed to initialize real-time processor:', error);
    }
  }

  async setupProvider(name, rpcUrl) {
    try {
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl, {
        chainId: config.blockchain.bsc.chainId,
        name: 'bsc'
      });

      // Setup provider event handlers
      provider.on('error', (error) => {
        console.error(`❌ Provider ${name} error:`, error);
        this.handleProviderError(name, error);
      });

      provider.on('block', (blockNumber) => {
        this.handleNewBlock(name, blockNumber);
      });

      this.providers.set(name, provider);
      console.log(`✅ Provider ${name} connected`);
    } catch (error) {
      console.error(`❌ Failed to setup provider ${name}:`, error);
    }
  }

  async initializeContracts() {
    try {
      const provider = this.providers.get('bsc');
      if (!provider) {
        throw new Error('Primary provider not available');
      }

      // Initialize AhiruLaunchpad contract
      if (config.blockchain.contracts.launchpadAddress) {
        const launchpadContract = new ethers.Contract(
          config.blockchain.contracts.launchpadAddress,
          AhiruLaunchpad.abi,
          provider
        );
        this.contracts.set('launchpad', launchpadContract);
      }

      // Initialize AhiruToken contract
      if (config.blockchain.contracts.tokenAddress) {
        const tokenContract = new ethers.Contract(
          config.blockchain.contracts.tokenAddress,
          AhiruToken.abi,
          provider
        );
        this.contracts.set('token', tokenContract);
      }

      console.log('✅ Contracts initialized');
    } catch (error) {
      console.error('❌ Failed to initialize contracts:', error);
    }
  }

  setupEventListeners() {
    try {
      // AhiruLaunchpad events
      const launchpadContract = this.contracts.get('launchpad');
      if (launchpadContract) {
        // Token created event
        launchpadContract.on('TokenCreated', (tokenAddress, creator, name, symbol, event) => {
          this.processEvent('TokenCreated', {
            tokenAddress,
            creator,
            name,
            symbol,
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber
          });
        });

        // Token purchased event
        launchpadContract.on('TokenPurchased', (tokenAddress, buyer, amount, event) => {
          this.processEvent('TokenPurchased', {
            tokenAddress,
            buyer,
            amount: amount.toString(),
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber
          });
        });

        // Token sold event
        launchpadContract.on('TokenSold', (tokenAddress, seller, amount, event) => {
          this.processEvent('TokenSold', {
            tokenAddress,
            seller,
            amount: amount.toString(),
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber
          });
        });

        // Trading enabled event
        launchpadContract.on('TradingEnabled', (tokenAddress, event) => {
          this.processEvent('TradingEnabled', {
            tokenAddress,
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber
          });
        });

        console.log('✅ Launchpad event listeners setup');
      }

      // AhiruToken events
      const tokenContract = this.contracts.get('token');
      if (tokenContract) {
        // Transfer event
        tokenContract.on('Transfer', (from, to, amount, event) => {
          this.processEvent('Transfer', {
            from,
            to,
            amount: amount.toString(),
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber
          });
        });

        console.log('✅ Token event listeners setup');
      }
    } catch (error) {
      console.error('❌ Failed to setup event listeners:', error);
    }
  }

  async processEvent(eventType, data) {
    try {
      const eventData = {
        eventType,
        data,
        timestamp: new Date(),
        processed: false
      };

      // Add to processing queue
      this.processingQueue.push(eventData);

      // Process immediately if queue is getting full
      if (this.processingQueue.length >= this.batchSize) {
        await this.processBatch();
      }

      this.emit('eventReceived', eventData);
    } catch (error) {
      console.error('❌ Error processing event:', error);
    }
  }

  async processBatch() {
    if (this.processingQueue.length === 0) return;

    const batch = this.processingQueue.splice(0, this.batchSize);

    try {
      await Promise.all(batch.map(event => this.processSingleEvent(event)));
    } catch (error) {
      console.error('❌ Error processing batch:', error);
      // Re-add failed events to queue
      this.processingQueue.unshift(...batch);
    }
  }

  async processSingleEvent(event) {
    try {
      const { eventType, data } = event;

      switch (eventType) {
        case 'TokenCreated':
          await this.handleTokenCreated(data);
          break;
        case 'TokenPurchased':
          await this.handleTokenPurchased(data);
          break;
        case 'TokenSold':
          await this.handleTokenSold(data);
          break;
        case 'Transfer':
          await this.handleTransfer(data);
          break;
        case 'TradingEnabled':
          await this.handleTradingEnabled(data);
          break;
      }

      // Update analytics
      await this.updateAnalytics(eventType, data);

      // Notify WebSocket clients
      await this.notifyClients(eventType, data);

      event.processed = true;
      event.processedAt = new Date();

    } catch (error) {
      console.error(`❌ Error processing ${eventType}:`, error);
      event.error = error.message;
    }
  }

  async handleTokenCreated(data) {
    const { tokenAddress, creator, name, symbol } = data;

    // Notify WebSocket clients
    await websocketService.notifyTokenEvent(tokenAddress, 'created', {
      creator,
      name,
      symbol
    });

    // Track analytics event
    await analyticsController.trackEvent({
      body: {
        eventType: 'token_created',
        data: {
          tokenAddress,
          creator,
          name,
          symbol
        }
      }
    }, {
      user: { walletAddress: creator },
      ip: '0.0.0.0',
      get: () => 'Blockchain',
      sessionID: 'blockchain'
    });

    console.log(`🎉 New token created: ${name} (${symbol}) by ${creator}`);
  }

  async handleTokenPurchased(data) {
    const { tokenAddress, buyer, amount } = data;

    // Get current price
    const price = await this.getTokenPrice(tokenAddress);

    // Notify WebSocket clients
    await websocketService.notifyTokenEvent(tokenAddress, 'purchased', {
      buyer,
      amount,
      price,
      value: (parseFloat(amount) * parseFloat(price)).toString()
    });

    // Track analytics event
    await analyticsController.trackEvent({
      body: {
        eventType: 'token_purchased',
        data: {
          tokenAddress,
          buyer,
          amount,
          price,
          value: (parseFloat(amount) * parseFloat(price)).toString()
        }
      }
    }, {
      user: { walletAddress: buyer },
      ip: '0.0.0.0',
      get: () => 'Blockchain',
      sessionID: 'blockchain'
    });

    console.log(`💰 Token purchased: ${amount} of ${tokenAddress} by ${buyer}`);
  }

  async handleTokenSold(data) {
    const { tokenAddress, seller, amount } = data;

    // Get current price
    const price = await this.getTokenPrice(tokenAddress);

    // Notify WebSocket clients
    await websocketService.notifyTokenEvent(tokenAddress, 'sold', {
      seller,
      amount,
      price,
      value: (parseFloat(amount) * parseFloat(price)).toString()
    });

    // Track analytics event
    await analyticsController.trackEvent({
      body: {
        eventType: 'token_sold',
        data: {
          tokenAddress,
          seller,
          amount,
          price,
          value: (parseFloat(amount) * parseFloat(price)).toString()
        }
      }
    }, {
      user: { walletAddress: seller },
      ip: '0.0.0.0',
      get: () => 'Blockchain',
      sessionID: 'blockchain'
    });

    console.log(`💸 Token sold: ${amount} of ${tokenAddress} by ${seller}`);
  }

  async handleTransfer(data) {
    const { from, to, amount } = data;

    // Skip zero address transfers
    if (from === '0x0000000000000000000000000000000000000000' ||
        to === '0x0000000000000000000000000000000000000000') {
      return;
    }

    // Notify WebSocket clients if it's a token we're tracking
    const launchpadContract = this.contracts.get('launchpad');
    if (launchpadContract) {
      try {
        const isTrackedToken = await launchpadContract.isTokenTracked(from);
        if (isTrackedToken) {
          await websocketService.notifyTokenEvent(from, 'transfer', {
            from,
            to,
            amount
          });
        }
      } catch (error) {
        // Ignore errors for untracked tokens
      }
    }
  }

  async handleTradingEnabled(data) {
    const { tokenAddress } = data;

    // Notify WebSocket clients
    await websocketService.notifyTokenEvent(tokenAddress, 'trading_enabled', {});

    // Track analytics event
    await analyticsController.trackEvent({
      body: {
        eventType: 'trading_enabled',
        data: { tokenAddress }
      }
    }, {
      user: {},
      ip: '0.0.0.0',
      get: () => 'Blockchain',
      sessionID: 'blockchain'
    });

    console.log(`🚀 Trading enabled for token: ${tokenAddress}`);
  }

  async getTokenPrice(tokenAddress) {
    try {
      const launchpadContract = this.contracts.get('launchpad');
      if (!launchpadContract) return '0';

      const price = await launchpadContract.getCurrentPrice(tokenAddress);
      return ethers.utils.formatEther(price);
    } catch (error) {
      console.error('❌ Error getting token price:', error);
      return '0';
    }
  }

  async updateAnalytics(eventType, data) {
    try {
      // Update real-time metrics
      switch (eventType) {
        case 'TokenCreated':
          await this.incrementMetric('total_tokens');
          break;
        case 'TokenPurchased':
        case 'TokenSold':
          await this.incrementMetric('total_transactions');
          await this.updateVolume(data.amount);
          break;
      }
    } catch (error) {
      console.error('❌ Error updating analytics:', error);
    }
  }

  async notifyClients(eventType, data) {
    try {
      // Notify based on event type
      switch (eventType) {
        case 'TokenCreated':
        case 'TokenPurchased':
        case 'TokenSold':
        case 'TradingEnabled':
          // Already handled in individual event handlers
          break;
        default:
          // Generic notification
          await websocketService.broadcastToAll({
            type: 'blockchain_event',
            data: {
              eventType,
              data,
              timestamp: new Date()
            }
          });
      }
    } catch (error) {
      console.error('❌ Error notifying clients:', error);
    }
  }

  async handleNewBlock(providerName, blockNumber) {
    try {
      // Process any pending events
      if (this.processingQueue.length > 0) {
        await this.processBatch();
      }

      // Update block metrics
      await this.updateBlockMetrics(providerName, blockNumber);

      // Emit block event
      this.emit('newBlock', { provider: providerName, blockNumber });

    } catch (error) {
      console.error('❌ Error handling new block:', error);
    }
  }

  async handleProviderError(providerName, error) {
    console.error(`❌ Provider ${providerName} error:`, error);

    // Try to switch to backup provider
    if (providerName === 'bsc' && this.providers.has('bsc_backup')) {
      console.log('🔄 Switching to backup provider...');
      await this.switchProvider('bsc_backup');
    }
  }

  async switchProvider(providerName) {
    try {
      const provider = this.providers.get(providerName);
      if (!provider) {
        throw new Error(`Provider ${providerName} not found`);
      }

      // Re-initialize contracts with new provider
      const primaryProvider = this.providers.get('bsc');
      if (providerName === 'bsc_backup' && primaryProvider) {
        // Update contracts to use backup provider
        for (const [name, contract] of this.contracts) {
          const newContract = new ethers.Contract(
            contract.address,
            contract.interface.format(),
            provider
          );
          this.contracts.set(name, newContract);
        }

        // Re-setup event listeners
        this.setupEventListeners();

        console.log(`✅ Switched to backup provider: ${providerName}`);
      }
    } catch (error) {
      console.error('❌ Failed to switch provider:', error);
    }
  }

  startQueueProcessor() {
    setInterval(async () => {
      if (this.processingQueue.length > 0) {
        await this.processBatch();
      }
    }, this.batchTimeout);

    console.log('🔄 Queue processor started');
  }

  async incrementMetric(metric) {
    try {
      await analyticsController.setRealTimeMetric(metric, 'increment', 1);
    } catch (error) {
      console.error('❌ Error incrementing metric:', error);
    }
  }

  async updateVolume(amount) {
    try {
      await analyticsController.setRealTimeMetric('volume', 'add', amount);
    } catch (error) {
      console.error('❌ Error updating volume:', error);
    }
  }

  async updateBlockMetrics(providerName, blockNumber) {
    try {
      // Update blockchain health metrics
      await analyticsController.setRealTimeMetric('blockchain_health', 'set', {
        provider: providerName,
        blockNumber,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('❌ Error updating block metrics:', error);
    }
  }

  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('🚀 Real-time processor started');
  }

  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;

    // Remove all event listeners
    for (const contract of this.contracts.values()) {
      contract.removeAllListeners();
    }

    // Clear processing queue
    this.processingQueue = [];

    console.log('🛑 Real-time processor stopped');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      queueSize: this.processingQueue.length,
      providersConnected: this.providers.size,
      contractsInitialized: this.contracts.size,
      lastActivity: new Date()
    };
  }
}

module.exports = new RealtimeProcessor();