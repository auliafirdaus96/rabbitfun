import { setupServer } from 'msw/node';
import { rest } from 'msw';

// Mock API responses
const mockTokens = [
  {
    id: '1',
    name: 'Rabbit Token',
    ticker: 'RABBIT',
    contractAddress: '0x1234567890123456789012345678901234567890',
    marketCap: '100000',
    priceChange: 15.5,
    creatorName: 'Rabbit Creator',
    created_at: '2024-01-01T00:00:00.000Z',
    progress: 45,
    description: 'A revolutionary rabbit-themed token',
    volume: '25000',
    holders: 500,
    price: '0.001',
    liquidity: '50000',
  },
  {
    id: '2',
    name: 'Carrot Coin',
    ticker: 'CARROT',
    contractAddress: '0x9876543210987654321098765432109876543210',
    marketCap: '75000',
    priceChange: -5.2,
    creatorName: 'Carrot Farmer',
    created_at: '2024-01-02T00:00:00.000Z',
    progress: 30,
    description: 'Fresh carrots for everyone',
    volume: '15000',
    holders: 300,
    price: '0.0005',
    liquidity: '30000',
  },
];

const mockBondingCurveConfig = {
  INITIAL_PRICE: 0.00000001,
  GROSS_RAISE: 100000,
  GRADUATION_SUPPLY: 200000,
  K_VALUE: 0.000015,
  FEE_RATE: 0.0125,
  CREATOR_FEE_RATE: 0.0025,
  PLATFORM_FEE_RATE: 0.01,
  MIN_TRADE_AMOUNT: 0.001,
  MAX_TRADE_AMOUNT: 1000,
};

const mockMarketStats = {
  totalMarketCap: 5000000,
  totalVolume: 1000000,
  totalTokens: 150,
  activeUsers: 5000,
  totalRaised: 2000000,
  topGainers: mockTokens.slice(0, 3),
  topLosers: [mockTokens[1]],
};

