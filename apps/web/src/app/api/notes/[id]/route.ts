/**
 * Note API Route - Single Note Operations
 * GET - Get note by ID
 * PATCH - Update note
 * DELETE - Delete note
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { NoteUpdate } from '@/lib/supabase/types';

export const runtime = 'edge';

/**
 * GET /api/notes/[id]
 * Get a single note by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: note, error } = await supabaseAdmin
      .from('notes')
      .select('*, folder:note_folders(*)')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[Notes API] Error fetching note:', error);
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ note });
  } catch (error) {
    console.error('[Notes API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notes/[id]
 * Update a note
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      title,
      content,
      contentJson,
      folderId,
      isPinned,
      isArchived,
      isLocked,
      color,
      tags,
      aiSummary,
      aiActionItems,
    } = body as {
      title?: string;
      content?: string;
      contentJson?: Record<string, unknown>;
      folderId?: string | null;
      isPinned?: boolean;
      isArchived?: boolean;
      isLocked?: boolean;
      color?: string;
      tags?: string[];
      aiSummary?: string;
      aiActionItems?: Array<{
        id: string;
        task: string;
        completed: boolean;
        due_date: string | null;
        created_at: string;
      }>;
    };

    const updates: NoteUpdate = {
      last_edited_at: new Date().toISOString(),
    };

    if (title !== undefined) updates.title = title;
    if (content !== undefined) {
      updates.content = content;
      updates.word_count = content.split(/\s+/).filter(Boolean).length;
    }
    if (contentJson !== undefined) updates.content_json = contentJson;
    if (folderId !== undefined) updates.folder_id = folderId;
    if (isPinned !== undefined) updates.is_pinned = isPinned;
    if (isArchived !== undefined) {
      updates.is_archived = isArchived;
      updates.archived_at = isArchived ? new Date().toISOString() : null;
    }
    if (isLocked !== undefined) updates.is_locked = isLocked;
    if (color !== undefined) updates.color = color;
    if (tags !== undefined) updates.tags = tags;
    if (aiSummary !== undefined) updates.ai_summary = aiSummary;
    if (aiActionItems !== undefined) updates.ai_action_items = aiActionItems;

    const { data: note, error } = await supabaseAdmin
      .from('notes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Notes API] Error updating note:', error);
      return NextResponse.json(
        { error: 'Failed to update note' },
        { status: 500 }
      );
    }

    return NextResponse.json({ note });
  } catch (error) {
    console.error('[Notes API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notes/[id]
 * Delete a note (or archive it)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const hard = searchParams.get('hard') === 'true';

    if (hard) {
      // Permanent delete
      const { error } = await supabaseAdmin
        .from('notes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[Notes API] Error deleting note:', error);
        return NextResponse.json(
          { error: 'Failed to delete note' },
          { status: 500 }
        );
      }
    } else {
      // Soft delete (archive)
      const { error } = await supabaseAdmin
        .from('notes')
        .update({
          is_archived: true,
          archived_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('[Notes API] Error archiving note:', error);
        return NextResponse.json(
          { error: 'Failed to archive note' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Notes API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
