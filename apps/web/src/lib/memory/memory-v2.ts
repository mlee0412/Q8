/**
 * Memory 2.0 - Supabase-First Memory System
 * High-precision retrieval with hybrid search (vector + keyword)
 * Includes importance decay, conflict resolution, and provenance tracking
 */

import { supabaseAdmin } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { MemoryType, MemoryImportance, LongTermMemory } from './types';

/**
 * Memory with provenance and hybrid search metadata
 */
export interface EnhancedMemory {
  id: string;
  userId: string;
  content: string;
  memoryType: MemoryType;
  importance: MemoryImportance;
  keywords: string[];
  decayFactor: number;
  accessCount: number;
  createdAt: Date;
  lastAccessedAt: Date;
  sourceThreadId?: string;
  sourceMessageId?: string;
  verificationStatus: 'unverified' | 'verified' | 'contradicted';
  supersededBy?: string;
  provenance: {
    extractedFrom?: string;
    extractionMethod?: string;
    confidenceScore?: number;
    supersededAt?: Date;
    supersededReason?: string;
  };
}

/**
 * Memory retrieval result with relevance scoring
 */
export interface MemoryRetrievalResult {
  memory: EnhancedMemory;
  relevanceScore: number;
  matchType: 'exact' | 'semantic' | 'keyword';
  whyRelevant: string;
}

/**
 * Store options for new memories
 */
export interface StoreMemoryOptions {
  content: string;
  memoryType: MemoryType;
  importance?: MemoryImportance;
  keywords?: string[];
  sourceThreadId?: string;
  sourceMessageId?: string;
  provenance?: Record<string, unknown>;
}

/**
 * Generate embeddings using OpenAI
 */
async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!process.env.OPENAI_API_KEY) {
    logger.warn('No OpenAI API key for embeddings', { module: 'memory-v2' });
    return null;
  }

  try {
    const { OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0]?.embedding || null;
  } catch (error) {
    logger.error('Embedding generation failed', { module: 'memory-v2', error });
    return null;
  }
}

/**
 * Extract keywords from text for hybrid search
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your',
    'yours', 'yourself', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers',
    'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs',
    'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but',
    'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for',
    'with', 'about', 'against', 'between', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in',
    'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
    'like', 'just', 'also', 'very', 'really', 'always', 'never', 'sometimes',
  ]);

  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));

  // Get unique words and return most frequent
  const wordCount = new Map<string, number>();
  for (const word of words) {
    wordCount.set(word, (wordCount.get(word) || 0) + 1);
  }

  return Array.from(wordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * Store a new memory with embeddings and keywords
 */
export async function storeMemory(
  userId: string,
  options: StoreMemoryOptions
): Promise<EnhancedMemory | null> {
  try {
    // Generate embedding for semantic search
    const embedding = await generateEmbedding(options.content);

    // Extract keywords for hybrid search
    const keywords = options.keywords || extractKeywords(options.content);

    // Map importance to numeric value
    const importanceMap: Record<MemoryImportance, number> = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    };

    const { data, error } = await supabaseAdmin
      .from('agent_memories')
      .insert({
        user_id: userId,
        content: options.content,
        memory_type: options.memoryType,
        importance: importanceMap[options.importance || 'medium'],
        keywords,
        embedding,
        source_thread_id: options.sourceThreadId,
        source_message_id: options.sourceMessageId,
        provenance: options.provenance || {},
        verification_status: 'unverified',
      })
      .select()
      .single();

    if (error || !data) {
      logger.error('Failed to store memory', { module: 'memory-v2', error });
      return null;
    }

    return mapToEnhancedMemory(data);
  } catch (error) {
    logger.error('Error storing memory', { module: 'memory-v2', error });
    return null;
  }
}

/**
 * Search memories using hybrid retrieval
 * Combines vector similarity with keyword/exact matching
 */
