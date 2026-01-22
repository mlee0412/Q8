/**
 * Semantic Response Cache
 * Caches responses with semantic similarity matching for faster repeat queries
 *
 * Features:
 * - LRU cache with TTL expiration
 * - Semantic similarity matching via embeddings
 * - User-specific and global cache layers
 * - Cache warming for common queries
 */

import { logger } from '@/lib/logger';
import type { ExtendedAgentType } from './types';

// =============================================================================
// TYPES
// =============================================================================

interface CacheEntry {
  query: string;
  queryEmbedding?: number[];
  response: string;
  agent: ExtendedAgentType;
  timestamp: number;
  ttl: number;
  hits: number;
  userId?: string;
  metadata?: {
    latency: number;
    tokenUsage?: { input: number; output: number };
    quality?: number;
  };
}

interface CacheConfig {
  maxSize: number;
  defaultTTL: number; // milliseconds
  similarityThreshold: number; // 0-1, higher = stricter matching
  enableSemanticMatching: boolean;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  avgLatencySaved: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_CONFIG: CacheConfig = {
  maxSize: 500,
  defaultTTL: 30 * 60 * 1000, // 30 minutes
  similarityThreshold: 0.92,
  enableSemanticMatching: true,
};

// Common queries that should be cached globally
const COMMON_QUERY_PATTERNS = [
  { pattern: /^(hi|hello|hey|good morning|good afternoon|good evening)/i, ttl: 60000 },
  { pattern: /^what('s| is) the (weather|time|date)/i, ttl: 300000 },
  { pattern: /^(thanks|thank you|bye|goodbye)/i, ttl: 60000 },
  { pattern: /^how are you/i, ttl: 60000 },
];

// =============================================================================
// CACHE IMPLEMENTATION
// =============================================================================

class ResponseCache {
  private cache: Map<string, CacheEntry> = new Map();
  private userCache: Map<string, Map<string, CacheEntry>> = new Map();
  private config: CacheConfig;
  private stats: CacheStats = { hits: 0, misses: 0, size: 0, avgLatencySaved: 0 };
  private totalLatencySaved = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate cache key from query
   */
  private generateKey(query: string, agent?: ExtendedAgentType): string {
    const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ');
    return agent ? `${agent}:${normalized}` : normalized;
  }

  /**
   * Check if query matches a common pattern
   */
  private matchesCommonPattern(query: string): { ttl: number } | null {
    for (const { pattern, ttl } of COMMON_QUERY_PATTERNS) {
      if (pattern.test(query)) {
        return { ttl };
      }
    }
    return null;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += (a[i] ?? 0) * (b[i] ?? 0);
      normA += (a[i] ?? 0) ** 2;
      normB += (b[i] ?? 0) ** 2;
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Find semantically similar cached entry
   */
  private findSimilar(
    queryEmbedding: number[],
    targetCache: Map<string, CacheEntry>
  ): CacheEntry | null {
    let bestMatch: CacheEntry | null = null;
    let bestSimilarity = this.config.similarityThreshold;

    for (const entry of targetCache.values()) {
      if (!entry.queryEmbedding) continue;
      if (Date.now() > entry.timestamp + entry.ttl) continue;

      const similarity = this.cosineSimilarity(queryEmbedding, entry.queryEmbedding);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = entry;
      }
    }

    return bestMatch;
  }

  /**
   * Get cached response
   */
  async get(
    query: string,
    options: {
      agent?: ExtendedAgentType;
      userId?: string;
      queryEmbedding?: number[];
    } = {}
  ): Promise<{ response: string; agent: ExtendedAgentType; fromCache: true } | null> {
    const { agent, userId, queryEmbedding } = options;
    const key = this.generateKey(query, agent);

    // Check exact match in global cache
    const globalEntry = this.cache.get(key);
    if (globalEntry && Date.now() < globalEntry.timestamp + globalEntry.ttl) {
      globalEntry.hits++;
      this.stats.hits++;
      if (globalEntry.metadata?.latency) {
        this.totalLatencySaved += globalEntry.metadata.latency;
        this.stats.avgLatencySaved = this.totalLatencySaved / this.stats.hits;
      }
      logger.debug('Cache hit (exact)', { query: query.slice(0, 50), agent: globalEntry.agent });
      return { response: globalEntry.response, agent: globalEntry.agent, fromCache: true };
    }

    // Check user-specific cache
    if (userId) {
      const userCacheMap = this.userCache.get(userId);
      if (userCacheMap) {
        const userEntry = userCacheMap.get(key);
        if (userEntry && Date.now() < userEntry.timestamp + userEntry.ttl) {
          userEntry.hits++;
          this.stats.hits++;
          logger.debug('Cache hit (user)', { query: query.slice(0, 50), userId });
          return { response: userEntry.response, agent: userEntry.agent, fromCache: true };
        }
      }
    }

    // Semantic similarity search
    if (this.config.enableSemanticMatching && queryEmbedding) {
      const similarEntry = this.findSimilar(queryEmbedding, this.cache);
      if (similarEntry) {
        similarEntry.hits++;
        this.stats.hits++;
        logger.debug('Cache hit (semantic)', { query: query.slice(0, 50) });
        return { response: similarEntry.response, agent: similarEntry.agent, fromCache: true };
      }
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Store response in cache
   */
  set(
    query: string,
    response: string,
    agent: ExtendedAgentType,
    options: {
      userId?: string;
      queryEmbedding?: number[];
      ttl?: number;
      metadata?: CacheEntry['metadata'];
    } = {}
  ): void {
    const { userId, queryEmbedding, ttl, metadata } = options;
    const key = this.generateKey(query, agent);

    // Check for common pattern TTL override
    const commonPattern = this.matchesCommonPattern(query);
    const effectiveTTL = ttl ?? commonPattern?.ttl ?? this.config.defaultTTL;

    const entry: CacheEntry = {
      query,
      queryEmbedding,
      response,
      agent,
      timestamp: Date.now(),
      ttl: effectiveTTL,
      hits: 0,
      userId,
      metadata,
    };

    // Evict if at capacity (LRU)
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    // Store in appropriate cache
    if (userId) {
      if (!this.userCache.has(userId)) {
        this.userCache.set(userId, new Map());
      }
      this.userCache.get(userId)!.set(key, entry);
    } else {
      this.cache.set(key, entry);
    }

    this.stats.size = this.cache.size;
    logger.debug('Cache set', { query: query.slice(0, 50), agent, ttl: effectiveTTL });
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    let lowestHits = Infinity;

    for (const [key, entry] of this.cache) {
      // Prioritize evicting expired entries
      if (Date.now() > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        return;
      }

      // Then evict by hits (least used) and timestamp (oldest)
      if (entry.hits < lowestHits || (entry.hits === lowestHits && entry.timestamp < oldestTime)) {
        oldestKey = key;
        oldestTime = entry.timestamp;
        lowestHits = entry.hits;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Invalidate cache entries
   */
  invalidate(options: { userId?: string; agent?: ExtendedAgentType; all?: boolean } = {}): void {
    const { userId, agent, all } = options;

    if (all) {
      this.cache.clear();
      this.userCache.clear();
      logger.info('Cache cleared (all)');
      return;
    }

    if (userId) {
      this.userCache.delete(userId);
      logger.info('Cache cleared (user)', { userId });
    }

    if (agent) {
      for (const [key] of this.cache) {
        if (key.startsWith(`${agent}:`)) {
          this.cache.delete(key);
        }
      }
      logger.info('Cache cleared (agent)', { agent });
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  /**
   * Warm cache with common responses
   */
  warmCache(entries: Array<{ query: string; response: string; agent: ExtendedAgentType }>): void {
    for (const entry of entries) {
      this.set(entry.query, entry.response, entry.agent, { ttl: 3600000 }); // 1 hour
    }
    logger.info('Cache warmed', { entries: entries.length });
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let cacheInstance: ResponseCache | null = null;

export function getResponseCache(): ResponseCache {
  if (!cacheInstance) {
    cacheInstance = new ResponseCache();
  }
  return cacheInstance;
}

export function createResponseCache(config?: Partial<CacheConfig>): ResponseCache {
  return new ResponseCache(config);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if a query is cacheable
 */
export function isCacheable(query: string, agent: ExtendedAgentType): boolean {
  // Don't cache queries that likely require real-time data
  const nonCacheablePatterns = [
    /\b(now|currently|right now|at the moment)\b/i,
    /\b(today's|yesterday's|tomorrow's)\b/i,
    /\b(latest|newest|recent|breaking)\b/i,
    /\b(price|stock|market|weather)\b/i, // Real-time data
  ];

  // Always cache simple greetings/closings
  if (COMMON_QUERY_PATTERNS.some(({ pattern }) => pattern.test(query))) {
    return true;
  }

  // Don't cache real-time queries
  if (nonCacheablePatterns.some((pattern) => pattern.test(query))) {
    return false;
  }

  // Don't cache tool-heavy agents
  if (['home', 'secretary', 'finance'].includes(agent)) {
    return false;
  }

  return true;
}

/**
 * Calculate optimal TTL based on query characteristics
 */
export function calculateTTL(query: string, agent: ExtendedAgentType): number {
  // Common patterns get short TTL
  if (COMMON_QUERY_PATTERNS.some(({ pattern }) => pattern.test(query))) {
    return 60000; // 1 minute
  }

  // Research queries get medium TTL
  if (agent === 'researcher') {
    return 10 * 60 * 1000; // 10 minutes
  }

  // Code-related queries can be cached longer
  if (agent === 'coder') {
    return 30 * 60 * 1000; // 30 minutes
  }

  // Default TTL
  return 15 * 60 * 1000; // 15 minutes
}
