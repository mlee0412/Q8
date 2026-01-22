/**
 * Routing Feedback API
 *
 * Collects user feedback on routing decisions for continuous learning.
 *
 * POST /api/routing/feedback - Submit feedback
 * GET /api/routing/feedback - Process pending feedback into training examples
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  submitRoutingFeedback,
  processPendingFeedback,
} from '@/lib/agents/orchestration/vector-router';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/auth/api-auth';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import type { ExtendedAgentType } from '@/lib/agents/orchestration/types';

export const runtime = 'nodejs';

const feedbackSchema = z.object({
  originalQuery: z.string().min(1),
  selectedAgent: z.enum([
    'coder', 'researcher', 'secretary', 'home', 'finance', 'personality', 'orchestrator'
  ]),
  routingConfidence: z.number().min(0).max(1).optional(),
  routingSource: z.string().optional(),
  threadId: z.string().uuid().optional(),
  feedbackType: z.enum(['correct', 'incorrect', 'improved', 'tool_failure', 'slow']),
  correctAgent: z.enum([
    'coder', 'researcher', 'secretary', 'home', 'finance', 'personality', 'orchestrator'
  ]).optional(),
  userComment: z.string().max(500).optional(),
});

/**
 * POST /api/routing/feedback
 * Submit routing feedback
 */
export async function POST(request: NextRequest) {
  // Authenticate user
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();

    // Validate input
    const parseResult = feedbackSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid feedback data', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const feedback = parseResult.data;

    // Validate that incorrect/improved feedback includes correct agent
    if (
      (feedback.feedbackType === 'incorrect' || feedback.feedbackType === 'improved') &&
      !feedback.correctAgent
    ) {
      return NextResponse.json(
        { error: 'correctAgent is required for incorrect/improved feedback' },
        { status: 400 }
      );
    }

    const feedbackId = await submitRoutingFeedback({
      userId: user.id,
      threadId: feedback.threadId,
      originalQuery: feedback.originalQuery,
      selectedAgent: feedback.selectedAgent as ExtendedAgentType,
      routingConfidence: feedback.routingConfidence ?? 0,
      routingSource: feedback.routingSource ?? 'unknown',
      feedbackType: feedback.feedbackType,
      correctAgent: feedback.correctAgent as ExtendedAgentType | undefined,
      userComment: feedback.userComment,
    });

    if (!feedbackId) {
      return NextResponse.json(
        { error: 'Failed to save feedback' },
        { status: 500 }
      );
    }

    logger.info('[Routing Feedback] Saved', {
      userId: user.id,
      feedbackId,
      type: feedback.feedbackType,
    });

    return NextResponse.json({
      success: true,
      feedbackId,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Routing Feedback] Error', { error: errorMessage });

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/routing/feedback
 * Process pending feedback (admin only, triggered by cron)
 */
export async function GET(request: NextRequest) {
  // Check for admin authorization
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const adminSecret = process.env.ADMIN_SECRET;

  const isAuthorized =
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    (adminSecret && authHeader === `Bearer ${adminSecret}`) ||
    process.env.NODE_ENV === 'development';

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const processed = await processPendingFeedback();

    logger.info('[Routing Feedback] Processed pending', { count: processed });

    return NextResponse.json({
      success: true,
      processed,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Routing Feedback] Processing error', { error: errorMessage });

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
