/**
 * Speculative Executor
 * Pre-fetches likely data based on routing decisions while LLM generates response
 *
 * Strategy:
 * - When routing determines target agent, start fetching common data in background
 * - By the time LLM decides what tools to call, data may already be cached
 * - Uses a short-lived cache (30s TTL) to avoid stale data
 */

import { logger } from '@/lib/logger';
import { executeAgentTool } from './agent-runner';
import type { ExtendedAgentType, RoutingDecision } from './types';

// =============================================================================
// TYPES
// =============================================================================

interface SpeculativeResult {
  tool: string;
  args: Record<string, unknown>;
  result: unknown;
  timestamp: number;
}

interface SpeculativeCache {
  results: Map<string, SpeculativeResult>;
  pendingPromises: Map<string, Promise<SpeculativeResult>>;
}

// =============================================================================
// SPECULATIVE PREFETCH CONFIGURATIONS
// =============================================================================

/**
 * Define which tools to speculatively execute for each agent
 * These are high-probability tools that users commonly request
 */
const SPECULATIVE_TOOL_CONFIG: Partial<Record<ExtendedAgentType, Array<{
  tool: string;
  args: Record<string, unknown>;
  priority: number; // Higher = execute first
}>>> = {
  finance: [
    { tool: 'get_balance_sheet', args: {}, priority: 3 },
    { tool: 'get_spending_summary', args: { period: '30d', limit: 5 }, priority: 2 },
    { tool: 'get_upcoming_bills', args: { days_ahead: 7 }, priority: 1 },
  ],
  secretary: [
    { tool: 'calendar_list_events', args: { timeMin: 'today', maxResults: 5 }, priority: 3 },
    { tool: 'gmail_list_messages', args: { maxResults: 5, unreadOnly: true }, priority: 2 },
  ],
  home: [
    { tool: 'get_device_states', args: {}, priority: 2 },
  ],
  coder: [
    { tool: 'github_list_prs', args: { state: 'open', limit: 5 }, priority: 2 },
  ],
};

// Cache TTL in milliseconds (30 seconds - fresh enough for most queries)
const CACHE_TTL_MS = 30_000;

// Maximum speculative tools to execute per agent
const MAX_SPECULATIVE_TOOLS = 3;

// =============================================================================
// SPECULATIVE CACHE
// =============================================================================

// Per-user speculative cache
const userCaches = new Map<string, SpeculativeCache>();

function getUserCache(userId: string): SpeculativeCache {
  let cache = userCaches.get(userId);
  if (!cache) {
    cache = {
      results: new Map(),
      pendingPromises: new Map(),
    };
    userCaches.set(userId, cache);
  }
  return cache;
}

function getCacheKey(tool: string, args: Record<string, unknown>): string {
  return `${tool}:${JSON.stringify(args)}`;
}

/**
 * Check if a cached result is still valid
 */
function isResultValid(result: SpeculativeResult): boolean {
  return Date.now() - result.timestamp < CACHE_TTL_MS;
}

/**
 * Clean up expired entries from cache
 */
function cleanupCache(cache: SpeculativeCache): void {
  const now = Date.now();
  for (const [key, result] of cache.results) {
    if (now - result.timestamp >= CACHE_TTL_MS) {
      cache.results.delete(key);
    }
  }
}

// =============================================================================
// SPECULATIVE EXECUTION
// =============================================================================

/**
 * Start speculative tool execution based on routing decision
 * This runs in the background and doesn't block the main flow
 *
 * @returns A cleanup function to cancel pending operations if needed
 */
