import { Server as WebSocketServer, WebSocket as WebSocketWS } from 'ws';
import { IncomingMessage } from 'http';
import logger from '../utils/logger';
import ContractService from './contractService';
import EventProcessorService from './eventProcessorService';

interface RealtimeConfig {
  port?: number;
  heartbeatInterval?: number;
  maxConnections?: number;
  enableCompression?: boolean;
}

interface ClientConnection {
  id: string;
  ws: WebSocketWS;
  ip: string;
  connectedAt: Date;
  lastPing: Date;
  subscriptions: Set<string>;
  userId?: string;
  isAuthenticated: boolean;
}

interface Subscription {
  type: 'token' | 'market' | 'user' | 'portfolio';
  id: string;
  filter?: any;
}

interface RealtimeMessage {
  type: string;
  data: any;
  timestamp: number;
  clientId?: string;
}

class RealtimeService {
  private wss?: WebSocketServer;
  private clients: Map<string, ClientConnection> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map(); // subscriptionId -> Set of clientIds
  private heartbeatTimer?: NodeJS.Timeout;
  private config: Required<RealtimeConfig>;
  private clientCounter: number = 0;

  // Services
  private contractService: ContractService;
  private eventProcessor: EventProcessorService;

  constructor(
    contractService: ContractService,
    eventProcessor: EventProcessorService,
    config: RealtimeConfig = {}
  ) {
    this.contractService = contractService;
    this.eventProcessor = eventProcessor;

    this.config = {
      port: config.port ?? 8081,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
      maxConnections: config.maxConnections ?? 1000,
      enableCompression: config.enableCompression ?? true
    };

    logger.info('RealtimeService initialized', this.config);
  }

  /**
   * Start the WebSocket server
   */
  async start(): Promise<void> {
    try {
      this.wss = new WebSocketServer({
        port: this.config.port,
        perMessageDeflate: this.config.enableCompression
      });

      this.wss.on('connection', this.handleConnection.bind(this));
      this.wss.on('error', this.handleServerError.bind(this));

      // Start heartbeat
      this.startHeartbeat();

      logger.info(`WebSocket server started on port ${this.config.port}`);
    } catch (error) {
      logger.error('Error starting WebSocket server:', error);
      throw error;
    }
  }

