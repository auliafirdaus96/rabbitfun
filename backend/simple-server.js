const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

// Import database
let db = null;
let dbInitialized = false;

async function initializeDatabase() {
  if (!dbInitialized) {
    const database = require('./src/database');
    db = database.db;
    dbInitialized = true;
    console.log('📀 Database initialized successfully');
  }
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:8080', 'http://localhost:3000', 'http://localhost:8081', 'http://localhost:8082', 'http://localhost:8083'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = 3001;

// Basic middleware
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:3000', 'http://localhost:8081', 'http://localhost:8082', 'http://localhost:8083'],
  credentials: true
}));
app.use(express.json());
app.use(express.static('.'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Database-backed API endpoints
app.get('/api/tokens', async (req, res) => {
  try {
    // Ensure database is initialized
    if (!dbInitialized) {
      await initializeDatabase();
    }

    const tokens = await db.getTokens();

    // Transform database tokens to API format
    const apiTokens = tokens.map(token => ({
      address: token.address,
      name: token.name,
      symbol: token.symbol,
      description: token.description,
      logoUrl: token.logo_url,
      website: token.website,
      twitter: token.twitter,
      telegram: token.telegram,
      creatorAddress: token.creator_address,
      totalSupply: token.total_supply,
      currentPrice: token.current_price.toString(),
      priceChange24h: token.price_change_24h.toString(),
      volume24h: token.volume_24h.toString(),
      holdersCount: token.holders_count,
      isGraduated: token.is_graduated,
      marketCap: token.market_cap?.toString() || '0',
      bondingCurveProgress: token.bonding_curve_progress || 0,
      createdAt: token.created_at
    }));

    res.json({
      tokens: apiTokens,
      pagination: {
        page: 1,
        limit: apiTokens.length,
        total: apiTokens.length
      }
    });
  } catch (error) {
    console.error('Error fetching tokens:', error);
    res.status(500).json({
      error: 'Failed to fetch tokens',
      message: error.message
    });
  }
});

// Get token by address
app.get('/api/tokens/:address', async (req, res) => {
  try {
    // Ensure database is initialized
    if (!dbInitialized) {
      await initializeDatabase();
    }

    const { address } = req.params;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Token address is required'
      });
    }

    const token = await db.getTokenByAddress(address);

    if (!token) {
      return res.status(404).json({
        success: false,
        error: 'Token not found'
      });
    }

    // Transform database token to API format
    const apiToken = {
      address: token.address,
      name: token.name,
      symbol: token.symbol,
      description: token.description,
      logoUrl: token.logo_url,
      website: token.website,
      twitter: token.twitter,
      telegram: token.telegram,
      creatorAddress: token.creator_address,
      totalSupply: token.total_supply,
      currentPrice: token.current_price.toString(),
      priceChange24h: token.price_change_24h.toString(),
      volume24h: token.volume_24h.toString(),
      holdersCount: token.holders_count,
      isGraduated: token.is_graduated,
      marketCap: token.market_cap?.toString() || '0',
      bondingCurveProgress: token.bonding_curve_progress || 0,
      createdAt: token.created_at
    };

    res.json({
      success: true,
      data: apiToken
    });

  } catch (error) {
    console.error('Error fetching token:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.post('/api/tokens', async (req, res) => {
  try {
    // Ensure database is initialized
    if (!dbInitialized) {
      await initializeDatabase();
    }

    const { name, symbol, description, logoUrl, website, twitter, telegram, creatorAddress } = req.body;

    const tokenData = {
      address: '0x' + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      name: name || 'New Token',
      symbol: symbol || 'NEW',
      description: description || 'Created via Ahiru Launchpad',
      logo_url: logoUrl || '',
      website: website || '',
      twitter: twitter || '',
      telegram: telegram || '',
      creator_address: creatorAddress || '0xcreator',
      total_supply: '1000000000000000000000000000',
      current_price: 0.00000001, // Initial price from smart contract
      price_change_24h: 0,
      volume_24h: 0,
      market_cap: 0,
      holders_count: 1,
      liquidity_pool: 0,
      bonding_curve_progress: 0, // New tokens start at 0%
      is_graduated: false
    };

    const newToken = await db.createToken(tokenData);

    // Transform to API format
    const apiToken = {
      address: newToken.address,
      name: newToken.name,
      symbol: newToken.symbol,
      description: newToken.description,
      logoUrl: newToken.logo_url,
      website: newToken.website,
      twitter: newToken.twitter,
      telegram: newToken.telegram,
      creatorAddress: newToken.creator_address,
      totalSupply: newToken.total_supply,
      currentPrice: newToken.current_price.toString(),
      priceChange24h: newToken.price_change_24h.toString(),
      volume24h: newToken.volume_24h.toString(),
      holdersCount: newToken.holders_count,
      isGraduated: newToken.is_graduated,
      marketCap: newToken.market_cap?.toString() || '0',
      bondingCurveProgress: newToken.bonding_curve_progress || 0,
      createdAt: newToken.created_at
    };

    res.status(201).json({
      success: true,
      data: apiToken
    });
  } catch (error) {
    console.error('Error creating token:', error);
    res.status(500).json({
      error: 'Failed to create token',
      message: error.message
    });
  }
});

app.get('/api/analytics/platform', (req, res) => {
  res.json({
    totalTokens: 1,
    totalVolume: '10.5',
    totalUsers: 25,
    activeUsers: 5
  });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`🔌 WebSocket client connected: ${socket.id}`);

  // Handle token subscriptions
  socket.on('subscribe_token', (data) => {
    const { tokenAddress } = data;
    socket.join(`token:${tokenAddress}`);
    console.log(`📡 Client ${socket.id} subscribed to token: ${tokenAddress}`);
  });

  socket.on('unsubscribe_token', (data) => {
    const { tokenAddress } = data;
    socket.leave(`token:${tokenAddress}`);
    console.log(`📡 Client ${socket.id} unsubscribed from token: ${tokenAddress}`);
  });

  // Handle user subscriptions
  socket.on('subscribe_user', (data) => {
    const { address } = data;
    socket.join(`user:${address}`);
    console.log(`📡 Client ${socket.id} subscribed to user: ${address}`);
  });

  socket.on('unsubscribe_user', (data) => {
    const { address } = data;
    socket.leave(`user:${address}`);
    console.log(`📡 Client ${socket.id} unsubscribed from user: ${address}`);
  });

  // Handle market subscriptions
  socket.on('subscribe_market', () => {
    socket.join('market');
    console.log(`📡 Client ${socket.id} subscribed to market updates`);
  });

  socket.on('unsubscribe_market', () => {
    socket.leave('market');
    console.log(`📡 Client ${socket.id} unsubscribed from market updates`);
  });

  // Handle ping for heartbeat
  socket.on('ping', () => {
    socket.emit('pong');
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`🔌 WebSocket client disconnected: ${socket.id}, reason: ${reason}`);
  });
});

