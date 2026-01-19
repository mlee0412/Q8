/**
 * Rate Limiting Infrastructure
 *
 * Production-ready rate limiting using Upstash Redis with sliding window algorithm.
 * Falls back to in-memory limiting when Redis is not configured (development).
 *
 * Usage:
 * ```typescript
 * import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
 *
 * export async function POST(request: NextRequest) {
 *   const user = await getAuthenticatedUser(request);
 *   if (!user) return unauthorizedResponse();
 *
 *   const rateLimit = await checkRateLimit(user.id, 'ai');
 *   if (!rateLimit.success) return rateLimitResponse(rateLimit.reset);
 *
 *   // ... handler logic
 * }
 * ```
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import { isServer } from '@/lib/env';
import { logger } from '@/lib/logger';

/**
 * Rate limit tiers with different limits per route type
 */
export const RATE_LIMIT_CONFIG = {
  ai: {
    requests: 20,
    window: '60 s',
    description: 'AI chat, insights, memory extraction',
  },
  finance: {
    requests: 50,
    window: '60 s',
    description: 'Finance API operations',
  },
  data: {
    requests: 100,
    window: '60 s',
    description: 'Notes, threads, memories CRUD',
  },
  media: {
    requests: 200,
    window: '60 s',
    description: 'Spotify, content hub operations',
  },
} as const;

export type RateLimitTier = keyof typeof RATE_LIMIT_CONFIG;

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
  limit: number;
}

/**
 * Check if Upstash Redis is configured
 */
function isRedisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

/**
 * Check if rate limiting is enabled
 */
function isRateLimitEnabled(): boolean {
  const enabled = process.env.RATE_LIMIT_ENABLED;
  // Disabled in test environment by default
  if (process.env.NODE_ENV === 'test') return false;
  // Explicitly disabled
  if (enabled === 'false') return false;
  return true;
}

/**
 * Create Redis-based rate limiters for production
 */
function createRedisRateLimiters(): Record<RateLimitTier, Ratelimit> | null {
  if (!isRedisConfigured()) {
    return null;
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  return {
    ai: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        RATE_LIMIT_CONFIG.ai.requests,
        RATE_LIMIT_CONFIG.ai.window
      ),
      prefix: 'ratelimit:ai',
      analytics: true,
    }),
    finance: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        RATE_LIMIT_CONFIG.finance.requests,
        RATE_LIMIT_CONFIG.finance.window
      ),
      prefix: 'ratelimit:finance',
      analytics: true,
    }),
    data: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        RATE_LIMIT_CONFIG.data.requests,
        RATE_LIMIT_CONFIG.data.window
      ),
      prefix: 'ratelimit:data',
      analytics: true,
    }),
    media: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        RATE_LIMIT_CONFIG.media.requests,
        RATE_LIMIT_CONFIG.media.window
      ),
      prefix: 'ratelimit:media',
      analytics: true,
    }),
  };
}

/**
 * In-memory rate limiter for development (no Redis required)
 */
class InMemoryRateLimiter {
  private requests: Map<string, { count: number; resetAt: number }> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(maxRequests: number, windowSeconds: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowSeconds * 1000;
  }

  async limit(
    identifier: string
  ): Promise<{ success: boolean; remaining: number; reset: number }> {
    const now = Date.now();
    const key = identifier;
    const record = this.requests.get(key);

    // Clean up expired entries periodically
    if (Math.random() < 0.01) {
      this.cleanup();
    }

    if (!record || now >= record.resetAt) {
      // First request or window expired
      const resetAt = now + this.windowMs;
      this.requests.set(key, { count: 1, resetAt });
      return {
        success: true,
        remaining: this.maxRequests - 1,
        reset: Math.floor(resetAt / 1000),
      };
    }

    if (record.count >= this.maxRequests) {
      // Rate limit exceeded
      return {
        success: false,
        remaining: 0,
        reset: Math.floor(record.resetAt / 1000),
      };
    }

    // Increment count
    record.count++;
    return {
      success: true,
      remaining: this.maxRequests - record.count,
      reset: Math.floor(record.resetAt / 1000),
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now >= record.resetAt) {
        this.requests.delete(key);
      }
    }
  }
}

