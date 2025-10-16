const mongoose = require('mongoose');

// Event Schema
const EventSchema = new mongoose.Schema({
  eventType: {
    type: String,
    required: true,
    enum: [
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
    ]
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  walletAddress: {
    type: String,
    lowercase: true,
    index: true
  },
  sessionId: {
    type: String,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    referrer: String,
    utmSource: String,
    utmMedium: String,
    utmCampaign: String,
    country: String,
    city: String,
    device: String,
    browser: String,
    os: String
  }
}, {
  timestamps: true,
  collection: 'analytics_events'
});

// Token Analytics Schema
const TokenAnalyticsSchema = new mongoose.Schema({
  tokenAddress: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  tokenId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Token',
    index: true
  },
  creator: {
    type: String,
    lowercase: true,
    index: true
  },
  totalSupply: {
    type: String,
    default: '0'
  },
  circulatingSupply: {
    type: String,
    default: '0'
  },
  totalHolders: {
    type: Number,
    default: 0
  },
  totalTransactions: {
    type: Number,
    default: 0
  },
  totalVolume: {
    type: String,
    default: '0'
  },
  marketCap: {
    type: String,
    default: '0'
  },
  currentPrice: {
    type: String,
    default: '0'
  },
  priceChange24h: {
    type: Number,
    default: 0
  },
  volume24h: {
    type: String,
    default: '0'
  },
  holders: [{
    address: {
      type: String,
      lowercase: true
    },
    balance: String,
    percentage: Number
  }],
  transactions: {
    buys: { type: Number, default: 0 },
    sells: { type: Number, default: 0 },
    transfers: { type: Number, default: 0 }
  },
  hourlyStats: [{
    hour: Date,
    price: String,
    volume: String,
    transactions: Number
  }],
  dailyStats: [{
    date: Date,
    price: String,
    volume: String,
    transactions: Number,
    holders: Number,
    marketCap: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'token_analytics'
});

// User Analytics Schema
const UserAnalyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  walletAddress: {
    type: String,
    lowercase: true,
    index: true
  },
  totalTransactions: {
    type: Number,
    default: 0
  },
  totalVolume: {
    type: String,
    default: '0'
  },
  tokensCreated: {
    type: Number,
    default: 0
  },
  tokensHeld: [{
    tokenAddress: String,
    balance: String,
    value: String
  }],
  firstSeen: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  sessions: [{
    sessionId: String,
    startTime: Date,
    endTime: Date,
    duration: Number,
    pageViews: Number,
    events: Number
  }],
  activities: {
    tokensCreated: { type: Number, default: 0 },
    tokensPurchased: { type: Number, default: 0 },
    tokensSold: { type: Number, default: 0 },
    walletConnections: { type: Number, default: 0 },
    pageViews: { type: Number, default: 0 }
  },
  kpis: {
    ltv: { type: String, default: '0' }, // Lifetime Value
    frequency: { type: Number, default: 0 }, // Activity frequency
    engagement: { type: Number, default: 0 }, // Engagement score
    churnRisk: { type: Number, default: 0 } // Churn risk score
  }
}, {
  collection: 'user_analytics'
});

// Platform Analytics Schema
const PlatformAnalyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true
  },
  metrics: {
    totalUsers: { type: Number, default: 0 },
    activeUsers: { type: Number, default: 0 },
    newUsers: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    newTokens: { type: Number, default: 0 },
    totalTransactions: { type: Number, default: 0 },
    totalVolume: { type: String, default: '0' },
    platformFees: { type: String, default: '0' },
    averageSessionDuration: { type: Number, default: 0 },
    bounceRate: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 }
  },
  transactions: {
    buys: { type: Number, default: 0 },
    sells: { type: Number, default: 0 },
    tokenCreations: { type: Number, default: 0 }
  },
  revenue: {
    platformFees: { type: String, default: '0' },
    creationFees: { type: String, default: '0' },
    tradingFees: { type: String, default: '0' }
  },
  performance: {
    averageResponseTime: { type: Number, default: 0 },
    errorRate: { type: Number, default: 0 },
    uptime: { type: Number, default: 100 }
  },
  hourly: [{
    hour: Number,
    users: Number,
    transactions: Number,
    volume: String
  }]
}, {
  collection: 'platform_analytics'
});

// Real-time Metrics Schema
const RealTimeMetricsSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['users', 'transactions', 'volume', 'tokens', 'performance']
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  collection: 'realtime_metrics'
});

// Create indexes
EventSchema.index({ eventType: 1, timestamp: -1 });
EventSchema.index({ userId: 1, timestamp: -1 });
EventSchema.index({ walletAddress: 1, timestamp: -1 });
EventSchema.index({ sessionId: 1, timestamp: -1 });

TokenAnalyticsSchema.index({ tokenAddress: 1 });
TokenAnalyticsSchema.index({ creator: 1 });
TokenAnalyticsSchema.index({ 'dailyStats.date': -1 });
TokenAnalyticsSchema.index({ totalVolume: -1 });

UserAnalyticsSchema.index({ userId: 1 });
UserAnalyticsSchema.index({ walletAddress: 1 });
UserAnalyticsSchema.index({ lastActive: -1 });

PlatformAnalyticsSchema.index({ date: -1 });
PlatformAnalyticsSchema.index({ 'metrics.totalVolume': -1 });

RealTimeMetricsSchema.index({ type: 1, timestamp: -1 });

// Create models
const Event = mongoose.model('Event', EventSchema);
const TokenAnalytics = mongoose.model('TokenAnalytics', TokenAnalyticsSchema);
const UserAnalytics = mongoose.model('UserAnalytics', UserAnalyticsSchema);
const PlatformAnalytics = mongoose.model('PlatformAnalytics', PlatformAnalyticsSchema);
const RealTimeMetrics = mongoose.model('RealTimeMetrics', RealTimeMetricsSchema);

module.exports = {
  Event,
  TokenAnalytics,
  UserAnalytics,
  PlatformAnalytics,
  RealTimeMetrics
};