/**
 * Semantic Vector Router
 *
 * Routes messages to agents using embedding similarity search.
 * Provides more accurate routing than keyword matching by understanding
 * semantic meaning of queries.
 *
 * Features:
 * - Vector similarity search against training examples
 * - Aggregated confidence scoring
 * - Fallback to heuristic routing when no examples match
 * - Feedback integration for continuous learning
 */

import { generateEmbedding } from '@/lib/embeddings';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { ExtendedAgentType, RoutingDecision } from './types';
import { heuristicRoute, AGENT_CAPABILITIES } from './router';

// =============================================================================
// TYPES
// =============================================================================

interface VectorRoutingResult {
  agent: ExtendedAgentType;
  confidence: number;
  matchCount: number;
  avgSimilarity: number;
  avgQuality: number;
}

interface RoutingExample {
  agent_type: string;
  similarity: number;
  query: string;
  quality_score: number;
  source: string;
}

interface RoutingFeedback {
  userId: string;
  threadId?: string;
  originalQuery: string;
  selectedAgent: ExtendedAgentType;
  routingConfidence: number;
  routingSource: string;
  feedbackType: 'correct' | 'incorrect' | 'improved' | 'tool_failure' | 'slow';
  correctAgent?: ExtendedAgentType;
  userComment?: string;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const MIN_SIMILARITY_THRESHOLD = 0.65;
const MIN_CONFIDENCE_THRESHOLD = 0.6;
const MAX_EXAMPLES_TO_FETCH = 10;
const VECTOR_ROUTING_TIMEOUT_MS = 500;

// =============================================================================
// VECTOR ROUTING
// =============================================================================

/**
 * Route a message using semantic vector similarity
 *
 * @param message - User message to route
 * @returns Routing decision with confidence score
 */
export async function vectorRoute(message: string): Promise<RoutingDecision | null> {
  const startTime = Date.now();

  try {
    // Generate embedding for the query
    const embedding = await generateEmbedding(message, { useCache: true });

    if (!embedding) {
      logger.warn('[VectorRouter] Failed to generate embedding');
      return null;
    }

    // Query for similar routing examples
    const { data: results, error } = await supabaseAdmin.rpc(
      'aggregate_routing_scores',
      {
        p_query_embedding: JSON.stringify(embedding),
        p_limit: MAX_EXAMPLES_TO_FETCH,
        p_min_similarity: MIN_SIMILARITY_THRESHOLD,
      }
    );

    if (error) {
      logger.error('[VectorRouter] Database query failed', { error });
      return null;
    }

    const elapsed = Date.now() - startTime;

    // No matches found
    if (!results || results.length === 0) {
      logger.info('[VectorRouter] No matches found', { elapsed });
      return null;
    }

    // Get the top result
    const topResult = results[0] as VectorRoutingResult;

    // Check confidence threshold
    if (topResult.confidence < MIN_CONFIDENCE_THRESHOLD) {
      logger.info('[VectorRouter] Confidence too low', {
        agent: topResult.agent,
        confidence: topResult.confidence,
        elapsed,
      });
      return null;
    }

    // Validate agent type
    const validAgents = AGENT_CAPABILITIES.map(c => c.agent);
    if (!validAgents.includes(topResult.agent as ExtendedAgentType)) {
      logger.warn('[VectorRouter] Invalid agent type', { agent: topResult.agent });
      return null;
    }

    logger.info('[VectorRouter] Route found', {
      agent: topResult.agent,
      confidence: topResult.confidence,
      matchCount: topResult.matchCount,
      avgSimilarity: topResult.avgSimilarity,
      elapsed,
    });

    // Get capability info for rationale
    const capability = AGENT_CAPABILITIES.find(c => c.agent === topResult.agent);

    return {
      agent: topResult.agent as ExtendedAgentType,
      confidence: Math.min(0.98, topResult.confidence), // Cap at 98%
      rationale: `Semantic match: ${capability?.name || topResult.agent} (${topResult.matchCount} similar examples)`,
      fallbackAgent: 'personality',
      toolPlan: capability?.tools.slice(0, 3),
      source: 'vector',
      performanceContext: {
        matchCount: topResult.matchCount,
        avgSimilarity: topResult.avgSimilarity,
        avgQuality: topResult.avgQuality,
      },
    };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    logger.error('[VectorRouter] Error', { error, elapsed });
    return null;
  }
}

/**
 * Get similar routing examples for a query (for debugging/analysis)
 */
export async function getSimilarExamples(
  message: string,
  limit: number = 5
): Promise<RoutingExample[]> {
  try {
    const embedding = await generateEmbedding(message, { useCache: true });

    if (!embedding) {
      return [];
    }

    const { data, error } = await supabaseAdmin.rpc(
      'search_routing_examples',
      {
        p_query_embedding: JSON.stringify(embedding),
        p_limit: limit,
        p_min_similarity: 0.5, // Lower threshold for debugging
      }
    );

    if (error) {
      logger.error('[VectorRouter] Failed to get similar examples', { error });
      return [];
    }

    return (data || []) as RoutingExample[];
  } catch (error) {
    logger.error('[VectorRouter] Error getting examples', { error });
    return [];
  }
}

// =============================================================================
// FEEDBACK HANDLING
// =============================================================================

/**
 * Submit routing feedback for learning
 */
export async function submitRoutingFeedback(
  feedback: RoutingFeedback
): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('routing_feedback')
      .insert({
        user_id: feedback.userId,
        thread_id: feedback.threadId,
        original_query: feedback.originalQuery,
        selected_agent: feedback.selectedAgent,
        routing_confidence: feedback.routingConfidence,
        routing_source: feedback.routingSource,
        feedback_type: feedback.feedbackType,
        correct_agent: feedback.correctAgent,
        user_comment: feedback.userComment,
      })
      .select('id')
      .single();

