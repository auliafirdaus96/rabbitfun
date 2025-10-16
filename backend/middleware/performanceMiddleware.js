const { performance } = require('perf_hooks');
const { promisify } = require('util');

class PerformanceMiddleware {
  constructor() {
    this.metrics = new Map();
    this.slowQueryThreshold = 1000; // 1 second
    this.slowRequestThreshold = 5000; // 5 seconds
  }

  // Request performance monitoring
  requestMonitor() {
    return (req, res, next) => {
      const startTime = performance.now();
      const startMemory = process.memoryUsage();

      // Generate unique request ID
      req.requestId = this.generateRequestId();

      // Store original res.end
      const originalEnd = res.end;

      res.end = function(...args) {
        const endTime = performance.now();
        const endMemory = process.memoryUsage();
        const duration = endTime - startTime;

        // Calculate memory difference
        const memoryDiff = {
          rss: endMemory.rss - startMemory.rss,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal
        };

        // Log performance metrics
        const metrics = {
          requestId: req.requestId,
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          duration: Math.round(duration),
          memoryDiff,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          timestamp: new Date()
        };

        // Store metrics
        this.storeRequestMetrics(metrics);

        // Check for slow requests
        if (duration > this.slowRequestThreshold) {
          this.logSlowRequest(metrics);
        }

        // Set performance headers
        res.set('X-Response-Time', `${Math.round(duration)}ms`);
        res.set('X-Request-ID', req.requestId);

        // Call original end
        originalEnd.apply(this, args);
      }.bind(this);

      next();
    };
  }

  // Database performance monitoring
  databaseMonitor() {
    return (req, res, next) => {
      const originalExec = require('mongoose').Query.prototype.exec;

      require('mongoose').Query.prototype.exec = function() {
        const startTime = performance.now();
        const queryString = this.getQuery();
        const collection = this.model.collection.name;

        const originalExecResult = originalExec.call(this);

        if (originalExecResult && typeof originalExecResult.then === 'function') {
          return originalExecResult.then(
            (result) => {
              const endTime = performance.now();
              const duration = endTime - startTime;

              this.storeDatabaseMetrics({
                requestId: req.requestId,
                collection,
                operation: this.op,
                query: JSON.stringify(queryString),
                duration: Math.round(duration),
                success: true,
                timestamp: new Date()
              });

              if (duration > this.slowQueryThreshold) {
                this.logSlowQuery({
                  requestId: req.requestId,
                  collection,
                  operation: this.op,
                  query: JSON.stringify(queryString),
                  duration: Math.round(duration)
                });
              }

              return result;
            },
            (error) => {
              const endTime = performance.now();
              const duration = endTime - startTime;

              this.storeDatabaseMetrics({
                requestId: req.requestId,
                collection,
                operation: this.op,
                query: JSON.stringify(queryString),
                duration: Math.round(duration),
                success: false,
                error: error.message,
                timestamp: new Date()
              });

              throw error;
            }
          );
        }

        return originalExecResult;
      }.bind(this);

      next();
    };
  }

  // External API call monitoring
  apiCallMonitor() {
    return (req, res, next) => {
      const originalFetch = global.fetch;

      global.fetch = async (...args) => {
        const startTime = performance.now();
        const url = args[0];

        try {
          const response = await originalFetch(...args);
          const endTime = performance.now();
          const duration = endTime - startTime;

          this.storeApiMetrics({
            requestId: req.requestId,
            url: typeof url === 'string' ? url : url.url,
            method: args[1]?.method || 'GET',
            statusCode: response.status,
            duration: Math.round(duration),
            success: response.ok,
            timestamp: new Date()
          });

          return response;
        } catch (error) {
          const endTime = performance.now();
          const duration = endTime - startTime;

          this.storeApiMetrics({
            requestId: req.requestId,
            url: typeof url === 'string' ? url : url.url,
            method: args[1]?.method || 'GET',
            duration: Math.round(duration),
            success: false,
            error: error.message,
            timestamp: new Date()
          });

          throw error;
        }
      };

      next();
    };
  }

