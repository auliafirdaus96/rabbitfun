/**
 * Integration Tests Setup
 * Global setup for integration tests including MSW server
 */

const { server } = require('../mocks/server.cjs');

// Start MSW server before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'error',
  });
});

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers();
});

// Close MSW server after all tests
afterAll(() => {
  server.close();
});

// Global integration test utilities
global.createMockApiResponse = (data, status = 200) => {
  return {
    success: true,
    data,
    status,
    message: 'Success',
    timestamp: new Date().toISOString(),
  };
};

global.createMockErrorResponse = (message, status = 400) => {
  return {
    success: false,
    error: message,
    status,
    timestamp: new Date().toISOString(),
  };
};

global.createMockPagination = (data, page = 1, limit = 10, total = data.length) => {
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
    timestamp: new Date().toISOString(),
  };
};

global.wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Mock performance API for tests
global.mockPerformanceMetrics = () => ({
  duration: Math.random() * 1000,
  memory: Math.random() * 100,
  timestamp: Date.now(),
});

// Mock user session for tests
global.mockUserSession = {
  address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  connected: true,
  chainId: 56,
  balance: '5.234',
  tokenBalance: 125000,
};

// Mock blockchain data
global.mockBlockchainData = {
  blockNumber: 12345678,
  gasPrice: '20',
  networkId: 56,
  isConnected: true,
};

// Mock token data
global.mockToken = {
  id: '1',
  name: 'Test Token',
  ticker: 'TEST',
  description: 'Test token description',
  imageUrl: 'https://example.com/token.png',
  contractAddress: '0x1234567890123456789012345678901234567890',
  creatorAddress: mockUserSession.address,
  creatorName: 'Test Creator',
  creatorAvatar: 'https://example.com/avatar.png',
  marketCap: '50000',
  progress: 25,
  holders: 1000,
  priceChange: 10,
  price: '0.1',
  volume24h: '1000',
  createdAt: new Date().toISOString(),
  isGraduated: false,
  bondingCurve: 'linear',
  totalSupply: 1000000,
  circulatingSupply: 1243955,
};

// Mock analytics data
global.mockAnalytics = {
  totalTokens: 150,
  totalVolume24h: '500000',
  totalMarketCap: '2500000',
  activeUsers: 2500,
  trades24h: 500,
  topGainers: [
    {
      id: '1',
      name: 'Gainer Token',
      ticker: 'GAIN',
      priceChange: 45.5,
      marketCap: '100000',
    }
  ],
  topLosers: [
    {
      id: '2',
      name: 'Loser Token',
      ticker: 'LOSE',
      priceChange: -32.1,
      marketCap: '50000',
    }
  ],
  trendingTokens: [
    {
      id: '3',
      name: 'Trending Token',
      ticker: 'TREND',
      mentions: 150,
      socialScore: 85,
    }
  ],
};