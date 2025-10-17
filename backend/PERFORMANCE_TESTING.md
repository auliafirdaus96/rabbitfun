# ⚡ Performance Testing & Load Handling Guide

## 📋 Overview

This document outlines the performance testing strategy and load handling capabilities for the Rabbit Launchpad backend system.

## 🎯 Performance Goals

### Target Metrics
- **Response Time**: < 200ms for 95% of requests
- **Throughput**: 1000+ requests per second
- **Concurrent Users**: 500+ simultaneous users
- **Database Queries**: < 50ms average query time
- **Memory Usage**: < 512MB for typical load
- **CPU Usage**: < 70% under normal load

### Service Level Agreements (SLAs)
- **Availability**: 99.9% uptime
- **Error Rate**: < 0.1% of total requests
- **P95 Response Time**: < 500ms
- **P99 Response Time**: < 1000ms

## 🔧 Performance Testing Tools

### 1. Load Testing Tools
```bash
# Install Artillery for load testing
npm install -g artillery

# Install k6 for modern load testing
# Download from: https://k6.io/

# Install Apache Bench (usually comes with Apache)
ab -V

# Install wrk for HTTP benchmarking
# Download from: https://github.com/wg/wrk
```

### 2. Monitoring Tools
```bash
# Node.js performance monitoring
npm install clinic
npm install -g 0x

# System monitoring
npm install -g pidstat
npm install -g iotop
```

## 📊 Performance Test Scenarios

### Scenario 1: Basic Load Test
```yaml
# artillery-load-test.yml
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Ramp up load"
    - duration: 300
      arrivalRate: 100
      name: "Sustained load"
  processor: "./test-processor.js"

scenarios:
  - name: "API Load Test"
    weight: 70
    flow:
      - get:
          url: "/health"
      - think: 1
      - get:
          url: "/api/tokens"
      - think: 2
      - get:
          url: "/api/tokens?limit=10"

  - name: "Authentication Load Test"
    weight: 20
    flow:
      - post:
          url: "/api/auth/check-wallet"
          json:
            walletAddress: "0x1234567890123456789012345678901234567890"

  - name: "Search Load Test"
    weight: 10
    flow:
      - get:
          url: "/api/tokens?search=test"
```

### Scenario 2: Stress Test
```yaml
# artillery-stress-test.yml
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 50
      name: "Initial load"
    - duration: 60
      arrivalRate: 100
      name: "Medium load"
    - duration: 60
      arrivalRate: 200
      name: "High load"
    - duration: 60
      arrivalRate: 500
      name: "Peak load"
    - duration: 60
      arrivalRate: 1000
      name: "Stress test"

scenarios:
  - name: "Mixed API Load"
    flow:
      - loop:
        - get:
            url: "/health"
        - get:
            url: "/api/tokens"
        - post:
            url: "/api/auth/check-wallet"
            json:
              walletAddress: "0x1234567890123456789012345678901234567890"
      count: 100
```

### Scenario 3: Spike Test
```yaml
# artillery-spike-test.yml
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 120
      arrivalRate: 10
      name: "Normal load"
    - duration: 30
      arrivalRate: 1000
      name: "Spike"
    - duration: 120
      arrivalRate: 10
      name: "Recovery"

scenarios:
  - name: "Spike Test"
    flow:
      - get:
          url: "/health"
```

## 🚀 Performance Test Execution

### Basic Load Test
```bash
# Run basic load test
artillery run artillery-load-test.yml

# Run with custom output
artillery run artillery-load-test.yml --output load-test-results.json

# Generate HTML report
artillery report load-test-results.json --output load-test-report.html
```

### Stress Test
```bash
# Run stress test
artillery run artillery-stress-test.yml

# Monitor system resources during test
# In another terminal:
top -p $(pgrep node)
iostat -x 1
```

### k6 Load Testing
```javascript
// k6-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

export let errorRate = new Rate('errors');

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],    // Error rate under 10%
    errors: ['rate<0.1'],             // Custom error rate under 10%
  },
};

export default function() {
  // Health check
  let healthResponse = http.get('http://localhost:3001/health');
  let healthOk = check(healthResponse, {
    'health status is 200': (r) => r.status === 200,
  });
  errorRate.add(!healthOk);

  // Get tokens
  let tokensResponse = http.get('http://localhost:3001/api/tokens');
  let tokensOk = check(tokensResponse, {
    'tokens status is 200': (r) => r.status === 200,
    'tokens response time < 500ms': (r) => r.timings.duration < 500,
  });
  errorRate.add(!tokensOk);

  sleep(1);
}
```

```bash
# Run k6 test
k6 run k6-load-test.js

# Run with output options
k6 run k6-load-test.js --out json=results.json
```

## 📈 Performance Monitoring

