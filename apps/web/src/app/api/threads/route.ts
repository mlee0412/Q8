/**
 * Threads API Route
 * GET - List user's threads
 * POST - Create new thread
 *
 * SECURITY: All endpoints require authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
} from '@/lib/auth/api-auth';
import type { Thread, ThreadInsert } from '@/lib/supabase/types';

// Changed from 'edge' to 'nodejs' for cookie-based auth support
export const runtime = 'nodejs';

/**
 * GET /api/threads
 * List threads for the authenticated user
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
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

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
 * Create a new thread for the authenticated user
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
    const { title, metadata } = body as {
      title?: string;
      metadata?: Record<string, unknown>;
    };

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
