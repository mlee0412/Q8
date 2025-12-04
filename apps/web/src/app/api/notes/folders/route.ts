/**
 * Note Folders API Route
 * GET - List user's folders
 * POST - Create new folder
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { NoteFolderInsert } from '@/lib/supabase/types';

export const runtime = 'edge';

/**
 * GET /api/notes/folders
 * List folders for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const { data: folders, error } = await supabaseAdmin
      .from('note_folders')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[Folders API] Error fetching folders:', error);
      return NextResponse.json(
        { error: 'Failed to fetch folders' },
        { status: 500 }
      );
    }

    // Also get note counts per folder
    const { data: noteCounts } = await supabaseAdmin
      .from('notes')
      .select('folder_id')
      .eq('user_id', userId)
      .eq('is_archived', false);

    const folderCounts: Record<string, number> = {};
    noteCounts?.forEach((note) => {
      if (note.folder_id) {
        folderCounts[note.folder_id] = (folderCounts[note.folder_id] || 0) + 1;
      }
    });

    const foldersWithCounts = folders?.map((folder) => ({
      ...folder,
      note_count: folderCounts[folder.id] || 0,
    }));

    return NextResponse.json({ folders: foldersWithCounts || [] });
  } catch (error) {
    console.error('[Folders API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notes/folders
 * Create a new folder
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name, icon, color, parentId } = body as {
      userId: string;
      name: string;
      icon?: string;
      color?: string;
      parentId?: string;
    };

    if (!userId || !name) {
      return NextResponse.json(
        { error: 'userId and name are required' },
        { status: 400 }
      );
    }

    // Get max sort_order for new folder
    const { data: maxSort } = await supabaseAdmin
      .from('note_folders')
      .select('sort_order')
      .eq('user_id', userId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const folderData: NoteFolderInsert = {
      user_id: userId,
      name,
      icon: icon || null,
      color: color || null,
      parent_id: parentId || null,
      sort_order: (maxSort?.sort_order || 0) + 1,
    };

    const { data: folder, error } = await supabaseAdmin
      .from('note_folders')
      .insert(folderData)
      .select()
      .single();

    if (error) {
      console.error('[Folders API] Error creating folder:', error);
      return NextResponse.json(
        { error: 'Failed to create folder' },
        { status: 500 }
      );
    }

    return NextResponse.json({ folder });
  } catch (error) {
    console.error('[Folders API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notes/folders
 * Delete a folder (moves notes to root)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('id');

    if (!folderId) {
      return NextResponse.json(
        { error: 'Folder ID is required' },
        { status: 400 }
      );
    }

    // Move notes to root first
    await supabaseAdmin
      .from('notes')
      .update({ folder_id: null })
      .eq('folder_id', folderId);

    // Delete the folder
    const { error } = await supabaseAdmin
      .from('note_folders')
      .delete()
      .eq('id', folderId);

    if (error) {
      console.error('[Folders API] Error deleting folder:', error);
      return NextResponse.json(
        { error: 'Failed to delete folder' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Folders API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
