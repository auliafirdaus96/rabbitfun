interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

interface UserMetrics {
  routeLoadTime: number[];
  componentLoadTime: number[];
  errorCount: number;
  totalInteractions: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private userMetrics: UserMetrics = {
    routeLoadTime: [],
    componentLoadTime: [],
    errorCount: 0,
    totalInteractions: 0
  };
  private static instance: PerformanceMonitor;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Start measuring an operation
  startMeasure(name: string, metadata?: Record<string, unknown>): string {
    const id = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      success: false,
      metadata
    };

    this.metrics.push(metric);
    return id;
  }

  // End measuring an operation
  endMeasure(id: string, success: boolean = true, error?: string): void {
    const metric = this.metrics.find(m => m.name.split('_')[2] === id);
    if (!metric) return;

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    metric.success = success;
    metric.error = error;

    // Track user metrics
    if (metric.name.includes('route')) {
      if (success && metric.duration) {
        this.userMetrics.routeLoadTime.push(metric.duration);
      }
    } else if (metric.name.includes('component')) {
      if (success && metric.duration) {
        this.userMetrics.componentLoadTime.push(metric.duration);
      }
    }

    if (!success) {
      this.userMetrics.errorCount++;
    }

    this.userMetrics.totalInteractions++;
  }

  // Measure route loading
  measureRouteLoad(routeName: string): () => void {
    const id = this.startMeasure(`route_${routeName}`, { route: routeName });
    return () => this.endMeasure(id);
  }

  // Measure component loading
  measureComponentLoad(componentName: string): () => void {
    const id = this.startMeasure(`component_${componentName}`, { component: componentName });
    return () => this.endMeasure(id);
  }

  // Get performance statistics
  getStats(): {
    routeLoadTime: { avg: number; p95: number; count: number };
    componentLoadTime: { avg: number; p95: number; count: number };
    errorRate: number;
    totalInteractions: number;
  } {
    const routeTimes = this.userMetrics.routeLoadTime;
    const componentTimes = this.userMetrics.componentLoadTime;

    const calculateStats = (times: number[]) => {
      if (times.length === 0) return { avg: 0, p95: 0, count: 0 };
      const sorted = [...times].sort((a, b) => a - b);
      const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
      const p95Index = Math.floor(sorted.length * 0.95);
      return {
        avg: Math.round(avg * 100) / 100,
        p95: Math.round(sorted[p95Index] * 100) / 100,
        count: times.length
      };
    };

    return {
      routeLoadTime: calculateStats(routeTimes),
      componentLoadTime: calculateStats(componentTimes),
      errorRate: this.userMetrics.totalInteractions > 0
        ? Math.round((this.userMetrics.errorCount / this.userMetrics.totalInteractions) * 100 * 100) / 100
        : 0,
      totalInteractions: this.userMetrics.totalInteractions
    };
  }

  // Log performance metrics (in production, send to analytics)
  logMetrics(): void {
    const stats = this.getStats();
    console.group('🚀 Performance Metrics');
    console.log('Route Loading:', stats.routeLoadTime);
    console.log('Component Loading:', stats.componentLoadTime);
    console.log('Error Rate:', `${stats.errorRate}%`);
    console.log('Total Interactions:', stats.totalInteractions);
    console.groupEnd();
  }

  // Get metrics for API reporting
  getMetricsForReporting(): {
    performance: ReturnType<typeof this.getStats>;
    navigation: {
      domContentLoaded: number;
      loadComplete: number;
      firstPaint: number | null;
      firstContentfulPaint: number | null;
    } | null;
    userAgent: string;
    timestamp: number;
  } {
    const stats = this.getStats();
    const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    return {
      performance: stats,
      navigation: navTiming ? {
        domContentLoaded: Math.round(navTiming.domContentLoadedEventEnd - navTiming.fetchStart),
        loadComplete: Math.round(navTiming.loadEventEnd - navTiming.fetchStart),
        firstPaint: this.getFirstPaint(),
        firstContentfulPaint: this.getFirstContentfulPaint()
      } : null,
      userAgent: navigator.userAgent,
      timestamp: Date.now()
    };
  }

  private getFirstPaint(): number | null {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint ? Math.round(firstPaint.startTime) : null;
  }

  private getFirstContentfulPaint(): number | null {
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return fcp ? Math.round(fcp.startTime) : null;
  }

  // Clear all metrics (useful for testing)
  clearMetrics(): void {
    this.metrics = [];
    this.userMetrics = {
      routeLoadTime: [],
      componentLoadTime: [],
      errorCount: 0,
      totalInteractions: 0
    };
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// React hook for performance monitoring
export const usePerformanceMonitor = () => {
  return {
    measureRouteLoad: (route: string) => performanceMonitor.measureRouteLoad(route),
    measureComponentLoad: (component: string) => performanceMonitor.measureComponentLoad(component),
    getStats: () => performanceMonitor.getStats(),
    logMetrics: () => performanceMonitor.logMetrics(),
    getMetricsForReporting: () => performanceMonitor.getMetricsForReporting(),
    clearMetrics: () => performanceMonitor.clearMetrics()
  };
};

// Performance monitoring for API calls
export const measureApiCall = async <T>(
  apiCall: () => Promise<T>,
  endpoint: string
): Promise<T> => {
  const startTime = performance.now();
  try {
    const result = await apiCall();
    const duration = performance.now() - startTime;

    console.log(`🌐 API call to ${endpoint} completed in ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`❌ API call to ${endpoint} failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
};

// Performance budget validation
export const PERFORMANCE_BUDGET = {
  routeLoadTime: 2000, // 2 seconds
  componentLoadTime: 100, // 100ms
  apiCallTime: 1000, // 1 second
  errorRate: 5, // 5%
};

export const validatePerformanceBudget = () => {
  const stats = performanceMonitor.getStats();
  const violations: string[] = [];

  if (stats.routeLoadTime.avg > PERFORMANCE_BUDGET.routeLoadTime) {
    violations.push(`Route load time average (${stats.routeLoadTime.avg}ms) exceeds budget (${PERFORMANCE_BUDGET.routeLoadTime}ms)`);
  }

  if (stats.componentLoadTime.avg > PERFORMANCE_BUDGET.componentLoadTime) {
    violations.push(`Component load time average (${stats.componentLoadTime.avg}ms) exceeds budget (${PERFORMANCE_BUDGET.componentLoadTime}ms)`);
  }

  if (stats.errorRate > PERFORMANCE_BUDGET.errorRate) {
    violations.push(`Error rate (${stats.errorRate}%) exceeds budget (${PERFORMANCE_BUDGET.errorRate}%)`);
  }

  if (violations.length > 0) {
    console.warn('⚠️ Performance Budget Violations:', violations);
  }

  return violations;
};

// Performance optimization suggestions
export const getOptimizationSuggestions = (): string[] => {
  const stats = performanceMonitor.getStats();
  const suggestions: string[] = [];

  if (stats.routeLoadTime.avg > 1500) {
    suggestions.push('Consider implementing code splitting and lazy loading for routes');
  }

  if (stats.componentLoadTime.avg > 50) {
    suggestions.push('Consider optimizing component renders with React.memo and useMemo');
  }

  if (stats.errorRate > 3) {
    suggestions.push('Review error handling and implement retry mechanisms');
  }

  if (stats.totalInteractions < 10) {
    suggestions.push('Performance metrics may be insufficient. Collect more data for accurate analysis.');
  }

  return suggestions;
};