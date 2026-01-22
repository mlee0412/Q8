/**
 * Memory Search API Route
 * POST - Hybrid semantic + keyword search for memories
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import OpenAI from 'openai';
import type { MemoryType, MemoryImportance } from '@/lib/supabase/types';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/auth/api-auth';
import { logger } from '@/lib/logger';

export const runtime = 'edge';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Map importance strings to numeric values for SQL function
const IMPORTANCE_MAP: Record<MemoryImportance, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

/**
 * Extract keywords from query for hybrid search
 */
function extractKeywords(query: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
    'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
    'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'between', 'under', 'again', 'further', 'then', 'once', 'here',
    'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
    'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or',
    'because', 'until', 'while', 'about', 'against', 'what', 'which', 'who',
    'this', 'that', 'these', 'those', 'am', 'i', 'me', 'my', 'myself', 'we',
    'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'he',
    'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its',
    'itself', 'they', 'them', 'their', 'theirs', 'themselves',
  ]);

  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 10); // Limit to top 10 keywords
}

/**
 * POST /api/memories/search
 * Search memories using hybrid semantic + keyword matching
 */
export async function POST(request: NextRequest) {
  // Authenticate user
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const {
      query,
      memoryTypes,
      minImportance,
      limit = 10,
      keywords: providedKeywords,
    } = body as {
      query: string;
      memoryTypes?: MemoryType[];
      minImportance?: MemoryImportance;
      limit?: number;
      keywords?: string[];
    };

    const userId = user.id;

    if (!query) {
      return NextResponse.json(
        { error: 'query is required' },
        { status: 400 }
      );
    }

    // Generate embedding for query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0]?.embedding;

    if (!queryEmbedding) {
      return NextResponse.json(
        { error: 'Failed to generate embedding' },
        { status: 500 }
      );
    }

    // Extract keywords for hybrid search (use provided or extract from query)
    const keywords = providedKeywords ?? extractKeywords(query);

    // Convert importance to numeric value
    const minImportanceValue = minImportance ? IMPORTANCE_MAP[minImportance] : 0;

    // Search using hybrid function (vector + keyword)
    const { data: results, error } = await supabaseAdmin.rpc('search_memories_hybrid', {
      p_user_id: userId,
      p_query_embedding: JSON.stringify(queryEmbedding),
      p_keywords: keywords,
      p_query_text: query,
      p_memory_types: memoryTypes ?? [],
      p_min_importance: minImportanceValue,
      p_limit: limit,
    });

    if (error) {
      logger.error('[Memory Search API] Error', { error });
      return NextResponse.json(
        { error: 'Search failed', details: error.message },
        { status: 500 }
      );
    }

    // Transform results to match expected response format
    const memories = (results || []).map((r: {
      id: string;
      content: string;
      memory_type: string;
      importance: number;
      created_at: string;
      relevance_score: number;
      match_type: string;
      provenance: Record<string, unknown>;
    }) => ({
      id: r.id,
      content: r.content,
      memory_type: r.memory_type,
      importance: r.importance,
      created_at: r.created_at,
      relevance_score: r.relevance_score,
      match_type: r.match_type,
      provenance: r.provenance,
    }));

    return NextResponse.json({ memories });
  } catch (error) {
    logger.error('[Memory Search API] Error', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
