/**
 * Memories API Route
 * GET - List user's memories
 * POST - Create new memory
 *
 * SECURITY: All endpoints require authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
} from '@/lib/auth/api-auth';
import type {
  AgentMemoryInsert,
  MemoryType,
  MemoryImportance,
} from '@/lib/supabase/types';

// Changed from 'edge' to 'nodejs' for cookie-based auth support
export const runtime = 'nodejs';

/**
 * GET /api/memories
 * List memories for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Get user from authenticated session, not query params
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }
    const userId = user.id;

    const { searchParams } = new URL(request.url);
    const memoryType = searchParams.get('type') as MemoryType | null;
    const importance = searchParams.get('importance') as MemoryImportance | null;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

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
 * Create a new memory for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Get user from authenticated session, not request body
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }
    const userId = user.id;

    const body = await request.json();
    const {
      content,
      memoryType,
      importance = 'medium',
      sourceThreadId,
      tags = [],
      expiresAt,
    } = body as {
      content: string;
      memoryType: MemoryType;
      importance?: MemoryImportance;
      sourceThreadId?: string;
      tags?: string[];
      expiresAt?: string;
    };

    if (!content || !memoryType) {
      return NextResponse.json(
        { error: 'content and memoryType are required' },
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