### Real-time Monitoring
```javascript
// scripts/performance-monitor.js
const { performance } = require('perf_hooks');
const os = require('os');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTime: [],
      memory: [],
      cpu: []
    };
    this.startTime = Date.now();
  }

  startRequest() {
    return performance.now();
  }

  endRequest(startTime, isError = false) {
    const endTime = performance.now();
    const duration = endTime - startTime;

    this.metrics.requests++;
    if (isError) this.metrics.errors++;
    this.metrics.responseTime.push(duration);

    // Keep only last 1000 measurements
    if (this.metrics.responseTime.length > 1000) {
      this.metrics.responseTime.shift();
    }
  }

  collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    this.metrics.memory.push({
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external
    });

    this.metrics.cpu.push({
      user: cpuUsage.user,
      system: cpuUsage.system
    });

    // Keep only last 100 measurements
    if (this.metrics.memory.length > 100) this.metrics.memory.shift();
    if (this.metrics.cpu.length > 100) this.metrics.cpu.shift();
  }

  getReport() {
    const responseTimes = this.metrics.responseTime;
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    const sortedTimes = responseTimes.sort((a, b) => a - b);
    const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0;
    const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0;

    const errorRate = this.metrics.requests > 0
      ? (this.metrics.errors / this.metrics.requests) * 100
      : 0;

    return {
      uptime: Date.now() - this.startTime,
      requests: this.metrics.requests,
      errors: this.metrics.errors,
      errorRate: errorRate.toFixed(2) + '%',
      avgResponseTime: avgResponseTime.toFixed(2) + 'ms',
      p95ResponseTime: p95.toFixed(2) + 'ms',
      p99ResponseTime: p99.toFixed(2) + 'ms',
      memory: this.metrics.memory[this.metrics.memory.length - 1] || {},
      rps: (this.metrics.requests / ((Date.now() - this.startTime) / 1000)).toFixed(2)
    };
  }
}

module.exports = PerformanceMonitor;
```

### Database Performance Monitoring
```javascript
// scripts/database-performance.js
const { PrismaClient } = require('@prisma/client');

class DatabasePerformanceMonitor {
  constructor() {
    this.prisma = new PrismaClient();
    this.queryMetrics = [];
  }

  async monitorQuery(queryName, queryFunction) {
    const startTime = performance.now();

    try {
      const result = await queryFunction();
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.queryMetrics.push({
        query: queryName,
        duration,
        timestamp: new Date(),
        success: true
      });

      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.queryMetrics.push({
        query: queryName,
        duration,
        timestamp: new Date(),
        success: false,
        error: error.message
      });

      throw error;
    }
  }

  async getSlowQueries(threshold = 100) {
    return this.queryMetrics.filter(q => q.duration > threshold);
  }

  async getQueryStats() {
    const stats = {};

    this.queryMetrics.forEach(query => {
      if (!stats[query.query]) {
        stats[query.query] = {
          count: 0,
          totalDuration: 0,
          avgDuration: 0,
          maxDuration: 0,
          errors: 0
        };
      }

      const stat = stats[query.query];
      stat.count++;
      stat.totalDuration += query.duration;
      stat.avgDuration = stat.totalDuration / stat.count;
      stat.maxDuration = Math.max(stat.maxDuration, query.duration);

      if (!query.success) {
        stat.errors++;
      }
    });

    return stats;
  }
}

module.exports = DatabasePerformanceMonitor;
```

## 🔧 Performance Optimization

### Database Optimization
```sql
-- Performance indexes for PostgreSQL
CREATE INDEX CONCURRENTLY idx_tokens_active_created_at ON tokens(is_active, created_at DESC);
CREATE INDEX CONCURRENTLY idx_transactions_token_type_created_at ON transactions(token_id, type, created_at DESC);
CREATE INDEX CONCURRENTLY idx_users_active_wallet ON users(is_active, wallet_address) WHERE is_active = true;

-- Partial indexes for better performance
CREATE INDEX CONCURRENTLY idx_tokens_graduated ON tokens(graduated) WHERE graduated = true;
CREATE INDEX CONCURRENTLY idx_transactions_confirmed ON transactions(created_at) WHERE status = 'CONFIRMED';

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY idx_tokens_creator_active ON tokens(creator_address, is_active) WHERE is_active = true;
CREATE INDEX CONCURRENTLY idx_transactions_trader_type ON transactions(trader_address, type) WHERE trader_address IS NOT NULL;
```

### Caching Strategy
```javascript
// services/cacheService.js
const Redis = require('redis');
const client = Redis.createClient(process.env.REDIS_URL);

class CacheService {
  async get(key) {
    try {
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, data, ttl = 300) {
    try {
      await client.setex(key, ttl, JSON.stringify(data));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async invalidate(pattern) {
    try {
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
      }
    } catch (error) {
      console.error('Cache invalidate error:', error);
    }
  }

  // Cache middleware
  cacheMiddleware(ttl = 300) {
    return async (req, res, next) => {
      const key = `cache:${req.method}:${req.originalUrl}`;

      try {
        const cached = await this.get(key);
        if (cached) {
          return res.json(cached);
        }

        // Override res.json to cache response
        const originalJson = res.json;
        res.json = function(data) {
          cacheService.set(key, data, ttl);
          return originalJson.call(this, data);
        };

        next();
      } catch (error) {
        next();
      }
    };
  }
}

const cacheService = new CacheService();
module.exports = cacheService;
```

