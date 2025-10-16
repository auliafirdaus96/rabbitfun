import { PrismaClient, Prisma } from '../generated/prisma';
import logger from '../utils/logger';
import Redis from 'ioredis';

// Query performance monitoring
interface QueryMetrics {
  queryType: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  rowCount?: number;
  cacheHit?: boolean;
}

class QueryPerformanceMonitor {
  private metrics: QueryMetrics[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics

  recordMetric(metric: QueryMetrics) {
    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  getMetrics(queryType?: string, timeRange?: number): QueryMetrics[] {
    let filtered = this.metrics;

    if (queryType) {
      filtered = filtered.filter(m => m.queryType === queryType);
    }

    if (timeRange) {
      const cutoff = new Date(Date.now() - timeRange);
      filtered = filtered.filter(m => m.timestamp > cutoff);
    }

    return filtered;
  }

  getAverageQueryTime(queryType?: string): number {
    const metrics = this.getMetrics(queryType);
    if (metrics.length === 0) return 0;

    const totalTime = metrics.reduce((sum, m) => sum + m.duration, 0);
    return totalTime / metrics.length;
  }

  getSlowQueries(threshold: number = 1000): QueryMetrics[] {
    return this.metrics.filter(m => m.duration > threshold);
  }

  getCacheHitRate(): number {
    const metrics = this.getMetrics();
    if (metrics.length === 0) return 0;

    const hits = metrics.filter(m => m.cacheHit).length;
    return (hits / metrics.length) * 100;
  }
}

export class OptimizedDatabaseService {
  private prisma: PrismaClient;
  private redis: Redis | null = null;
  private performanceMonitor = new QueryPerformanceMonitor();
  private queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  constructor() {
    this.prisma = new PrismaClient({
      log: ['error', 'warn', 'query'],
      errorFormat: 'pretty',
      // Connection pooling for better performance
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });

    // Initialize Redis if available
    if (process.env.REDIS_URL) {
      this.redis = new Redis(process.env.REDIS_URL, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });
    }

    // Set up query logging
    this.prisma.$use(async (params, next) => {
      const startTime = Date.now();

      try {
        const result = await next(params);
        const duration = Date.now() - startTime;

        this.performanceMonitor.recordMetric({
          queryType: `${params.model}.${params.action}`,
          duration,
          timestamp: new Date(),
          success: true,
          rowCount: Array.isArray(result) ? result.length : 1
        });

        // Log slow queries
        if (duration > 1000) {
          logger.warn(`Slow query detected`, {
            query: `${params.model}.${params.action}`,
            duration: `${duration}ms`,
            args: params.args
          });
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        this.performanceMonitor.recordMetric({
          queryType: `${params.model}.${params.action}`,
          duration,
          timestamp: new Date(),
          success: false
        });

        logger.error(`Query failed`, {
          query: `${params.model}.${params.action}`,
          duration: `${duration}ms`,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        throw error;
      }
    });
  }

  // Cache management
  private getCacheKey(key: string): string {
    return `db_cache:${key}`;
  }

  private async getFromCache<T>(key: string): Promise<T | null> {
    if (this.redis) {
      try {
        const cached = await this.redis.get(this.getCacheKey(key));
        return cached ? JSON.parse(cached) : null;
      } catch (error) {
        logger.warn('Redis cache get failed:', error);
      }
    }

    // Fallback to in-memory cache
    const cached = this.queryCache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    return null;
  }

  private async setCache<T>(key: string, data: T, ttlMs: number = 300000): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.setex(
          this.getCacheKey(key),
          Math.ceil(ttlMs / 1000),
          JSON.stringify(data)
        );
        return;
      } catch (error) {
        logger.warn('Redis cache set failed:', error);
      }
    }

    // Fallback to in-memory cache
    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });

