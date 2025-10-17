import productionDatabaseService from '../src/services/productionDatabaseService';

// Token Management API with real database integration
export default async function handler(req: any, res: any) {
  const { method, query, body } = req;

  try {
    switch (method) {
      case 'GET':
        if (query.address) {
          return getTokenByAddress(req, res);
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

// GET /api/tokens-db - Get all tokens with pagination and filtering
async function getTokens(req: any, res: any) {
  const {
    page = 1,
    limit = 20,
    search,
    isActive,
    isFeatured,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  try {
    const result = await productionDatabaseService.getTokens({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      isFeatured: isFeatured === 'true' ? true : isFeatured === 'false' ? false : undefined,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
    });

    return res.status(200).json({
      success: true,
      data: result.tokens,
      pagination: result.pagination,
      message: 'Tokens retrieved successfully from database'
    });
  } catch (error: any) {
    console.error('Error fetching tokens:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch tokens',
      message: error.message
    });
  }
}

// GET /api/tokens-db?address=0x... - Get single token by address
async function getTokenByAddress(req: any, res: any) {
  const { address } = req.query;

  if (!address) {
    return res.status(400).json({
      success: false,
      error: 'Missing token address',
      message: 'Token address is required'
    });
  }

  try {
    const token = await productionDatabaseService.getTokenByAddress(address as string);

    if (!token) {
      return res.status(404).json({
        success: false,
        error: 'Token not found',
        message: 'Token with the specified address does not exist'
      });
    }

    return res.status(200).json({
      success: true,
      data: token,
      message: 'Token retrieved successfully from database'
    });
  } catch (error: any) {
    console.error('Error fetching token:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch token',
      message: error.message
    });
  }
}

// POST /api/tokens-db - Create new token in database
async function createToken(req: any, res: any) {
  const {
    address,
    name,
    symbol,
    creatorAddress,
    creatorId,
    description,
    imageUrl,
    initialPrice
  } = req.body;

  // Validation
  if (!address || !name || !symbol || !creatorAddress) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      message: 'Address, name, symbol, and creator address are required'
    });
  }

  try {
    const newToken = await productionDatabaseService.createToken({
      address: address.toLowerCase(),
      name,
      symbol: symbol.toUpperCase(),
      creatorAddress: creatorAddress.toLowerCase(),
      creatorId,
      description,
      imageUrl,
      initialPrice,
    });

    return res.status(201).json({
      success: true,
      data: newToken,
      message: 'Token created successfully in database'
    });
  } catch (error: any) {
    console.error('Error creating token:', error);

    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Token already exists',
        message: 'A token with this address already exists in the database'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create token',
      message: error.message
    });
  }
}

// PUT /api/tokens-db - Update token status or metadata
async function updateToken(req: any, res: any) {
  const { address, ...updateData } = req.body;

  if (!address) {
    return res.status(400).json({
      success: false,
      error: 'Missing token address',
      message: 'Token address is required for updates'
    });
  }

  try {
    const updatedToken = await productionDatabaseService.updateTokenStatus(
      address.toLowerCase(),
      updateData
    );

    return res.status(200).json({
      success: true,
      data: updatedToken,
      message: 'Token updated successfully in database'
    });
  } catch (error: any) {
    console.error('Error updating token:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Token not found',
        message: 'Token with the specified address does not exist'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to update token',
      message: error.message
    });
  }
}

// DELETE /api/tokens-db?address=0x... - Delete token (soft delete by setting isActive=false)
async function deleteToken(req: any, res: any) {
  const { address } = req.query;

  if (!address) {
    return res.status(400).json({
      success: false,
      error: 'Missing token address',
      message: 'Token address is required for deletion'
    });
  }

  try {
    await productionDatabaseService.updateTokenStatus(address as string, {
      isActive: false,
      isHidden: true,
      hideReason: 'Deleted by request'
    });

    return res.status(200).json({
      success: true,
      message: 'Token deleted successfully from database'
    });
  } catch (error: any) {
    console.error('Error deleting token:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete token',
      message: error.message
    });
  }
}