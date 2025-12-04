/**
 * Memories API Route
 * GET - List user's memories
 * POST - Create new memory
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { AgentMemoryInsert, MemoryType, MemoryImportance } from '@/lib/supabase/types';

export const runtime = 'edge';

/**
 * GET /api/memories
 * List memories for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const memoryType = searchParams.get('type') as MemoryType | null;
    const importance = searchParams.get('importance') as MemoryImportance | null;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    let query = supabaseAdmin
      .from('agent_memories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (memoryType) {
      query = query.eq('memory_type', memoryType);
    }

    if (importance) {
      query = query.eq('importance', importance);
    }

    const { data: memories, error } = await query;

    if (error) {
      console.error('[Memories API] Error fetching memories:', error);
      return NextResponse.json(
        { error: 'Failed to fetch memories' },
        { status: 500 }
      );
    }

    return NextResponse.json({ memories: memories || [] });
  } catch (error) {
    console.error('[Memories API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/memories
 * Create a new memory
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      content,
      memoryType,
      importance = 'medium',
      sourceThreadId,
      tags = [],
      expiresAt,
    } = body as {
      userId: string;
      content: string;
      memoryType: MemoryType;
      importance?: MemoryImportance;
      sourceThreadId?: string;
      tags?: string[];
      expiresAt?: string;
    };

    if (!userId || !content || !memoryType) {
      return NextResponse.json(
        { error: 'userId, content, and memoryType are required' },
        { status: 400 }
      );
    }

    const memoryData: AgentMemoryInsert = {
      user_id: userId,
      content,
      memory_type: memoryType,
      importance,
      source_thread_id: sourceThreadId,
      tags,
      expires_at: expiresAt,
    };

    const { data: memory, error } = await supabaseAdmin
      .from('agent_memories')
      .insert(memoryData)
      .select()
      .single();

    if (error) {
      console.error('[Memories API] Error creating memory:', error);
      return NextResponse.json(
        { error: 'Failed to create memory' },
        { status: 500 }
      );
    }

    return NextResponse.json({ memory });
  } catch (error) {
    console.error('[Memories API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
