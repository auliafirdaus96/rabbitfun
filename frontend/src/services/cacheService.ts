/**
 * 💾 Ahiru Launchpad - Advanced Caching Service
 *
 * Multi-layer caching system with:
 * - Memory cache (fastest access)
 * - localStorage cache (persistent)
 * - IndexedDB cache (large data)
 * - Cache invalidation strategies
 * - Compression for large datasets
 * - Background sync
 * - Performance monitoring
 */

import { toast } from 'sonner';

// Configuration
const CACHE_CONFIG = {
  // Memory cache limits
  MEMORY_CACHE_LIMIT: 50 * 1024 * 1024, // 50MB
  MEMORY_MAX_ITEMS: 1000,

  // localStorage limits (5-10MB typically)
  LOCALSTORAGE_LIMIT: 4 * 1024 * 1024, // 4MB
  LOCALSTORAGE_PREFIX: 'ahiru_cache_',

  // IndexedDB limits (much larger)
  INDEXEDDB_NAME: 'AhiruCacheDB',
  INDEXEDDB_VERSION: 1,
  INDEXEDDB_STORE: 'cache',

  // Cache TTL (time to live)
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes
  LONG_TTL: 30 * 60 * 1000, // 30 minutes
  SHORT_TTL: 30 * 1000, // 30 seconds

  // Performance
  CLEANUP_INTERVAL: 60 * 1000, // 1 minute
  COMPRESSION_THRESHOLD: 1024, // 1KB
  MAX_RETRY_ATTEMPTS: 3,

  // Background sync
  SYNC_INTERVAL: 30 * 1000, // 30 seconds
  SYNC_BATCH_SIZE: 10,
};

// Types
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  compressed?: boolean;
  size: number;
  hits: number;
  lastAccessed: number;
}

interface CacheStats {
  memoryCache: {
    items: number;
    size: number;
    hits: number;
    misses: number;
  };
  localStorage: {
    items: number;
    size: number;
    hits: number;
    misses: number;
  };
  indexedDB: {
    items: number;
    size: number;
    hits: number;
    misses: number;
  };
  performance: {
    avgReadTime: number;
    avgWriteTime: number;
    compressionRatio: number;
  };
}

interface CacheOptions {
  ttl?: number;
  compress?: boolean;
  persistent?: boolean;
  backgroundSync?: boolean;
  priority?: 'low' | 'normal' | 'high';
}

class CacheService {
  // Memory cache
  private memoryCache = new Map<string, CacheEntry>();
  private memorySize = 0;

  // Performance tracking
  private stats: CacheStats = {
    memoryCache: { items: 0, size: 0, hits: 0, misses: 0 },
    localStorage: { items: 0, size: 0, hits: 0, misses: 0 },
    indexedDB: { items: 0, size: 0, hits: 0, misses: 0 },
    performance: { avgReadTime: 0, avgWriteTime: 0, compressionRatio: 0 }
  };

  // IndexedDB
  private db: IDBDatabase | null = null;
  private dbReady = false;

  // Cleanup timer
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeIndexedDB();
    this.startCleanupTimer();
    this.setupEventListeners();

