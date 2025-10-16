/**
 * 🔄 Ahiru Launchpad - Synchronization Service
 *
 * Real-time WebSocket synchronization with:
 * - Automatic reconnection
 * - Message queuing
 * - Subscription management
 * - Offline support
 * - Performance optimization
 */

import { useTokenStore } from '@/store/tokenStore';
import { toast } from 'sonner';

// Configuration
const SYNC_CONFIG = {
  RECONNECT_DELAY: 3000,
  MAX_RECONNECT_ATTEMPTS: 10,
  PING_INTERVAL: 30000,
  MESSAGE_QUEUE_SIZE: 100,
  BATCH_SIZE: 10,
  BATCH_DELAY: 100,
};

// Message types
interface SyncMessage {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  retryCount?: number;
}

interface SubscriptionConfig {
  type: 'token' | 'market' | 'user' | 'portfolio';
  id: string;
  filter?: any;
  callback?: (data: any) => void;
}

class SynchronizationService {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private messageQueue: SyncMessage[] = [];
  private subscriptions: Map<string, SubscriptionConfig> = new Map();
  private reconnectAttempts = 0;
  private isConnecting = false;
  private isDestroyed = false;

  // Store reference
  private store = useTokenStore.getState();

  constructor(private wsUrl: string) {
    this.setupEventListeners();
    console.log('SynchronizationService initialized');
  }

  /**
   * Setup browser event listeners
   */
  private setupEventListeners(): void {
    // Handle online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Handle page visibility
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

    // Handle page unload
    window.addEventListener('beforeunload', this.destroy.bind(this));
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.isDestroyed) {
      console.warn('SynchronizationService destroyed, cannot connect');
      return;
    }

    this.isConnecting = true;

