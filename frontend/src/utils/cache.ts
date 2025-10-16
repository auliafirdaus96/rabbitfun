/**
 * Enhanced Caching Utilities
 * Provides multiple caching strategies for better performance
 */

// In-memory cache for short-term data
const memoryCache = new Map<string, {
  data: any;
  timestamp: number;
  ttl: number;
}>();

// Persistent cache for long-term data (localStorage)
const persistentCache = {
  get: (key: string): any => {
    try {
      const item = localStorage.getItem(`cache_${key}`);
      if (!item) return null;

      const parsed = JSON.parse(item);
      if (Date.now() > parsed.expiry) {
        localStorage.removeItem(`cache_${key}`);
        return null;
      }

      return parsed.data;
    } catch {
      return null;
    }
  },

  set: (key: string, data: any, ttl: number = 5 * 60 * 1000): void => {
    try {
      const item = {
        data,
        expiry: Date.now() + ttl,
        timestamp: Date.now()
      };
      localStorage.setItem(`cache_${key}`, JSON.stringify(item));
    } catch {
      // Ignore localStorage errors
    }
  },

  remove: (key: string): void => {
    try {
      localStorage.removeItem(`cache_${key}`);
    } catch {
      // Ignore localStorage errors
    }
  },

  clear: (): void => {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('cache_')) {
          localStorage.removeItem(key);
        }
      });
    } catch {
      // Ignore localStorage errors
    }
  }
};

// Enhanced memory cache with TTL
export class EnhancedMemoryCache<T = any> {
  get(key: string): T | null {
    const item = memoryCache.get(key);
    if (!item) return null;

    if (Date.now() > item.timestamp + item.ttl) {
      memoryCache.delete(key);
      return null;
    }

    return item.data;
  }

  set(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  delete(key: string): void {
    memoryCache.delete(key);
  }

  clear(): void {
    memoryCache.clear();
  }

  // Get cache info for debugging
  info() {
    return {
      size: memoryCache.size,
      keys: Array.from(memoryCache.keys()),
      items: Array.from(memoryCache.entries()).map(([key, value]) => ({
        key,
        age: Date.now() - value.timestamp,
        ttl: value.ttl,
        expired: Date.now() > value.timestamp + value.ttl
      }))
    };
  }
}

// Create a singleton instance
const enhancedMemoryCache = new EnhancedMemoryCache();

// Cache configuration
const CACHE_CONFIG = {
  // TTL in milliseconds
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 30 * 60 * 1000, // 30 minutes
  LONG: 2 * 60 * 60 * 1000, // 2 hours
  VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours

  // Cache keys
  TOKENS: 'tokens',
  TOKEN_DETAIL: 'token_detail_',
  USER_PREFERENCES: 'user_preferences',
  ANALYTICS: 'analytics_',
  TRENDING_TOKENS: 'trending_tokens',
  BONDING_CURVE: 'bonding_curve_'
};

// Generic caching functions
export const cache = {
  // Memory cache
  get: <T>(key: string): T | null => enhancedMemoryCache.get(key),
  set: <T>(key: string, data: T, ttl: number = CACHE_CONFIG.MEDIUM): void => {
    enhancedMemoryCache.set(key, data, ttl);
  },
  delete: (key: string): void => enhancedMemoryCache.delete(key),
  clear: (): void => enhancedMemoryCache.clear(),

  // Persistent cache
  getPersistent: <T>(key: string): T | null => persistentCache.get(key),
  setPersistent: <T>(key: string, data: T, ttl: number = CACHE_CONFIG.LONG): void => {
    persistentCache.set(key, data, ttl);
  },
  deletePersistent: (key: string): void => persistentCache.remove(key),
  clearPersistent: (): void => persistentCache.clear(),

  // Smart caching - tries memory first, then persistent
  getSmart: <T>(key: string): T | null => {
    // Try memory cache first (fast)
    let data = enhancedMemoryCache.get(key);
    if (data !== null) return data;

    // Try persistent cache
    data = persistentCache.get(key);
    if (data !== null) {
      // Store in memory cache for faster access next time
      enhancedMemoryCache.set(key, data, CACHE_CONFIG.SHORT);
      return data;
    }

    return null;
  },

  setSmart: <T>(key: string, data: T, ttl: number = CACHE_CONFIG.MEDIUM): void => {
    // Store in both caches
    enhancedMemoryCache.set(key, data, CACHE_CONFIG.SHORT);
    persistentCache.set(key, data, ttl);
  },

  deleteSmart: (key: string): void => {
    enhancedMemoryCache.delete(key);
    persistentCache.remove(key);
  },

  // Batch operations
  getBatch: <T>(keys: string[]): Map<string, T | null> => {
    const result = new Map<string, T | null>();
    keys.forEach(key => {
      result.set(key, enhancedMemoryCache.get(key));
    });
    return result;
  },

  setBatch: <T>(items: Array<{ key: string; data: T; ttl?: number }>, defaultTtl: number = CACHE_CONFIG.MEDIUM): void => {
    items.forEach(({ key, data, ttl }) => {
      enhancedMemoryCache.set(key, data, ttl || defaultTtl);
    });
  },

  // Cache warming (preload data)
  warmUp: async <T>(keys: string[], fetcher: (key: string) => Promise<T>): Promise<Map<string, T>> => {
    const results = new Map<string, T>();

    const promises = keys.map(async (key) => {
      try {
        const data = await fetcher(key);
        results.set(key, data);
        enhancedMemoryCache.set(key, data, CACHE_CONFIG.MEDIUM);
      } catch (error) {
        console.warn(`Failed to warm cache for key ${key}:`, error);
      }
    });

    await Promise.all(promises);
    return results;
  }
};

// React Query cache configuration
export const queryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: CACHE_CONFIG.MEDIUM,
      cacheTime: CACHE_CONFIG.LONG,
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    }
  }
};

