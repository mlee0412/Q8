/**
 * Memory API Route
 * Store, retrieve, and search memories
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  storeLongTermMemory,
  searchMemories,
  getRelevantMemories,
  deleteMemory,
  getUserPreferences,
  updateUserPreferences,
  buildMemoryContext,
  type MemoryType,
  type MemoryImportance,
} from '@/lib/memory';

export const runtime = 'edge';

interface StoreRequest {
  action: 'store';
  userId: string;
  content: string;
  type: MemoryType;
  importance?: MemoryImportance;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

interface SearchRequest {
  action: 'search';
  userId: string;
  query?: string;
  types?: MemoryType[];
  tags?: string[];
  minImportance?: MemoryImportance;
  limit?: number;
}

interface DeleteRequest {
  action: 'delete';
  userId: string;
  memoryId: string;
}

interface GetContextRequest {
  action: 'getContext';
  userId: string;
  sessionId: string;
}

interface GetPreferencesRequest {
  action: 'getPreferences';
  userId: string;
}

interface UpdatePreferencesRequest {
  action: 'updatePreferences';
  userId: string;
  preferences: Record<string, unknown>;
}

type MemoryRequest =
  | StoreRequest
  | SearchRequest
  | DeleteRequest
  | GetContextRequest
  | GetPreferencesRequest
  | UpdatePreferencesRequest;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MemoryRequest;

    switch (body.action) {
      case 'store': {
        const memory = storeLongTermMemory(
          body.userId,
          body.content,
          body.type,
          {
            importance: body.importance,
            tags: body.tags,
            metadata: body.metadata,
          }
        );
        return NextResponse.json({ success: true, memory });
      }

      case 'search': {
        const results = searchMemories({
          userId: body.userId,
          query: body.query,
          types: body.types,
          tags: body.tags,
          minImportance: body.minImportance,
          limit: body.limit || 10,
        });
        return NextResponse.json({ success: true, results });
      }

      case 'delete': {
        const deleted = deleteMemory(body.userId, body.memoryId);
        return NextResponse.json({ success: deleted });
      }

      case 'getContext': {
        const context = buildMemoryContext(body.userId, body.sessionId);
        return NextResponse.json({ success: true, context });
      }

      case 'getPreferences': {
        const preferences = getUserPreferences(body.userId);
        return NextResponse.json({ success: true, preferences });
      }

      case 'updatePreferences': {
        const updated = updateUserPreferences(body.userId, body.preferences);
        return NextResponse.json({ success: true, preferences: updated });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Memory API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