export async function searchMemoriesHybrid(
  userId: string,
  query: string,
  options: {
    memoryTypes?: MemoryType[];
    minImportance?: MemoryImportance;
    limit?: number;
    includeProvenance?: boolean;
  } = {}
): Promise<MemoryRetrievalResult[]> {
  const { memoryTypes, minImportance = 'low', limit = 10, includeProvenance = true } = options;

  try {
    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);

    // Extract keywords from query
    const queryKeywords = extractKeywords(query);

    // Map importance
    const importanceMap: Record<MemoryImportance, number> = {
      low: 1, medium: 2, high: 3, critical: 4,
    };

    // Use hybrid search RPC
    const { data, error } = await supabaseAdmin.rpc('search_memories_hybrid', {
      p_user_id: userId,
      p_query_embedding: queryEmbedding,
      p_keywords: queryKeywords,
      p_query_text: query,
      p_memory_types: memoryTypes || [],
      p_min_importance: importanceMap[minImportance],
      p_limit: limit,
    });

    if (error) {
      logger.error('Hybrid search failed', { module: 'memory-v2', error, userId });
      // Fall back to simple text search
      return fallbackSearch(userId, query, limit);
    }

    // Update access stats for retrieved memories
    const memoryIds = (data || []).map((r: { id: string }) => r.id);
    if (memoryIds.length > 0) {
      try {
        await supabaseAdmin.rpc('update_memory_access_batch', { p_memory_ids: memoryIds });
      } catch {
        // Non-critical, ignore errors
      }
    }

    // Map results
    return (data || []).map((row: {
      id: string;
      content: string;
      memory_type: string;
      importance: number;
      created_at: string;
      relevance_score: number;
      match_type: string;
      provenance: Record<string, unknown>;
    }) => ({
      memory: {
        id: row.id,
        userId,
        content: row.content,
        memoryType: row.memory_type as MemoryType,
        importance: reverseImportanceMap(row.importance),
        keywords: [],
        decayFactor: 1,
        accessCount: 0,
        createdAt: new Date(row.created_at),
        lastAccessedAt: new Date(),
        verificationStatus: 'unverified' as const,
        provenance: includeProvenance ? (row.provenance as EnhancedMemory['provenance']) : {},
      },
      relevanceScore: row.relevance_score,
      matchType: row.match_type as 'exact' | 'semantic' | 'keyword',
      whyRelevant: generateRelevanceExplanation(row.match_type, row.relevance_score),
    }));
  } catch (error) {
    logger.error('Search error', { module: 'memory-v2', error, userId });
    return fallbackSearch(userId, query, limit);
  }
}

/**
 * Fallback to simple text search when hybrid search fails
 */
async function fallbackSearch(
  userId: string,
  query: string,
  limit: number
): Promise<MemoryRetrievalResult[]> {
  const { data } = await supabaseAdmin
    .from('agent_memories')
    .select('*')
    .eq('user_id', userId)
    .is('superseded_by', null)
    .neq('verification_status', 'contradicted')
    .ilike('content', `%${query}%`)
    .order('importance', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data || []).map((row) => ({
    memory: mapToEnhancedMemory(row),
    relevanceScore: 0.7,
    matchType: 'exact' as const,
    whyRelevant: 'Contains query text',
  }));
}

/**
 * Get most relevant memories for a context
 * Optimized for agent prompts
 */
export async function getRelevantContext(
  userId: string,
  currentQuery: string,
  options: {
    maxMemories?: number;
    includePreferences?: boolean;
    includeFacts?: boolean;
    includeProvenance?: boolean;
  } = {}
): Promise<string> {
  const {
    maxMemories = 8,
    includePreferences = true,
    includeFacts = true,
    includeProvenance = false,
  } = options;

  const memoryTypes: MemoryType[] = [];
  if (includePreferences) memoryTypes.push('preference');
  if (includeFacts) memoryTypes.push('fact');

  const results = await searchMemoriesHybrid(userId, currentQuery, {
    memoryTypes: memoryTypes.length > 0 ? memoryTypes : undefined,
    limit: maxMemories,
    includeProvenance,
  });

  if (results.length === 0) {
    return '';
  }

  const lines: string[] = ['## User Context (from memory)'];

  for (const result of results) {
    const typeLabel = result.memory.memoryType.charAt(0).toUpperCase() + result.memory.memoryType.slice(1);
    const relevanceIndicator = result.relevanceScore > 0.8 ? '★' : result.relevanceScore > 0.6 ? '◉' : '○';

    let line = `${relevanceIndicator} [${typeLabel}] ${result.memory.content}`;

    if (includeProvenance && result.whyRelevant) {
      line += ` _(${result.whyRelevant})_`;
    }

    lines.push(line);
  }

  return lines.join('\n');
}

