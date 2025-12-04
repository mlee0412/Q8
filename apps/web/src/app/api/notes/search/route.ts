/**
 * Notes Search API Route
 * POST - Search notes (text and semantic)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import OpenAI from 'openai';

export const runtime = 'edge';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/notes/search
 * Search notes by text or semantic similarity
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId, 
      query, 
      limit = 10,
      semantic = false,
      tags,
      folderId,
    } = body as {
      userId: string;
      query: string;
      limit?: number;
      semantic?: boolean;
      tags?: string[];
      folderId?: string;
    };

    if (!userId || !query) {
      return NextResponse.json(
        { error: 'userId and query are required' },
        { status: 400 }
      );
    }

    // Semantic search using embeddings
    if (semantic) {
      // Generate embedding for the query
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

      // Use the match_notes function for similarity search
      const { data: results, error } = await supabaseAdmin.rpc('match_notes', {
        query_embedding: queryEmbedding,
        match_threshold: 0.5,
        match_count: limit,
        filter_user_id: userId,
      });

      if (error) {
        console.error('[Notes Search] Semantic search error:', error);
        return NextResponse.json(
          { error: 'Search failed' },
          { status: 500 }
        );
      }

      return NextResponse.json({ notes: results || [], semantic: true });
    }

    // Text search (full-text)
    let dbQuery = supabaseAdmin
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (tags && tags.length > 0) {
      dbQuery = dbQuery.contains('tags', tags);
    }

    if (folderId) {
      dbQuery = dbQuery.eq('folder_id', folderId);
    }

    const { data: notes, error } = await dbQuery;

    if (error) {
      console.error('[Notes Search] Text search error:', error);
      return NextResponse.json(
        { error: 'Search failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({ notes: notes || [], semantic: false });
  } catch (error) {
    console.error('[Notes Search] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
