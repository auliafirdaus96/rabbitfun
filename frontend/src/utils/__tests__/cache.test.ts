/**
 * Cache Utility Tests
 * Test cases for caching functions
 */

import {
  EnhancedMemoryCache,
  PersistentCache,
  SmartCache,
  imageCache,
  CacheManager,
  createCacheKey,
  generateCacheBustingKey,
  validateCacheKey,
  CacheItem,
  PersistentCacheItem,
} from '../cache';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    key: jest.fn((index) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
    length: 0,
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('EnhancedMemoryCache', () => {
  let cache: EnhancedMemoryCache<string>;

  beforeEach(() => {
    cache = new EnhancedMemoryCache<string>();
  });

  afterEach(() => {
    cache.clear();
  });

  describe('Basic Operations', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should check if key exists', () => {
      expect(cache.has('key1')).toBe(false);
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
    });

    it('should delete keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      expect(cache.size()).toBe(2);

      cache.delete('key1');
      expect(cache.get('key1')).toBeNull();
      expect(cache.size()).toBe(1);
    });

    it('should clear all keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      expect(cache.size()).toBe(3);

      cache.clear();
      expect(cache.size()).toBe(0);
    });
  });

  describe('TTL (Time To Live)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should respect TTL', () => {
      const ttl = 1000; // 1 second
      cache.set('key1', 'value1', { ttl });

      expect(cache.get('key1')).toBe('value1');

      jest.advanceTimersByTime(ttl + 1);
      expect(cache.get('key1')).toBeNull();
    });

    it('should not expire keys without TTL', () => {
      cache.set('key1', 'value1');

      jest.advanceTimersByTime(10000);
      expect(cache.get('key1')).toBe('value1');
    });

    it('should clean expired keys on access', () => {
      cache.set('key1', 'value1', { ttl: 100 });
      cache.set('key2', 'value2', { ttl: 200 });

      // Both should be accessible initially
      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');

      // Advance time to expire key1
      jest.advanceTimersByTime(150);

      // key1 should be null, key2 should still exist
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');

      // size should reflect only active keys
      expect(cache.size()).toBe(1);
    });
  });

  describe('Size Limit', () => {
    it('should respect size limit', () => {
      const maxSize = 3;
      cache = new EnhancedMemoryCache<string>({ maxSize });

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      expect(cache.size()).toBe(3);

      // Adding a 4th item should remove the oldest
      cache.set('key4', 'value4');
      expect(cache.size()).toBe(3);
      expect(cache.get('key1')).toBeNull(); // Oldest item removed
      expect(cache.get('key4')).toBe('value4'); // New item exists
    });

    it('should use LRU eviction strategy', () => {
      cache = new EnhancedMemoryCache<string>({ maxSize: 3 });

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Access key1 to make it recently used
      cache.get('key1');

      // Add new key to trigger eviction
      cache.set('key4', 'value4');

      // key2 should be evicted (least recently used)
      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });
  });

  describe('Statistics', () => {
    it('should track cache statistics', () => {
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.get('key2'); // Miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should reset statistics', () => {
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.get('key2'); // Miss

      let stats = cache.getStats();
      expect(stats.hits).toBe(1);

      stats = cache.resetStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });
});

describe('PersistentCache', () => {
  let cache: PersistentCache<string>;

  beforeEach(() => {
    cache = new PersistentCache<string>('test-cache');
    localStorageMock.clear();
  });

  afterEach(() => {
    cache.clear();
  });

  describe('Basic Operations', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('test-cache-key1', expect.any(String));
    });

    it('should persist across cache instances', () => {
      cache.set('key1', 'value1');

      const newCache = new PersistentCache<string>('test-cache');
      expect(newCache.get('key1')).toBe('value1');
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      // Should not throw, but should handle gracefully
      expect(() => cache.set('key1', 'value1')).not.toThrow();
    });
  });

  describe('TTL with Persistence', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should respect TTL and persist to storage', () => {
      const ttl = 1000;
      cache.set('key1', 'value1', { ttl });

      // Should be accessible immediately
      expect(cache.get('key1')).toBe('value1');

      // Should still be accessible before TTL expires
      jest.advanceTimersByTime(ttl - 1);
      expect(cache.get('key1')).toBe('value1');

      // Should be null after TTL expires
      jest.advanceTimersByTime(2);
      expect(cache.get('key1')).toBeNull();

      // Should be removed from localStorage
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('test-cache-key1');
    });
  });

  describe('Storage Limit', () => {
    it('should handle storage quota exceeded', () => {
      localStorageMock.setItem.mockImplementation(() => {
        const error = new Error('Storage quota exceeded');
        (error as any).name = 'QuotaExceededError';
        throw error;
      });

      // Should not throw, but should handle gracefully
      expect(() => {
        for (let i = 0; i < 100; i++) {
          cache.set(`key${i}`, `value${i}`);
        }
      }).not.toThrow();
    });

    it('should clear old items when storage is full', () => {
      // Mock full storage
      localStorageMock.setItem.mockImplementation(() => {
        const error = new Error('Storage quota exceeded');
        (error as any).name = 'QuotaExceededError';
        throw error;
      });

      // Set some items first
      cache.set('old1', 'old1');
      cache.set('old2', 'old2');

      // Should not throw when storage is full
      expect(() => cache.set('new1', 'new1')).not.toThrow();
    });
  });
});

