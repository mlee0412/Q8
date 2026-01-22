/**
 * Embeddings Utility
 *
 * Shared embedding generation for semantic search across the application.
 * Used by:
 * - Agent routing (semantic vector routing)
 * - Memory search (hybrid semantic/keyword search)
 * - Notes search (semantic similarity)
 *
 * Features:
 * - In-memory caching with TTL
 * - Batch embedding support
 * - Automatic retry with backoff
 */

import { logger } from '@/lib/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  tokenCount: number;
}

export interface BatchEmbeddingResult {
  embeddings: Array<{
    index: number;
    embedding: number[];
  }>;
  model: string;
  totalTokens: number;
}

interface CacheEntry {
  embedding: number[];
  timestamp: number;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000;
const MAX_BATCH_SIZE = 100;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

// In-memory cache for embeddings
const embeddingCache = new Map<string, CacheEntry>();

// =============================================================================
// CACHE MANAGEMENT
// =============================================================================

/**
 * Generate a cache key for a text input
 */
function getCacheKey(text: string): string {
  // Simple hash for cache key
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `${EMBEDDING_MODEL}:${hash}:${text.slice(0, 50)}`;
}

/**
 * Get embedding from cache if valid
 */
function getFromCache(text: string): number[] | null {
  const key = getCacheKey(text);
  const entry = embeddingCache.get(key);

  if (!entry) return null;

  // Check if expired
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    embeddingCache.delete(key);
    return null;
  }

  return entry.embedding;
}

/**
 * Store embedding in cache
 */
function storeInCache(text: string, embedding: number[]): void {
  // Evict oldest entries if cache is full
  if (embeddingCache.size >= MAX_CACHE_SIZE) {
    const oldest = [...embeddingCache.entries()]
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, Math.floor(MAX_CACHE_SIZE / 4));

    for (const [key] of oldest) {
      embeddingCache.delete(key);
    }
  }

  const key = getCacheKey(text);
  embeddingCache.set(key, {
    embedding,
    timestamp: Date.now(),
  });
}

/**
 * Clear the embedding cache
 */
export function clearEmbeddingCache(): void {
  embeddingCache.clear();
}

// =============================================================================
// EMBEDDING GENERATION
// =============================================================================

/**
 * Generate embedding for a single text input
 *
 * @param text - Text to embed
 * @param options - Optional configuration
 * @returns Embedding array or null if failed
 */
export async function generateEmbedding(
  text: string,
  options: {
    useCache?: boolean;
    skipRetry?: boolean;
  } = {}
): Promise<number[] | null> {
  const { useCache = true, skipRetry = false } = options;

  if (!text || text.trim().length === 0) {
    return null;
  }

  // Check API key
  if (!process.env.OPENAI_API_KEY) {
    logger.warn('[Embeddings] No OpenAI API key configured');
    return null;
  }

  // Check cache
  if (useCache) {
    const cached = getFromCache(text);
    if (cached) {
      return cached;
    }
  }

  // Generate embedding with retry
  const { OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let lastError: Error | null = null;
  const maxAttempts = skipRetry ? 1 : MAX_RETRIES;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: text,
      });

      const embedding = response.data[0]?.embedding;

      if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
        throw new Error('Invalid embedding response');
      }

      // Store in cache
      if (useCache) {
        storeInCache(text, embedding);
      }

      return embedding;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on certain errors
      if (lastError.message.includes('invalid_api_key') ||
          lastError.message.includes('insufficient_quota')) {
        break;
      }

      // Exponential backoff
      if (attempt < maxAttempts) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  logger.error('[Embeddings] Failed to generate embedding', {
    textLength: text.length,
    error: lastError?.message,
  });

  return null;
}

/**
 * Generate embeddings for multiple texts in batch
 *
 * @param texts - Array of texts to embed
 * @param options - Optional configuration
 * @returns Array of embeddings (null for failed items)
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  options: {
    useCache?: boolean;
    skipRetry?: boolean;
  } = {}
): Promise<Array<number[] | null>> {
  const { useCache = true, skipRetry = false } = options;

  if (!texts.length) {
    return [];
  }

  if (!process.env.OPENAI_API_KEY) {
    logger.warn('[Embeddings] No OpenAI API key configured');
    return texts.map(() => null);
  }

  // Check cache for all texts
  const results: Array<number[] | null> = new Array(texts.length).fill(null);
  const uncachedIndices: number[] = [];
  const uncachedTexts: string[] = [];

  if (useCache) {
    for (let i = 0; i < texts.length; i++) {
      const cached = getFromCache(texts[i]!);
      if (cached) {
        results[i] = cached;
      } else {
        uncachedIndices.push(i);
        uncachedTexts.push(texts[i]!);
      }
    }
  } else {
    for (let i = 0; i < texts.length; i++) {
      uncachedIndices.push(i);
      uncachedTexts.push(texts[i]!);
    }
  }

  // If all cached, return early
  if (uncachedTexts.length === 0) {
    return results;
  }

  // Process in batches
  const { OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  for (let batchStart = 0; batchStart < uncachedTexts.length; batchStart += MAX_BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + MAX_BATCH_SIZE, uncachedTexts.length);
    const batchTexts = uncachedTexts.slice(batchStart, batchEnd);
    const batchIndices = uncachedIndices.slice(batchStart, batchEnd);

    let lastError: Error | null = null;
    const maxAttempts = skipRetry ? 1 : MAX_RETRIES;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await client.embeddings.create({
          model: EMBEDDING_MODEL,
          input: batchTexts,
        });

        // Map results back to original indices
        for (let i = 0; i < response.data.length; i++) {
          const embedding = response.data[i]?.embedding;
          const originalIndex = batchIndices[i];

          if (embedding && embedding.length === EMBEDDING_DIMENSIONS && originalIndex !== undefined) {
            results[originalIndex] = embedding;

            if (useCache && texts[originalIndex]) {
              storeInCache(texts[originalIndex]!, embedding);
            }
          }
        }

        break; // Success, exit retry loop
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (lastError.message.includes('invalid_api_key') ||
            lastError.message.includes('insufficient_quota')) {
          break;
        }

        if (attempt < maxAttempts) {
          const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    if (lastError) {
      logger.error('[Embeddings] Batch embedding failed', {
        batchSize: batchTexts.length,
        error: lastError.message,
      });
    }
  }

  return results;
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have same dimensions');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Get the embedding model configuration
 */
export function getEmbeddingConfig() {
  return {
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    cacheTtlMs: CACHE_TTL_MS,
    maxBatchSize: MAX_BATCH_SIZE,
  };
}
