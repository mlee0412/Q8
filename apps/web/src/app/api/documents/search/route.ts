/**
 * Document Search API
 *
 * POST /api/documents/search - Search documents semantically
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/auth/api-auth';
import { searchDocuments } from '@/lib/documents';
import type { DocumentScope, FileType } from '@/lib/documents';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const runtime = 'nodejs';

const searchSchema = z.object({
  query: z.string().min(1).max(1000),
  limit: z.number().min(1).max(50).optional().default(10),
  minSimilarity: z.number().min(0).max(1).optional().default(0.7),
  scope: z.enum(['conversation', 'global']).optional(),
  threadId: z.string().uuid().optional(),
  fileTypes: z.array(z.enum([
    'pdf', 'docx', 'doc', 'txt', 'md', 'csv', 'json', 'xlsx', 'xls', 'code', 'image', 'other'
  ])).optional(),
});

/**
 * POST /api/documents/search
 * Semantic search across documents
 */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const parseResult = searchSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid search parameters', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { query, limit, minSimilarity, scope, threadId, fileTypes } = parseResult.data;

    const results = await searchDocuments(user.id, query, {
      limit,
      minSimilarity,
      scope: scope as DocumentScope | undefined,
      threadId,
      fileTypes: fileTypes as FileType[] | undefined,
    });

    return NextResponse.json({
      success: true,
      results,
      count: results.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Documents] Search failed', { error: errorMessage });

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
