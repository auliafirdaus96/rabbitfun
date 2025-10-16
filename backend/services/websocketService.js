const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const redis = require('redis');
const analyticsController = require('../controllers/analyticsController');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map();
    this.rooms = new Map();
    this.redisClient = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD
    });
    this.redisSubscribe = this.redisClient.duplicate();
    this.redisPublish = this.redisClient.duplicate();

    this.initRedis();
  }

  async initRedis() {
    try {
      await Promise.all([
        this.redisClient.connect(),
        this.redisSubscribe.connect(),
        this.redisPublish.connect()
      ]);

      // Setup Redis pub/sub for multi-server support
      await this.redisSubscribe.subscribe('websocket:broadcast', (message) => {
        this.broadcastToClients(JSON.parse(message));
      });

      console.log('✅ Redis initialized for WebSocket service');
    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error);
    }
  }

  initialize(server) {
    this.wss = new WebSocket.Server({
      server,
      path: '/ws',
      verifyClient: this.verifyClient.bind(this)
    });

    this.wss.on('connection', this.handleConnection.bind(this));

    // Setup heartbeat
    this.setupHeartbeat();

    console.log('🔌 WebSocket server initialized');

    return this.wss;
  }

  async verifyClient(info) {
    try {
      const { origin, req } = info;

      // Verify origin
      const allowedOrigins = [
        'https://ahiru-launchpad.com',
        'https://www.ahiru-launchpad.com',
        'http://localhost:3000',
        'http://localhost:5173'
      ];

      if (!allowedOrigins.includes(origin)) {
        console.warn(`⚠️ Rejected connection from origin: ${origin}`);
        return false;
      }

      // Verify token if provided
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
      }

      return true;
    } catch (error) {
      console.warn('⚠️ WebSocket client verification failed:', error.message);
      return false;
    }
  }

  handleConnection(ws, req) {
    const clientId = this.generateClientId();
    const user = req.user;

    // Store client info
    const clientInfo = {
      id: clientId,
      ws,
      user,
      rooms: new Set(),
      lastPing: Date.now(),
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      connectedAt: new Date()
    };

    this.clients.set(clientId, clientInfo);

    // Setup event handlers
    ws.on('message', (message) => this.handleMessage(clientId, message));
    ws.on('close', () => this.handleDisconnect(clientId));
    ws.on('error', (error) => this.handleError(clientId, error));
    ws.on('pong', () => this.handlePong(clientId));

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'connected',
      data: {
        clientId,
        timestamp: new Date(),
        user: user ? { id: user.id, address: user.walletAddress } : null
      }
    });

    // Track connection event
    analyticsController.trackEvent({
      body: {
        eventType: 'websocket_connected',
        data: { clientId, userId: user?.id },
        metadata: { ip: req.ip, userAgent: req.headers['user-agent'] }
      }
    }, {
      user: user || {},
      ip: req.ip,
      get: (header) => req.headers[header],
      sessionID: clientId
    }).catch(console.error);

    console.log(`🔗 Client connected: ${clientId} (User: ${user?.id || 'anonymous'})`);
  }

  async handleMessage(clientId, message) {
    try {
      const client = this.clients.get(clientId);
      if (!client) return;

      const data = JSON.parse(message);
      const { type, payload } = data;

      switch (type) {
        case 'ping':
          this.sendToClient(clientId, { type: 'pong' });
          break;

        case 'subscribe':
          await this.handleSubscribe(clientId, payload);
          break;

        case 'unsubscribe':
          await this.handleUnsubscribe(clientId, payload);
          break;

        case 'join_room':
          await this.handleJoinRoom(clientId, payload);
          break;

        case 'leave_room':
          await this.handleLeaveRoom(clientId, payload);
          break;

        case 'track_event':
          await this.handleTrackEvent(clientId, payload);
          break;

        case 'get_realtime_data':
          await this.handleGetRealtimeData(clientId, payload);
          break;

        default:
          console.warn(`⚠️ Unknown message type: ${type}`);
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
      this.sendToClient(clientId, {
        type: 'error',
        data: { message: 'Failed to process message' }
      });
    }
  }

  async handleSubscribe(clientId, payload) {
    const { channels } = payload;
    const client = this.clients.get(clientId);

    if (!client || !Array.isArray(channels)) return;

    for (const channel of channels) {
      if (this.isValidChannel(channel)) {
        client.rooms.add(channel);

        // Join Redis channel for real-time updates
        const redisChannel = `channel:${channel}`;
        await this.redisSubscribe.subscribe(redisChannel);

        this.sendToClient(clientId, {
          type: 'subscribed',
          data: { channel }
        });
      }
    }
  }

  async handleUnsubscribe(clientId, payload) {
    const { channels } = payload;
    const client = this.clients.get(clientId);

    if (!client || !Array.isArray(channels)) return;

    for (const channel of channels) {
      client.rooms.delete(channel);
      this.sendToClient(clientId, {
        type: 'unsubscribed',
        data: { channel }
      });
    }
  }

  async handleJoinRoom(clientId, payload) {
    const { room } = payload;
    const client = this.clients.get(clientId);

    if (!client || !room) return;

    // Add client to room
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room).add(clientId);
    client.rooms.add(room);

    // Notify others in room
    this.broadcastToRoom(room, {
      type: 'user_joined',
      data: {
        userId: client.user?.id,
        timestamp: new Date()
      }
    }, clientId);

    this.sendToClient(clientId, {
      type: 'room_joined',
      data: { room, userCount: this.rooms.get(room).size }
    });
  }

  async handleLeaveRoom(clientId, payload) {
    const { room } = payload;
    const client = this.clients.get(clientId);

    if (!client || !room) return;

    // Remove client from room
    if (this.rooms.has(room)) {
      this.rooms.get(room).delete(clientId);
      if (this.rooms.get(room).size === 0) {
        this.rooms.delete(room);
      }
    }
    client.rooms.delete(room);

    // Notify others in room
    this.broadcastToRoom(room, {
      type: 'user_left',
      data: {
        userId: client.user?.id,
        timestamp: new Date()
      }
    }, clientId);

    this.sendToClient(clientId, {
      type: 'room_left',
      data: { room }
    });
  }

  async handleTrackEvent(clientId, payload) {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      await analyticsController.trackEvent({
        body: {
          eventType: payload.eventType,
          data: payload.data,
          metadata: { ...payload.metadata, source: 'websocket' }
        }
      }, {
        user: client.user || {},
        ip: client.ip,
        get: (header) => client.userAgent,
        sessionID: clientId
      });

      this.sendToClient(clientId, {
        type: 'event_tracked',
        data: { eventId: payload.eventId, timestamp: new Date() }
      });
    } catch (error) {
      this.sendToClient(clientId, {
        type: 'error',
        data: { message: 'Failed to track event' }
      });
    }
  }

  async handleGetRealtimeData(clientId, payload) {
    try {
      const { dataType } = payload;
      let data;

      switch (dataType) {
        case 'dashboard':
          data = await this.getDashboardData();
          break;
        case 'token_analytics':
          data = await this.getTokenAnalytics(payload.tokenAddress);
          break;
        case 'platform_stats':
          data = await this.getPlatformStats();
          break;
        default:
          data = await this.getRealtimeMetrics();
      }

      this.sendToClient(clientId, {
        type: 'realtime_data',
        data: { dataType, data, timestamp: new Date() }
      });
    } catch (error) {
      this.sendToClient(clientId, {
        type: 'error',
        data: { message: 'Failed to get real-time data' }
      });
    }
  }

  handleDisconnect(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove client from all rooms
    for (const room of client.rooms) {
      if (this.rooms.has(room)) {
        this.rooms.get(room).delete(clientId);
        if (this.rooms.get(room).size === 0) {
          this.rooms.delete(room);
        }
      }
    }

    // Remove client
    this.clients.delete(clientId);

    // Track disconnection event
    if (client.user) {
      analyticsController.trackEvent({
        body: {
          eventType: 'websocket_disconnected',
          data: { clientId, userId: client.user.id },
          metadata: { duration: Date.now() - client.connectedAt.getTime() }
        }
      }, {
        user: client.user,
        ip: client.ip,
        get: () => client.userAgent,
        sessionID: clientId
      }).catch(console.error);
    }

    console.log(`🔌 Client disconnected: ${clientId}`);
  }

  handleError(clientId, error) {
    console.error(`❌ WebSocket error for client ${clientId}:`, error);
    this.handleDisconnect(clientId);
  }

  handlePong(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastPing = Date.now();
    }
  }

  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  broadcastToAll(message) {
    for (const [clientId, client] of this.clients) {
      this.sendToClient(clientId, message);
    }
  }

  broadcastToRoom(room, message, excludeClientId = null) {
    if (!this.rooms.has(room)) return;

    for (const clientId of this.rooms.get(room)) {
      if (clientId !== excludeClientId) {
        this.sendToClient(clientId, message);
      }
    }
  }

  async broadcastToClients(message) {
    // Use Redis pub/sub for multi-server broadcasting
    await this.redisPublish.publish('websocket:broadcast', JSON.stringify(message));
  }

  // Public methods for external use
  async notifyTokenEvent(tokenAddress, eventType, data) {
    const message = {
      type: 'token_event',
      data: {
        tokenAddress,
        eventType,
        data,
        timestamp: new Date()
      }
    };

    // Send to token-specific room
    this.broadcastToRoom(`token:${tokenAddress}`, message);

    // Send to general token events room
    this.broadcastToRoom('token_events', message);
  }

  async notifyTransaction(transactionHash, status, data) {
    const message = {
      type: 'transaction_update',
      data: {
        hash: transactionHash,
        status,
        data,
        timestamp: new Date()
      }
    };

    this.broadcastToAll(message);
  }

  async notifyPriceUpdate(tokenAddress, newPrice, change24h) {
    const message = {
      type: 'price_update',
      data: {
        tokenAddress,
        price: newPrice,
        change24h,
        timestamp: new Date()
      }
    };

    this.broadcastToRoom(`token:${tokenAddress}`, message);
    this.broadcastToRoom('price_updates', message);
  }

  setupHeartbeat() {
    setInterval(() => {
      const now = Date.now();
      const timeout = 60000; // 60 seconds

      for (const [clientId, client] of this.clients) {
        if (now - client.lastPing > timeout) {
          console.log(`💔 Client timeout: ${clientId}`);
          client.ws.terminate();
          this.handleDisconnect(clientId);
        } else if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.ping();
        }
      }
    }, 30000); // Check every 30 seconds
  }

  isValidChannel(channel) {
    const validChannels = [
      'token_events',
      'price_updates',
      'transactions',
      'platform_stats',
      'user_activity',
      'system_notifications'
    ];

    // Also accept token-specific channels
    if (channel.startsWith('token:')) {
      return true;
    }

    return validChannels.includes(channel);
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getDashboardData() {
    // Implementation for dashboard data
    return {
      activeUsers: this.clients.size,
      totalRooms: this.rooms.size,
      timestamp: new Date()
    };
  }

  async getTokenAnalytics(tokenAddress) {
    // Implementation for token analytics
    return {
      tokenAddress,
      currentPrice: '0',
      volume24h: '0',
      change24h: 0
    };
  }

  async getPlatformStats() {
    return {
      activeConnections: this.clients.size,
      totalRooms: this.rooms.size,
      uptime: process.uptime(),
      timestamp: new Date()
    };
  }

  async getRealtimeMetrics() {
    return {
      activeUsers: this.clients.size,
      activeRooms: this.rooms.size,
      timestamp: new Date()
    };
  }

  // Statistics
  getStats() {
    return {
      connectedClients: this.clients.size,
      activeRooms: this.rooms.size,
      totalSubscriptions: Array.from(this.clients.values())
        .reduce((sum, client) => sum + client.rooms.size, 0)
    };
  }
}

module.exports = new WebSocketService();