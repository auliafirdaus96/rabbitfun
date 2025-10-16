# 📊 Analytics & Real-time Data Integration

## 🎯 Analytics Goals for Investor Presentation

### **Key Metrics to Track:**
- **User Engagement**: Page views, time on site, bounce rate
- **Platform Usage**: Token creation, trading volume, user retention
- **Financial Metrics**: Total value locked (TVL), revenue, transaction fees
- **Performance**: Site speed, error rates, uptime
- **Social**: Share rates, mentions, sentiment analysis

## 🛠️ Recommended Analytics Stack

### **1. Google Analytics 4 (Free)**
```javascript
// Install in frontend
npm install react-ga4

// Add to main.tsx
import ReactGA from 'react-ga4';

ReactGA.initialize('G-MEASUREMENT_ID');

// Track page views
ReactGA.send({ hitType: 'pageview', page: window.location.pathname });

// Track custom events
ReactGA.event({
  category: 'Token',
  action: 'Created',
  label: 'RabbitToken',
  value: 1
});
```

### **2. Hotjar (Heatmaps & Recordings)**
```javascript
// Install Hotjar
npm install @hotjar/browser

// Initialize
import { hotjar } from '@hotjar/browser';

hotjar.initialize({
  hjid: 123456,
  hjsv: 6
});
```

### **3. Custom Dashboard (Real-time Metrics)**
```typescript
// Create real-time dashboard
import { useState, useEffect } from 'react';

const AnalyticsDashboard = () => {
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalTransactions: 0,
    totalVolume: 0,
    activeTokens: 0,
    platformRevenue: 0
  });

  // Update metrics every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const data = await fetch('/api/analytics/realtime').then(r => r.json());
      setMetrics(data);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="analytics-dashboard">
      <MetricCard title="Total Users" value={metrics.totalUsers} />
      <MetricCard title="Transactions" value={metrics.totalTransactions} />
      <MetricCard title="Volume (BNB)" value={metrics.totalVolume} />
      <MetricCard title="Active Tokens" value={metrics.activeTokens} />
      <MetricCard title="Revenue (BNB)" value={metrics.platformRevenue} />
    </div>
  );
};
```

## 📈 Backend Analytics Implementation

### **1. Analytics Service**
```typescript
// backend/src/services/analyticsService.ts
export class AnalyticsService {
  async getRealTimeMetrics() {
    const [userCount, txCount, volume, tokens] = await Promise.all([
      this.getActiveUserCount(),
      this.getTransactionCount(),
      this.getTotalVolume(),
      this.getActiveTokenCount()
    ]);

    return {
      totalUsers: userCount,
      totalTransactions: txCount,
      totalVolume: volume,
      activeTokens: tokens,
      platformRevenue: await this.getPlatformRevenue()
    };
  }

  async getActiveUserCount(): Promise<number> {
    // Count unique active users in last 24 hours
    return await db('users')
      .where('last_seen', '>', new Date(Date.now() - 24 * 60 * 60 * 1000))
      .countDistinct('id')
      .first();
  }

  async getTransactionCount(): Promise<number> {
    return await db('transactions')
      .where('created_at', '>', new Date(Date.now() - 24 * 60 * 60 * 1000))
      .count('id')
      .first();
  }

  async getTotalVolume(): Promise<number> {
    const result = await db('transactions')
      .where('created_at', '>', new Date(Date.now() - 24 * 60 * 60 * 1000))
      .sum('bnb_amount')
      .first();
    return parseFloat(result.sum || '0');
  }

  async getActiveTokenCount(): Promise<number> {
    return await db('tokens')
      .where('created_at', '>', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .where('is_active', true)
      .count('id')
      .first();
  }

  async getPlatformRevenue(): Promise<number> {
    const result = await db('transactions')
      .where('created_at', '>', new Date(Date.now() - 24 * 60 * 60 * 1000))
      .sum('platform_fee')
      .first();
    return parseFloat(result.sum || '0');
  }
}
```

### **2. Analytics API Endpoints**
```typescript
// backend/src/controllers/analyticsController.ts
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  async getRealTimeMetrics(req: Request, res: Response) {
    try {
      const metrics = await this.analyticsService.getRealTimeMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  }

  async getHistoricalMetrics(req: Request, res: Response) {
    const { period = '7d' } = req.query;

    try {
      const metrics = await this.analyticsService.getHistoricalMetrics(period as string);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch historical metrics' });
    }
  }

  async getTopTokens(req: Request, res: Response) {
    try {
      const tokens = await this.analyticsService.getTopTokens();
      res.json(tokens);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch top tokens' });
    }
  }

  async getUserMetrics(req: Request, res: Response) {
    try {
      const metrics = await this.analyticsService.getUserMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user metrics' });
    }
  }
}
```

