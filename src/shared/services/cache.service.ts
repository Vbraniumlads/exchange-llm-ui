interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface CacheOptions {
  duration?: number; // Cache duration in milliseconds
  key?: string; // Optional custom cache key
}

export class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private isCacheValid<T>(key: string, duration?: number): boolean {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return false;
    
    const now = Date.now();
    const cacheDuration = duration || this.DEFAULT_CACHE_DURATION;
    return now - entry.timestamp < cacheDuration;
  }

  get<T>(key: string, options?: CacheOptions): T | null {
    const duration = options?.duration;
    if (this.isCacheValid(key, duration)) {
      const data = this.cache.get(key)?.data;
      if (data !== undefined) {
        console.log(`[Cache] Using cached data for key: ${key}`);
        return data;
      }
    }
    return null;
  }

  set<T>(key: string, data: T): void {
    console.log(`[Cache] Setting cache for key: ${key}`);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clear(pattern?: string): void {
    if (pattern) {
      console.log(`[Cache] Clearing cache entries matching pattern: ${pattern}`);
      // Clear specific cache entries matching pattern
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      console.log('[Cache] Clearing all cache');
      // Clear all cache
      this.cache.clear();
    }
  }

  delete(key: string): boolean {
    console.log(`[Cache] Deleting cache for key: ${key}`);
    return this.cache.delete(key);
  }

  has(key: string, options?: CacheOptions): boolean {
    const duration = options?.duration;
    return this.isCacheValid(key, duration);
  }

  // Helper method to wrap async functions with caching
  async withCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    // Check cache first
    const cachedData = this.get<T>(key, options);
    if (cachedData !== null) {
      return cachedData;
    }

    // Fetch data if not cached
    console.log(`[Cache] Fetching fresh data for key: ${key}`);
    const data = await fetcher();
    
    // Cache the result
    this.set(key, data);
    
    return data;
  }

  // Get cache stats
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const cacheService = new CacheService();