// Service worker cache helper (for PWA support)
export const serviceWorkerCache = {
  async precache(urls: string[]): Promise<void> {
    if ('serviceWorker' in navigator && 'caches' in window) {
      try {
        const cache = await caches.open('static-cache-v1');
        await cache.addAll(urls);
      } catch (error) {
        console.warn('Failed to precache URLs:', error);
      }
    }
  },

  async addToCache(request: Request, response: Response): Promise<void> {
    if ('serviceWorker' in navigator && 'caches' in window) {
      try {
        const cache = await caches.open('dynamic-cache-v1');
        await cache.put(request, response);
      } catch (error) {
        console.warn('Failed to add to cache:', error);
      }
    }
  },

  async getFromCache(request: Request): Promise<Response | null> {
    if ('serviceWorker' in navigator && 'caches' in window) {
      try {
        const cache = await caches.match(request);
        return cache || null;
      } catch (error) {
        console.warn('Failed to get from cache:', error);
        return null;
      }
    }
    return null;
  }
};

// Image caching utilities
export const imageCache = {
  get: (url: string): string | null => {
    return cache.getSmart(`image_${url}`);
  },

  set: (url: string, dataUrl: string): void => {
    cache.setSmart(`image_${url}`, dataUrl, CACHE_CONFIG.VERY_LONG);
  },

  preload: async (urls: string[]): Promise<void> => {
    const promises = urls.map(url =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          // Convert to data URL and cache
          fetch(url)
            .then(response => response.blob())
            .then(blob => {
              const reader = new FileReader();
              reader.onload = () => {
                imageCache.set(url, reader.result as string);
                resolve();
              };
              reader.readAsDataURL(blob);
            })
            .catch(() => resolve());
        };
        img.onerror = () => resolve();
        img.src = url;
      })
    );

    await Promise.all(promises);
  }
};

// API response caching with deduplication
class DedupedCache {
  private pendingRequests = new Map<string, Promise<any>>();

  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = CACHE_CONFIG.MEDIUM
  ): Promise<T> {
    // Check cache first
    const cached = cache.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    // Make request
    const promise = fetcher().then(data => {
      cache.set(key, data, ttl);
      this.pendingRequests.delete(key);
      return data;
    }).catch(error => {
      this.pendingRequests.delete(key);
      throw error;
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  clear(): void {
    this.pendingRequests.clear();
  }
}

export const dedupedCache = new DedupedCache();

// Cache monitoring utilities
export const cacheMonitor = {
  getStats: () => {
    const memoryStats = enhancedMemoryCache.info();
    const storageStats = {
      used: 0,
      keys: 0
    };

    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('cache_')) {
          storageStats.keys++;
          storageStats.used += localStorage.getItem(key)?.length || 0;
        }
      });
    } catch {
      // Ignore localStorage errors
    }

    return {
      memory: memoryStats,
      storage: storageStats,
      total: memoryStats.size + storageStats.keys
    };
  },

  clearExpired: (): void => {
    // Clear expired memory cache items
    const info = enhancedMemoryCache.info();
    info.items.forEach(item => {
      if (item.expired) {
        enhancedMemoryCache.delete(item.key);
      }
    });
  },

  logStats: (): void => {
    const stats = cacheMonitor.getStats();
    console.log('📊 Cache Statistics:', {
      memory: {
        total: stats.memory.size,
        expired: stats.memory.items.filter(i => i.expired).length,
        keys: stats.memory.keys.slice(0, 5)
      },
      storage: {
        total: stats.storage.keys,
        size: `${(stats.storage.used / 1024).toFixed(2)} KB`
      },
      total: stats.total
    });
  }
};

// Auto-cleanup on app load
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    cacheMonitor.clearExpired();
  });
}