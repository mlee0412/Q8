/**
 * Notes API Route
 * GET - List user's notes
 * POST - Create new note
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { Note, NoteInsert } from '@/lib/supabase/types';

export const runtime = 'edge';

/**
 * Get logical date string for daily note (day starts at 5 AM)
 * Before 5 AM = previous day's date
 * Uses local timezone formatting
 */
function getLogicalDateStr(date: Date = new Date()): string {
  const hours = date.getHours();
  const targetDate = new Date(date);
  
  // Before 5 AM, use previous day
  if (hours < 5) {
    targetDate.setDate(targetDate.getDate() - 1);
  }
  
  // Use local date formatting to avoid timezone issues
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get logical date object for daily note (day starts at 5 AM)
 */
function getLogicalDate(date: Date = new Date()): Date {
  const hours = date.getHours();
  const logicalDate = new Date(date);
  
  // Before 5 AM, use previous day
  if (hours < 5) {
    logicalDate.setDate(logicalDate.getDate() - 1);
  }
  
  return logicalDate;
}

/**
 * Format date for daily notes: "Saturday 11/30/25"
 */
function formatDailyTitle(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = days[date.getDay()];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear().toString().slice(-2);
  return `${dayName} ${month}/${day}/${year}`;
}

/**
 * Get daily note template content
 */
function getDailyNoteTemplate(date: Date): string {
  const title = formatDailyTitle(date);
  return `# ${title}

## 📋 Today's Focus
- [ ] 

## 📝 Notes


## ✅ Completed


## 💡 Ideas


## 🔗 Links & References

`;
}

/**
 * GET /api/notes
 * List notes for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const folderId = searchParams.get('folderId');
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const pinnedOnly = searchParams.get('pinnedOnly') === 'true';
    const dailyOnly = searchParams.get('dailyOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') || 'updated_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    let query = supabaseAdmin
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }

    if (pinnedOnly) {
      query = query.eq('is_pinned', true);
    }

    if (dailyOnly) {
      query = query.eq('is_daily', true);
    }

    if (folderId) {
      if (folderId === 'null') {
        query = query.is('folder_id', null);
      } else {
        query = query.eq('folder_id', folderId);
      }
    }

    const { data: notes, error, count } = await query;

    if (error) {
      console.error('[Notes API] Error fetching notes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notes' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      notes: notes || [],
      count: count || notes?.length || 0,
    });
  } catch (error) {
    console.error('[Notes API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notes
 * Create a new note
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId, 
      title, 
      content, 
      contentJson,
      folderId, 
      tags,
      color,
      isDaily,
      dailyDate,
    } = body as {
      userId: string;
      title?: string;
      content?: string;
      contentJson?: Record<string, unknown>;
      folderId?: string;
      tags?: string[];
      color?: string;
      isDaily?: boolean;
      dailyDate?: string;
    };

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Handle daily note creation
    let noteTitle = title;
    let noteContent = content || '';
    let noteDailyDate = dailyDate;

    if (isDaily) {
      // Use provided date string or get logical date string (5 AM boundary)
      noteDailyDate = dailyDate || getLogicalDateStr();
      const date = new Date(noteDailyDate + 'T12:00:00'); // Parse at noon to avoid timezone issues
      
      // Check if daily note already exists
      const { data: existingDaily } = await supabaseAdmin
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .eq('is_daily', true)
        .eq('daily_date', noteDailyDate)
        .single();

      if (existingDaily) {
        return NextResponse.json({ note: existingDaily, existing: true });
      }

      noteTitle = formatDailyTitle(date);
      noteContent = getDailyNoteTemplate(date);
    }

    // Calculate word count
    const wordCount = noteContent.split(/\s+/).filter(Boolean).length;

    const noteData: NoteInsert = {
      user_id: userId,
      title: noteTitle || null,
      content: noteContent,
      content_json: contentJson || null,
      folder_id: folderId || null,
      tags: tags || [],
      color: color || null,
      is_daily: isDaily || false,
      daily_date: noteDailyDate || null,
    };

    const { data: note, error } = await supabaseAdmin
      .from('notes')
      .insert({ ...noteData, word_count: wordCount })
      .select()
      .single();

    if (error) {
      console.error('[Notes API] Error creating note:', error);
      return NextResponse.json(
        { error: 'Failed to create note' },
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
