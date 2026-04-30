/**
 * In-memory cache utility with TTL support.
 * Used for caching expensive admin dashboard queries.
 *
 * Note: Memory-only — cache is cleared on server restart.
 * Upgrade to Redis when scaling to multiple server instances.
 */

class InMemoryCache {
  constructor() {
    this.store = new Map();
    this.cleanupInterval = null;
    this.startCleanup();
  }

  /**
   * Get cached value if not expired.
   * @returns The cached value, or null if missing/expired
   */
  get(key) {
    if (typeof key !== "string" || !key) return null;

    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Set a value with TTL in seconds.
   * @param {string} key
   * @param {any} value
   * @param {number} ttlSeconds - Time to live (default: 300s / 5 minutes)
   */
  set(key, value, ttlSeconds = 300) {
    if (typeof key !== "string" || !key) return;
    if (typeof ttlSeconds !== "number" || ttlSeconds <= 0) ttlSeconds = 300;

    // 🛡️ Cap TTL at 1 hour to prevent unbounded memory usage
    const safeTTL = Math.min(ttlSeconds, 3600);

    this.store.set(key, {
      value,
      expiresAt: Date.now() + safeTTL * 1000,
    });
  }

  /**
   * Delete a specific cache key.
   */
  delete(key) {
    if (typeof key !== "string") return;
    this.store.delete(key);
  }

  /**
   * Delete all keys matching a prefix.
   * Useful when underlying data changes (e.g., user signs up → invalidate stats).
   */
  invalidatePrefix(prefix) {
    if (typeof prefix !== "string" || !prefix) return;

    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear entire cache.
   */
  clear() {
    this.store.clear();
  }

  /**
   * Get current size of cache (debugging only).
   */
  size() {
    return this.store.size;
  }

  /**
   * 🧹 Periodic cleanup of expired entries.
   * Runs every 10 minutes to prevent memory leaks from never-accessed expired keys.
   */
  startCleanup() {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (now > entry.expiresAt) {
          this.store.delete(key);
        }
      }
    }, 10 * 60 * 1000);

    // Don't keep Node.js process alive just for cleanup
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Stop cleanup interval (used during graceful shutdown).
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton instance — shared across all imports
const cache = new InMemoryCache();

module.exports = cache;