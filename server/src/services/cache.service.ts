/**
 * High-Speed In-Memory Cache Service
 * Provides sub-millisecond retrieval (< 1ms) for high-frequency reads
 * like Packages, Itineraries, Places Master, and Hotels Master.
 * Includes automatic TTL expiry and prefix-based cache invalidation.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class CacheService {
  private store = new Map<string, CacheEntry<any>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Periodically remove expired keys every 60 seconds
    this.cleanupInterval = setInterval(() => {
      this.purgeExpired();
    }, 60000);
    // Allow process to exit cleanly without waiting on interval
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Get value from cache. Returns null if missing or expired.
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Store value in cache with a TTL in seconds (default 300s / 5 mins).
   */
  set<T>(key: string, value: T, ttlSeconds = 300): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Delete a specific key.
   */
  del(key: string): void {
    this.store.delete(key);
  }

  /**
   * Delete all keys starting with a prefix (e.g. "places:", "hotels:", "packages:").
   */
  delPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Purge all expired keys from memory.
   */
  private purgeExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear all cached keys.
   */
  flush(): void {
    this.store.clear();
  }
}

export const cache = new CacheService();