### Connection Pooling
```javascript
// config/database.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  // Connection pooling configuration
  __internal: {
    engine: {
      connectionLimit: 20,
      poolTimeout: 10000,
      acquireTimeoutMillis: 60000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 100,
    },
  },
});

module.exports = prisma;
```

## 📊 Performance Benchmarks

### Baseline Performance Metrics
```javascript
// scripts/benchmark.js
const { performance } = require('perf_hooks');
const axios = require('axios');

class PerformanceBenchmark {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.results = [];
  }

  async benchmarkEndpoint(endpoint, method = 'GET', payload = null, iterations = 100) {
    console.log(`📊 Benchmarking ${method} ${endpoint} (${iterations} iterations)`);

    const times = [];
    let errors = 0;

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();

      try {
        if (method === 'GET') {
          await axios.get(`${this.baseUrl}${endpoint}`);
        } else if (method === 'POST') {
          await axios.post(`${this.baseUrl}${endpoint}`, payload);
        }

        const endTime = performance.now();
        times.push(endTime - startTime);
      } catch (error) {
        errors++;
      }
    }

    const stats = this.calculateStats(times, errors, iterations);
    this.results.push({ endpoint, method, ...stats });

    console.log(`   Average: ${stats.avg}ms`);
    console.log(`   P95: ${stats.p95}ms`);
    console.log(`   P99: ${stats.p99}ms`);
    console.log(`   Error Rate: ${stats.errorRate}%`);
    console.log('');

    return stats;
  }

  calculateStats(times, errors, total) {
    const sorted = times.sort((a, b) => a - b);
    const sum = times.reduce((a, b) => a + b, 0);

    return {
      avg: (sum / times.length).toFixed(2),
      min: Math.min(...times).toFixed(2),
      max: Math.max(...times).toFixed(2),
      p50: sorted[Math.floor(sorted.length * 0.5)].toFixed(2),
      p95: sorted[Math.floor(sorted.length * 0.95)].toFixed(2),
      p99: sorted[Math.floor(sorted.length * 0.99)].toFixed(2),
      errorRate: ((errors / total) * 100).toFixed(2),
      requestsPerSecond: (total / (Math.max(...times) / 1000)).toFixed(2)
    };
  }

  async runFullBenchmark() {
    console.log('🚀 Starting Performance Benchmark');
    console.log('=================================\n');

    await this.benchmarkEndpoint('/health');
    await this.benchmarkEndpoint('/api/tokens');
    await this.benchmarkEndpoint('/api/tokens?limit=10');
    await this.benchmarkEndpoint('/api/tokens?search=test');
    await this.benchmarkEndpoint('/api/auth/check-wallet', 'POST', {
      walletAddress: '0x1234567890123456789012345678901234567890'
    });

    this.generateReport();
  }

  generateReport() {
    console.log('📊 BENCHMARK REPORT');
    console.log('====================');

    this.results.forEach(result => {
      console.log(`${result.method} ${result.endpoint}`);
      console.log(`  Average: ${result.avg}ms | P95: ${result.p95}ms | P99: ${result.p99}ms | RPS: ${result.requestsPerSecond}`);
    });

    // Save report
    const fs = require('fs');
    fs.writeFileSync(
      'performance-benchmark-report.json',
      JSON.stringify(this.results, null, 2)
    );
  }
}

// Run benchmark
const benchmark = new PerformanceBenchmark('http://localhost:3001');
benchmark.runFullBenchmark();
```

## 🎯 Performance Targets & KPIs

### Acceptable Performance Thresholds
- **Health Check**: < 50ms average, < 100ms P95
- **Token List**: < 200ms average, < 500ms P95
- **Token Search**: < 300ms average, < 800ms P95
- **Authentication**: < 100ms average, < 200ms P95
- **Database Queries**: < 50ms average, < 100ms P95

### Monitoring Dashboard Metrics
- **Response Time**: Real-time response time charts
- **Throughput**: Requests per second over time
- **Error Rate**: Percentage of failed requests
- **Memory Usage**: Heap and RSS memory usage
- **CPU Usage**: Process and system CPU usage
- **Database Connections**: Active and idle connections
- **Cache Hit Rate**: Redis cache effectiveness

## 🔧 Production Performance Configuration

### Environment Variables for Performance
```bash
# .env.production
NODE_ENV=production

# Performance Tuning
UV_THREADPOOL_SIZE=128
NODE_OPTIONS="--max-old-space-size=2048"

# Database Pooling
DATABASE_POOL_MIN=10
DATABASE_POOL_MAX=20

# Redis Configuration
REDIS_POOL_SIZE=50
REDIS_TIMEOUT=5000

# Rate Limiting (Production)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_STRICT_MODE=true

# Caching
CACHE_TTL=300
CACHE_MAX_SIZE=10000

# Performance Monitoring
PERFORMANCE_MONITORING=true
SLOW_QUERY_THRESHOLD=100
```

### PM2 Configuration for Production
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'rabbit-launchpad-api',
    script: './dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

---

**Last Updated**: October 17, 2025
**Performance Level**: Development
**Next Benchmark**: After PostgreSQL Migration