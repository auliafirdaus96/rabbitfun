/**
 * Mock Service Worker
 * API mocking for testing purposes
 */

import { setupServer } from 'msw/node';
import { http } from 'msw/core/http';
import { createMockToken } from '../setupTests';

// Mock API handlers
export const handlers = [
  // Health check
  http.get('/health', () => {
    return new Response(
      JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: 'test',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }),

  // Get all tokens
  http.get('/api/v1/tokens', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const search = url.searchParams.get('search') || '';

    // Create mock tokens
    const tokens = Array.from({ length: 50 }, (_, i) => createMockToken({
      id: String(i + 1),
      name: `Test Token ${i + 1}`,
      ticker: `TEST${i + 1}`,
      contractAddress: `0x${(i + 1).toString(16).padStart(40, '0')}`,
      marketCap: `${Math.floor(Math.random() * 100000)}`,
      progress: Math.floor(Math.random() * 100),
      holders: Math.floor(Math.random() * 1000),
      priceChange: Math.floor(Math.random() * 200) - 100,
    }));

    // Filter by search
    const filteredTokens = tokens.filter(token =>
      token.name.toLowerCase().includes(search.toLowerCase()) ||
      token.ticker.toLowerCase().includes(search.toLowerCase())
    );

    // Paginate
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTokens = filteredTokens.slice(startIndex, endIndex);

    return new Response(
      JSON.stringify({
        data: paginatedTokens,
        pagination: {
          page,
          limit,
          total: filteredTokens.length,
          totalPages: Math.ceil(filteredTokens.length / limit),
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }),

  // Get single token
  http.get('/api/v1/tokens/:address', ({ params }) => {
    const { address } = params;

    // Mock token data
    const token = createMockToken({
      contractAddress: address,
    });

    return new Response(
      JSON.stringify({
        data: token,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }),

  // Create token
  http.post('/api/v1/tokens', async ({ request }) => {
    const newTokenData = await request.json() as any;
    const newToken = createMockToken({
      ...newTokenData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        data: newToken,
        message: 'Token created successfully',
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }),

  // Like token
  http.post('/api/v1/tokens/:address/like', ({ params }) => {
    const { address } = params;

    return new Response(
      JSON.stringify({
        data: {
          tokenAddress: address,
          likes: Math.floor(Math.random() * 1000),
          userLiked: true,
        },
        message: 'Token liked successfully',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }),

  // Get token analytics
  http.get('/api/v1/tokens/:address/analytics', ({ params }) => {
    const { address } = params;

    return new Response(
      JSON.stringify({
        data: {
          tokenAddress: address,
          totalVolume: Math.floor(Math.random() * 1000000),
          totalHolders: Math.floor(Math.random() * 1000),
          totalTransactions: Math.floor(Math.random() * 10000),
          averagePrice: Math.random() * 100,
          priceChange24h: Math.floor(Math.random() * 200) - 100,
          marketCap: Math.floor(Math.random() * 1000000),
          liquidity: Math.floor(Math.random() * 100000),
          createdAt: new Date().toISOString(),
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }),

  // Get token holders
  http.get('/api/v1/tokens/:address/holders', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    const holders = Array.from({ length: 100 }, (_, i) => ({
      address: `0x${(i + 1).toString(16).padStart(40, '0')}`,
      balance: Math.floor(Math.random() * 1000000),
      percentage: Math.random() * 10,
      createdAt: new Date().toISOString(),
    }));

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedHolders = holders.slice(startIndex, endIndex);

    return new Response(
      JSON.stringify({
        data: paginatedHolders,
        pagination: {
          page,
          limit,
          total: holders.length,
          totalPages: Math.ceil(holders.length / limit),
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }),

  // Get token transactions
  http.get('/api/v1/tokens/:address/transactions', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    const transactions = Array.from({ length: 100 }, (_, i) => ({
      hash: `0x${(i + 1).toString(16).padStart(64, '0')}`,
      from: `0x${(i + 1).toString(16).padStart(40, '0')}`,
      to: `0x${(i + 2).toString(16).padStart(40, '0')}`,
      amount: Math.floor(Math.random() * 1000000),
      type: i % 2 === 0 ? 'buy' : 'sell',
      timestamp: new Date(Date.now() - i * 60000).toISOString(),
      blockNumber: 1000000 + i,
      gasUsed: Math.floor(Math.random() * 100000),
      gasPrice: Math.floor(Math.random() * 100),
    }));

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTransactions = transactions.slice(startIndex, endIndex);

    return new Response(
      JSON.stringify({
        data: paginatedTransactions,
        pagination: {
          page,
          limit,
          total: transactions.length,
          totalPages: Math.ceil(transactions.length / limit),
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }),

  // Get user portfolio
  http.get('/api/v1/users/:address/portfolio', ({ params }) => {
    const { address } = params;

    return new Response(
      JSON.stringify({
        data: {
          userAddress: address,
          totalValue: Math.floor(Math.random() * 100000),
          tokens: Array.from({ length: 5 }, (_, i) => createMockToken({
            id: String(i + 1),
            name: `Portfolio Token ${i + 1}`,
            ticker: `PRT${i + 1}`,
            contractAddress: `0x${(i + 1).toString(16).padStart(40, '0')}`,
            balance: Math.floor(Math.random() * 1000000),
            value: Math.floor(Math.random() * 20000),
          })),
          transactions: Math.floor(Math.random() * 100),
          profitLoss: Math.floor(Math.random() * 5000) - 2500,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }),

  // Get user transactions
  http.get('/api/v1/users/:address/transactions', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    const transactions = Array.from({ length: 50 }, (_, i) => ({
      hash: `0x${(i + 1).toString(16).padStart(64, '0')}`,
      tokenAddress: `0x${(i + 1).toString(16).padStart(40, '0')}`,
      type: i % 2 === 0 ? 'buy' : 'sell',
      amount: Math.floor(Math.random() * 1000000),
      price: Math.random() * 100,
      value: Math.floor(Math.random() * 100000),
      gasUsed: Math.floor(Math.random() * 100000),
      gasPrice: Math.floor(Math.random() * 100),
      timestamp: new Date(Date.now() - i * 60000).toISOString(),
      status: 'completed',
    }));

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTransactions = transactions.slice(startIndex, endIndex);

    return new Response(
      JSON.stringify({
        data: paginatedTransactions,
        pagination: {
          page,
          limit,
          total: transactions.length,
          totalPages: Math.ceil(transactions.length / limit),
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }),

  // Get trending tokens
  http.get('/api/v1/tokens/trending', () => {
    const trendingTokens = Array.from({ length: 10 }, (_, i) => createMockToken({
      id: String(i + 1),
      name: `Trending Token ${i + 1}`,
      ticker: `TRD${i + 1}`,
      contractAddress: `0x${(i + 1).toString(16).padStart(40, '0')}`,
      marketCap: `${Math.floor(Math.random() * 500000)}`,
      progress: Math.floor(Math.random() * 100),
      holders: Math.floor(Math.random() * 500),
      priceChange: Math.floor(Math.random() * 100),
      volume24h: Math.floor(Math.random() * 100000),
    }));

    return new Response(
      JSON.stringify({
        data: trendingTokens,
        message: 'Trending tokens retrieved successfully',
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 300000).toISOString(),
        metadata: {
          cacheKey: 'trending-tokens',
          version: '1.0',
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }),

  // Error handlers
  http.get('/api/v1/error', () => {
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: 'Something went wrong',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }),

  http.post('/api/v1/error', () => {
    return new Response(
      JSON.stringify({
        error: 'Bad request',
        message: 'Invalid request data',
        code: 'BAD_REQUEST',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }),

  // Mock blockchain RPC
  http.post('/rpc', async ({ request }) => {
    const { method, params } = await request.json() as any;

    // Handle different RPC methods
    switch (method) {
      case 'eth_call':
        return new Response(
          JSON.stringify({
            result: '0x0000000000000000000000000000000000000000',
            id: params[1]?.id || 1,
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

      case 'eth_getCode':
        return new Response(
          JSON.stringify({
            result: '0x608060405234801561001016014056',
            id: params[1]?.id || 1,
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

      case 'eth_getBalance':
        return new Response(
          JSON.stringify({
            result: '0x152d02c7e14af6800000',
            id: params[1]?.id || 1,
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

      case 'eth_blockNumber':
        return new Response(
          JSON.stringify({
            result: '0x989680',
            id: params[0]?.id || 1,
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

      default:
        return new Response(
          JSON.stringify({
            error: 'Method not supported',
            method,
            id: params[0]?.id || 1,
          }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
    }
  }),
];

// Create and export the server
export const server = setupServer(...handlers);