    try {
      console.log(`Connecting to WebSocket: ${this.wsUrl}`);
      this.ws = new WebSocket(this.wsUrl);

      this.setupWebSocketEvents();

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        this.ws!.onopen = () => {
          clearTimeout(timeout);
          resolve();
        };

        this.ws!.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };
      });

      console.log('WebSocket connected successfully');
      this.reconnectAttempts = 0;

      // Start ping interval
      this.startPingInterval();

      // Process queued messages
      this.processMessageQueue();

      // Restore subscriptions
      this.restoreSubscriptions();

      // Update store
      this.store.setWebSocketConnected(true);

    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupWebSocketEvents(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connection opened');
      this.isConnecting = false;
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason);
      this.handleDisconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.store.setWebSocketConnected(false);
    };

    this.ws.onpong = () => {
      // Connection is alive
      console.debug('WebSocket pong received');
    };
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      // Handle ping/pong
      if (message.type === 'pong') {
        return;
      }

      // Update store with new data
      this.store.handleWebSocketMessage(message);

      // Call subscription callbacks
      this.notifySubscribers(message);

      console.debug('WebSocket message processed:', message.type);

    } catch (error) {
      console.error('Error processing WebSocket message:', error, data);
    }
  }

  /**
   * Handle WebSocket disconnection
   */
  private handleDisconnect(): void {
    this.store.setWebSocketConnected(false);
    this.isConnecting = false;

    // Clear ping timer
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }

    // Schedule reconnection if not intentionally closed
    if (!this.isDestroyed) {
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= SYNC_CONFIG.MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached');
      toast.error('Connection lost. Please refresh the page.');
      return;
    }

    const delay = SYNC_CONFIG.RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts);
    console.log(`Scheduling reconnection in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPingInterval(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
    }

    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, SYNC_CONFIG.PING_INTERVAL);
  }

  /**
   * Process queued messages
   */
  private processMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    console.log(`Processing ${this.messageQueue.length} queued messages`);

    const batch = this.messageQueue.splice(0, SYNC_CONFIG.BATCH_SIZE);

    batch.forEach((message) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendMessage(message);
      } else {
        // Re-queue if not connected
        this.messageQueue.unshift(message);
      }
    });

    // Process remaining messages
    if (this.messageQueue.length > 0) {
      setTimeout(() => this.processMessageQueue(), SYNC_CONFIG.BATCH_DELAY);
    }
  }

  /**
   * Restore subscriptions after reconnection
   */
  private restoreSubscriptions(): void {
    console.log(`Restoring ${this.subscriptions.size} subscriptions`);

    for (const [key, subscription] of this.subscriptions) {
      this.sendSubscribeMessage(subscription);
    }
  }

  /**
   * Send subscription message
   */
  private sendSubscribeMessage(subscription: SubscriptionConfig): void {
    const message = {
      type: 'subscribe',
      data: {
        type: subscription.type,
        id: subscription.id,
        filter: subscription.filter
      }
    };

    this.sendMessage(message);
  }

  /**
   * Send message to WebSocket
   */
  private sendMessage(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for later
      this.queueMessage(message);
    }
  }

  /**
   * Queue message for later sending
   */
  private queueMessage(message: any): void {
    const syncMessage: SyncMessage = {
      id: `msg_${Date.now()}_${Math.random()}`,
      type: message.type,
      data: message.data,
      timestamp: Date.now()
    };

    // Add to queue (with size limit)
    if (this.messageQueue.length >= SYNC_CONFIG.MESSAGE_QUEUE_SIZE) {
      this.messageQueue.shift(); // Remove oldest message
    }

    this.messageQueue.push(syncMessage);
  }

  /**
   * Notify subscribers of matching messages
   */
  private notifySubscribers(message: any): void {
    for (const [key, subscription] of this.subscriptions) {
      if (this.messageMatchesSubscription(message, subscription)) {
        subscription.callback?.(message);
      }
    }
  }

  /**
   * Check if message matches subscription
   */
  private messageMatchesSubscription(message: any, subscription: SubscriptionConfig): boolean {
    const { type, data } = message;

    // Market subscription
    if (subscription.type === 'market' && type === 'market_update') {
      return true;
    }

    // Token subscription
    if (subscription.type === 'token' && type === 'token_update') {
      return data.tokenAddress === subscription.id;
    }

    // User subscription
    if (subscription.type === 'user' && type === 'portfolio_update') {
      return data.userId === subscription.id;
    }

    // Portfolio subscription
    if (subscription.type === 'portfolio' && type === 'portfolio_update') {
      return true;
    }

    return false;
  }

  /**
   * Subscribe to specific events
   */
  subscribe(config: SubscriptionConfig): () => void {
    const key = `${config.type}:${config.id}`;
    this.subscriptions.set(key, config);

    // Send subscription message if connected
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscribeMessage(config);
    }

    // Update store
    this.store.addSubscription(key);

    // Return unsubscribe function
    return () => {
      this.subscriptions.delete(key);
      this.store.removeSubscription(key);

      // Send unsubscribe message if connected
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendMessage({
          type: 'unsubscribe',
          data: {
            type: config.type,
            id: config.id
          }
        });
      }
    };
  }

  /**
   * Subscribe to token events
   */
  subscribeToToken(tokenAddress: string, callback?: (data: any) => void): () => void {
    return this.subscribe({
      type: 'token',
      id: tokenAddress,
      callback
    });
  }

  /**
   * Subscribe to market events
   */
  subscribeToMarket(callback?: (data: any) => void): () => void {
    return this.subscribe({
      type: 'market',
      id: 'global',
      callback
    });
  }

  /**
   * Subscribe to user events
   */
  subscribeToUser(userId: string, callback?: (data: any) => void): () => void {
    return this.subscribe({
      type: 'user',
      id: userId,
      callback
    });
  }

  /**
   * Send custom message
   */
  send(type: string, data: any): void {
    const message = { type, data, timestamp: Date.now() };
    this.sendMessage(message);
  }

  /**
   * Authenticate connection
   */
  authenticate(token: string, userId?: string): void {
    this.send('authenticate', { token, userId });
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    console.log('Device came online');
    this.store.setOnlineStatus(true);

    // Try to reconnect if not connected
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
    }
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    console.log('Device went offline');
    this.store.setOnlineStatus(false);
  }

  /**
   * Handle page visibility change
   */
  private handleVisibilityChange(): void {
    if (document.hidden) {
      // Page is hidden, reduce activity
      console.log('Page hidden, reducing sync activity');
    } else {
      // Page is visible, resume activity
      console.log('Page visible, resuming sync activity');

      // Check connection status
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.connect();
      }
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      isConnected: this.ws?.readyState === WebSocket.OPEN,
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      subscriptions: this.subscriptions.size,
      queuedMessages: this.messageQueue.length
    };
  }

  /**
   * Clear message queue
   */
  clearQueue(): void {
    this.messageQueue = [];
  }

  /**
   * Destroy service
   */
  destroy(): void {
    if (this.isDestroyed) return;

    console.log('Destroying SynchronizationService');
    this.isDestroyed = true;

    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
    }

    // Close WebSocket
    if (this.ws) {
      this.ws.close(1000, 'Service destroyed');
      this.ws = null;
    }

    // Clear subscriptions
    this.subscriptions.clear();
    this.messageQueue = [];

    // Remove event listeners
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    window.removeEventListener('beforeunload', this.destroy.bind(this));
  }
}

// Create singleton instance
let syncService: SynchronizationService | null = null;

/**
 * Initialize synchronization service
 */
export const initializeSync = (wsUrl?: string): SynchronizationService => {
  if (syncService) {
    syncService.destroy();
  }

  const url = wsUrl || import.meta.env.VITE_WS_URL || 'ws://localhost:8081';
  syncService = new SynchronizationService(url);

  // Auto-connect
  syncService.connect();

  return syncService;
};

/**
 * Get synchronization service instance
 */
export const getSyncService = (): SynchronizationService => {
  if (!syncService) {
    throw new Error('SynchronizationService not initialized. Call initializeSync() first.');
  }
  return syncService;
};

/**
 * Hook for using synchronization service
 */
export const useSyncService = () => {
  return getSyncService();
};

/**
 * Hook for WebSocket connection status
 */
export const useWebSocketStatus = () => {
  const wsState = useTokenStore(state => state.wsState);
  return {
    isConnected: wsState.isConnected,
    reconnectAttempts: wsState.reconnectAttempts,
    lastError: wsState.lastError
  };
};

export default SynchronizationService;