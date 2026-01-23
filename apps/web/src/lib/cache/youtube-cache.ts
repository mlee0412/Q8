/**
 * Simple in-memory cache for YouTube API responses
 * Reduces quota usage by caching results for a configurable TTL
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class YouTubeCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly defaultTTL = 15 * 60 * 1000; // 15 minutes default

  /**
   * Get cached data or undefined if not cached/expired
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.data as T;
  }

  /**
   * Set cached data with optional TTL (defaults to 15 minutes)
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTTL),
    });
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    // Clean expired entries first
    for (const [key, entry] of this.cache.entries()) {
      if (Date.now() > entry.expiresAt) {
        this.cache.delete(key);
      }
    }

    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
export const youtubeCache = new YouTubeCache();

// Cache key generators for consistent key naming
export const cacheKeys = {
  trending: (regionCode: string, limit: number) =>
    `trending:${regionCode}:${limit}`,
  trendingMusic: (regionCode: string, limit: number) =>
    `trending-music:${regionCode}:${limit}`,
  trendingGaming: (regionCode: string, limit: number) =>
    `trending-gaming:${regionCode}:${limit}`,
  shorts: (mode: string, category: string, limit: number) =>
    `shorts:${mode}:${category}:${limit}`,
  likedVideos: (userId: string, limit: number) =>
    `liked:${userId}:${limit}`,
  subscriptions: (userId: string, limit: number) =>
    `subs:${userId}:${limit}`,
  channelVideos: (channelId: string, limit: number) =>
    `channel:${channelId}:${limit}`,
  playlists: (query: string, limit: number) =>
    `playlists:${query}:${limit}`,
};

// TTL constants (in milliseconds)
export const cacheTTL = {
  trending: 30 * 60 * 1000,      // 30 minutes - trending changes slowly
  shorts: 15 * 60 * 1000,        // 15 minutes
  likedVideos: 5 * 60 * 1000,    // 5 minutes - user's own data
  subscriptions: 60 * 60 * 1000, // 1 hour - subscriptions rarely change
  channelVideos: 15 * 60 * 1000, // 15 minutes
  playlists: 60 * 60 * 1000,     // 1 hour - curated content
};