    if (error) {
      logger.error('[VectorRouter] Failed to save feedback', { error });
      return null;
    }

    logger.info('[VectorRouter] Feedback saved', {
      feedbackId: data.id,
      type: feedback.feedbackType,
    });

    return data.id;
  } catch (error) {
    logger.error('[VectorRouter] Error saving feedback', { error });
    return null;
  }
}

/**
 * Process pending feedback into training examples
 */
export async function processPendingFeedback(): Promise<number> {
  try {
    // Get unprocessed feedback
    const { data: feedbackItems, error: fetchError } = await supabaseAdmin
      .from('routing_feedback')
      .select('*')
      .eq('processed', false)
      .limit(50);

    if (fetchError || !feedbackItems?.length) {
      return 0;
    }

    let processed = 0;

    for (const feedback of feedbackItems) {
      // Generate embedding for the query
      const embedding = await generateEmbedding(feedback.original_query);

      if (!embedding) {
        continue;
      }

      // Process the feedback
      const { error } = await supabaseAdmin.rpc('process_routing_feedback', {
        p_feedback_id: feedback.id,
        p_embedding: JSON.stringify(embedding),
      });

      if (!error) {
        processed++;
      } else {
        logger.error('[VectorRouter] Failed to process feedback', {
          feedbackId: feedback.id,
          error,
        });
      }
    }

    logger.info('[VectorRouter] Processed feedback', { processed });
    return processed;
  } catch (error) {
    logger.error('[VectorRouter] Error processing feedback', { error });
    return 0;
  }
}

// =============================================================================
// HYBRID ROUTING
// =============================================================================

/**
 * Combined routing using vector + heuristic + LLM
 *
 * Priority:
 * 1. Vector routing (if high confidence)
 * 2. Heuristic routing (for speed)
 * 3. LLM routing (for complex cases)
 */
export async function hybridRoute(
  message: string,
  options: {
    enableVector?: boolean;
    enableLLM?: boolean;
    vectorTimeout?: number;
  } = {}
): Promise<RoutingDecision> {
  const {
    enableVector = true,
    enableLLM = true,
    vectorTimeout = VECTOR_ROUTING_TIMEOUT_MS,
  } = options;

  // Try vector routing first (with timeout)
  if (enableVector) {
    const vectorPromise = vectorRoute(message);
    const timeoutPromise = new Promise<null>(resolve =>
      setTimeout(() => resolve(null), vectorTimeout)
    );

    const vectorResult = await Promise.race([vectorPromise, timeoutPromise]);

    if (vectorResult && vectorResult.confidence >= MIN_CONFIDENCE_THRESHOLD) {
      return vectorResult;
    }
  }

  // Fall back to heuristic routing
  const heuristicResult = heuristicRoute(message);

  // If heuristic is confident enough, use it
  if (heuristicResult.confidence >= 0.7) {
    return heuristicResult;
  }

  // For low-confidence cases, we could try LLM routing
  // But for performance, we'll stick with heuristic
  if (enableLLM && heuristicResult.confidence < 0.5) {
    // Import and use llmRoute if needed
    // This adds latency but improves accuracy for ambiguous cases
    try {
      const { llmRoute } = await import('./router');
      const llmResult = await Promise.race([
        llmRoute(message),
        new Promise<RoutingDecision>(resolve =>
          setTimeout(() => resolve(heuristicResult), 1000)
        ),
      ]);
      return llmResult;
    } catch {
      return heuristicResult;
    }
  }

  return heuristicResult;
}

