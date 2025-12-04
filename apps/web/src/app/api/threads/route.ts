/**
 * Threads API Route
 * GET - List user's threads
 * POST - Create new thread
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { Thread, ThreadInsert } from '@/lib/supabase/types';

export const runtime = 'edge';

/**
 * GET /api/threads
 * List threads for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    let query = supabaseAdmin
      .from('threads')
      .select('*')
      .eq('user_id', userId)
      .order('last_message_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }

    const { data: threads, error } = await query;

    if (error) {
      console.error('[Threads API] Error fetching threads:', error);
      return NextResponse.json(
        { error: 'Failed to fetch threads' },
        { status: 500 }
      );
    }

    // Get message counts and last message preview for each thread
    const threadsWithCounts = await Promise.all(
      (threads || []).map(async (thread: Thread) => {
        const { count } = await supabaseAdmin
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('thread_id', thread.id);

        const { data: lastMessage } = await supabaseAdmin
          .from('chat_messages')
          .select('content, role')
          .eq('thread_id', thread.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        return {
          ...thread,
          message_count: count || 0,
          last_message_preview: lastMessage?.content?.slice(0, 100) || null,
        };
      })
    );

    return NextResponse.json({ threads: threadsWithCounts });
  } catch (error) {
    console.error('[Threads API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/threads
 * Create a new thread
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, title, metadata } = body as {
      userId: string;
      title?: string;
      metadata?: Record<string, unknown>;
    };

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const threadData: ThreadInsert = {
      user_id: userId,
      title: title || null,
      metadata: metadata || {},
    };

    const { data: thread, error } = await supabaseAdmin
      .from('threads')
      .insert(threadData)
      .select()
      .single();

    if (error) {
      console.error('[Threads API] Error creating thread:', error);
      return NextResponse.json(
        { error: 'Failed to create thread' },
        { status: 500 }
      );
    }

    return NextResponse.json({ thread });
  } catch (error) {
    console.error('[Threads API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