## 🎨 Frontend Analytics Dashboard

### **1. Analytics Dashboard Component**
```typescript
// frontend/src/components/AnalyticsDashboard.tsx
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const AnalyticsDashboard = () => {
  const [metrics, setMetrics] = useState({
    realTime: {},
    historical: [],
    topTokens: [],
    userMetrics: {}
  });

  useEffect(() => {
    // Fetch real-time metrics
    const fetchMetrics = async () => {
      const [realTime, historical, topTokens, userMetrics] = await Promise.all([
        fetch('/api/analytics/realtime').then(r => r.json()),
        fetch('/api/analytics/historical?period=7d').then(r => r.json()),
        fetch('/api/analytics/top-tokens').then(r => r.json()),
        fetch('/api/analytics/user-metrics').then(r => r.json())
      ]);

      setMetrics({ realTime, historical, topTokens, userMetrics });
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Real-time Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Users"
          value={metrics.realTime.totalUsers}
          change="+12%"
          icon="users"
        />
        <MetricCard
          title="Transactions"
          value={metrics.realTime.totalTransactions}
          change="+8%"
          icon="transactions"
        />
        <MetricCard
          title="Volume (BNB)"
          value={metrics.realTime.totalVolume}
          change="+15%"
          icon="volume"
        />
        <MetricCard
          title="Revenue (BNB)"
          value={metrics.realTime.platformRevenue}
          change="+25%"
          icon="revenue"
        />
      </div>

      {/* Historical Chart */}
      <div className="bg-card rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">7-Day Performance</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={metrics.historical}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="volume" stroke="#8884d8" />
            <Line type="monotone" dataKey="transactions" stroke="#82ca9d" />
            <Line type="monotone" dataKey="users" stroke="#ffc658" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top Tokens Table */}
      <div className="bg-card rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Top Performing Tokens</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Token</th>
                <th className="text-left p-2">Price</th>
                <th className="text-left p-2">Volume</th>
                <th className="text-left p-2">Change</th>
              </tr>
            </thead>
            <tbody>
              {metrics.topTokens.map((token, index) => (
                <tr key={index} className="border-b">
                  <td className="p-2">{token.name}</td>
                  <td className="p-2">{token.price}</td>
                  <td className="p-2">{token.volume}</td>
                  <td className={`p-2 ${token.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {token.change > 0 ? '+' : ''}{token.change}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
```

### **2. Metric Card Component**
```typescript
// frontend/src/components/MetricCard.tsx
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon?: string;
}

