import jwt from 'jsonwebtoken';

// Authentication API for Vercel serverless
export default async function handler(req: any, res: any) {
  const { method, body } = req;

  try {
    switch (method) {
      case 'POST':
        if (body.action === 'login') {
          return login(req, res);
        } else if (body.action === 'register') {
          return register(req, res);
        } else if (body.action === 'refresh') {
          return refreshToken(req, res);
        } else if (body.action === 'logout') {
          return logout(req, res);
        }
        break;

      case 'GET':
        if (req.query.action === 'verify') {
          return verifyToken(req, res);
        }
        break;

      default:
        res.setHeader('Allow', ['POST', 'GET']);
        return res.status(405).json({
          error: 'Method not allowed',
          message: `Method ${method} not allowed`
        });
    }
  } catch (error: any) {
    console.error('Auth API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

// POST /api/auth - Login
async function login(req: any, res: any) {
  const { walletAddress, signature } = req.body;

  if (!walletAddress || !signature) {
    return res.status(400).json({
      success: false,
      error: 'Missing credentials',
      message: 'Wallet address and signature are required'
    });
  }

  // Mock user data - akan diganti dengan database nanti
  const mockUser = {
    id: '1',
    walletAddress: walletAddress.toLowerCase(),
    username: `user_${walletAddress.slice(-6)}`,
    email: null,
    avatar: null,
    role: 'user',
    isActive: true,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  };

  // Generate JWT tokens
  const accessToken = generateAccessToken(mockUser);
  const refreshToken = generateRefreshToken(mockUser);

  return res.status(200).json({
    success: true,
    data: {
      user: mockUser,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 604800 // 7 days
      }
    },
    message: 'Login successful'
  });
}

// POST /api/auth - Register
async function register(req: any, res: any) {
  const { walletAddress, username, email } = req.body;

  if (!walletAddress) {
    return res.status(400).json({
      success: false,
      error: 'Missing wallet address',
      message: 'Wallet address is required'
    });
  }

  // Mock user creation
  const newUser = {
    id: Date.now().toString(),
    walletAddress: walletAddress.toLowerCase(),
    username: username || `user_${walletAddress.slice(-6)}`,
    email: email || null,
    avatar: null,
    role: 'user',
    isActive: true,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  };

  // Generate JWT tokens
  const accessToken = generateAccessToken(newUser);
  const refreshToken = generateRefreshToken(newUser);

  return res.status(201).json({
    success: true,
    data: {
      user: newUser,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 604800
      }
    },
    message: 'Registration successful'
  });
}

// POST /api/auth - Refresh Token
async function refreshToken(req: any, res: any) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: 'Missing refresh token',
      message: 'Refresh token is required'
    });
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || 'fallback-secret') as any;

    // Mock user data
    const mockUser = {
      id: decoded.id,
      walletAddress: decoded.walletAddress,
      username: decoded.username,
      role: decoded.role
    };

    // Generate new access token
    const newAccessToken = generateAccessToken(mockUser);

    return res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
        expiresIn: 604800
      },
      message: 'Token refreshed successfully'
    });

  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid refresh token',
      message: 'Refresh token is invalid or expired'
    });
  }
}

// POST /api/auth - Logout
async function logout(req: any, res: any) {
  // In a real implementation, you would invalidate the token
  return res.status(200).json({
    success: true,
    message: 'Logout successful'
  });
}

// GET /api/auth?action=verify - Verify Token
async function verifyToken(req: any, res: any) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Missing token',
      message: 'Access token is required'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: decoded.id,
          walletAddress: decoded.walletAddress,
          username: decoded.username,
          role: decoded.role
        },
        valid: true
      },
      message: 'Token is valid'
    });

  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      message: 'Access token is invalid or expired'
    });
  }
}

// Helper functions
function generateAccessToken(user: any) {
  return jwt.sign(
    {
      id: user.id,
      walletAddress: user.walletAddress,
      username: user.username,
      role: user.role
    },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: '7d' }
  );
}

function generateRefreshToken(user: any) {
  return jwt.sign(
    {
      id: user.id,
      walletAddress: user.walletAddress,
      type: 'refresh'
    },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: '30d' }
  );
}