import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import type {
  WebSocketEvent,
  TokenPriceUpdate,
  NewTransactionEvent,
  TokenInfo,
  Transaction
} from '@/types/api';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private eventListeners: Map<string, Set<Function>> = new Map();
  private isConnected = false;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Global connection events
    this.eventListeners.set('connect', new Set());
    this.eventListeners.set('disconnect', new Set());
    this.eventListeners.set('error', new Set());
    this.eventListeners.set('reconnect', new Set());

    // Token-specific events
    this.eventListeners.set('token_price_update', new Set());
    this.eventListeners.set('new_transaction', new Set());
    this.eventListeners.set('token_created', new Set());
    this.eventListeners.set('token_graduated', new Set());

    // Market events
    this.eventListeners.set('market_update', new Set());
    this.eventListeners.set('volume_spike', new Set());
    this.eventListeners.set('price_alert', new Set());

    // User-specific events
    this.eventListeners.set('user_transaction', new Set());
    this.eventListeners.set('portfolio_update', new Set());
  }

  async connect(token?: string): Promise<boolean> {
    try {
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
      const auth = token ? { token } : {};

      this.socket = io(wsUrl, {
        auth,
        transports: ['websocket', 'polling'],
        upgrade: true,
        rememberUpgrade: true,
        timeout: 20000,
        forceNew: true,
      });

      this.setupSocketEvents();

      return new Promise((resolve) => {
        this.socket!.once('connect', () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          this.emit('connect', { connected: true });
          resolve(true);
        });

        this.socket!.once('connect_error', () => {
          this.isConnected = false;
          resolve(false);
        });

        // Connection timeout
        setTimeout(() => {
          if (!this.isConnected) {
            this.socket?.disconnect();
            resolve(false);
          }
        }, 10000);
      });
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.isConnected = false;
      return false;
    }
  }

  private setupSocketEvents(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.emit('connect', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.isConnected = false;
      this.emit('disconnect', { reason });

      // Attempt to reconnect if not disconnected intentionally
      if (reason !== 'io client disconnect') {
        this.attemptReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.emit('error', { error });
    });

    // Reconnection events
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`WebSocket reconnected after ${attemptNumber} attempts`);
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      this.emit('reconnect', { attemptNumber });
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`WebSocket reconnection attempt ${attemptNumber}`);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('WebSocket reconnection failed after maximum attempts');
      this.emit('error', { error: 'Reconnection failed' });
    });

    // Token events
    this.socket.on('token_price_update', (data: TokenPriceUpdate) => {
      this.emit('token_price_update', data);
    });

    this.socket.on('new_transaction', (data: NewTransactionEvent) => {
      this.emit('new_transaction', data);
      this.showTransactionNotification(data);
    });

    this.socket.on('token_created', (data: TokenInfo) => {
      this.emit('token_created', data);
      this.showTokenCreatedNotification(data);
    });

    this.socket.on('token_graduated', (data: { token: TokenInfo; lpPair: string }) => {
      this.emit('token_graduated', data);
      this.showTokenGraduatedNotification(data);
    });

    // Market events
    this.socket.on('market_update', (data: any) => {
      this.emit('market_update', data);
    });

    this.socket.on('volume_spike', (data: { token: TokenInfo; volume: number; percentage: number }) => {
      this.emit('volume_spike', data);
      this.showVolumeSpikeNotification(data);
    });

    this.socket.on('price_alert', (data: { token: TokenInfo; targetPrice: number; currentPrice: number }) => {
      this.emit('price_alert', data);
      this.showPriceAlertNotification(data);
    });

    // User-specific events
    this.socket.on('user_transaction', (data: { transaction: Transaction; userAddress: string }) => {
      this.emit('user_transaction', data);
    });

    this.socket.on('portfolio_update', (data: { userAddress: string; portfolio: any }) => {
      this.emit('portfolio_update', data);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', { error });
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      if (!this.isConnected) {
        this.connect();
      }
    }, delay);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
  }

  // Event subscription methods
  on(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.add(callback);
    }
  }

  off(event: string, callback?: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      if (callback) {
        listeners.delete(callback);
      } else {
        listeners.clear();
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Subscription methods for specific data
  subscribeToToken(tokenAddress: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe_token', { tokenAddress });
    }
  }

  unsubscribeFromToken(tokenAddress: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('unsubscribe_token', { tokenAddress });
    }
  }

  subscribeToUser(address: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe_user', { address });
    }
  }

  unsubscribeFromUser(address: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('unsubscribe_user', { address });
    }
  }

  subscribeToMarket(): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe_market');
    }
  }

  unsubscribeFromMarket(): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('unsubscribe_market');
    }
  }

  // Notification methods
  private showTransactionNotification(data: NewTransactionEvent): void {
    const { type, from, tokenAddress, value } = data;
    const isBuy = type === 'buy';
    const action = isBuy ? 'bought' : 'sold';
    const actionEmoji = isBuy ? '🟢' : '🔴';

    toast.success(
      `${actionEmoji} ${action} ${value} BNB worth of tokens`,
      {
        description: `Transaction by ${from.slice(0, 6)}...${from.slice(-4)}`,
        action: {
          label: 'View Transaction',
          onClick: () => {
            window.open(`https://testnet.bscscan.com/tx/${data.hash}`, '_blank');
          },
        },
      }
    );
  }

  private showTokenCreatedNotification(data: TokenInfo): void {
    toast.success(
      `🎉 New Token Created: ${data.name} (${data.symbol})`,
      {
        description: `Created by ${data.creator.slice(0, 6)}...${data.creator.slice(-4)}`,
        action: {
          label: 'View Token',
          onClick: () => {
            window.open(`/token/${data.tokenAddress}`, '_blank');
          },
        },
      }
    );
  }

  private showTokenGraduatedNotification(data: { token: TokenInfo; lpPair: string }): void {
    toast.info(
      `🚀 ${data.token.name} has graduated to DEX!`,
      {
        description: 'Trading now available on PancakeSwap',
        action: {
          label: 'Trade on DEX',
          onClick: () => {
            window.open(`https://pancakeswap.finance/swap?outputCurrency=${data.token.tokenAddress}`, '_blank');
          },
        },
      }
    );
  }

  private showVolumeSpikeNotification(data: { token: TokenInfo; volume: number; percentage: number }): void {
    const { token, volume, percentage } = data;
    toast.warning(
      `📈 Volume Spike: ${token.name}`,
      {
        description: `Volume increased by ${percentage}% (${volume} BNB)`,
      }
    );
  }

  private showPriceAlertNotification(data: { token: TokenInfo; targetPrice: number; currentPrice: number }): void {
    const { token, targetPrice, currentPrice } = data;
    const isAboveTarget = currentPrice >= targetPrice;
    const action = isAboveTarget ? 'above' : 'below';
    const emoji = isAboveTarget ? '📈' : '📉';

    toast.info(
      `${emoji} ${token.name} Price Alert`,
      {
        description: `Price is ${action} target: ${currentPrice.toFixed(8)} BNB`,
      }
    );
  }

  // Utility methods
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  getSocketId(): string | null {
    return this.socket?.id || null;
  }

  isConnectionLive(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  // Custom event emission (for testing)
  private emitCustomEvent(event: string, data: any): void {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    }
  }

  // Heartbeat for connection monitoring
  startHeartbeat(): void {
    setInterval(() => {
      if (this.socket && this.isConnected) {
        this.socket.emit('ping');
      }
    }, 30000); // Every 30 seconds
  }
}

// Create singleton instance
export const webSocketService = new WebSocketService();

// Export class for testing purposes
export { WebSocketService };

// Export convenience hooks
export const useWebSocket = () => {
  const connect = useCallback(async (token?: string) => {
    return await webSocketService.connect(token);
  }, []);

  const disconnect = useCallback(() => {
    webSocketService.disconnect();
  }, []);

  const subscribeToToken = useCallback((tokenAddress: string) => {
    webSocketService.subscribeToToken(tokenAddress);
  }, []);

  const unsubscribeFromToken = useCallback((tokenAddress: string) => {
    webSocketService.unsubscribeFromToken(tokenAddress);
  }, []);

  const subscribeToUser = useCallback((address: string) => {
    webSocketService.subscribeToUser(address);
  }, []);

  const subscribeToMarket = useCallback(() => {
    webSocketService.subscribeToMarket();
  }, []);

  return {
    connect,
    disconnect,
    subscribeToToken,
    unsubscribeFromToken,
    subscribeToUser,
    subscribeToMarket,
    isConnected: webSocketService.getConnectionStatus(),
    socketId: webSocketService.getSocketId(),
  };
};

export default webSocketService;