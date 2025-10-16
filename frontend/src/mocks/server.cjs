/**
 * Simple Mock Server for Integration Tests
 * Bypassing MSW setup issues with direct fetch mocking
 */

// Polyfill Request and Response for Node.js environment
if (typeof Request === 'undefined') {
  global.Request = class Request {
    constructor(url, init = {}) {
      this.url = url;
      this.method = init.method || 'GET';
      this.headers = new Map();
      this.body = init.body;

      if (init.headers) {
        if (init.headers instanceof Map) {
          this.headers = init.headers;
        } else {
          Object.entries(init.headers).forEach(([key, value]) => {
            this.headers.set(key, value);
          });
        }
      }
    }

    getHeader(name) {
      return this.headers.get(name);
    }

    async json() {
      return JSON.parse(this.body || '{}');
    }
  };
}

if (typeof Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.statusText = init.statusText || 'OK';
      this.headers = new Map();

      if (init.headers) {
        if (init.headers instanceof Map) {
          this.headers = init.headers;
        } else {
          Object.entries(init.headers).forEach(([key, value]) => {
            this.headers.set(key, value);
          });
        }
      }
    }

    get ok() {
      return this.status >= 200 && this.status < 300;
    }

    async json() {
      return JSON.parse(this.body);
    }

    async text() {
      return this.body;
    }

    get(name) {
      return this.headers.get(name);
    }
  };
}

// Store handlers and mock data
let handlers = new Map();
let mockResponses = new Map();

// Create mock server API
const server = {
  use: (handler) => {
    const key = `${handler.method}-${handler.path}`;
    handlers.set(key, handler);
  },

  resetHandlers: () => {
    handlers.clear();
  },

  listen: function() {
    // Setup global fetch mocking
    const originalFetch = global.fetch;
    const self = this;

    global.fetch = async (url, options = {}) => {
      const method = options.method || 'GET';
      // Handle relative URLs by prepending the base URL
      const fullUrl = url.startsWith('http') ? url : `http://localhost${url}`;
      const parsedUrl = new URL(fullUrl);
      const pathname = parsedUrl.pathname;

      // Create request object with the full URL
      const request = new Request(fullUrl, {
        ...options,
        url: fullUrl
      });

      // Find matching handler
      for (const [key, handler] of handlers) {
        if (self.matchesHandler(method, pathname, handler)) {
          return handler.handler({
            request: request,
            params: self.extractParams(pathname, handler.path)
          });
        }
      }

      // Try to find a predefined mock response
      const mockKey = `${method}-${pathname}`;
      if (mockResponses.has(mockKey)) {
        const handler = mockResponses.get(mockKey);
        return handler.handler({
          request: request,
          params: self.extractParams(pathname, handler.path)
        });
      }

      // Return default response if no handler found
      return new Response(
        JSON.stringify({ error: 'Not Found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    };

    global.mockServer = { originalFetch };
  },

  close: () => {
    // Restore original fetch
    if (global.mockServer && global.mockServer.originalFetch) {
      global.fetch = global.mockServer.originalFetch;
    }
  },

  matchesHandler: (method, pathname, handler) => {
    if (handler.method && handler.method.toUpperCase() !== method.toUpperCase()) {
      return false;
    }

    // Simple path matching (can be enhanced for params)
    if (handler.path === pathname) {
      return true;
    }

    // Handle path parameters
    const handlerSegments = handler.path.split('/').filter(Boolean);
    const pathSegments = pathname.split('/').filter(Boolean);

    if (handlerSegments.length !== pathSegments.length) {
      return false;
    }

    return handlerSegments.every((segment, index) => {
      return segment.startsWith(':') || segment === pathSegments[index];
    });
  },

  extractParams: (pathname, handlerPath) => {
    const params = {};
    const handlerSegments = handlerPath.split('/').filter(Boolean);
    const pathSegments = pathname.split('/').filter(Boolean);

    handlerSegments.forEach((segment, index) => {
      if (segment.startsWith(':')) {
        const paramName = segment.substring(1);
        params[paramName] = pathSegments[index];
      }
    });

    return params;
  }
};

// HTTP methods for creating handlers
const http = {
  get: (path, handler) => ({ method: 'GET', path, handler }),
  post: (path, handler) => ({ method: 'POST', path, handler }),
  put: (path, handler) => ({ method: 'PUT', path, handler }),
  delete: (path, handler) => ({ method: 'DELETE', path, handler }),
  patch: (path, handler) => ({ method: 'PATCH', path, handler })
};

// Mock data helpers
const createMockToken = (overrides = {}) => ({
  id: '1',
  name: 'Test Token',
  ticker: 'TEST',
  description: 'Test token description',
  imageUrl: 'https://example.com/token.png',
  contractAddress: '0x1234567890123456789012345678901234567890',
  creatorAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
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
  ...overrides,
});

// Default handlers
const defaultHandlers = [
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

    const filteredTokens = tokens.filter(token =>
      token.name.toLowerCase().includes(search.toLowerCase()) ||
      token.ticker.toLowerCase().includes(search.toLowerCase())
    );

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTokens = filteredTokens.slice(startIndex, endIndex);

    return new Response(
      JSON.stringify({
        success: true,
        data: paginatedTokens,
        pagination: {
          page,
          limit,
          total: filteredTokens.length,
          totalPages: Math.ceil(filteredTokens.length / limit),
          hasNext: page * limit < filteredTokens.length,
          hasPrev: page > 1,
        },
        timestamp: new Date().toISOString(),
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
    const token = createMockToken({
      contractAddress: address,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: token,
        timestamp: new Date().toISOString(),
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
    const newTokenData = await request.json();
    const newToken = createMockToken({
      ...newTokenData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: newToken,
        message: 'Token created successfully',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 201,
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
        success: false,
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
        success: false,
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
];

// Setup default handlers
defaultHandlers.forEach(handler => {
  const key = `${handler.method}-${handler.path}`;
  mockResponses.set(key, handler);
});

module.exports = { server, http };