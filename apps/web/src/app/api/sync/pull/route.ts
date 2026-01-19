/**
 * Pull Sync API Route
 *
 * Fetches data from Supabase for a specific collection
 * to sync with local RxDB storage.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/auth/api-auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

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
    const { lastPulledAt = new Date(0).toISOString(), batchSize = 100 } = body;

    // Fetch documents updated since last pull for this user
    const { data: documents, error } = await supabaseAdmin
      .from(tableName)
      .select('*')
      .eq('user_id', user.id)
      .gte('updated_at', lastPulledAt)
      .order('updated_at', { ascending: true })
      .limit(batchSize);

    if (error) {
      // Handle missing table gracefully - return empty results
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        logger.warn('[Sync Pull] Table does not exist yet, returning empty', { tableName });
        return NextResponse.json({
          documents: [],
          checkpoint: lastPulledAt,
        });
      }

      // Handle missing column gracefully
      if (error.code === '42703' || error.message?.includes('column')) {
        logger.warn('[Sync Pull] Schema mismatch, returning empty', { tableName });
        return NextResponse.json({
          documents: [],
          checkpoint: lastPulledAt,
        });
      }

      logger.error('[Sync Pull] Error fetching collection', { collection, error });
      return NextResponse.json(
        { error: `Failed to fetch ${collection}: ${error.message}` },
        { status: 500 }
      );
    }

    // Transform Supabase snake_case to RxDB camelCase
    const transformedDocuments = (documents || []).map((doc) =>
      transformToCamelCase(doc, collection)
    );

    // Determine new checkpoint (latest updated_at)
    const lastDoc = transformedDocuments.at(-1);
    const checkpoint = lastDoc?.updatedAt ?? lastPulledAt;

    return NextResponse.json({
      documents: transformedDocuments,
      checkpoint,
    });
  } catch (error) {
    logger.error('[Sync Pull] Unexpected error', { error: error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Transform Supabase snake_case fields to RxDB camelCase
 */
function transformToCamelCase(
  doc: Record<string, unknown>,
  collection: string
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    id: doc.id,
    userId: doc.user_id,
  };

  switch (collection) {
    case 'chat_messages':
      return {
        ...base,
        role: doc.role,
        content: doc.content,
        agent_name: doc.agent_name,
        avatar: doc.avatar,
        timestamp: doc.timestamp || doc.created_at,
        status: doc.status,
        conversation_id: doc.conversation_id,
        updatedAt: doc.updated_at || doc.created_at,
      };

    case 'user_preferences':
      return {
        ...base,
        theme: doc.theme,
        dashboardLayout: doc.dashboard_layout,
        preferredAgent: doc.preferred_agent,
        updatedAt: doc.updated_at,
      };

    case 'devices':
      return {
        ...base,
        name: doc.name,
        type: doc.type,
        state: doc.state,
        attributes: doc.attributes,
        updatedAt: doc.updated_at,
      };

    case 'knowledge_base':
      return {
        ...base,
        content: doc.content,
        embedding: doc.embedding,
        metadata: doc.metadata,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at || doc.created_at,
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
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
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
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
      };

    case 'tasks':
      return {
        ...base,
        title: doc.title,
        description: doc.description,
        text: doc.text,
        status: doc.status || 'todo',
        completed: doc.completed || false,
        priority: doc.priority || 'medium',
        dueDate: doc.due_date,
        tags: doc.tags || [],
        projectId: doc.project_id,
        parentTaskId: doc.parent_task_id,
        sortOrder: doc.sort_order || 0,
        estimatedMinutes: doc.estimated_minutes,
        completedAt: doc.completed_at,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
      };

    default:
      return {
        ...doc,
        userId: doc.user_id,
        updatedAt: doc.updated_at,
      };
  }
}