describe('SmartCache', () => {
  let cache: SmartCache<string>;

  beforeEach(() => {
    cache = new SmartCache<string>('smart-cache');
    localStorageMock.clear();
  });

  afterEach(() => {
    cache.clear();
  });

  describe('Intelligent Caching', () => {
    it('should use memory cache for fast access', () => {
      cache.set('key1', 'value1');

      // Should be in memory cache immediately
      const stats = cache.getStats();
      expect(stats.memoryHits).toBe(0);
      expect(stats.persistentHits).toBe(0);

      // Access should be a memory hit
      expect(cache.get('key1')).toBe('value1');

      const afterStats = cache.getStats();
      expect(afterStats.memoryHits).toBe(1);
    });

    it('should fall back to persistent cache', () => {
      // Clear memory cache
      cache.clearMemory();

      // Add to persistent cache
      cache.set('key1', 'value1');

      // Clear memory cache again
      cache.clearMemory();

      // Should fall back to persistent cache
      expect(cache.get('key1')).toBe('value1');

      const stats = cache.getStats();
      expect(stats.memoryHits).toBe(0);
      expect(stats.persistentHits).toBe(1);
    });

    it('should promote frequently accessed items to memory', () => {
      const threshold = 2;
      cache = new SmartCache<string>('smart-cache', { memoryThreshold: threshold });

      // Add to persistent cache
      cache.set('key1', 'value1');
      cache.clearMemory();

      // Access once (below threshold)
      cache.get('key1');
      expect(cache.getStats().memoryHits).toBe(0);

      // Access second time (should promote to memory)
      cache.get('key1');
      expect(cache.getStats().memoryHits).toBe(1);

      // Third access should be from memory
      cache.get('key1');
      expect(cache.getStats().memoryHits).toBe(2);
    });
  });

  describe('Deduplication', () => {
    it('should prevent duplicate API calls', async () => {
      const fetchMock = jest.fn().mockResolvedValue('data');

      const result1 = await cache.getOrFetch('key1', fetchMock);
      const result2 = await cache.getOrFetch('key1', fetchMock);

      expect(result1).toBe('data');
      expect(result2).toBe('data');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent requests', async () => {
      const fetchMock = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('data'), 100))
      );

      const [result1, result2, result3] = await Promise.all([
        cache.getOrFetch('key1', fetchMock),
        cache.getOrFetch('key1', fetchMock),
        cache.getOrFetch('key1', fetchMock),
      ]);

      expect(result1).toBe('data');
      expect(result2).toBe('data');
      expect(result3).toBe('data');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should handle failed requests gracefully', async () => {
      const fetchMock = jest.fn().mockRejectedValue(new Error('Network error'));

      try {
        await cache.getOrFetch('key1', fetchMock);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      // Cache should not store failed results
      expect(cache.get('key1')).toBeNull();
    });
  });

  describe('Statistics', () => {
    it('should track comprehensive statistics', () => {
      const fetchMock = jest.fn().mockResolvedValue('data');

      // Memory cache hit
      cache.set('key1', 'value1');
      cache.get('key1');

      // Persistent cache hit
      cache.clearMemory();
      cache.set('key2', 'value2');
      cache.get('key2');

      // Cache miss
      await cache.getOrFetch('key3', fetchMock);

      const stats = cache.getStats();
      expect(stats.memoryHits).toBe(1);
      expect(stats.persistentHits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.apiCalls).toBe(1);
    });
  });
});