  /**
   * Stop the WebSocket server
   */
  async stop(): Promise<void> {
    try {
      // Stop heartbeat
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
      }

      // Close all client connections
      for (const [clientId, client] of this.clients) {
        client.ws.close(1000, 'Server shutting down');
      }
      this.clients.clear();

      // Close server
      if (this.wss) {
        this.wss.close();
      }

      logger.info('WebSocket server stopped');
    } catch (error) {
      logger.error('Error stopping WebSocket server:', error);
      throw error;
    }
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocketWS, request: IncomingMessage): void {
    // Check connection limit
    if (this.clients.size >= this.config.maxConnections) {
      ws.close(1013, 'Server overload');
      return;
    }

    const clientId = this.generateClientId();
    const ip = request.socket.remoteAddress || 'unknown';

    const client: ClientConnection = {
      id: clientId,
      ws,
      ip,
      connectedAt: new Date(),
      lastPing: new Date(),
      subscriptions: new Set(),
      isAuthenticated: false
    };

    this.clients.set(clientId, client);

    logger.info('Client connected:', { clientId, ip, totalClients: this.clients.size });

    // Setup client event handlers
    ws.on('message', (data) => this.handleMessage(clientId, data));
    ws.on('close', (code, reason) => this.handleDisconnection(clientId, code, reason));
    ws.on('error', (error) => this.handleClientError(clientId, error));
    ws.on('pong', () => this.handlePong(clientId));

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'connected',
      data: {
        clientId,
        serverTime: Date.now(),
        features: {
          tokenSubscriptions: true,
          marketData: true,
          portfolioUpdates: true,
          realtimeTrades: true
        }
      },
      timestamp: Date.now()
    });
  }

  /**
   * Handle WebSocket server errors
   */
  private handleServerError(error: Error): void {
    logger.error('WebSocket server error:', error);
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(clientId: string, code: number, reason: Buffer): void {
    const client = this.clients.get(clientId);
    if (client) {
      // Remove from all subscriptions
      for (const subscriptionId of client.subscriptions) {
        const subscribers = this.subscriptions.get(subscriptionId);
        if (subscribers) {
          subscribers.delete(clientId);
          if (subscribers.size === 0) {
            this.subscriptions.delete(subscriptionId);
          }
        }
      }

      this.clients.delete(clientId);

      logger.info('Client disconnected:', {
        clientId,
        code,
        reason: reason.toString(),
        totalClients: this.clients.size
      });
    }
  }

  /**
   * Handle client errors
   */
  private handleClientError(clientId: string, error: Error): void {
    logger.error('Client error:', { clientId, error });
    this.clients.delete(clientId);
  }

  /**
   * Handle pong message (heartbeat response)
   */
  private handlePong(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastPing = new Date();
    }
  }

  /**
   * Handle incoming messages from clients
   */
  private handleMessage(clientId: string, data: any): void {
    try {
      const client = this.clients.get(clientId);
      if (!client) {
        return;
      }

      const message: RealtimeMessage = JSON.parse(data.toString());
      message.timestamp = Date.now();

      logger.debug('Message received:', { clientId, type: message.type });

      switch (message.type) {
        case 'ping':
          this.sendToClient(clientId, {
            type: 'pong',
            data: { timestamp: message.timestamp },
            timestamp: Date.now()
          });
          break;

        case 'subscribe':
          this.handleSubscription(clientId, message.data);
          break;

        case 'unsubscribe':
          this.handleUnsubscription(clientId, message.data);
          break;

        case 'authenticate':
          this.handleAuthentication(clientId, message.data);
          break;

        case 'get_token_info':
          this.handleTokenInfoRequest(clientId, message.data);
          break;

        case 'get_market_data':
          this.handleMarketDataRequest(clientId, message.data);
          break;

        default:
          logger.warn('Unknown message type:', { clientId, type: message.type });
          this.sendToClient(clientId, {
            type: 'error',
            data: { message: `Unknown message type: ${message.type}` },
            timestamp: Date.now()
          });
      }
    } catch (error) {
      logger.error('Error handling message:', { clientId, error });
      this.sendToClient(clientId, {
        type: 'error',
        data: { message: 'Invalid message format' },
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle subscription requests
   */
  private handleSubscription(clientId: string, data: any): void {
    try {
      const client = this.clients.get(clientId);
      if (!client) {
        return;
      }

      const { type, id, filter } = data as Subscription;
      const subscriptionId = `${type}:${id}`;

      // Add to client subscriptions
      client.subscriptions.add(subscriptionId);

      // Add to global subscriptions
      if (!this.subscriptions.has(subscriptionId)) {
        this.subscriptions.set(subscriptionId, new Set());
      }
      this.subscriptions.get(subscriptionId)!.add(clientId);

      // Start token-specific event listener if needed
      if (type === 'token') {
        this.contractService.startTokenEventListener(id, (event) => {
          this.broadcastToSubscription(subscriptionId, {
            type: 'token_event',
            data: event,
            timestamp: Date.now()
          });
        }).catch(error => {
          logger.error('Error starting token event listener:', { tokenId: id, error });
        });
      }

      // Send confirmation
      this.sendToClient(clientId, {
        type: 'subscribed',
        data: { subscriptionId, type, id },
        timestamp: Date.now()
      });

      logger.debug('Client subscribed:', { clientId, subscriptionId });

    } catch (error) {
      logger.error('Error handling subscription:', { clientId, error });
      this.sendToClient(clientId, {
        type: 'error',
        data: { message: 'Subscription failed' },
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle unsubscription requests
   */
  private handleUnsubscription(clientId: string, data: any): void {
    try {
      const client = this.clients.get(clientId);
      if (!client) {
        return;
      }

      const { type, id } = data as Subscription;
      const subscriptionId = `${type}:${id}`;

      // Remove from client subscriptions
      client.subscriptions.delete(subscriptionId);

      // Remove from global subscriptions
      const subscribers = this.subscriptions.get(subscriptionId);
      if (subscribers) {
        subscribers.delete(clientId);
        if (subscribers.size === 0) {
          this.subscriptions.delete(subscriptionId);
          // Stop token-specific event listener
          if (type === 'token') {
            this.contractService.stopEventListener(id);
          }
        }
      }

      // Send confirmation
      this.sendToClient(clientId, {
        type: 'unsubscribed',
        data: { subscriptionId, type, id },
        timestamp: Date.now()
      });

      logger.debug('Client unsubscribed:', { clientId, subscriptionId });

    } catch (error) {
      logger.error('Error handling unsubscription:', { clientId, error });
    }
  }

  /**
   * Handle authentication requests
   */
  private handleAuthentication(clientId: string, data: any): void {
    try {
      const client = this.clients.get(clientId);
      if (!client) {
        return;
      }

      const { token, userId } = data;

      // TODO: Implement proper JWT authentication
      // For now, just mark as authenticated if token is provided
      if (token) {
        client.isAuthenticated = true;
        client.userId = userId;

        this.sendToClient(clientId, {
          type: 'authenticated',
          data: { userId },
          timestamp: Date.now()
        });

        logger.info('Client authenticated:', { clientId, userId });
      } else {
        this.sendToClient(clientId, {
          type: 'authentication_failed',
          data: { message: 'Invalid token' },
          timestamp: Date.now()
        });
      }
    } catch (error) {
      logger.error('Error handling authentication:', { clientId, error });
    }
  }

  /**
   * Handle token info requests
   */
  private async handleTokenInfoRequest(clientId: string, data: any): Promise<void> {
    try {
      const { tokenAddress } = data;

      // Get from cache or contract
      let tokenInfo = this.eventProcessor.getCachedToken(tokenAddress);

      if (!tokenInfo) {
        tokenInfo = await this.contractService.getTokenInfo(tokenAddress);
      }

      this.sendToClient(clientId, {
        type: 'token_info',
        data: { tokenAddress, tokenInfo },
        timestamp: Date.now()
      });

    } catch (error) {
      logger.error('Error handling token info request:', { clientId, tokenAddress: data.tokenAddress, error });
      this.sendToClient(clientId, {
        type: 'error',
        data: { message: 'Failed to get token info' },
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle market data requests
   */
  private async handleMarketDataRequest(clientId: string, data: any): Promise<void> {
    try {
      const { type } = data;

      let marketData: any = {};

      switch (type) {
        case 'global_stats':
          marketData = await this.contractService.getGlobalState();
          break;
        case 'trending_tokens':
          // TODO: Implement trending tokens logic
          marketData = { tokens: [] };
          break;
        case 'recent_transactions':
          // TODO: Implement recent transactions logic
          marketData = { transactions: [] };
          break;
        default:
          throw new Error(`Unknown market data type: ${type}`);
      }

      this.sendToClient(clientId, {
        type: 'market_data',
        data: { type, data: marketData },
        timestamp: Date.now()
      });

    } catch (error) {
      logger.error('Error handling market data request:', { clientId, error });
      this.sendToClient(clientId, {
        type: 'error',
        data: { message: 'Failed to get market data' },
        timestamp: Date.now()
      });
    }
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId: string, message: RealtimeMessage): boolean {
    try {
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === client.ws.OPEN) {
        client.ws.send(JSON.stringify(message));
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error sending message to client:', { clientId, error });
      return false;
    }
  }

  /**
   * Broadcast message to all clients
   */
  broadcast(message: RealtimeMessage): number {
    let sentCount = 0;
    for (const [clientId, client] of this.clients) {
      if (client.ws.readyState === client.ws.OPEN) {
        if (this.sendToClient(clientId, message)) {
          sentCount++;
        }
      }
    }
    return sentCount;
  }

  /**
   * Broadcast message to specific subscription
   */
  broadcastToSubscription(subscriptionId: string, message: RealtimeMessage): number {
    const subscribers = this.subscriptions.get(subscriptionId);
    if (!subscribers) {
      return 0;
    }

    let sentCount = 0;
    for (const clientId of subscribers) {
      if (this.sendToClient(clientId, message)) {
        sentCount++;
      }
    }
    return sentCount;
  }

  /**
   * Broadcast to token subscribers
   */
  broadcastToToken(tokenAddress: string, message: RealtimeMessage): number {
    return this.broadcastToSubscription(`token:${tokenAddress}`, message);
  }

  /**
   * Broadcast to market subscribers
   */
  broadcastToMarket(message: RealtimeMessage): number {
    return this.broadcastToSubscription('market:global', message);
  }

  /**
   * Broadcast to user subscribers
   */
  broadcastToUser(userId: string, message: RealtimeMessage): number {
    let sentCount = 0;
    for (const [clientId, client] of this.clients) {
      if (client.userId === userId && client.ws.readyState === client.ws.OPEN) {
        if (this.sendToClient(clientId, message)) {
          sentCount++;
        }
      }
    }
    return sentCount;
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const deadClients: string[] = [];

      for (const [clientId, client] of this.clients) {
        const timeSinceLastPing = now - client.lastPing.getTime();

        if (timeSinceLastPing > this.config.heartbeatInterval * 2) {
          // Client hasn't responded to ping, consider dead
          deadClients.push(clientId);
        } else if (client.ws.readyState === client.ws.OPEN) {
          // Send ping
          try {
            client.ws.ping();
          } catch (error) {
            deadClients.push(clientId);
          }
        } else {
          // Connection is closed
          deadClients.push(clientId);
        }
      }

      // Clean up dead clients
      for (const clientId of deadClients) {
        const client = this.clients.get(clientId);
        if (client) {
          try {
            client.ws.close(1000, 'Heartbeat timeout');
          } catch (error) {
            // Ignore errors during cleanup
          }
          this.clients.delete(clientId);
        }
      }

      if (deadClients.length > 0) {
        logger.info('Cleaned up dead clients:', { count: deadClients.length });
      }

    }, this.config.heartbeatInterval);
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client_${++this.clientCounter}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get service statistics
   */
  getStats() {
    const subscriptionStats: Record<string, number> = {};
    for (const [subscriptionId, subscribers] of this.subscriptions) {
      subscriptionStats[subscriptionId] = subscribers.size;
    }

    return {
      totalClients: this.clients.size,
      authenticatedClients: Array.from(this.clients.values()).filter(c => c.isAuthenticated).length,
      totalSubscriptions: this.subscriptions.size,
      subscriptionStats,
      uptime: process.uptime(),
      config: this.config
    };
  }

  /**
   * Get connected clients
   */
  getConnectedClients() {
    return Array.from(this.clients.values()).map(client => ({
      id: client.id,
      ip: client.ip,
      connectedAt: client.connectedAt,
      lastPing: client.lastPing,
      isAuthenticated: client.isAuthenticated,
      userId: client.userId,
      subscriptionCount: client.subscriptions.size
    }));
  }
}

export default RealtimeService;
export { RealtimeService, type RealtimeConfig, type ClientConnection, type Subscription, type RealtimeMessage };