/**
 * Create in-memory rate limiters for development
 */
function createInMemoryRateLimiters(): Record<
  RateLimitTier,
  InMemoryRateLimiter
> {
  return {
    ai: new InMemoryRateLimiter(RATE_LIMIT_CONFIG.ai.requests, 60),
    finance: new InMemoryRateLimiter(RATE_LIMIT_CONFIG.finance.requests, 60),
    data: new InMemoryRateLimiter(RATE_LIMIT_CONFIG.data.requests, 60),
    media: new InMemoryRateLimiter(RATE_LIMIT_CONFIG.media.requests, 60),
  };
}

// Lazy-initialized rate limiters
let redisLimiters: Record<RateLimitTier, Ratelimit> | null = null;
let memoryLimiters: Record<RateLimitTier, InMemoryRateLimiter> | null = null;

/**
 * Get or create rate limiters
 */
function getRateLimiters(): {
  redis: Record<RateLimitTier, Ratelimit> | null;
  memory: Record<RateLimitTier, InMemoryRateLimiter>;
} {
  if (!redisLimiters && isRedisConfigured()) {
    redisLimiters = createRedisRateLimiters();
  }
  if (!memoryLimiters) {
    memoryLimiters = createInMemoryRateLimiters();
  }
  return { redis: redisLimiters, memory: memoryLimiters };
}

/**
 * Check rate limit for a user and tier
 *
 * @param userId - The user's unique identifier
 * @param tier - The rate limit tier to check against
 * @returns Promise<RateLimitResult> with success status and metadata
 *
 * @example
 * const result = await checkRateLimit(user.id, 'ai');
 * if (!result.success) {
 *   return rateLimitResponse(result.reset);
 * }
 */
export async function checkRateLimit(
  userId: string,
  tier: RateLimitTier
): Promise<RateLimitResult> {
  // Skip rate limiting if disabled
  if (!isRateLimitEnabled()) {
    return {
      success: true,
      remaining: RATE_LIMIT_CONFIG[tier].requests,
      reset: Math.floor(Date.now() / 1000) + 60,
      limit: RATE_LIMIT_CONFIG[tier].requests,
    };
  }

  const identifier = `${tier}:${userId}`;
  const limiters = getRateLimiters();
  const config = RATE_LIMIT_CONFIG[tier];

  try {
    // Try Redis first (production)
    if (limiters.redis) {
      const result = await limiters.redis[tier].limit(identifier);
      return {
        success: result.success,
        remaining: result.remaining,
        reset: result.reset,
        limit: config.requests,
      };
    }

    // Fall back to in-memory (development)
    const result = await limiters.memory[tier].limit(identifier);
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
      limit: config.requests,
    };
  } catch (error) {
    // Log error but allow request to proceed (fail open)
    logger.error('Rate limit check failed', { error, tier, userId });
    return {
      success: true,
      remaining: config.requests,
      reset: Math.floor(Date.now() / 1000) + 60,
      limit: config.requests,
    };
  }
}

/**
 * Create a 429 Too Many Requests response
 *
 * @param reset - Unix timestamp when the rate limit resets
 * @returns NextResponse with proper headers
 *
 * @example
 * if (!rateLimit.success) {
 *   return rateLimitResponse(rateLimit.reset);
 * }
 */
export function rateLimitResponse(reset: number): NextResponse {
  const retryAfter = Math.max(1, reset - Math.floor(Date.now() / 1000));

  return NextResponse.json(
    {
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Please slow down and try again later',
      retryAfter,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Reset': String(reset),
      },
    }
  );
}

/**
 * Add rate limit headers to a response
 *
 * @param response - The response to add headers to
 * @param result - The rate limit check result
 * @returns Response with rate limit headers added
 */
export function withRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(result.limit));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(result.reset));
  return response;
}
