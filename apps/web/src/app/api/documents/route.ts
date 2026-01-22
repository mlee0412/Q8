/**
 * Documents API
 *
 * POST /api/documents - Upload a new document
 * GET /api/documents - List user's documents
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/auth/api-auth';
import { uploadDocument, getUserDocuments } from '@/lib/documents';
import type { DocumentScope } from '@/lib/documents';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for file processing

/**
 * POST /api/documents
 * Upload a new document
 */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const scope = (formData.get('scope') as DocumentScope) || 'global';
    const threadId = formData.get('threadId') as string | null;
    const name = formData.get('name') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 50MB.' },
        { status: 400 }
      );
    }

    // Validate scope
    if (scope === 'conversation' && !threadId) {
      return NextResponse.json(
        { error: 'threadId required for conversation-scoped documents' },
        { status: 400 }
      );
    }

    const document = await uploadDocument(file, user.id, {
      scope,
      threadId: threadId || undefined,
      name: name || undefined,
    });

    logger.info('[Documents] Uploaded', {
      userId: user.id,
      documentId: document.id,
      name: document.name,
      fileType: document.fileType,
    });

    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Documents] Upload failed', { error: errorMessage });

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/documents
 * List user's documents
 */
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') as DocumentScope | null;
    const threadId = searchParams.get('threadId');
    const status = searchParams.get('status') as 'pending' | 'processing' | 'ready' | 'error' | null;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const { documents, total } = await getUserDocuments(user.id, {
      scope: scope || undefined,
      threadId: threadId || undefined,
      status: status || undefined,
      limit: Math.min(limit, 100),
      offset,
    });

    return NextResponse.json({
      success: true,
      documents,
      total,
      limit,
      offset,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Documents] List failed', { error: errorMessage });

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
