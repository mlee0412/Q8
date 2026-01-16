/**
 * Push Sync API Route
 *
 * Receives local RxDB changes and upserts them to Supabase.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/api-auth';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// Map RxDB collection names to Supabase table names
const COLLECTION_TABLE_MAP: Record<string, string> = {
  chat_messages: 'chat_messages',
  user_preferences: 'user_preferences',
  devices: 'devices',
  knowledge_base: 'knowledge_base',
  github_prs: 'github_prs',
  calendar_events: 'calendar_events',
  tasks: 'tasks',
};

export async function POST(request: NextRequest) {
  try {
    const [user, errorResponse] = await requireAuth(request);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const collection = searchParams.get('collection');

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection parameter is required' },
        { status: 400 }
      );
    }

    const tableName = COLLECTION_TABLE_MAP[collection];
    if (!tableName) {
      return NextResponse.json(
        { error: `Unknown collection: ${collection}` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { documents } = body;

    if (!Array.isArray(documents)) {
      return NextResponse.json(
        { error: 'Documents must be an array' },
        { status: 400 }
      );
    }

    if (documents.length === 0) {
      return NextResponse.json({
        success: [],
        errors: [],
      });
    }

    const success: string[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    // Check if table exists first
    const { error: tableCheckError } = await supabaseAdmin
      .from(tableName)
      .select('id')
      .limit(1);

    if (tableCheckError) {
      // Handle missing table gracefully
      if (tableCheckError.code === '42P01' || tableCheckError.message?.includes('does not exist')) {
        console.warn(`[Sync Push] Table ${tableName} does not exist yet, skipping push`);
        return NextResponse.json({
          success: [],
          errors: documents.map((doc: Record<string, unknown>) => ({
            id: doc.id,
            error: `Table ${tableName} does not exist`,
          })),
        });
      }
    }

    // Transform and upsert each document
    for (const doc of documents) {
      try {
        // Ensure document belongs to authenticated user
        const transformedDoc = transformToSnakeCase(doc, collection);
        transformedDoc.user_id = user.id;
        transformedDoc.updated_at = new Date().toISOString();

        const { error } = await supabaseAdmin
          .from(tableName)
          .upsert(transformedDoc, { onConflict: 'id' });

        if (error) {
          // Skip column errors silently - schema mismatch
          if (error.code === '42703') {
            console.warn(`[Sync Push] Schema mismatch for ${tableName}, skipping doc ${doc.id}`);
          }
          errors.push({ id: doc.id as string, error: error.message });
        } else {
          success.push(doc.id as string);
        }
      } catch (err) {
        errors.push({
          id: doc.id as string,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success,
      errors,
    });
  } catch (error) {
    console.error('[Sync Push] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Transform RxDB camelCase fields to Supabase snake_case
 */
function transformToSnakeCase(
  doc: Record<string, unknown>,
  collection: string
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    id: doc.id,
    user_id: doc.userId,
  };

  switch (collection) {
    case 'chat_messages':
      return {
        ...base,
        role: doc.role,
        content: doc.content,
        agent_name: doc.agent_name,
        avatar: doc.avatar,
        timestamp: doc.timestamp,
        status: doc.status,
        conversation_id: doc.conversation_id,
        created_at: doc.timestamp || new Date().toISOString(),
      };

    case 'user_preferences':
      return {
        ...base,
        theme: doc.theme,
        dashboard_layout: doc.dashboardLayout,
        preferred_agent: doc.preferredAgent,
      };

    case 'devices':
      return {
        ...base,
        name: doc.name,
        type: doc.type,
        state: doc.state,
        attributes: doc.attributes,
      };

    case 'knowledge_base':
      return {
        ...base,
        content: doc.content,
        embedding: doc.embedding,
        metadata: doc.metadata,
        created_at: doc.createdAt || new Date().toISOString(),
      };

    case 'github_prs':
      return {
        ...base,
        number: doc.number,
        title: doc.title,
        status: doc.status,
        author: doc.author,
        repo: doc.repo,
        url: doc.url,
        created_at: doc.createdAt || new Date().toISOString(),
      };

    case 'calendar_events':
      return {
        ...base,
        title: doc.title,
        start_time: doc.start_time,
        end_time: doc.end_time,
        location: doc.location,
        meeting_url: doc.meeting_url,
        attendees_count: doc.attendees_count,
        color: doc.color,
        calendar_name: doc.calendar_name,
        created_at: doc.createdAt || new Date().toISOString(),
      };

    case 'tasks':
      return {
        ...base,
        text: doc.text,
        completed: doc.completed,
        priority: doc.priority,
        due_date: doc.due_date,
        created_at: doc.created_at || new Date().toISOString(),
      };

    default:
      // Generic transform: convert camelCase to snake_case
      const transformed: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(doc)) {
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        transformed[snakeKey] = value;
      }
      return transformed;
  }
}
