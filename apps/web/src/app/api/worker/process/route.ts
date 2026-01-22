/**
 * Deep Thinker Worker API
 *
 * Processes background jobs from the agent_jobs queue.
 * Can be triggered by:
 * - Vercel Cron (scheduled)
 * - External webhook
 * - Manual invocation
 *
 * Usage:
 * - POST /api/worker/process - Process a batch of jobs
 * - GET /api/worker/process - Get queue statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { processBatch, getQueueStats, cleanupStaleJobs } from '@/lib/agents/deep-thinker';
import { logger } from '@/lib/logger';
import type { ExtendedAgentType } from '@/lib/agents/orchestration/types';

// Vercel cron configuration
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds max for cron jobs

/**
 * Verify the request is authorized
 * Accepts Vercel cron secret or API key
 */
function verifyAuthorization(request: NextRequest): boolean {
  // Check for Vercel cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // Check for internal API key
  const apiKey = request.headers.get('x-api-key');
  const internalApiKey = process.env.INTERNAL_API_KEY;

  if (internalApiKey && apiKey === internalApiKey) {
    return true;
  }

  // In development, allow unauthenticated access
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  return false;
}

/**
 * POST /api/worker/process
 * Process a batch of pending jobs
 */
export async function POST(request: NextRequest) {
  if (!verifyAuthorization(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Parse optional configuration from body
    let config: {
      agentTypes?: ExtendedAgentType[];
      batchSize?: number;
      concurrency?: number;
    } = {};

    try {
      const body = await request.json();
      config = {
        agentTypes: body.agentTypes,
        batchSize: body.batchSize ?? 10,
        concurrency: body.concurrency ?? 3,
      };
    } catch {
      // No body or invalid JSON, use defaults
    }

    const workerId = `api-worker-${Date.now()}`;

    logger.info('[Worker API] Starting batch processing', {
      workerId,
      config,
    });

    const result = await processBatch({
      workerId,
      ...config,
    });

    logger.info('[Worker API] Batch processing complete', {
      workerId,
      result: {
        processed: result.processed,
        succeeded: result.succeeded,
        failed: result.failed,
      },
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Worker API] Processing failed', { error: errorMessage });

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/worker/process
 * Get queue statistics
 */
export async function GET(request: NextRequest) {
  if (!verifyAuthorization(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [stats, cleanedUp] = await Promise.all([
      getQueueStats(),
      cleanupStaleJobs(),
    ]);

    return NextResponse.json({
      success: true,
      stats,
      staleJobsCleaned: cleanedUp,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Worker API] Failed to get stats', { error: errorMessage });

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