// =============================================================================
// EXAMPLE MANAGEMENT
// =============================================================================

/**
 * Add a new routing example (for manual curation)
 */
export async function addRoutingExample(
  query: string,
  agentType: ExtendedAgentType,
  options: {
    source?: 'manual' | 'feedback' | 'telemetry' | 'synthetic';
    qualityScore?: number;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<string | null> {
  const { source = 'manual', qualityScore = 1.0, metadata = {} } = options;

  try {
    // Generate embedding
    const embedding = await generateEmbedding(query);

    if (!embedding) {
      logger.error('[VectorRouter] Failed to generate embedding for new example');
      return null;
    }

    const { data, error } = await supabaseAdmin
      .from('routing_examples')
      .insert({
        query,
        agent_type: agentType,
        embedding: JSON.stringify(embedding),
        source,
        quality_score: qualityScore,
        metadata,
      })
      .select('id')
      .single();

    if (error) {
      logger.error('[VectorRouter] Failed to add example', { error });
      return null;
    }

    logger.info('[VectorRouter] Example added', {
      exampleId: data.id,
      agent: agentType,
    });

    return data.id;
  } catch (error) {
    logger.error('[VectorRouter] Error adding example', { error });
    return null;
  }
}

/**
 * Seed embeddings for existing examples (run once after migration)
 */
export async function seedExampleEmbeddings(): Promise<{
  processed: number;
  failed: number;
}> {
  try {
    // Get examples without embeddings
    const { data: examples, error: fetchError } = await supabaseAdmin
      .from('routing_examples')
      .select('id, query')
      .is('embedding', null)
      .limit(100);

    if (fetchError || !examples?.length) {
      return { processed: 0, failed: 0 };
    }

    let processed = 0;
    let failed = 0;

    // Process in batches to avoid rate limits
    for (const example of examples) {
      const embedding = await generateEmbedding(example.query);

      if (embedding) {
        const { error: updateError } = await supabaseAdmin
          .from('routing_examples')
          .update({ embedding: JSON.stringify(embedding) })
          .eq('id', example.id);

        if (!updateError) {
          processed++;
        } else {
          failed++;
        }
      } else {
        failed++;
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    logger.info('[VectorRouter] Seeded embeddings', { processed, failed });
    return { processed, failed };
  } catch (error) {
    logger.error('[VectorRouter] Error seeding embeddings', { error });
    return { processed: 0, failed: 0 };
  }
}

/**
 * Get routing example statistics
 */
export async function getRoutingStats(): Promise<{
  totalExamples: number;
  examplesWithEmbeddings: number;
  byAgent: Record<string, number>;
  bySource: Record<string, number>;
}> {
  try {
    const [
      { count: totalExamples },
      { count: withEmbeddings },
      agentCounts,
      sourceCounts,
    ] = await Promise.all([
      supabaseAdmin
        .from('routing_examples')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true),
      supabaseAdmin
        .from('routing_examples')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .not('embedding', 'is', null),
      supabaseAdmin
        .from('routing_examples')
        .select('agent_type')
        .eq('is_active', true),
      supabaseAdmin
        .from('routing_examples')
        .select('source')
        .eq('is_active', true),
    ]);

    const byAgent: Record<string, number> = {};
    const bySource: Record<string, number> = {};

    if (agentCounts.data) {
      for (const row of agentCounts.data) {
        const agent = (row as { agent_type: string }).agent_type;
        byAgent[agent] = (byAgent[agent] || 0) + 1;
      }
    }

    if (sourceCounts.data) {
      for (const row of sourceCounts.data) {
        const source = (row as { source: string }).source;
        bySource[source] = (bySource[source] || 0) + 1;
      }
    }

    return {
      totalExamples: totalExamples ?? 0,
      examplesWithEmbeddings: withEmbeddings ?? 0,
      byAgent,
      bySource,
    };
  } catch (error) {
    logger.error('[VectorRouter] Error getting stats', { error });
    return {
      totalExamples: 0,
      examplesWithEmbeddings: 0,
      byAgent: {},
      bySource: {},
    };
  }
}