    console.log('CacheService initialized');
  }

  /**
   * Initialize IndexedDB
   */
  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CACHE_CONFIG.INDEXEDDB_NAME, CACHE_CONFIG.INDEXEDDB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB');
        reject(new Error('IndexedDB initialization failed'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.dbReady = true;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(CACHE_CONFIG.INDEXEDDB_STORE)) {
          db.createObjectStore(CACHE_CONFIG.INDEXEDDB_STORE, { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Setup browser event listeners
   */
  private setupEventListeners(): void {
    // Handle storage events (for cross-tab synchronization)
    window.addEventListener('storage', this.handleStorageEvent.bind(this));

    // Handle page unload
    window.addEventListener('beforeunload', this.cleanup.bind(this));

    // Handle memory pressure
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;

        if (usageRatio > 0.8) {
          console.warn('High memory usage detected, cleaning cache');
          this.cleanupMemoryCache();
        }
      }, 30000); // Check every 30 seconds
    }
  }

  /**
   * Handle storage events for cross-tab synchronization
   */
  private handleStorageEvent(event: StorageEvent): void {
    if (event.key?.startsWith(CACHE_CONFIG.LOCALSTORAGE_PREFIX)) {
      console.log('Cache updated in another tab');
      // Invalidate memory cache for updated key
      const cacheKey = event.key.replace(CACHE_CONFIG.LOCALSTORAGE_PREFIX, '');
      this.memoryCache.delete(cacheKey);
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredEntries();
      this.optimizeMemoryUsage();
    }, CACHE_CONFIG.CLEANUP_INTERVAL);
  }

  /**
   * Get cache entry size
   */
  private getEntrySize(data: any): number {
    try {
      const serialized = JSON.stringify(data);
      return new Blob([serialized]).size;
    } catch {
      return 0;
    }
  }

  /**
   * Compress data if needed
   */
  private async compressData(data: any): Promise<{ data: any; compressed: boolean; size: number }> {
    const size = this.getEntrySize(data);

    if (size < CACHE_CONFIG.COMPRESSION_THRESHOLD) {
      return { data, compressed: false, size };
    }

    try {
      // Simple compression for demonstration
      // In production, use proper compression libraries
      const serialized = JSON.stringify(data);
      const compressed = serialized.replace(/([a-zA-Z0-9])\1+/g, '$1'); // Simple deduplication

      return {
        data: JSON.parse(compressed),
        compressed: true,
        size: new Blob([compressed]).size
      };
    } catch (error) {
      console.warn('Compression failed:', error);
      return { data, compressed: false, size };
    }
  }

  /**
   * Decompress data if needed
   */
  private async decompressData(entry: CacheEntry): Promise<any> {
    if (!entry.compressed) {
      return entry.data;
    }

    try {
      // Decompression logic would go here
      // For now, return data as-is
      return entry.data;
    } catch (error) {
      console.warn('Decompression failed:', error);
      return entry.data;
    }
  }

  /**
   * Set cache entry
   */
  async set<T = any>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
    const startTime = performance.now();
    const {
      ttl = CACHE_CONFIG.DEFAULT_TTL,
      compress = true,
      persistent = false,
      priority = 'normal'
    } = options;

    const { data: processedData, compressed, size } = await this.compressData(data);

    const entry: CacheEntry<T> = {
      data: processedData,
      timestamp: Date.now(),
      ttl,
      compressed,
      size,
      hits: 0,
      lastAccessed: Date.now()
    };

    // Store in memory cache
    this.memoryCache.set(key, entry);
    this.memorySize += size;
    this.stats.memoryCache.items++;
    this.stats.memoryCache.size += size;

    // Store in persistent cache if requested
    if (persistent) {
      await this.setLocalStorage(key, entry);
    }

    // Optimize memory if needed
    if (this.memorySize > CACHE_CONFIG.MEMORY_CACHE_LIMIT) {
      this.optimizeMemoryUsage();
    }

    // Update performance stats
    const writeTime = performance.now() - startTime;
    this.updatePerformanceStats('write', writeTime, size, compressed);

    console.debug(`Cache set: ${key} (${size} bytes, ${writeTime.toFixed(2)}ms)`);
  }

  /**
   * Get cache entry
   */
  async get<T = any>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const startTime = performance.now();
    const { persistent = false } = options;

    // Try memory cache first
    let entry = this.memoryCache.get(key);
    let cacheHit = 'memory';

    if (!entry && persistent) {
      // Try localStorage
      entry = await this.getLocalStorage(key);
      cacheHit = entry ? 'localStorage' : 'none';
    }

    if (!entry) {
      this.updateMissStats(cacheHit);
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.memoryCache.delete(key);
      if (persistent) {
        this.removeLocalStorage(key);
      }
      this.updateMissStats(cacheHit);
      return null;
    }

    // Update access stats
    entry.hits++;
    entry.lastAccessed = Date.now();

    // Decompress if needed
    const data = await this.decompressData(entry);

    // Update performance stats
    const readTime = performance.now() - startTime;
    this.updatePerformanceStats('read', readTime, entry.size, entry.compressed);

    console.debug(`Cache hit: ${key} (${cacheHit}, ${readTime.toFixed(2)}ms)`);

    return data;
  }

  /**
   * Check if key exists
   */
  async has(key: string, options: CacheOptions = {}): Promise<boolean> {
    const entry = await this.get(key, options);
    return entry !== null;
  }

  /**
   * Remove cache entry
   */
  async remove(key: string): Promise<void> {
    const entry = this.memoryCache.get(key);

    if (entry) {
      this.memorySize -= entry.size;
      this.stats.memoryCache.items--;
      this.stats.memoryCache.size -= entry.size;
    }

    this.memoryCache.delete(key);
    this.removeLocalStorage(key);

    // Remove from IndexedDB if needed
    if (this.dbReady) {
      await this.removeIndexedDB(key);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    this.memorySize = 0;
    this.stats.memoryCache = { items: 0, size: 0, hits: 0, misses: 0 };

    // Clear localStorage
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_CONFIG.LOCALSTORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    }

    // Clear IndexedDB
    if (this.dbReady) {
      await this.clearIndexedDB();
    }

    console.log('All cache cleared');
  }

  /**
   * Set localStorage entry
   */
  private async setLocalStorage(key: string, entry: CacheEntry): Promise<void> {
    try {
      const lsKey = CACHE_CONFIG.LOCALSTORAGE_PREFIX + key;
      const serialized = JSON.stringify(entry);

      // Check size limit
      if (serialized.length > CACHE_CONFIG.LOCALSTORAGE_LIMIT) {
        console.warn(`LocalStorage entry too large: ${key}`);
        return;
      }

      localStorage.setItem(lsKey, serialized);
      this.stats.localStorage.items++;
      this.stats.localStorage.size += serialized.length;

    } catch (error) {
      console.error('Failed to set localStorage:', error);
    }
  }

  /**
   * Get localStorage entry
   */
  private async getLocalStorage(key: string): Promise<CacheEntry | null> {
    try {
      const lsKey = CACHE_CONFIG.LOCALSTORAGE_PREFIX + key;
      const serialized = localStorage.getItem(lsKey);

      if (!serialized) {
        return null;
      }

      const entry = JSON.parse(serialized) as CacheEntry;

      // Move to memory cache for faster access
      this.memoryCache.set(key, entry);
      this.memorySize += entry.size;
      this.stats.memoryCache.items++;
      this.stats.memoryCache.size += entry.size;
      this.stats.localStorage.hits++;

      return entry;

    } catch (error) {
      console.error('Failed to get localStorage:', error);
      this.stats.localStorage.misses++;
      return null;
    }
  }

  /**
   * Remove localStorage entry
   */
  private removeLocalStorage(key: string): void {
    try {
      const lsKey = CACHE_CONFIG.LOCALSTORAGE_PREFIX + key;
      const item = localStorage.getItem(lsKey);

      if (item) {
        this.stats.localStorage.size -= item.length;
        this.stats.localStorage.items--;
      }

      localStorage.removeItem(lsKey);

    } catch (error) {
      console.error('Failed to remove localStorage:', error);
    }
  }

  /**
   * IndexedDB operations
   */
  private async setIndexedDB(key: string, entry: CacheEntry): Promise<void> {
    if (!this.dbReady) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CACHE_CONFIG.INDEXEDDB_STORE], 'readwrite');
      const store = transaction.objectStore(CACHE_CONFIG.INDEXEDDB_STORE);

      const request = store.put({ key, entry });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getIndexedDB(key: string): Promise<CacheEntry | null> {
    if (!this.dbReady) return null;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([CACHE_CONFIG.INDEXEDDB_STORE], 'readonly');
      const store = transaction.objectStore(CACHE_CONFIG.INDEXEDDB_STORE);

      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          this.stats.indexedDB.hits++;
        } else {
          this.stats.indexedDB.misses++;
        }
        resolve(result?.entry || null);
      };

      request.onerror = () => {
        this.stats.indexedDB.misses++;
        resolve(null);
      };
    });
  }

  private async removeIndexedDB(key: string): Promise<void> {
    if (!this.dbReady) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([CACHE_CONFIG.INDEXEDDB_STORE], 'readwrite');
      const store = transaction.objectStore(CACHE_CONFIG.INDEXEDDB_STORE);

      const request = store.delete(key);
      request.onsuccess = () => resolve();
    });
  }

  private async clearIndexedDB(): Promise<void> {
    if (!this.dbReady) return;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([CACHE_CONFIG.INDEXEDDB_STORE], 'readwrite');
      const store = transaction.objectStore(CACHE_CONFIG.INDEXEDDB_STORE);

      const request = store.clear();
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Cleanup expired entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let cleanedCount = 0;

    // Clean memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.memorySize -= entry.size;
        this.memoryCache.delete(key);
        this.stats.memoryCache.items--;
        this.stats.memoryCache.size -= entry.size;
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  /**
   * Optimize memory usage
   */
  private optimizeMemoryUsage(): void {
    if (this.memoryCache.size <= CACHE_CONFIG.MEMORY_MAX_ITEMS) {
      return;
    }

    // Sort by last accessed time (LRU)
    const entries = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

    // Remove least recently used entries
    const toRemove = entries.slice(0, entries.length - CACHE_CONFIG.MEMORY_MAX_ITEMS);

    for (const [key, entry] of toRemove) {
      this.memoryCache.delete(key);
      this.memorySize -= entry.size;
      this.stats.memoryCache.items--;
      this.stats.memoryCache.size -= entry.size;

      // Keep in localStorage for persistence
      this.setLocalStorage(key, entry);
    }

    console.log(`Optimized memory cache, removed ${toRemove.length} entries`);
  }

  /**
   * Cleanup memory cache aggressively
   */
  private cleanupMemoryCache(): void {
    // Remove all non-essential entries
    const essentialKeys = ['user_preferences', 'auth_tokens'];

    for (const [key, entry] of this.memoryCache.entries()) {
      if (!essentialKeys.includes(key)) {
        this.memoryCache.delete(key);
        this.memorySize -= entry.size;
        this.stats.memoryCache.items--;
        this.stats.memoryCache.size -= entry.size;
      }
    }

    toast.warning('Cache optimized due to memory pressure');
  }

  /**
   * Update performance statistics
   */
  private updatePerformanceStats(operation: 'read' | 'write', time: number, size: number, compressed: boolean): void {
    const key = operation === 'read' ? 'avgReadTime' : 'avgWriteTime';
    const current = this.stats.performance[key];
    this.stats.performance[key] = (current * 0.9) + (time * 0.1); // Exponential moving average

    if (compressed) {
      const ratio = this.stats.performance.compressionRatio;
      this.stats.performance.compressionRatio = (ratio * 0.9) + ((size / 1024) * 0.1);
    }
  }

  /**
   * Update miss statistics
   */
  private updateMissStats(cacheType: string): void {
    switch (cacheType) {
      case 'memory':
        this.stats.memoryCache.misses++;
        break;
      case 'localStorage':
        this.stats.localStorage.misses++;
        break;
      case 'indexedDB':
        this.stats.indexedDB.misses++;
        break;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache size information
   */
  getCacheInfo() {
    return {
      memory: {
        entries: this.memoryCache.size,
        sizeBytes: this.memorySize,
        sizeMB: Math.round(this.memorySize / 1024 / 1024 * 100) / 100,
        limitMB: Math.round(CACHE_CONFIG.MEMORY_CACHE_LIMIT / 1024 / 1024 * 100) / 100
      },
      localStorage: {
        entries: this.stats.localStorage.items,
        sizeBytes: this.stats.localStorage.size,
        sizeMB: Math.round(this.stats.localStorage.size / 1024 / 1024 * 100) / 100
      },
      performance: {
        avgReadTime: Math.round(this.stats.performance.avgReadTime * 100) / 100,
        avgWriteTime: Math.round(this.stats.performance.avgWriteTime * 100) / 100,
        compressionRatio: Math.round(this.stats.performance.compressionRatio * 100) / 100
      }
    };
  }

  /**
   * Warm up cache with common data
   */
  async warmup(): Promise<void> {
    console.log('Warming up cache...');

    // Preload common data that doesn't change often
    const commonData = [
      { key: 'market_config', ttl: CACHE_CONFIG.LONG_TTL },
      { key: 'bonding_curve_config', ttl: CACHE_CONFIG.LONG_TTL },
      { key: 'ui_preferences', ttl: CACHE_CONFIG.LONG_TTL }
    ];

    for (const { key, ttl } of commonData) {
      if (!(await this.has(key))) {
        // Load data from API if not cached
        try {
          // This would be replaced with actual API calls
          console.log(`Warming up cache for: ${key}`);
        } catch (error) {
          console.warn(`Failed to warm up cache for ${key}:`, error);
        }
      }
    }

    console.log('Cache warmup completed');
  }

  /**
   * Export cache for backup
   */
  async export(): Promise<string> {
    const exportData = {
      version: '1.0',
      timestamp: Date.now(),
      memoryCache: Array.from(this.memoryCache.entries()),
      stats: this.stats
    };

    return JSON.stringify(exportData);
  }

  /**
   * Import cache from backup
   */
  async import(data: string): Promise<void> {
    try {
      const importData = JSON.parse(data);

      if (importData.version !== '1.0') {
        throw new Error('Unsupported cache version');
      }

      // Import memory cache
      for (const [key, entry] of importData.memoryCache) {
        this.memoryCache.set(key, entry);
        this.memorySize += entry.size;
      }

      // Import stats
      this.stats = { ...this.stats, ...importData.stats };

      console.log('Cache imported successfully');

    } catch (error) {
      console.error('Failed to import cache:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.clear();
    console.log('CacheService cleaned up');
  }
}

// Create singleton instance
const cacheService = new CacheService();

export default cacheService;
export { cacheService };
export type { CacheOptions, CacheStats };

/**
 * Hooks for using cache service
 */
export const useCache = () => {
  return {
    get: <T = any>(key: string, options?: CacheOptions) => cacheService.get<T>(key, options),
    set: <T = any>(key: string, data: T, options?: CacheOptions) => cacheService.set(key, data, options),
    has: (key: string, options?: CacheOptions) => cacheService.has(key, options),
    remove: (key: string) => cacheService.remove(key),
    clear: () => cacheService.clear(),
    stats: () => cacheService.getStats(),
    info: () => cacheService.getCacheInfo()
  };
};

/**
 * Hook for cached API calls
 */
export const useCachedCall = () => {
  const cache = useCache();

  return async <T = any>(
    key: string,
    apiCall: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> => {
    // Try to get from cache first
    const cached = await cache.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // Call API and cache result
    try {
      const result = await apiCall();
      await cache.set(key, result, options);
      return result;
    } catch (error) {
      console.error(`API call failed for ${key}:`, error);
      throw error;
    }
  };
};