  // Memory usage monitoring
  memoryMonitor() {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const memInfo = {
        timestamp: new Date(),
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers
      };

      this.storeMemoryMetrics(memInfo);

      // Check for memory leaks
      if (memUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
        this.logHighMemoryUsage(memInfo);
      }
    }, 30000); // Every 30 seconds
  }

  // CPU usage monitoring
  cpuMonitor() {
    let lastCpuUsage = process.cpuUsage();

    setInterval(() => {
      const currentCpuUsage = process.cpuUsage(lastCpuUsage);
      const cpuInfo = {
        timestamp: new Date(),
        user: currentCpuUsage.user,
        system: currentCpuUsage.system,
        percentage: (currentCpuUsage.user + currentCpuUsage.system) / 1000000 // Convert to percentage
      };

      this.storeCpuMetrics(cpuInfo);
      lastCpuUsage = process.cpuUsage();
    }, 1000); // Every second
  }

  // Event loop monitoring
  eventLoopMonitor() {
    setInterval(() => {
      const start = performance.now();
      setImmediate(() => {
        const delay = performance.now() - start;

        this.storeEventLoopMetrics({
          timestamp: new Date(),
          lag: Math.round(delay)
        });

        if (delay > 10) { // Event loop lag > 10ms
          this.logEventLoopLag(delay);
        }
      });
    }, 1000); // Every second
  }

  // Performance optimization suggestions
  getPerformanceInsights() {
    const insights = [];

    // Request performance insights
    const requests = Array.from(this.metrics.get('requests') || []);
    const avgResponseTime = requests.reduce((sum, r) => sum + r.duration, 0) / requests.length;
    const slowRequests = requests.filter(r => r.duration > this.slowRequestThreshold);

    if (avgResponseTime > 1000) {
      insights.push({
        type: 'performance',
        severity: 'warning',
        message: `Average response time is ${Math.round(avgResponseTime)}ms. Consider optimizing slow endpoints.`,
        suggestion: 'Review slow requests and implement caching or database optimizations.'
      });
    }

    if (slowRequests.length > 0) {
      insights.push({
        type: 'performance',
        severity: 'error',
        message: `${slowRequests.length} slow requests detected (>5s)`,
        suggestion: 'Investigate slow endpoints and implement performance improvements.'
      });
    }

    // Database performance insights
    const queries = Array.from(this.metrics.get('database') || []);
    const slowQueries = queries.filter(q => q.duration > this.slowQueryThreshold);

    if (slowQueries.length > 0) {
      insights.push({
        type: 'database',
        severity: 'warning',
        message: `${slowQueries.length} slow database queries detected (>1s)`,
        suggestion: 'Add database indexes, optimize queries, or implement query caching.'
      });
    }

    // Memory usage insights
    const memoryData = Array.from(this.metrics.get('memory') || []);
    if (memoryData.length > 0) {
      const latestMemory = memoryData[memoryData.length - 1];
      const memoryUsagePercent = (latestMemory.heapUsed / latestMemory.heapTotal) * 100;

      if (memoryUsagePercent > 80) {
        insights.push({
          type: 'memory',
          severity: 'warning',
          message: `High memory usage: ${Math.round(memoryUsagePercent)}%`,
          suggestion: 'Monitor for memory leaks and consider implementing memory optimization strategies.'
        });
      }
    }

    return insights;
  }

  // Helper methods
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  storeRequestMetrics(metrics) {
    if (!this.metrics.has('requests')) {
      this.metrics.set('requests', []);
    }
    const requests = this.metrics.get('requests');
    requests.push(metrics);

    // Keep only last 1000 requests
    if (requests.length > 1000) {
      requests.splice(0, requests.length - 1000);
    }
  }

  storeDatabaseMetrics(metrics) {
    if (!this.metrics.has('database')) {
      this.metrics.set('database', []);
    }
    const queries = this.metrics.get('database');
    queries.push(metrics);

    // Keep only last 500 queries
    if (queries.length > 500) {
      queries.splice(0, queries.length - 500);
    }
  }

  storeApiMetrics(metrics) {
    if (!this.metrics.has('api')) {
      this.metrics.set('api', []);
    }
    const calls = this.metrics.get('api');
    calls.push(metrics);

    // Keep only last 500 API calls
    if (calls.length > 500) {
      calls.splice(0, calls.length - 500);
    }
  }

  storeMemoryMetrics(metrics) {
    if (!this.metrics.has('memory')) {
      this.metrics.set('memory', []);
    }
    const memoryData = this.metrics.get('memory');
    memoryData.push(metrics);

    // Keep only last 100 data points
    if (memoryData.length > 100) {
      memoryData.splice(0, memoryData.length - 100);
    }
  }

  storeCpuMetrics(metrics) {
    if (!this.metrics.has('cpu')) {
      this.metrics.set('cpu', []);
    }
    const cpuData = this.metrics.get('cpu');
    cpuData.push(metrics);

    // Keep only last 100 data points
    if (cpuData.length > 100) {
      cpuData.splice(0, cpuData.length - 100);
    }
  }

  storeEventLoopMetrics(metrics) {
    if (!this.metrics.has('eventloop')) {
      this.metrics.set('eventloop', []);
    }
    const eventData = this.metrics.get('eventloop');
    eventData.push(metrics);

    // Keep only last 100 data points
    if (eventData.length > 100) {
      eventData.splice(0, eventData.length - 100);
    }
  }

  logSlowRequest(metrics) {
    console.warn('🐌 Slow Request Detected:', {
      requestId: metrics.requestId,
      method: metrics.method,
      url: metrics.url,
      duration: `${metrics.duration}ms`,
      statusCode: metrics.statusCode
    });
  }

  logSlowQuery(metrics) {
    console.warn('🗄️ Slow Database Query Detected:', {
      requestId: metrics.requestId,
      collection: metrics.collection,
      operation: metrics.operation,
      query: metrics.query,
      duration: `${metrics.duration}ms`
    });
  }

  logHighMemoryUsage(memoryInfo) {
    console.warn('💾 High Memory Usage Detected:', {
      heapUsed: `${Math.round(memoryInfo.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryInfo.heapTotal / 1024 / 1024)}MB`,
      usage: `${Math.round((memoryInfo.heapUsed / memoryInfo.heapTotal) * 100)}%`
    });
  }

  logEventLoopLag(lag) {
    console.warn('⏱️ Event Loop Lag Detected:', {
      lag: `${Math.round(lag)}ms`
    });
  }

  // Get performance summary
  getPerformanceSummary() {
    const requests = Array.from(this.metrics.get('requests') || []);
    const queries = Array.from(this.metrics.get('database') || []);
    const apiCalls = Array.from(this.metrics.get('api') || []);
    const memoryData = Array.from(this.metrics.get('memory') || []);

    if (requests.length === 0) {
      return { message: 'No performance data available' };
    }

    const avgResponseTime = requests.reduce((sum, r) => sum + r.duration, 0) / requests.length;
    const slowRequestsCount = requests.filter(r => r.duration > this.slowRequestThreshold).length;
    const errorRate = (requests.filter(r => r.statusCode >= 400).length / requests.length) * 100;

    return {
      requests: {
        total: requests.length,
        avgResponseTime: Math.round(avgResponseTime),
        slowRequests: slowRequestsCount,
        errorRate: Math.round(errorRate * 100) / 100
      },
      database: {
        totalQueries: queries.length,
        slowQueries: queries.filter(q => q.duration > this.slowQueryThreshold).length,
        avgQueryTime: queries.length > 0 ? Math.round(queries.reduce((sum, q) => sum + q.duration, 0) / queries.length) : 0
      },
      api: {
        totalCalls: apiCalls.length,
        errorRate: apiCalls.length > 0 ? Math.round((apiCalls.filter(c => !c.success).length / apiCalls.length) * 100) : 0
      },
      memory: memoryData.length > 0 ? {
        currentUsage: Math.round(memoryData[memoryData.length - 1].heapUsed / 1024 / 1024),
        peakUsage: Math.round(Math.max(...memoryData.map(m => m.heapUsed)) / 1024 / 1024)
      } : null,
      insights: this.getPerformanceInsights()
    };
  }

  // Reset metrics
  resetMetrics() {
    this.metrics.clear();
    console.log('📊 Performance metrics reset');
  }
}

module.exports = new PerformanceMiddleware();