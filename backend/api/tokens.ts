// Token management API for Vercel serverless
export default async function handler(req: any, res: any) {
  const { method, query, body } = req;

  try {
    switch (method) {
      case 'GET':
        if (query.id) {
          return getToken(req, res);
        } else {
          return getTokens(req, res);
        }

      case 'POST':
        return createToken(req, res);

      case 'PUT':
        return updateToken(req, res);

      case 'DELETE':
        return deleteToken(req, res);

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({
          error: 'Method not allowed',
          message: `Method ${method} not allowed`
        });
    }
  } catch (error: any) {
    console.error('Token API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

// GET /api/tokens - Get all tokens
async function getTokens(req: any, res: any) {
  const { page = 1, limit = 10, search, status } = req.query;

  // Mock data - akan diganti dengan database nanti
  const mockTokens = [
    {
      id: '1',
      name: 'Rabbit Token',
      symbol: 'RABBIT',
      description: 'Community token for Rabbit ecosystem',
      totalSupply: '1000000000000000000000000', // 1M tokens
      price: '0.0001',
      marketCap: '100000',
      holders: 150,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '2',
      name: 'Carrot Token',
      symbol: 'CARROT',
      description: 'Reward token for platform activities',
      totalSupply: '500000000000000000000000', // 500K tokens
      price: '0.00005',
      marketCap: '25000',
      holders: 75,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  let filteredTokens = mockTokens;

  // Filter by search
  if (search) {
    filteredTokens = filteredTokens.filter(token =>
      token.name.toLowerCase().includes(search.toLowerCase()) ||
      token.symbol.toLowerCase().includes(search.toLowerCase())
    );
  }

  // Filter by status
  if (status) {
    filteredTokens = filteredTokens.filter(token => token.status === status);
  }

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedTokens = filteredTokens.slice(startIndex, endIndex);

  return res.status(200).json({
    success: true,
    data: paginatedTokens,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: filteredTokens.length,
      pages: Math.ceil(filteredTokens.length / limit)
    },
    message: 'Tokens retrieved successfully'
  });
}

// GET /api/tokens?id=1 - Get single token
async function getToken(req: any, res: any) {
  const { id } = req.query;

  // Mock token data
  const mockToken = {
    id: id,
    name: 'Rabbit Token',
    symbol: 'RABBIT',
    description: 'Community token for Rabbit ecosystem',
    totalSupply: '1000000000000000000000000',
    price: '0.0001',
    marketCap: '100000',
    holders: 150,
    status: 'active',
    creator: '0x1234567890123456789012345678901234567890',
    contractAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    liquidityPool: '0x5678567856785678567856785678567856785678',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    bondingCurve: {
      type: 'exponential',
      params: {
        basePrice: '0.0001',
        slope: '0.000001'
      }
    },
    stats: {
      volume24h: '5000',
      change24h: '5.2',
      txCount: 1250,
      buyCount: 800,
      sellCount: 450
    }
  };

  return res.status(200).json({
    success: true,
    data: mockToken,
    message: 'Token retrieved successfully'
  });
}

// POST /api/tokens - Create new token
async function createToken(req: any, res: any) {
  const { name, symbol, description, totalSupply, initialPrice } = req.body;

  // Validation
  if (!name || !symbol || !totalSupply) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      message: 'Name, symbol, and total supply are required'
    });
  }

  // Mock token creation
  const newToken = {
    id: Date.now().toString(),
    name,
    symbol: symbol.toUpperCase(),
    description: description || '',
    totalSupply,
    price: initialPrice || '0.0001',
    marketCap: '0',
    holders: 0,
    status: 'pending',
    creator: '0x1234567890123456789012345678901234567890',
    contractAddress: null, // Will be set after deployment
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return res.status(201).json({
    success: true,
    data: newToken,
    message: 'Token created successfully'
  });
}

// PUT /api/tokens - Update token
async function updateToken(req: any, res: any) {
  const { id, ...updateData } = req.body;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Missing token ID',
      message: 'Token ID is required for updates'
    });
  }

  // Mock update
  const updatedToken = {
    id,
    ...updateData,
    updatedAt: new Date().toISOString()
  };

  return res.status(200).json({
    success: true,
    data: updatedToken,
    message: 'Token updated successfully'
  });
}

// DELETE /api/tokens - Delete token
async function deleteToken(req: any, res: any) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Missing token ID',
      message: 'Token ID is required for deletion'
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Token deleted successfully'
  });
}