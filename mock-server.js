// Simple Mock Backend Server for Testing
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

// Mock data
const mockTokens = [
  {
    address: "0x006Fb00cff2DBC089794FABB415298Cc1b5307Fb",
    name: "Ahiru Token",
    symbol: "AHIRU",
    description: "Test token for Ahiru Launchpad",
    logoUrl: "https://via.placeholder.com/96/4F46E5/FFFFFF?text=AHIRU",
    website: "https://ahiru-launchpad.com",
    twitter: "@ahirulaunchpad",
    telegram: "https://t.me/ahirulaunchpad",
    creatorAddress: "0x4edDe3C550879e3B97D309eC765cb02c5bCf6db7",
    totalSupply: "1000000000000000000000000000",
    currentPrice: "0.0000005",
    priceChange24h: "5.25",
    volume24h: "125.5",
    holdersCount: 245,
    isGraduated: false,
    createdAt: "2025-10-03T15:20:14.358Z"
  }
];

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase limit to 10mb
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.get('/api/tokens', (req, res) => {
  const { page = 1, limit = 20, sort = 'created_at', order = 'desc' } = req.query;

  res.json({
    success: true,
    data: mockTokens,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: mockTokens.length,
      totalPages: Math.ceil(mockTokens.length / parseInt(limit))
    }
  });
});

app.get('/api/tokens/:address', (req, res) => {
  const { address } = req.params;
  const token = mockTokens.find(t => t.address.toLowerCase() === address.toLowerCase());

  if (!token) {
    return res.status(404).json({
      success: false,
      error: 'Token not found'
    });
  }

  res.json({
    success: true,
    data: token
  });
});

app.post('/api/tokens', (req, res) => {
  console.log('Debug - Backend POST /api/tokens called');
  console.log('Debug - Request body:', req.body);

  const { name, symbol, description, creatorAddress, imageUrl, website, twitter, telegram } = req.body;

  const newToken = {
    address: `0x${Math.random().toString(16).substr(2, 40)}`,
    name,
    symbol,
    description,
    logoUrl: imageUrl || `https://via.placeholder.com/96/4F46E5/FFFFFF?text=${symbol}`,
    website: website || "",
    twitter: twitter || "",
    telegram: telegram || "",
    creatorAddress,
    totalSupply: "1000000000000000000000000000",
    currentPrice: "0.0000005",
    priceChange24h: "0",
    volume24h: "0",
    holdersCount: 1,
    isGraduated: false,
    createdAt: new Date().toISOString()
  };

  console.log('Debug - New token created:', newToken);
  mockTokens.push(newToken);
  console.log('Debug - Total tokens in array:', mockTokens.length);

  res.json({
    success: true,
    data: newToken,
    message: "Token created successfully"
  });
});

// Analytics endpoints
app.get('/api/analytics/platform', (req, res) => {
  res.json({
    success: true,
    data: {
      totalTokens: mockTokens.length,
      totalVolume24h: "125.5",
      totalUsers: 1250,
      activeWallets: 245,
      totalFeesCollected: "15.25",
      topTokens: mockTokens.slice(0, 10)
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mock Backend Server is running on http://localhost:${PORT}`);
  console.log(`📝 Mock API available at http://localhost:${PORT}/api`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Platform analytics: http://localhost:${PORT}/api/analytics/platform`);
});