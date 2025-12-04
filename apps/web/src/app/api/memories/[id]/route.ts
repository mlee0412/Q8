/**
 * Memory Detail API Route
 * GET - Get memory by ID
 * PATCH - Update memory
 * DELETE - Delete memory
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { AgentMemoryUpdate } from '@/lib/supabase/types';

export const runtime = 'edge';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/memories/[id]
 * Get memory by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const { data: memory, error } = await supabaseAdmin
      .from('agent_memories')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !memory) {
      return NextResponse.json(
        { error: 'Memory not found' },
        { status: 404 }
      );
    }

    // Update access count
    await supabaseAdmin
      .from('agent_memories')
      .update({
        access_count: memory.access_count + 1,
        last_accessed_at: new Date().toISOString(),
      })
      .eq('id', id);

    return NextResponse.json({ memory });
  } catch (error) {
    console.error('[Memory API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/memories/[id]
 * Update memory
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content, memoryType, importance, tags, expiresAt } = body as {
      content?: string;
      memoryType?: string;
      importance?: string;
      tags?: string[];
      expiresAt?: string | null;
    };

    const updates: AgentMemoryUpdate = {};
    if (content !== undefined) updates.content = content;
    if (memoryType !== undefined) updates.memory_type = memoryType as AgentMemoryUpdate['memory_type'];
    if (importance !== undefined) updates.importance = importance as AgentMemoryUpdate['importance'];
    if (tags !== undefined) updates.tags = tags;
    if (expiresAt !== undefined) updates.expires_at = expiresAt;

    const { data: memory, error } = await supabaseAdmin
      .from('agent_memories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Memory API] Error updating memory:', error);
      return NextResponse.json(
        { error: 'Failed to update memory' },
        { status: 500 }
      );
    }

    return NextResponse.json({ memory });
  } catch (error) {
    console.error('[Memory API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/memories/[id]
 * Delete memory
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const { error } = await supabaseAdmin
      .from('agent_memories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Memory API] Error deleting memory:', error);
      return NextResponse.json(
        { error: 'Failed to delete memory' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Memory API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