export const MetricCard = ({ title, value, change, icon }: MetricCardProps) => {
  const isPositive = change?.startsWith('+');

  return (
    <div className="bg-card rounded-lg p-4 border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {change && (
            <p className={`text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {change}
            </p>
          )}
        </div>
        <div className="text-2xl">
          {icon === 'users' && '👥'}
          {icon === 'transactions' && '💱'}
          {icon === 'volume' && '📊'}
          {icon === 'revenue' && '💰'}
        </div>
      </div>
    </div>
  );
};
```

## 🔗 Real-time Data Integration

### **1. WebSocket Service**
```typescript
// backend/src/services/websocketService.ts
export class WebSocketService {
  private io: Server;
  private analyticsService: AnalyticsService;

  constructor(server: http.Server, analyticsService: AnalyticsService) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL,
        methods: ["GET", "POST"]
      }
    });
    this.analyticsService = analyticsService;
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Client connected to analytics WebSocket');

      // Send initial metrics
      this.sendMetrics(socket);

      // Set up periodic updates
      const interval = setInterval(() => {
        this.sendMetrics(socket);
      }, 5000);

      socket.on('disconnect', () => {
        clearInterval(interval);
        console.log('Client disconnected from analytics WebSocket');
      });
    });
  }

  private async sendMetrics(socket: Socket) {
    try {
      const metrics = await this.analyticsService.getRealTimeMetrics();
      socket.emit('metrics_update', metrics);
    } catch (error) {
      console.error('Error sending metrics:', error);
    }
  }
}
```

### **2. Frontend WebSocket Client**
```typescript
// frontend/src/hooks/useRealTimeAnalytics.ts
import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

export const useRealTimeAnalytics = () => {
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalTransactions: 0,
    totalVolume: 0,
    activeTokens: 0,
    platformRevenue: 0
  });

  useEffect(() => {
    const socket: Socket = io(process.env.REACT_APP_WS_URL || 'http://localhost:3001');

    socket.on('metrics_update', (data) => {
      setMetrics(data);
    });

    socket.on('connect', () => {
      console.log('Connected to analytics WebSocket');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from analytics WebSocket');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return metrics;
};
```

## 📊 Data Visualization

### **1. Chart Components**
```bash
# Install chart libraries
npm install recharts
npm install chart.js react-chartjs-2
```

### **2. Custom Charts**
```typescript
// frontend/src/components/TradingVolumeChart.tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TradingVolumeChartProps {
  data: Array<{
    time: string;
    volume: number;
    transactions: number;
  }>;
}

export const TradingVolumeChart = ({ data }: TradingVolumeChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" />
        <YAxis />
        <Tooltip
          formatter={(value: number, name: string) => [
            name === 'volume' ? `${value} BNB` : value,
            name === 'volume' ? 'Volume' : 'Transactions'
          ]}
        />
        <Line
          type="monotone"
          dataKey="volume"
          stroke="#8884d8"
          strokeWidth={2}
          dot={{ fill: '#8884d8' }}
        />
        <Line
          type="monotone"
          dataKey="transactions"
          stroke="#82ca9d"
          strokeWidth={2}
          dot={{ fill: '#82ca9d' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
```

## 🎯 Analytics Dashboard Route

### **1. Add Analytics Route**
```typescript
// frontend/src/App.tsx
import { AnalyticsDashboard } from './components/AnalyticsDashboard';

// Add route
<Route
  path="/analytics"
  element={
    <RouteErrorBoundary>
      <Suspense fallback={<div>Loading...</div>}>
        <AnalyticsDashboard />
      </Suspense>
    </RouteErrorBoundary>
  }
/>
```

### **2. Add Analytics Navigation**
```typescript
// frontend/src/components/Header.tsx
<Link to="/analytics" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100">
  <BarChart3 className="h-4 w-4" />
  Analytics
</Link>
```

## 📈 Performance Monitoring

### **1. Performance Metrics**
```typescript
// backend/src/middleware/performanceMonitor.ts
export const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    // Log performance metrics
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);

    // Send to analytics service
    analyticsService.recordPerformanceMetric({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: duration,
      timestamp: new Date()
    });
  });

  next();
};
```

### **2. Error Tracking**
```typescript
// backend/src/middleware/errorTracker.ts
export const errorTracker = (error: Error, req: Request, res: Response, next: NextFunction) => {
  // Log error
  console.error('Application Error:', error);

  // Send to analytics service
  analyticsService.recordError({
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userAgent: req.headers['user-agent'],
    timestamp: new Date()
  });

  next(error);
};
```

## 🚀 Deployment Considerations

### **1. Analytics Database**
```sql
-- Create analytics tables
CREATE TABLE analytics_metrics (
  id SERIAL PRIMARY KEY,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(20, 8) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE analytics_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  user_id VARCHAR(255),
  data JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **2. Performance Optimization**
```typescript
// Cache analytics data
import NodeCache from 'node-cache';

const analyticsCache = new NodeCache({ stdTTL: 30 }); // 30 seconds cache

export const getCachedMetrics = async () => {
  const cacheKey = 'realtime_metrics';
  let metrics = analyticsCache.get(cacheKey);

  if (!metrics) {
    metrics = await analyticsService.getRealTimeMetrics();
    analyticsCache.set(cacheKey, metrics);
  }

  return metrics;
};
```

## 📊 Analytics Summary for Investors

### **Key Metrics to Highlight:**
1. **User Growth**: Daily active users, monthly active users
2. **Trading Volume**: 24h volume, total volume, growth rate
3. **Token Performance**: Success rate, graduation metrics
4. **Revenue Generation**: Platform fees, total revenue
5. **Engagement**: Time on site, pages per visit, conversion rates

### **Visual Presentation:**
- 📊 Real-time dashboard showing live metrics
- 📈 Historical growth charts
- 💰 Revenue and financial metrics
- 🎯 User engagement statistics
- 📱 Mobile vs desktop usage

This comprehensive analytics setup will provide impressive data visualization for investor presentations and demonstrate platform growth and engagement.