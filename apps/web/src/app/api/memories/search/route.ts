/**
 * Memory Search API Route
 * POST - Semantic search for memories
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import OpenAI from 'openai';
import type { MemoryType, MemoryImportance } from '@/lib/supabase/types';

export const runtime = 'edge';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/memories/search
 * Search memories using semantic similarity
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      query,
      memoryTypes,
      minImportance,
      limit = 10,
      threshold = 0.7,
    } = body as {
      userId: string;
      query: string;
      memoryTypes?: MemoryType[];
      minImportance?: MemoryImportance;
      limit?: number;
      threshold?: number;
    };

    if (!userId || !query) {
      return NextResponse.json(
        { error: 'userId and query are required' },
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

    // Search using vector similarity
    const { data: results, error } = await supabaseAdmin.rpc('match_memories', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
      filter_user_id: userId,
    });

    if (error) {
      console.error('[Memory Search API] Error:', error);
      return NextResponse.json(
        { error: 'Search failed' },
        { status: 500 }
      );
    }

    // Filter by memory type and importance if specified
    let filteredResults = results || [];

    if (memoryTypes && memoryTypes.length > 0) {
      filteredResults = filteredResults.filter((r: { memory_type: MemoryType }) =>
        memoryTypes.includes(r.memory_type)
      );
    }

    if (minImportance) {
      const importanceLevels: MemoryImportance[] = ['low', 'medium', 'high', 'critical'];
      const minLevel = importanceLevels.indexOf(minImportance);
      filteredResults = filteredResults.filter((r: { importance: MemoryImportance }) =>
        importanceLevels.indexOf(r.importance) >= minLevel
      );
    }

    return NextResponse.json({ memories: filteredResults });
  } catch (error) {
    console.error('[Memory Search API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
