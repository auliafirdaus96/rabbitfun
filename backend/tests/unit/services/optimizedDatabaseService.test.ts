import { OptimizedDatabaseService } from '../../../src/services/optimizedDatabaseService';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn()
    },
    token: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn()
    },
    transaction: {
      create: jest.fn()
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
    $use: jest.fn(),
    $disconnect: jest.fn()
  };

  return {
    PrismaClient: jest.fn().mockImplementation(() => mockPrisma)
  };
});

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    setex: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    ping: jest.fn().mockResolvedValue('PONG'),
    disconnect: jest.fn().mockResolvedValue('OK')
  }));
});

describe('OptimizedDatabaseService', () => {
  let service: OptimizedDatabaseService;
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.REDIS_URL = 'redis://localhost:6379';
    service = new OptimizedDatabaseService();
    mockPrisma = (service as any).prisma;
  });

  afterEach(async () => {
    await service.disconnect();
  });

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      const userData = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        username: 'testuser',
        email: 'test@example.com'
      };

      const createdUser = {
        id: '1',
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.user.create.mockResolvedValue(createdUser);

      const result = await service.createUser(userData);

      expect(result).toEqual(createdUser);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({ data: userData });
    });

    it('should handle creation errors', async () => {
      const userData = {
        walletAddress: '0x1234567890123456789012345678901234567890'
      };

      const error = new Error('Database error');
      mockPrisma.user.create.mockRejectedValue(error);

      await expect(service.createUser(userData)).rejects.toThrow(error);
    });
  });

  describe('getUserByWalletAddress', () => {
    it('should get user from cache when available', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const cachedUser = {
        id: '1',
        walletAddress,
        username: 'testuser'
      };

      // Mock cache hit
      jest.spyOn(service as any, 'getFromCache').mockResolvedValue(cachedUser);

      const result = await service.getUserByWalletAddress(walletAddress);

      expect(result).toEqual(cachedUser);
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch user from database when not in cache', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const dbUser = {
        id: '1',
        walletAddress,
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock cache miss
      jest.spyOn(service as any, 'getFromCache').mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(dbUser);
      jest.spyOn(service as any, 'setCache').mockResolvedValue(undefined);

      const result = await service.getUserByWalletAddress(walletAddress);

      expect(result).toEqual(dbUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { walletAddress },
        select: {
          id: true,
          walletAddress: true,
          username: true,
          displayName: true,
          avatar: true,
          email: true,
          role: true,
          isVerified: true,
          createdAt: true,
          updatedAt: true
        }
      });
    });

    it('should handle database errors', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const error = new Error('Database error');

      jest.spyOn(service as any, 'getFromCache').mockResolvedValue(null);
      mockPrisma.user.findUnique.mockRejectedValue(error);

      await expect(service.getUserByWalletAddress(walletAddress)).rejects.toThrow(error);
    });
  });

  describe('getTokenByAddress', () => {
    it('should get token with relations', async () => {
      const tokenAddress = '0x1234567890123456789012345678901234567890';
      const token = {
        id: '1',
        address: tokenAddress,
        name: 'Test Token',
        symbol: 'TEST',
        description: 'Test token description',
        creatorAddress: '0x1234567890123456789012345678901234567890',
        currentPrice: '0.001',
        marketCap: '1000',
        isGraduated: false,
        isFeatured: true,
        isVerified: true,
        createdAt: new Date(),
        creator: {
          walletAddress: '0x1234567890123456789012345678901234567890',
          username: 'creator',
          displayName: 'Creator',
          avatar: 'avatar.jpg'
        },
        _count: {
          transactions: 10,
          tokenFavorites: 5
        }
      };

      mockPrisma.token.findUnique.mockResolvedValue(token);

      const result = await service.getTokenByAddress(tokenAddress);

      expect(result).toEqual(token);
      expect(mockPrisma.token.findUnique).toHaveBeenCalledWith({
        where: { address: tokenAddress },
        select: {
          id: true,
          address: true,
          name: true,
          symbol: true,
          description: true,
          imageUrl: true,
          website: true,
          twitter: true,
          telegram: true,
          creatorAddress: true,
          totalSupply: true,
          soldSupply: true,
          currentPrice: true,
          marketCap: true,
          raisedAmount: true,
          isGraduated: true,
          isFeatured: true,
          isVerified: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          creator: {
            select: {
              walletAddress: true,
              username: true,
              displayName: true,
              avatar: true
            }
          },
          _count: {
            select: {
              transactions: true,
              tokenFavorites: true
            }
          }
        }
      });
    });
  });

  describe('getAllTokens', () => {
    it('should get paginated tokens with filters', async () => {
      const params = {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc' as const,
        search: 'test',
        isVerified: true
      };

      const tokens = [
        {
          id: '1',
          name: 'Test Token',
          symbol: 'TEST',
          address: '0x1234567890123456789012345678901234567890',
          currentPrice: '0.001',
          marketCap: '1000',
          isGraduated: false,
          isFeatured: true,
          isVerified: true,
          createdAt: new Date(),
          creator: {
            walletAddress: '0x1234567890123456789012345678901234567890',
            username: 'creator'
          },
          _count: {
            transactions: 10,
            tokenFavorites: 5
          }
        }
      ];

      mockPrisma.token.findMany.mockResolvedValue(tokens);
      mockPrisma.token.count.mockResolvedValue(1);

      const result = await service.getAllTokens(params);

      expect(result).toEqual({
        tokens,
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          pages: 1
        }
      });

      expect(mockPrisma.token.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          isHidden: false,
          isVerified: true,
          OR: [
            { name: { contains: 'test', mode: 'insensitive' } },
            { symbol: { contains: 'test', mode: 'insensitive' } },
            { description: { contains: 'test', mode: 'insensitive' } }
          ]
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: expect.any(Object)
      });
    });

    it('should handle empty results', async () => {
      const params = { page: 1, limit: 20 };

      mockPrisma.token.findMany.mockResolvedValue([]);
      mockPrisma.token.count.mockResolvedValue(0);

      const result = await service.getAllTokens(params);

      expect(result.tokens).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('createMultipleTokens', () => {
    it('should create multiple tokens in transaction', async () => {
      const tokens = [
        {
          name: 'Token 1',
          symbol: 'TOK1',
          creatorAddress: '0x1234567890123456789012345678901234567890'
        },
        {
          name: 'Token 2',
          symbol: 'TOK2',
          creatorAddress: '0x1234567890123456789012345678901234567890'
        }
      ];

      const createdTokens = [
        { id: '1', ...tokens[0] },
        { id: '2', ...tokens[1] }
      ];

      mockPrisma.$transaction.mockResolvedValue(createdTokens);

      const result = await service.createMultipleTokens(tokens);

      expect(result).toEqual(createdTokens);
      expect(mockPrisma.$transaction).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ data: tokens[0] }),
          expect.objectContaining({ data: tokens[1] })
        ])
      );
    });

    it('should handle transaction errors', async () => {
      const tokens = [
        {
          name: 'Token 1',
          symbol: 'TOK1',
          creatorAddress: '0x1234567890123456789012345678901234567890'
        }
      ];

      const error = new Error('Transaction failed');
      mockPrisma.$transaction.mockRejectedValue(error);

      await expect(service.createMultipleTokens(tokens)).rejects.toThrow(error);
    });
  });

  describe('searchTokens', () => {
    it('should search tokens with query', async () => {
      const query = 'test';
      const limit = 10;

      const tokens = [
        {
          id: '1',
          name: 'Test Token',
          symbol: 'TEST',
          address: '0x1234567890123456789012345678901234567890',
          currentPrice: '0.001',
          marketCap: '1000',
          isVerified: true,
          creator: {
            walletAddress: '0x1234567890123456789012345678901234567890',
            username: 'creator'
          }
        }
      ];

      mockPrisma.token.findMany.mockResolvedValue(tokens);

      const result = await service.searchTokens(query, limit);

      expect(result).toEqual(tokens);
      expect(mockPrisma.token.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            { isActive: true },
            { isHidden: false },
            {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { symbol: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } }
              ]
            }
          ]
        },
        take: limit,
        orderBy: [
          { isVerified: 'desc' },
          { marketCap: 'desc' },
          { createdAt: 'desc' }
        ],
        select: expect.any(Object)
      });
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when all checks pass', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const result = await service.healthCheck();

      expect(result.status).toBe('healthy');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.connectionTime).toBeGreaterThan(0);
      expect(result.performance).toBeDefined();
      expect(result.redis).toBe('connected');
    });

    it('should handle database connection errors', async () => {
      const error = new Error('Database connection failed');
      mockPrisma.$queryRaw.mockRejectedValue(error);

      await expect(service.healthCheck()).rejects.toThrow(error);
    });
  });

  describe('cache management', () => {
    it('should invalidate cache patterns correctly', async () => {
      const mockInvalidate = jest.spyOn(service as any, 'invalidateCache');
      mockInvalidate.mockResolvedValue(undefined);

      const userData = {
        walletAddress: '0x1234567890123456789012345678901234567890'
      };

      await service.createUser(userData);

      expect(mockInvalidate).toHaveBeenCalledWith('user:*');
      expect(mockInvalidate).toHaveBeenCalledWith('users:*');
    });

    it('should handle Redis cache set failures gracefully', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const dbUser = { id: '1', walletAddress };

      jest.spyOn(service as any, 'getFromCache').mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(dbUser);

      // Mock Redis set to fail
      const redisMock = (service as any).redis;
      redisMock.setex.mockRejectedValue(new Error('Redis error'));

      // Should not throw error
      await expect(service.getUserByWalletAddress(walletAddress)).resolves.toEqual(dbUser);
    });
  });

  describe('query performance monitoring', () => {
    it('should track slow queries', async () => {
      const userData = {
        walletAddress: '0x1234567890123456789012345678901234567890'
      };

      // Mock slow query
      jest.useFakeTimers();
      let resolvePromise: (value: any) => void;
      const slowPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockPrisma.user.create.mockReturnValue(slowPromise);

      // Start the operation
      const operationPromise = service.createUser(userData);

      // Advance time by 2 seconds (slow query threshold)
      jest.advanceTimersByTime(2000);

      // Resolve the promise
      resolvePromise!({ id: '1', ...userData });

      await operationPromise;

      // Check if slow query was logged
      expect(mockPrisma.user.create).toHaveBeenCalled();
      jest.useRealTimers();
    });
  });

  describe('cleanup', () => {
    it('should disconnect from database and Redis', async () => {
      await service.disconnect();

      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });
  });
});