describe('imageCache', () => {
  let cache: imageCache;

  beforeEach(() => {
    cache = new imageCache();
    localStorageMock.clear();
  });

  it('should handle image URLs', () => {
    const url = 'https://example.com/image.jpg';
    const imageData = 'image-data';

    cache.set(url, imageData);
    expect(cache.get(url)).toBe(imageData);
  });

  it('should generate unique cache keys', () => {
    const url1 = 'https://example.com/image.jpg';
    const url2 = 'https://example.com/image2.jpg';

    cache.set(url1, 'data1');
    cache.set(url2, 'data2');

    expect(cache.get(url1)).toBe('data1');
    expect(cache.get(url2)).toBe('data2');
  });

  it('should handle blob data', async () => {
    const url = 'https://example.com/image.jpg';
    const blob = new Blob(['image-data'], { type: 'image/jpeg' });

    await cache.set(url, blob);
    const retrievedBlob = await cache.get(url);
    expect(retrievedBlob).toBeInstanceOf(Blob);
  });
});

describe('CacheManager', () => {
  let manager: CacheManager;

  beforeEach(() => {
    manager = new CacheManager();
    localStorageMock.clear();
  });

  it('should manage multiple cache instances', () => {
    const cache1 = manager.create('cache1');
    const cache2 = manager.create('cache2');

    cache1.set('key1', 'value1');
    cache2.set('key1', 'value2');

    expect(cache1.get('key1')).toBe('value1');
    expect(cache2.get('key1')).toBe('value2');
  });

  it('should get cache statistics across all instances', () => {
    const cache1 = manager.create('cache1');
    const cache2 = manager.create('cache2');

    cache1.set('key1', 'value1');
    cache2.set('key2', 'value2');

    const stats = manager.getGlobalStats();
    expect(stats.totalKeys).toBe(2);
    expect(stats.totalHits).toBe(0); // No get calls yet
  });

  it('should clear all cache instances', () => {
    const cache1 = manager.create('cache1');
    const cache2 = manager.create('cache2');

    cache1.set('key1', 'value1');
    cache2.set('key2', 'value2');

    manager.clearAll();

    expect(cache1.get('key1')).toBeNull();
    expect(cache2.get('key2')).toBeNull();
  });
});

describe('Utility Functions', () => {
  describe('createCacheKey', () => {
    it('should create consistent cache keys', () => {
      const key1 = createCacheKey('prefix', 'param1', 'param2');
      const key2 = createCacheKey('prefix', 'param1', 'param2');
      expect(key1).toBe(key2);
    });

    it('should handle different parameters', () => {
      const key1 = createCacheKey('prefix', 'param1');
      const key2 = createCacheKey('prefix', 'param2');
      expect(key1).not.toBe(key2);
    });

    it('should handle objects and arrays', () => {
      const obj = { id: 1, name: 'test' };
      const arr = [1, 2, 3];

      const key1 = createCacheKey('prefix', obj);
      const key2 = createCacheKey('prefix', arr);

      expect(key1).toContain('prefix');
      expect(key2).toContain('prefix');
    });
  });

  describe('generateCacheBustingKey', () => {
    it('should generate unique keys', () => {
      const key1 = generateCacheBustingKey();
      const key2 = generateCacheBustingKey();
      expect(key1).not.toBe(key2);
    });

    it('should include timestamp', () => {
      const key = generateCacheBustingKey();
      expect(key).toMatch(/\d{13}/); // Unix timestamp
    });
  });

  describe('validateCacheKey', () => {
    it('should validate string keys', () => {
      expect(validateCacheKey('valid-key')).toBe(true);
      expect(validateCacheKey('')).toBe(true);
      expect(validateCacheKey(null as any)).toBe(false);
      expect(validateCacheKey(undefined as any)).toBe(false);
    });

    it('should reject dangerous keys', () => {
      expect(validateCacheKey('__proto__')).toBe(false);
      expect(validateCacheKey('constructor')).toBe(false);
      expect(validateCacheKey('prototype')).toBe(false);
    });
  });
});

describe('Error Handling', () => {
  it('should handle invalid cache keys gracefully', () => {
    const cache = new EnhancedMemoryCache<string>();

    expect(() => cache.set(null as any, 'value')).not.toThrow();
    expect(() => cache.get(null as any)).not.toThrow();
    expect(() => cache.delete(null as any)).not.toThrow();
  });

  it('should handle corrupted data in persistent cache', () => {
    localStorageMock.setItem.mockImplementation(() => 'invalid-json');

    const cache = new PersistentCache<string>('corrupted-cache');
    expect(cache.get('any-key')).toBeNull();
  });

  it('should handle storage disabled environment', () => {
    // Mock localStorage being disabled
    Object.defineProperty(window, 'localStorage', {
      value: undefined,
      writable: false,
    });

    const cache = new PersistentCache<string>('disabled-storage');
    expect(() => cache.set('key', 'value')).not.toThrow();
  });
});