/**
 * Resolve memory conflicts
 * When new information contradicts existing memory
 */
export async function resolveConflict(
  userId: string,
  existingMemoryId: string,
  newContent: string,
  resolution: 'supersede' | 'mark_contradicted' | 'keep_both',
  reason: string
): Promise<void> {
  try {
    if (resolution === 'supersede') {
      // Create new memory and mark old as superseded
      const newMemory = await storeMemory(userId, {
        content: newContent,
        memoryType: 'fact', // Will be corrected based on old memory type
        importance: 'high',
        provenance: {
          supersedes: existingMemoryId,
          reason,
        },
      });

      if (newMemory) {
        await supabaseAdmin.rpc('supersede_memory', {
          p_old_memory_id: existingMemoryId,
          p_new_memory_id: newMemory.id,
          p_reason: reason,
        });
      }
    } else if (resolution === 'mark_contradicted') {
      await supabaseAdmin
        .from('agent_memories')
        .update({
          verification_status: 'contradicted',
          provenance: { contradicted_reason: reason, contradicted_at: new Date().toISOString() },
        })
        .eq('id', existingMemoryId);
    }
    // 'keep_both' - no action needed
  } catch (error) {
    logger.error('Conflict resolution failed', { module: 'memory-v2', error, existingMemoryId, resolution });
  }
}

/**
 * Verify a memory (mark as confirmed)
 */
export async function verifyMemory(memoryId: string): Promise<void> {
  await supabaseAdmin
    .from('agent_memories')
    .update({ verification_status: 'verified' })
    .eq('id', memoryId);
}

/**
 * Get memory provenance (why this memory exists)
 */
export async function getMemoryProvenance(memoryId: string): Promise<{
  extractedFrom?: string;
  threadId?: string;
  createdAt: Date;
  verificationStatus: string;
  supersededBy?: string;
} | null> {
  const { data } = await supabaseAdmin
    .from('agent_memories')
    .select('provenance, source_thread_id, created_at, verification_status, superseded_by')
    .eq('id', memoryId)
    .single();

  if (!data) return null;

  return {
    extractedFrom: (data.provenance as Record<string, unknown>)?.extractedFrom as string | undefined,
    threadId: data.source_thread_id,
    createdAt: new Date(data.created_at),
    verificationStatus: data.verification_status,
    supersededBy: data.superseded_by,
  };
}

// ============================================================
// Helper Functions
// ============================================================

function mapToEnhancedMemory(row: Record<string, unknown>): EnhancedMemory {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    content: row.content as string,
    memoryType: row.memory_type as MemoryType,
    importance: reverseImportanceMap(row.importance as number),
    keywords: (row.keywords as string[]) || [],
    decayFactor: (row.decay_factor as number) || 1,
    accessCount: (row.access_count as number) || 0,
    createdAt: new Date(row.created_at as string),
    lastAccessedAt: new Date((row.last_accessed_at as string) || row.created_at as string),
    sourceThreadId: row.source_thread_id as string | undefined,
    sourceMessageId: row.source_message_id as string | undefined,
    verificationStatus: (row.verification_status as EnhancedMemory['verificationStatus']) || 'unverified',
    supersededBy: row.superseded_by as string | undefined,
    provenance: (row.provenance as EnhancedMemory['provenance']) || {},
  };
}

function reverseImportanceMap(value: number): MemoryImportance {
  const map: Record<number, MemoryImportance> = { 1: 'low', 2: 'medium', 3: 'high', 4: 'critical' };
  return map[value] || 'medium';
}

function generateRelevanceExplanation(matchType: string, score: number): string {
  if (matchType === 'exact') {
    return 'Direct match in memory content';
  } else if (matchType === 'semantic') {
    return score > 0.8 ? 'Highly similar meaning' : 'Related concept';
  } else {
    return 'Keyword match';
  }
}