export function startSpeculativeExecution(
  routingDecision: RoutingDecision,
  userId: string
): () => void {
  const config = SPECULATIVE_TOOL_CONFIG[routingDecision.agent];

  if (!config || config.length === 0) {
    return () => {}; // No speculative execution for this agent
  }

  const cache = getUserCache(userId);
  cleanupCache(cache);

  // Sort by priority and take top N
  const toolsToExecute = [...config]
    .sort((a, b) => b.priority - a.priority)
    .slice(0, MAX_SPECULATIVE_TOOLS);

  logger.debug('Starting speculative execution', {
    agent: routingDecision.agent,
    tools: toolsToExecute.map(t => t.tool),
  });

  let cancelled = false;

  // Execute tools in parallel (fire and forget)
  for (const { tool, args } of toolsToExecute) {
    const cacheKey = getCacheKey(tool, args);

    // Skip if already cached or pending
    if (cache.results.has(cacheKey) && isResultValid(cache.results.get(cacheKey)!)) {
      continue;
    }
    if (cache.pendingPromises.has(cacheKey)) {
      continue;
    }

    // Start execution
    const promise = (async (): Promise<SpeculativeResult> => {
      try {
        const result = await executeAgentTool(
          routingDecision.agent,
          tool,
          args,
          userId
        );

        if (cancelled) {
          throw new Error('Speculative execution cancelled');
        }

        const speculativeResult: SpeculativeResult = {
          tool,
          args,
          result: result.data,
          timestamp: Date.now(),
        };

        cache.results.set(cacheKey, speculativeResult);
        cache.pendingPromises.delete(cacheKey);

        logger.debug('Speculative execution completed', { tool, cacheKey });

        return speculativeResult;
      } catch (error) {
        cache.pendingPromises.delete(cacheKey);
        if (!cancelled) {
          logger.debug('Speculative execution failed', { tool, error });
        }
        throw error;
      }
    })();

    cache.pendingPromises.set(cacheKey, promise);
  }

  // Return cleanup function
  return () => {
    cancelled = true;
  };
}

/**
 * Try to get a speculative result from cache
 * Returns the cached result if available and valid, otherwise null
 */
export function getSpeculativeResult(
  userId: string,
  tool: string,
  args: Record<string, unknown>
): SpeculativeResult | null {
  const cache = getUserCache(userId);
  const cacheKey = getCacheKey(tool, args);

  const result = cache.results.get(cacheKey);
  if (result && isResultValid(result)) {
    logger.debug('Speculative cache hit', { tool, cacheKey });
    return result;
  }

  return null;
}

/**
 * Wait for a pending speculative execution if one exists
 * Returns null if no pending execution or timeout
 */
export async function waitForSpeculativeResult(
  userId: string,
  tool: string,
  args: Record<string, unknown>,
  timeoutMs: number = 100
): Promise<SpeculativeResult | null> {
  const cache = getUserCache(userId);
  const cacheKey = getCacheKey(tool, args);

  // Check cache first
  const cached = cache.results.get(cacheKey);
  if (cached && isResultValid(cached)) {
    return cached;
  }

  // Check for pending promise
  const pending = cache.pendingPromises.get(cacheKey);
  if (!pending) {
    return null;
  }

  // Race between pending promise and timeout
  try {
    const result = await Promise.race([
      pending,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    return result;
  } catch {
    return null;
  }
}

/**
 * Check if speculative execution has data ready for given tools
 * Useful for deciding whether to use cached data or execute fresh
 */
export function hasSpeculativeData(
  userId: string,
  tools: Array<{ tool: string; args: Record<string, unknown> }>
): { hits: number; total: number; hitRate: number } {
  const cache = getUserCache(userId);
  let hits = 0;

  for (const { tool, args } of tools) {
    const cacheKey = getCacheKey(tool, args);
    const result = cache.results.get(cacheKey);
    if (result && isResultValid(result)) {
      hits++;
    }
  }

  return {
    hits,
    total: tools.length,
    hitRate: tools.length > 0 ? hits / tools.length : 0,
  };
}

/**
 * Clear speculative cache for a user
 */
export function clearSpeculativeCache(userId: string): void {
  userCaches.delete(userId);
}

/**
 * Get cache stats for monitoring
 */
export function getSpeculativeCacheStats(): {
  totalUsers: number;
  totalCachedResults: number;
  totalPendingPromises: number;
} {
  let totalCachedResults = 0;
  let totalPendingPromises = 0;

  for (const cache of userCaches.values()) {
    totalCachedResults += cache.results.size;
    totalPendingPromises += cache.pendingPromises.size;
  }

  return {
    totalUsers: userCaches.size,
    totalCachedResults,
    totalPendingPromises,
  };
}