// Simulate real-time events
setInterval(() => {
  // Simulate price updates
  const priceUpdate = {
    tokenAddress: '0x1e46c31cf3017',
    price: (0.00000001 + Math.random() * 0.00000001).toFixed(8),
    priceChange: (Math.random() - 0.5) * 10,
    timestamp: new Date().toISOString()
  };

  io.to('token:0x1e46c31cf3017').emit('token_price_update', priceUpdate);

  // Simulate new transactions
  if (Math.random() > 0.7) { // 30% chance of transaction
    const transaction = {
      type: Math.random() > 0.5 ? 'buy' : 'sell',
      from: `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 4)}`,
      tokenAddress: '0x1e46c31cf3017',
      value: (Math.random() * 5).toFixed(4),
      hash: `0x${Math.random().toString(16).substr(2, 64)}`,
      timestamp: new Date().toISOString()
    };

    io.emit('new_transaction', transaction);
  }

  // Simulate market updates
  if (Math.random() > 0.8) { // 20% chance of market update
    const marketUpdate = {
      totalVolume24h: Math.random() * 100000,
      activeTokens: Math.floor(Math.random() * 100),
      timestamp: new Date().toISOString()
    };

    io.to('market').emit('market_update', marketUpdate);
  }
}, 5000); // Every 5 seconds

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Ahiru Launchpad Backend API',
    version: '1.0.0',
    status: 'Running',
    timestamp: new Date().toISOString(),
    websocket: 'Enabled'
  });
});

// Start server
server.listen(PORT, async () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API endpoints: http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket server enabled`);

  // Initialize database
  await initializeDatabase();
});