export const handlers = [
  // Token endpoints
  rest.get('/api/v1/tokens', (req, res, ctx) => {
    const page = parseInt(req.url.searchParams.get('page') || '1');
    const limit = parseInt(req.url.searchParams.get('limit') || '10');
    const search = req.url.searchParams.get('search');

    let filteredTokens = mockTokens;

    if (search) {
      filteredTokens = mockTokens.filter(token =>
        token.name.toLowerCase().includes(search.toLowerCase()) ||
        token.ticker.toLowerCase().includes(search.toLowerCase())
      );
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTokens = filteredTokens.slice(startIndex, endIndex);

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          tokens: paginatedTokens,
          pagination: {
            page,
            limit,
            total: filteredTokens.length,
            totalPages: Math.ceil(filteredTokens.length / limit),
            hasNext: endIndex < filteredTokens.length,
            hasPrev: page > 1,
          },
        },
      })
    );
  }),

  rest.get('/api/v1/tokens/:address', (req, res, ctx) => {
    const { address } = req.params;
    const token = mockTokens.find(t => t.contractAddress === address);

    if (!token) {
      return res(
        ctx.status(404),
        ctx.json({
          success: false,
          error: 'Token not found',
        })
      );
    }

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: token,
      })
    );
  }),

  rest.get('/api/v1/tokens/trending', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockTokens.filter(t => t.priceChange > 0),
      })
    );
  }),

  rest.get('/api/v1/tokens/recent', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockTokens.slice(0, 5),
      })
    );
  }),

  // Bonding curve endpoints
  rest.get('/api/v1/bonding-curve/config', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockBondingCurveConfig,
      })
    );
  }),

  rest.post('/api/v1/bonding-curve/calculate-price', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          price: 0.00000001 * Math.exp(0.000015 * 50000 / 200000),
        },
      })
    );
  }),

  rest.post('/api/v1/bonding-curve/calculate-tokens-out', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          tokens: 100000,
        },
      })
    );
  }),

  rest.post('/api/v1/bonding-curve/calculate-bnb-out', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          bnb: 0.5,
        },
      })
    );
  }),

  rest.post('/api/v1/bonding-curve/calculate-price-impact', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          impact: 0.05, // 5%
        },
      })
    );
  }),

  // Market data endpoints
  rest.get('/api/v1/market/stats', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockMarketStats,
      })
    );
  }),

  rest.get('/api/v1/market/gainers', (req, res, ctx) => {
    const limit = parseInt(req.url.searchParams.get('limit') || '10');
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockTokens
          .filter(t => t.priceChange > 0)
          .sort((a, b) => b.priceChange - a.priceChange)
          .slice(0, limit),
      })
    );
  }),

  rest.get('/api/v1/market/losers', (req, res, ctx) => {
    const limit = parseInt(req.url.searchParams.get('limit') || '10');
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockTokens
          .filter(t => t.priceChange < 0)
          .sort((a, b) => a.priceChange - b.priceChange)
          .slice(0, limit),
      })
    );
  }),

  rest.get('/api/v1/market/volume', (req, res, ctx) => {
    const limit = parseInt(req.url.searchParams.get('limit') || '10');
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockTokens
          .sort((a, b) => parseInt(b.volume) - parseInt(a.volume))
          .slice(0, limit),
      })
    );
  }),

  // User endpoints
  rest.get('/api/v1/users/:address/profile', (req, res, ctx) => {
    const { address } = req.params;
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          address,
          totalInvested: 5.5,
          totalReturned: 7.2,
          profitLoss: 1.7,
          profitLossPercentage: 30.9,
          tokensCreated: 2,
          tokensHeld: 5,
          totalTrades: 25,
          joinDate: '2024-01-01T00:00:00.000Z',
        },
      })
    );
  }),

  rest.get('/api/v1/users/:address/portfolio', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          holdings: mockTokens.slice(0, 3).map(token => ({
            token,
            balance: 1000,
            value: 10,
            profitLoss: 2.5,
            profitLossPercentage: 25,
          })),
          totalValue: 50,
          totalProfitLoss: 12.5,
          totalProfitLossPercentage: 25,
        },
      })
    );
  }),

  rest.get('/api/v1/users/:address/favorites', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: [mockTokens[0].contractAddress],
      })
    );
  }),

  rest.post('/api/v1/users/:address/favorites', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Added to favorites',
      })
    );
  }),

  rest.delete('/api/v1/users/:address/favorites/:tokenAddress', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: 'Removed from favorites',
      })
    );
  }),

  // Transaction endpoints
  rest.get('/api/v1/transactions', (req, res, ctx) => {
    const page = parseInt(req.url.searchParams.get('page') || '1');
    const limit = parseInt(req.url.searchParams.get('limit') || '10');
    const userAddress = req.url.searchParams.get('user');
    const tokenAddress = req.url.searchParams.get('token');

    let transactions = [
      {
        id: '1',
        type: 'buy',
        user: '0x1234567890123456789012345678901234567890',
        token: mockTokens[0].contractAddress,
        amount: 1000,
        price: 0.001,
        total: 1,
        timestamp: '2024-01-01T12:00:00.000Z',
        txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      },
      {
        id: '2',
        type: 'sell',
        user: '0x1234567890123456789012345678901234567890',
        token: mockTokens[1].contractAddress,
        amount: 500,
        price: 0.0005,
        total: 0.25,
        timestamp: '2024-01-01T13:00:00.000Z',
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      },
    ];

    if (userAddress) {
      transactions = transactions.filter(tx => tx.user === userAddress);
    }

    if (tokenAddress) {
      transactions = transactions.filter(tx => tx.token === tokenAddress);
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTransactions = transactions.slice(startIndex, endIndex);

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          transactions: paginatedTransactions,
          pagination: {
            page,
            limit,
            total: transactions.length,
            totalPages: Math.ceil(transactions.length / limit),
            hasNext: endIndex < transactions.length,
            hasPrev: page > 1,
          },
        },
      })
    );
  }),

  // Analytics endpoints
  rest.get('/api/v1/analytics/global', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          totalVolume: 10000000,
          totalMarketCap: 50000000,
          totalTokens: 1000,
          activeUsers: 50000,
          dailyVolume: 500000,
          dailyActiveUsers: 5000,
          weeklyGrowth: 15.5,
          monthlyGrowth: 45.2,
        },
      })
    );
  }),

  rest.get('/api/v1/analytics/tokens/:address', (req, res, ctx) => {
    const { address } = req.params;
    const token = mockTokens.find(t => t.contractAddress === address);

    if (!token) {
      return res(
        ctx.status(404),
        ctx.json({
          success: false,
          error: 'Token not found',
        })
      );
    }

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          token,
          priceHistory: [
            { timestamp: '2024-01-01T00:00:00.000Z', price: 0.0008 },
            { timestamp: '2024-01-01T06:00:00.000Z', price: 0.0009 },
            { timestamp: '2024-01-01T12:00:00.000Z', price: 0.001 },
            { timestamp: '2024-01-01T18:00:00.000Z', price: 0.0011 },
            { timestamp: '2024-01-02T00:00:00.000Z', price: 0.001 },
          ],
          volumeHistory: [
            { timestamp: '2024-01-01T00:00:00.000Z', volume: 1000 },
            { timestamp: '2024-01-01T06:00:00.000Z', volume: 1500 },
            { timestamp: '2024-01-01T12:00:00.000Z', volume: 2000 },
            { timestamp: '2024-01-01T18:00:00.000Z', volume: 2500 },
            { timestamp: '2024-01-02T00:00:00.000Z', volume: 1800 },
          ],
          holderHistory: [
            { timestamp: '2024-01-01T00:00:00.000Z', holders: 100 },
            { timestamp: '2024-01-01T06:00:00.000Z', holders: 150 },
            { timestamp: '2024-01-01T12:00:00.000Z', holders: 200 },
            { timestamp: '2024-01-01T18:00:00.000Z', holders: 250 },
            { timestamp: '2024-01-02T00:00:00.000Z', holders: 300 },
          ],
        },
      })
    );
  }),

  // Health check
  rest.get('/health', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      })
    );
  }),

  // Error handlers for testing
  rest.get('/api/v1/error-test', (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({
        success: false,
        error: 'Internal server error',
      })
    );
  }),

  rest.get('/api/v1/timeout-test', (req, res, ctx) => {
    return res(
      ctx.delay(10000), // 10 second delay to test timeout
      ctx.status(200),
      ctx.json({
        success: true,
        data: 'This should timeout',
      })
    );
  }),
];

export const server = setupServer(...handlers);