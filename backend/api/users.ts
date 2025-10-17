import productionDatabaseService from '../src/services/productionDatabaseService';

// User Management API with real database integration
export default async function handler(req: any, res: any) {
  const { method, query, body } = req;

  try {
    switch (method) {
      case 'GET':
        if (query.walletAddress) {
          return getUserByWallet(req, res);
        } else {
          return getUsers(req, res);
        }

      case 'POST':
        return createOrUpdateUser(req, res);

      case 'PUT':
        return updateUser(req, res);

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        return res.status(405).json({
          error: 'Method not allowed',
          message: `Method ${method} not allowed`
        });
    }
  } catch (error: any) {
    console.error('User API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

// GET /api/users - Get users with pagination
async function getUsers(req: any, res: any) {
  const { page = 1, limit = 20, search, isActive } = req.query;

  try {
    const prisma = productionDatabaseService.getPrismaClient();

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = {};

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.OR = [
        { walletAddress: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          walletAddress: true,
          email: true,
          username: true,
          displayName: true,
          avatar: true,
          isActive: true,
          isVerified: true,
          isAdmin: true,
          createdAt: true,
          lastLoginAt: true,
          loginCount: true,
          _count: {
            select: {
              createdTokens: true,
              transactions: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
      message: 'Users retrieved successfully from database'
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      message: error.message
    });
  }
}

// GET /api/users?walletAddress=0x... - Get user by wallet address
async function getUserByWallet(req: any, res: any) {
  const { walletAddress } = req.query;

  if (!walletAddress) {
    return res.status(400).json({
      success: false,
      error: 'Missing wallet address',
      message: 'Wallet address is required'
    });
  }

  try {
    const user = await productionDatabaseService.getUserByWallet(walletAddress.toLowerCase());

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User with the specified wallet address does not exist'
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
      message: 'User retrieved successfully from database'
    });
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
      message: error.message
    });
  }
}

// POST /api/users - Create or update user
async function createOrUpdateUser(req: any, res: any) {
  const {
    walletAddress,
    email,
    username,
    displayName,
    avatar,
    bio,
    twitterHandle,
    telegramHandle,
    website
  } = req.body;

  if (!walletAddress) {
    return res.status(400).json({
      success: false,
      error: 'Missing wallet address',
      message: 'Wallet address is required'
    });
  }

  try {
    const user = await productionDatabaseService.createOrUpdateUser({
      walletAddress: walletAddress.toLowerCase(),
      email,
      username,
      displayName,
      avatar,
      bio,
      twitterHandle,
      telegramHandle,
      website,
    });

    return res.status(201).json({
      success: true,
      data: user,
      message: 'User created or updated successfully in database'
    });
  } catch (error: any) {
    console.error('Error creating/updating user:', error);

    // Handle unique constraint violations
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0];
      return res.status(409).json({
        success: false,
        error: 'Duplicate entry',
        message: `A user with this ${field} already exists`
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create or update user',
      message: error.message
    });
  }
}

// PUT /api/users - Update user profile
async function updateUser(req: any, res: any) {
  const { walletAddress, ...updateData } = req.body;

  if (!walletAddress) {
    return res.status(400).json({
      success: false,
      error: 'Missing wallet address',
      message: 'Wallet address is required for updates'
    });
  }

  try {
    const prisma = productionDatabaseService.getPrismaClient();

    const updatedUser = await prisma.user.update({
      where: { walletAddress: walletAddress.toLowerCase() },
      data: updateData,
      select: {
        id: true,
        walletAddress: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        bio: true,
        twitterHandle: true,
        telegramHandle: true,
        website: true,
        isActive: true,
        isVerified: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      data: updatedUser,
      message: 'User profile updated successfully in database'
    });
  } catch (error: any) {
    console.error('Error updating user:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User with the specified wallet address does not exist'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to update user',
      message: error.message
    });
  }
}