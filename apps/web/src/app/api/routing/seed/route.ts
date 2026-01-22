/**
 * Routing Examples Seed API
 *
 * Seeds embeddings for routing examples and provides management endpoints.
 *
 * POST /api/routing/seed - Seed embeddings for examples without them
 * GET /api/routing/seed - Get routing statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { seedExampleEmbeddings, getRoutingStats } from '@/lib/agents/orchestration/vector-router';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const maxDuration = 120; // 2 minutes for seeding

/**
 * Verify authorization (admin only)
 */
function verifyAuthorization(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const adminSecret = process.env.ADMIN_SECRET;

  if (adminSecret && authHeader === `Bearer ${adminSecret}`) {
    return true;
  }

  const apiKey = request.headers.get('x-api-key');
  const internalApiKey = process.env.INTERNAL_API_KEY;

  if (internalApiKey && apiKey === internalApiKey) {
    return true;
  }

  // Allow in development
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  return false;
}

/**
 * POST /api/routing/seed
 * Seed embeddings for routing examples
 */
export async function POST(request: NextRequest) {
  if (!verifyAuthorization(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    logger.info('[Routing Seed] Starting embedding seeding');

    const result = await seedExampleEmbeddings();

    logger.info('[Routing Seed] Seeding complete', result);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Routing Seed] Failed', { error: errorMessage });

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/routing/seed
 * Get routing example statistics
 */
export async function GET(request: NextRequest) {
  if (!verifyAuthorization(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stats = await getRoutingStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Routing Seed] Failed to get stats', { error: errorMessage });

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
