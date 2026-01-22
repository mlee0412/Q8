/**
 * Single Job Processing API
 *
 * Process a specific job by ID.
 * Useful for:
 * - Manual job retry
 * - Testing specific jobs
 * - Debugging
 *
 * Usage:
 * - POST /api/worker/job/[id] - Process specific job
 * - GET /api/worker/job/[id] - Get job details
 */

import { NextRequest, NextResponse } from 'next/server';
import { processJobById } from '@/lib/agents/deep-thinker';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const maxDuration = 120; // 2 minutes for individual job processing

/**
 * Verify authorization
 */
function verifyAuthorization(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  const apiKey = request.headers.get('x-api-key');
  const internalApiKey = process.env.INTERNAL_API_KEY;

  if (internalApiKey && apiKey === internalApiKey) {
    return true;
  }

  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  return false;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/worker/job/[id]
 * Get job details
 */
export async function GET(
  request: NextRequest,
  context: RouteParams
) {
  if (!verifyAuthorization(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: jobId } = await context.params;

  try {
    const { data: job, error } = await supabaseAdmin
      .from('agent_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      job,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Worker API] Failed to get job', { jobId, error: errorMessage });

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/worker/job/[id]
 * Process a specific job
 */
export async function POST(
  request: NextRequest,
  context: RouteParams
) {
  if (!verifyAuthorization(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: jobId } = await context.params;

  try {
    // Check if job exists first
    const { data: existingJob, error: fetchError } = await supabaseAdmin
      .from('agent_jobs')
      .select('id, status')
      .eq('id', jobId)
      .single();

    if (fetchError || !existingJob) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // If job is not pending, check if force flag is set
    if (existingJob.status !== 'pending') {
      let force = false;
      try {
        const body = await request.json();
        force = body.force === true;
      } catch {
        // No body
      }

      if (!force) {
        return NextResponse.json(
          {
            error: `Job is already ${existingJob.status}. Use force=true to reprocess.`,
          },
          { status: 400 }
        );
      }

      // Reset job to pending for reprocessing
      await supabaseAdmin
        .from('agent_jobs')
        .update({
          status: 'pending',
          retry_count: 0,
          error_message: null,
          error_code: null,
          started_at: null,
          completed_at: null,
        })
        .eq('id', jobId);
    }

    logger.info('[Worker API] Processing job by ID', { jobId });

    const result = await processJobById(jobId);

    return NextResponse.json({
      success: result.succeeded > 0,
      ...result,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Worker API] Failed to process job', { jobId, error: errorMessage });

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/worker/job/[id]
 * Cancel a pending job
 */
export async function DELETE(
  request: NextRequest,
  context: RouteParams
) {
  if (!verifyAuthorization(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: jobId } = await context.params;

  try {
    const { data: job, error: fetchError } = await supabaseAdmin
      .from('agent_jobs')
      .select('id, status')
      .eq('id', jobId)
      .single();

    if (fetchError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    if (job.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot cancel job with status: ${job.status}` },
        { status: 400 }
      );
    }

    await supabaseAdmin
      .from('agent_jobs')
      .update({ status: 'cancelled' })
      .eq('id', jobId);

    logger.info('[Worker API] Job cancelled', { jobId });

    return NextResponse.json({
      success: true,
      message: 'Job cancelled',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Worker API] Failed to cancel job', { jobId, error: errorMessage });

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
