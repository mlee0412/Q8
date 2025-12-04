/**
 * Thread Detail API Route
 * GET - Get thread with messages
 * PATCH - Update thread (title, archive)
 * DELETE - Soft delete (archive) thread
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { ThreadUpdate } from '@/lib/supabase/types';

export const runtime = 'edge';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/threads/[id]
 * Get thread with messages
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeMessages = searchParams.get('includeMessages') !== 'false';
    const messageLimit = parseInt(searchParams.get('messageLimit') || '100');

    // Get thread
    const { data: thread, error: threadError } = await supabaseAdmin
      .from('threads')
      .select('*')
      .eq('id', id)
      .single();

    if (threadError || !thread) {
      return NextResponse.json(
        { error: 'Thread not found' },
        { status: 404 }
      );
    }

    // Get messages if requested
    let messages = [];
    if (includeMessages) {
      const { data: messageData, error: messagesError } = await supabaseAdmin
        .from('chat_messages')
        .select('*')
        .eq('thread_id', id)
        .order('created_at', { ascending: true })
        .limit(messageLimit);

      if (messagesError) {
        console.error('[Thread API] Error fetching messages:', messagesError);
      } else {
        messages = messageData || [];
      }
    }

    return NextResponse.json({ thread, messages });
  } catch (error) {
    console.error('[Thread API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/threads/[id]
 * Update thread
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, summary, is_archived, metadata } = body as ThreadUpdate & { summary?: string };

    const updates: ThreadUpdate = {};
    if (title !== undefined) updates.title = title;
    if (summary !== undefined) updates.summary = summary;
    if (is_archived !== undefined) updates.is_archived = is_archived;
    if (metadata !== undefined) updates.metadata = metadata;

    const { data: thread, error } = await supabaseAdmin
      .from('threads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Thread API] Error updating thread:', error);
      return NextResponse.json(
        { error: 'Failed to update thread' },
        { status: 500 }
      );
    }

    return NextResponse.json({ thread });
  } catch (error) {
    console.error('[Thread API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/threads/[id]
 * Soft delete (archive) thread
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hard') === 'true';

    if (hardDelete) {
      // Hard delete - permanently remove thread and messages
      const { error } = await supabaseAdmin
        .from('threads')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[Thread API] Error deleting thread:', error);
        return NextResponse.json(
          { error: 'Failed to delete thread' },
          { status: 500 }
        );
      }
    } else {
      // Soft delete - archive the thread
      const { error } = await supabaseAdmin
        .from('threads')
        .update({ is_archived: true })
        .eq('id', id);

      if (error) {
        console.error('[Thread API] Error archiving thread:', error);
        return NextResponse.json(
          { error: 'Failed to archive thread' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Thread API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