    // Clean up expired in-memory cache entries
    this.cleanupInMemoryCache();
  }

  private cleanupInMemoryCache(): void {
    const now = Date.now();
    for (const [key, value] of this.queryCache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.queryCache.delete(key);
      }
    }
  }

  private async invalidateCache(pattern: string): Promise<void> {
    if (this.redis) {
      try {
        const keys = await this.redis.keys(this.getCacheKey(pattern));
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (error) {
        logger.warn('Redis cache invalidation failed:', error);
      }
    }

    // Invalidate in-memory cache
    for (const key of this.queryCache.keys()) {
      if (key.includes(pattern)) {
        this.queryCache.delete(key);
      }
    }
  }

  // Optimized user operations
  async createUser(data: Prisma.UserCreateInput) {
    const startTime = Date.now();
    try {
      const user = await this.prisma.user.create({ data });

      // Invalidate relevant caches
      await this.invalidateCache(`user:*`);
      await this.invalidateCache(`users:*`);

      logger.info(`Created user: ${user.walletAddress}`);
      return user;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    } finally {
      logger.debug(`createUser took ${Date.now() - startTime}ms`);
    }
  }

  async getUserByWalletAddress(walletAddress: string, useCache: boolean = true) {
    const cacheKey = `user:${walletAddress}`;

    if (useCache) {
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        this.performanceMonitor.recordMetric({
          queryType: 'user.findByWalletAddress',
          duration: 0,
          timestamp: new Date(),
          success: true,
          cacheHit: true
        });
        return cached;
      }
    }

    const startTime = Date.now();
    try {
      const user = await this.prisma.user.findUnique({
        where: { walletAddress },
        select: {
          // Only select necessary fields
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

      if (useCache && user) {
        await this.setCache(cacheKey, user, 300000); // 5 minutes
      }

      return user;
    } catch (error) {
      logger.error('Error fetching user by wallet address:', error);
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.performanceMonitor.recordMetric({
        queryType: 'user.findByWalletAddress',
        duration,
        timestamp: new Date(),
        success: true,
        cacheHit: false
      });
    }
  }

  // Optimized token operations with advanced caching
  async getTokenByAddress(address: string, useCache: boolean = true) {
    const cacheKey = `token:${address}`;

    if (useCache) {
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const startTime = Date.now();
    try {
      const token = await this.prisma.token.findUnique({
        where: { address },
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

      if (useCache && token) {
        // Cache tokens for shorter time as they change frequently
        await this.setCache(cacheKey, token, 60000); // 1 minute
      }

      return token;
    } catch (error) {
      logger.error('Error fetching token by address:', error);
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      logger.debug(`getTokenByAddress took ${duration}ms`);
    }
  }

  async getAllTokens(params: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
    creator?: string;
    graduated?: boolean;
    isFeatured?: boolean;
    isVerified?: boolean;
    useCache?: boolean;
  }) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      creator,
      graduated,
      isFeatured,
      isVerified,
      useCache = true
    } = params;

    const cacheKey = `tokens:${JSON.stringify(params)}`;

    if (useCache && page === 1) { // Only cache first page
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const startTime = Date.now();
    try {
      const skip = (page - 1) * limit;
      const where: Prisma.TokenWhereInput = {
        isActive: true,
        isHidden: false,
        ...(creator && { creatorAddress: creator }),
        ...(graduated !== undefined && { graduated }),
        ...(isFeatured !== undefined && { isFeatured }),
        ...(isVerified !== undefined && { isVerified }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { symbol: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        })
      };

      // Optimized query with proper indexing
      const [tokens, total] = await Promise.all([
        this.prisma.token.findMany({
          where,
          skip,
          take: Math.min(limit, 100), // Limit max results
          orderBy: { [sortBy]: sortOrder },
          select: {
            id: true,
            address: true,
            name: true,
            symbol: true,
            imageUrl: true,
            creatorAddress: true,
            currentPrice: true,
            marketCap: true,
            raisedAmount: true,
            isGraduated: true,
            isFeatured: true,
            isVerified: true,
            createdAt: true,
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
        }),
        this.prisma.token.count({ where })
      ]);

      const result = {
        tokens,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

      if (useCache && page === 1) {
        await this.setCache(cacheKey, result, 120000); // 2 minutes
      }

      return result;
    } catch (error) {
      logger.error('Error fetching all tokens:', error);
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      logger.debug(`getAllTokens took ${duration}ms`);
    }
  }

  // Batch operations for better performance
  async createMultipleTokens(tokens: Prisma.TokenCreateInput[]) {
    const startTime = Date.now();
    try {
      // Use transaction for batch insert
      const result = await this.prisma.$transaction(
        tokens.map(token => this.prisma.token.create({ data: token }))
      );

      // Invalidate caches
      await this.invalidateCache('tokens:*');

      logger.info(`Created ${result.length} tokens`);
      return result;
    } catch (error) {
      logger.error('Error creating multiple tokens:', error);
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      logger.debug(`createMultipleTokens took ${duration}ms`);
    }
  }

  // Optimized analytics with pre-computation
  async getTokenAnalytics(tokenId: string, days: number = 30, useCache: boolean = true) {
    const cacheKey = `analytics:${tokenId}:${days}`;

    if (useCache) {
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const startTime = Date.now();
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Use raw query for better performance on large datasets
      const analytics = await this.prisma.$queryRaw`
        SELECT
          date,
          volume,
          price,
          market_cap,
          holders_count,
          transactions_count
        FROM token_analytics
        WHERE token_id = ${tokenId}
          AND date >= ${startDate}
        ORDER BY date ASC
      `;

      if (useCache) {
        await this.setCache(cacheKey, analytics, 300000); // 5 minutes
      }

      return analytics;
    } catch (error) {
      logger.error('Error fetching token analytics:', error);
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      logger.debug(`getTokenAnalytics took ${duration}ms`);
    }
  }

  // Optimized search with full-text search
  async searchTokens(query: string, limit: number = 20) {
    const cacheKey = `search:${query}:${limit}`;

    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const startTime = Date.now();
    try {
      // Use database-specific full-text search if available
      const tokens = await this.prisma.token.findMany({
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
        select: {
          id: true,
          address: true,
          name: true,
          symbol: true,
          imageUrl: true,
          currentPrice: true,
          marketCap: true,
          isVerified: true,
          creator: {
            select: {
              walletAddress: true,
              username: true,
              displayName: true
            }
          }
        }
      });

      await this.setCache(cacheKey, tokens, 180000); // 3 minutes

      return tokens;
    } catch (error) {
      logger.error('Error searching tokens:', error);
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      logger.debug(`searchTokens took ${duration}ms`);
    }
  }

  // Performance monitoring methods
  getQueryMetrics() {
    return this.performanceMonitor;
  }

  async getDatabaseStats() {
    try {
      const stats = await this.prisma.$queryRaw`
        SELECT
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_tuples,
          n_dead_tup as dead_tuples
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC
      `;

      return stats;
    } catch (error) {
      logger.error('Error fetching database stats:', error);
      return [];
    }
  }

  // Optimized transaction operations
  async createTransaction(data: Prisma.TransactionCreateInput) {
    const startTime = Date.now();
    try {
      const transaction = await this.prisma.transaction.create({ data });

      // Invalidate relevant caches
      await this.invalidateCache(`token:${data.tokenAddress}*`);
      await this.invalidateCache(`transactions:*`);

      logger.info(`Created transaction: ${transaction.hash}`);
      return transaction;
    } catch (error) {
      logger.error('Error creating transaction:', error);
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      logger.debug(`createTransaction took ${duration}ms`);
    }
  }

  // Batch transaction processing
  async processTransactionsBatch(transactions: Prisma.TransactionCreateInput[]) {
    const startTime = Date.now();
    try {
      const result = await this.prisma.$transaction(
        transactions.map(tx => this.prisma.transaction.create({ data: tx }))
      );

      // Invalidate caches
      await this.invalidateCache('transactions:*');
      await this.invalidateCache('token:*');

      logger.info(`Processed ${result.length} transactions`);
      return result;
    } catch (error) {
      logger.error('Error processing transaction batch:', error);
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      logger.debug(`processTransactionsBatch took ${duration}ms`);
    }
  }

  // Health check with performance metrics
  async healthCheck() {
    try {
      const startTime = Date.now();

      // Basic connectivity check
      await this.prisma.$queryRaw`SELECT 1`;

      const connectionTime = Date.now() - startTime;

      // Get performance metrics
      const queryMetrics = this.getQueryMetrics();
      const avgQueryTime = queryMetrics.getAverageQueryTime();
      const slowQueries = queryMetrics.getSlowQueries();
      const cacheHitRate = queryMetrics.getCacheHitRate();

      // Redis health check
      let redisHealth = 'disconnected';
      if (this.redis) {
        try {
          await this.redis.ping();
          redisHealth = 'connected';
        } catch (error) {
          redisHealth = 'error';
        }
      }

      return {
        status: 'healthy',
        timestamp: new Date(),
        connectionTime,
        performance: {
          averageQueryTime: avgQueryTime,
          slowQueriesCount: slowQueries.length,
          cacheHitRate
        },
        redis: redisHealth
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      throw error;
    }
  }

  // Cleanup
  async disconnect() {
    try {
      if (this.redis) {
        await this.redis.disconnect();
      }

      await this.prisma.$disconnect();
      logger.info('Database disconnected');
    } catch (error) {
      logger.error('Error disconnecting from database:', error);
      throw error;
    }
  }
}

export const optimizedDatabaseService = new OptimizedDatabaseService();