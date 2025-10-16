const {
  Event,
  TokenAnalytics,
  UserAnalytics,
  PlatformAnalytics,
  RealTimeMetrics
} = require('../models/Analytics');
const redis = require('redis');
const { promisify } = require('util');

class AnalyticsController {
  constructor() {
    this.redisClient = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD
    });
    this.redisGet = promisify(this.redisClient.get).bind(this.redisClient);
    this.redisSet = promisify(this.redisClient.set).bind(this.redisClient);
    this.redisExpire = promisify(this.redisClient.expire).bind(this.redisClient);
  }

  // Track Event
  async trackEvent(req, res) {
    try {
      const { eventType, data = {}, metadata = {} } = req.body;
      const userId = req.user?.id;
      const walletAddress = req.user?.walletAddress;

      // Validate event type
      const validEventTypes = [
        'token_created',
        'token_purchased',
        'token_sold',
        'wallet_connected',
        'transaction_completed',
        'transaction_failed',
        'user_registered',
        'user_active',
        'page_view',
        'button_click',
        'form_submit'
      ];

      if (!validEventTypes.includes(eventType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid event type'
        });
      }

      // Create event
      const event = new Event({
        eventType,
        userId,
        walletAddress,
        sessionId: req.sessionID,
        data,
        metadata: {
          ...metadata,
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip,
          referrer: req.get('Referrer')
        }
      });

      await event.save();

      // Update real-time metrics
      await this.updateRealTimeMetrics(eventType, data);

      // Update user analytics if user exists
      if (userId) {
        await this.updateUserAnalytics(userId, eventType, data);
      }

      // Update token analytics if applicable
      if (data.tokenAddress) {
        await this.updateTokenAnalytics(data.tokenAddress, eventType, data);
      }

      // Cache event for faster access
      const cacheKey = `event:${event._id}`;
      await this.redisSet(cacheKey, JSON.stringify(event), 3600); // 1 hour TTL

      res.status(201).json({
        success: true,
        data: {
          eventId: event._id,
          timestamp: event.timestamp
        }
      });
    } catch (error) {
      console.error('Error tracking event:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to track event'
      });
    }
  }

  // Get Token Analytics
  async getTokenAnalytics(req, res) {
    try {
      const { tokenAddress } = req.params;
      const { period = '24h' } = req.query;

      // Check cache first
      const cacheKey = `token_analytics:${tokenAddress}:${period}`;
      const cached = await this.redisGet(cacheKey);

      if (cached) {
        return res.json({
          success: true,
          data: JSON.parse(cached)
        });
      }

      const analytics = await TokenAnalytics.findOne({
        tokenAddress: tokenAddress.toLowerCase()
      });

      if (!analytics) {
        return res.status(404).json({
          success: false,
          message: 'Token analytics not found'
        });
      }

      // Calculate period-specific data
      const periodData = this.calculatePeriodData(analytics, period);

      const result = {
        tokenAddress,
        ...analytics.toObject(),
        ...periodData
      };

      // Cache result
      await this.redisSet(cacheKey, JSON.stringify(result), 300); // 5 minutes TTL

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error getting token analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get token analytics'
      });
    }
  }

  // Get User Analytics
  async getUserAnalytics(req, res) {
    try {
      const userId = req.user.id;

      const analytics = await UserAnalytics.findOne({ userId })
        .populate('userId', 'username email createdAt');

      if (!analytics) {
        return res.status(404).json({
          success: false,
          message: 'User analytics not found'
        });
      }

      // Calculate additional metrics
      const additionalMetrics = await this.calculateUserMetrics(userId);

      const result = {
        ...analytics.toObject(),
        ...additionalMetrics
      };

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error getting user analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user analytics'
      });
    }
  }

  // Get Platform Analytics
  async getPlatformAnalytics(req, res) {
    try {
      const { period = '24h', metric } = req.query;

      // Check cache
      const cacheKey = `platform_analytics:${period}:${metric || 'all'}`;
      const cached = await this.redisGet(cacheKey);

      if (cached) {
        return res.json({
          success: true,
          data: JSON.parse(cached)
        });
      }

      const now = new Date();
      let startDate;

      switch (period) {
        case '1h':
          startDate = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      // Get platform analytics for the period
      const analytics = await PlatformAnalytics.find({
        date: { $gte: startDate, $lte: now }
      }).sort({ date: -1 });

      // Get real-time metrics
      const realTimeMetrics = await this.getRealTimeMetrics();

      // Calculate aggregated data
      const aggregatedData = this.aggregatePlatformData(analytics, period);

      const result = {
        period,
        startDate,
        endDate: now,
        ...aggregatedData,
        realTime: realTimeMetrics
      };

      // Cache result
      await this.redisSet(cacheKey, JSON.stringify(result), 60); // 1 minute TTL

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error getting platform analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get platform analytics'
      });
    }
  }

  // Get Real-time Dashboard Data
  async getDashboardData(req, res) {
    try {
      const cacheKey = 'dashboard_data';
      const cached = await this.redisGet(cacheKey);

      if (cached) {
        return res.json({
          success: true,
          data: JSON.parse(cached)
        });
      }

      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get real-time metrics
      const [realTimeUsers, realTimeTransactions, realTimeVolume] = await Promise.all([
        this.getRealTimeMetric('users'),
        this.getRealTimeMetric('transactions'),
        this.getRealTimeMetric('volume')
      ]);

      // Get 24h changes
      const [users24h, transactions24h, volume24h] = await Promise.all([
        this.getMetricChange('users', last24h),
        this.getMetricChange('transactions', last24h),
        this.getMetricChange('volume', last24h)
      ]);

      // Get top tokens
      const topTokens = await TokenAnalytics.find()
        .sort({ totalVolume: -1 })
        .limit(10)
        .select('tokenAddress totalVolume totalHolders currentPrice priceChange24h');

      // Get recent events
      const recentEvents = await Event.find()
        .sort({ timestamp: -1 })
        .limit(50)
        .select('eventType data timestamp');

      const result = {
        realTime: {
          activeUsers: realTimeUsers,
          transactions: realTimeTransactions,
          volume: realTimeVolume
        },
        changes24h: {
          users: users24h,
          transactions: transactions24h,
          volume: volume24h
        },
        topTokens,
        recentEvents,
        lastUpdated: now
      };

      // Cache for 30 seconds
      await this.redisSet(cacheKey, JSON.stringify(result), 30);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get dashboard data'
      });
    }
  }

  // Get Analytics Report
  async getAnalyticsReport(req, res) {
    try {
      const {
        startDate,
        endDate,
        reportType = 'comprehensive',
        format = 'json'
      } = req.query;

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date range'
        });
      }

      let reportData;

      switch (reportType) {
        case 'tokens':
          reportData = await this.generateTokensReport(start, end);
          break;
        case 'users':
          reportData = await this.generateUsersReport(start, end);
          break;
        case 'transactions':
          reportData = await this.generateTransactionsReport(start, end);
          break;
        case 'comprehensive':
        default:
          reportData = await this.generateComprehensiveReport(start, end);
      }

      if (format === 'csv') {
        const csv = this.convertToCSV(reportData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=analytics-report-${startDate}-${endDate}.csv`);
        return res.send(csv);
      }

      res.json({
        success: true,
        data: reportData
      });
    } catch (error) {
      console.error('Error generating analytics report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate analytics report'
      });
    }
  }

  // Helper methods
  async updateRealTimeMetrics(eventType, data) {
    try {
      const timestamp = new Date();

      // Update different metrics based on event type
      switch (eventType) {
        case 'user_active':
          await this.setRealTimeMetric('users', 'increment');
          break;
        case 'token_purchased':
        case 'token_sold':
          await this.setRealTimeMetric('transactions', 'increment');
          if (data.amount) {
            await this.setRealTimeMetric('volume', 'add', data.amount);
          }
          break;
        case 'token_created':
          await this.setRealTimeMetric('tokens', 'increment');
          break;
      }
    } catch (error) {
      console.error('Error updating real-time metrics:', error);
    }
  }

  async updateUserAnalytics(userId, eventType, data) {
    try {
      const update = {
        lastActive: new Date(),
        $inc: {}
      };

      switch (eventType) {
        case 'token_created':
          update.$inc['activities.tokensCreated'] = 1;
          update.$inc.tokensCreated = 1;
          break;
        case 'token_purchased':
          update.$inc['activities.tokensPurchased'] = 1;
          update.$inc.totalTransactions = 1;
          if (data.amount) {
            update.$inc.totalVolume = data.amount;
          }
          break;
        case 'token_sold':
          update.$inc['activities.tokensSold'] = 1;
          update.$inc.totalTransactions = 1;
          break;
        case 'wallet_connected':
          update.$inc['activities.walletConnections'] = 1;
          break;
        case 'page_view':
          update.$inc['activities.pageViews'] = 1;
          break;
      }

      await UserAnalytics.findOneAndUpdate(
        { userId },
        update,
        { upsert: true, new: true }
      );
    } catch (error) {
      console.error('Error updating user analytics:', error);
    }
  }

  async updateTokenAnalytics(tokenAddress, eventType, data) {
    try {
      const update = {
        tokenAddress: tokenAddress.toLowerCase(),
        updatedAt: new Date(),
        $inc: {
          totalTransactions: 1
        }
      };

      if (eventType === 'token_purchased' || eventType === 'token_sold') {
        update.$inc[`transactions.${eventType === 'token_purchased' ? 'buys' : 'sells'}`] = 1;
        if (data.amount) {
          update.$inc.totalVolume = data.amount;
        }
      }

      await TokenAnalytics.findOneAndUpdate(
        { tokenAddress: tokenAddress.toLowerCase() },
        update,
        { upsert: true, new: true }
      );
    } catch (error) {
      console.error('Error updating token analytics:', error);
    }
  }

  calculatePeriodData(analytics, period) {
    const now = new Date();
    let startDate;

    switch (period) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Filter hourly/daily stats based on period
    const filteredStats = analytics.hourlyStats.filter(stat => stat.hour >= startDate);

    return {
      periodStats: filteredStats,
      volumePeriod: filteredStats.reduce((sum, stat) =>
        parseFloat(sum) + parseFloat(stat.volume), 0
      ).toString(),
      transactionsPeriod: filteredStats.reduce((sum, stat) => sum + stat.transactions, 0)
    };
  }

  async getRealTimeMetrics() {
    try {
      const metrics = await RealTimeMetrics.find({
        timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
      }).sort({ timestamp: -1 });

      const result = {};
      metrics.forEach(metric => {
        if (!result[metric.type]) {
          result[metric.type] = metric.value;
        }
      });

      return result;
    } catch (error) {
      console.error('Error getting real-time metrics:', error);
      return {};
    }
  }

  async getRealTimeMetric(type) {
    try {
      const metric = await RealTimeMetrics.findOne({ type })
        .sort({ timestamp: -1 });

      return metric ? metric.value : 0;
    } catch (error) {
      console.error('Error getting real-time metric:', error);
      return 0;
    }
  }

  async setRealTimeMetric(type, operation, value = 1) {
    try {
      const current = await this.getRealTimeMetric(type);
      let newValue;

      switch (operation) {
        case 'increment':
          newValue = current + 1;
          break;
        case 'add':
          newValue = parseFloat(current) + parseFloat(value);
          break;
        default:
          newValue = value;
      }

      const metric = new RealTimeMetrics({
        type,
        value: newValue,
        timestamp: new Date()
      });

      await metric.save();
    } catch (error) {
      console.error('Error setting real-time metric:', error);
    }
  }

  aggregatePlatformData(analytics, period) {
    if (!analytics || analytics.length === 0) {
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalTokens: 0,
        totalTransactions: 0,
        totalVolume: '0',
        platformFees: '0'
      };
    }

    const aggregated = analytics.reduce((acc, day) => {
      acc.totalUsers += day.metrics.totalUsers;
      acc.activeUsers += day.metrics.activeUsers;
      acc.newUsers += day.metrics.newUsers;
      acc.totalTokens += day.metrics.totalTokens;
      acc.newTokens += day.metrics.newTokens;
      acc.totalTransactions += day.metrics.totalTransactions;
      acc.totalVolume = (parseFloat(acc.totalVolume) + parseFloat(day.metrics.totalVolume)).toString();
      acc.platformFees = (parseFloat(acc.platformFees) + parseFloat(day.revenue.platformFees)).toString();
      return acc;
    }, {
      totalUsers: 0,
      activeUsers: 0,
      newUsers: 0,
      totalTokens: 0,
      newTokens: 0,
      totalTransactions: 0,
      totalVolume: '0',
      platformFees: '0'
    });

    return aggregated;
  }

  async calculateUserMetrics(userId) {
    try {
      const events = await Event.countDocuments({ userId });
      const tokensCreated = await TokenAnalytics.countDocuments({ creator: userId });

      return {
        totalEvents: events,
        tokensCreatedCount: tokensCreated
      };
    } catch (error) {
      console.error('Error calculating user metrics:', error);
      return {};
    }
  }

  async getMetricChange(metric, since) {
    try {
      const events = await Event.countDocuments({
        eventType: metric === 'users' ? 'user_active' :
                  metric === 'transactions' ? 'token_purchased' : 'user_active',
        timestamp: { $gte: since }
      });

      return events;
    } catch (error) {
      console.error('Error getting metric change:', error);
      return 0;
    }
  }

  async generateComprehensiveReport(startDate, endDate) {
    // Implementation for comprehensive report generation
    return {
      period: { startDate, endDate },
      summary: {},
      details: {}
    };
  }

  convertToCSV(data) {
    // Implementation for CSV conversion
    return 'csv,data';
  }
}

module.exports = new AnalyticsController();