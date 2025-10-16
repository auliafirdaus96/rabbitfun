// Simple Mock Backend Server using Node.js built-in modules
const http = require('http');
const url = require('url');

const PORT = 3004;

// Mock data - empty array (no dummy tokens)
const mockTokens = [];

// Helper function to send JSON response
function sendJSON(res, data, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data, null, 2));
}

// Helper function to parse request body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Helper function to find token by address
function findTokenByAddress(address) {
  return mockTokens.find(token =>
    token.address.toLowerCase() === address.toLowerCase()
  );
}

// Helper function to generate unique address
function generateAddress() {
  return '0x' + Array.from({length: 40}, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

// Create server
const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  console.log(`${method} ${path}`);

  try {
    // Health check endpoint
    if (path === '/health' && method === 'GET') {
      sendJSON(res, {
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
      return;
    }

    // Get all tokens
    if (path === '/api/tokens' && method === 'GET') {
      sendJSON(res, {
        success: true,
        data: mockTokens,
        count: mockTokens.length
      });
      return;
    }

    // Get token by address
    if (path.startsWith('/api/tokens/') && method === 'GET') {
      const address = path.split('/api/tokens/')[1];
      const token = findTokenByAddress(address);

      if (token) {
        sendJSON(res, {
          success: true,
          data: token
        });
      } else {
        sendJSON(res, {
          success: false,
          error: 'Token not found'
        }, 404);
      }
      return;
    }

    // Create new token
    if (path === '/api/tokens' && method === 'POST') {
      try {
        const body = await parseBody(req);

        // Validate required fields
        if (!body.name || !body.symbol) {
          sendJSON(res, {
            success: false,
            error: 'Name and symbol are required'
          }, 400);
          return;
        }

        // Create new token
        const newToken = {
          address: generateAddress(),
          name: body.name,
          symbol: body.symbol,
          description: body.description || '',
          logoUrl: body.logoUrl || `https://via.placeholder.com/96/4F46E5/FFFFFF?text=${body.symbol}`,
          website: body.website || '',
          twitter: body.twitter || '',
          telegram: body.telegram || '',
          creatorAddress: body.creatorAddress || '0x0000000000000000000000000000000000000000',
          totalSupply: body.totalSupply || '1000000000000000000000000000',
          currentPrice: '0.0000001', // Initial price
          priceChange24h: '0',
          volume24h: '0',
          holdersCount: 0,
          isGraduated: false,
          createdAt: new Date().toISOString()
        };

        mockTokens.push(newToken);

        sendJSON(res, {
          success: true,
          data: newToken,
          message: 'Token created successfully'
        }, 201);
        return;
      } catch (error) {
        sendJSON(res, {
          success: false,
          error: 'Invalid JSON data'
        }, 400);
        return;
      }
    }

    // Platform analytics
    if (path === '/api/analytics/platform' && method === 'GET') {
      const analytics = {
        totalTokens: mockTokens.length,
        totalVolume24h: mockTokens.reduce((sum, token) => sum + parseFloat(token.volume24h || 0), 0),
        totalHolders: mockTokens.reduce((sum, token) => sum + (token.holdersCount || 0), 0),
        activeTokens: mockTokens.filter(token => !token.isGraduated).length,
        graduatedTokens: mockTokens.filter(token => token.isGraduated).length,
        totalMarketCap: mockTokens.reduce((sum, token) => {
          const price = parseFloat(token.currentPrice || 0);
          const supply = parseFloat(token.totalSupply || 0) / Math.pow(10, 18);
          return sum + (price * supply);
        }, 0),
        lastUpdated: new Date().toISOString()
      };

      sendJSON(res, {
        success: true,
        data: analytics
      });
      return;
    }

    // 404 for unknown routes
    sendJSON(res, {
      success: false,
      error: 'Endpoint not found'
    }, 404);

  } catch (error) {
    console.error('Server error:', error);
    sendJSON(res, {
      success: false,
      error: 'Internal server error'
    }, 500);
  }
});

// Start server
server.listen(PORT, () => {
  console.log('🚀 Simple Mock Backend Server is running on http://localhost:' + PORT);
  console.log('📝 Mock API available at http://localhost:' + PORT + '/api');
  console.log('❤️  Health check: http://localhost:' + PORT + '/health');
  console.log('📊 Platform analytics: http://localhost:' + PORT + '/api/analytics/platform');
  console.log('🪙 Get tokens: http://localhost:' + PORT + '/api/tokens');
  console.log('🌐 Frontend should be at: http://localhost:8080');
  console.log('');
  console.log('Available endpoints:');
  console.log('  GET  /health');
  console.log('  GET  /api/tokens');
  console.log('  GET  /api/tokens/:address');
  console.log('  POST /api/tokens');
  console.log('  GET  /api/analytics/platform');
  console.log('');
  console.log('📝 Note: All dummy tokens have been removed. The server starts with an empty token list.');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});