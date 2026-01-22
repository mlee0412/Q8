/**
 * Fast Chat API Route
 *
 * Provides instant responses (~300-800ms) using the Fast Talker service.
 * Queues background processing for complex queries via Deep Thinker.
 *
 * Response includes:
 * - content: The instant response
 * - hasFollowUp: Whether a deeper response is coming
 * - jobId: ID of background job (if queued)
 * - threadId: For subscribing to follow-up messages
 *
 * Decoupled UX Pattern:
 * 1. User sends message → Fast Talker responds instantly
 * 2. If hasFollowUp=true → Frontend subscribes to thread
 * 3. Deep Thinker processes in background
 * 4. Follow-up arrives via Supabase Realtime
 */

import { NextRequest, NextResponse } from 'next/server';
import { fastTalk, shouldBypassFastTalker } from '@/lib/agents/fast-talker';
import { processMessage } from '@/lib/agents/orchestration/service';
import { route } from '@/lib/agents/orchestration/router';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/auth/api-auth';
import { chatMessageSchema, validationErrorResponse } from '@/lib/validations';
import { logger } from '@/lib/logger';
import type { ExtendedAgentType } from '@/lib/agents/orchestration/types';

export const runtime = 'nodejs';

interface FastChatRequest {
  message: string;
  conversationId?: string;
  userProfile?: {
    name?: string;
    timezone?: string;
    communicationStyle?: 'concise' | 'detailed';
  };
  forceAgent?: ExtendedAgentType;
  /** Skip fast talker and process directly (default: false) */
  skipFastTalker?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const body = await request.json() as FastChatRequest;

    // Validate input
    const parseResult = chatMessageSchema.safeParse(body);
    if (!parseResult.success) {
      return validationErrorResponse(parseResult.error);
    }

    const { message, conversationId, userProfile, forceAgent, skipFastTalker } = body;
    const userId = user.id;

    logger.info('[Fast Chat] Received request', {
      messageLength: message.length,
      userId,
      threadId: conversationId,
      skipFastTalker,
    });

    // Check if we should bypass Fast Talker
    const routing = await route(message);
    const shouldBypass = skipFastTalker || shouldBypassFastTalker(message, routing);

    if (shouldBypass) {
      // Process directly through orchestration service
      logger.info('[Fast Chat] Bypassing Fast Talker', {
        reason: skipFastTalker ? 'user_requested' : 'simple_query',
        agent: routing.agent,
      });

      const response = await processMessage({
        message,
        userId,
        threadId: conversationId,
        userProfile,
        forceAgent,
        showToolExecutions: true,
      });

      return NextResponse.json({
        content: response.content,
        agent: response.agent,
        threadId: response.threadId,
        hasFollowUp: false,
        jobId: null,
        responseType: 'direct',
        routing: {
          agent: response.routing.agent,
          confidence: response.routing.confidence,
          rationale: response.routing.rationale,
        },
        toolExecutions: response.toolExecutions?.map(t => ({
          tool: t.tool,
          success: t.success,
          duration: t.duration,
        })),
        metadata: response.metadata,
      });
    }

    // Use Fast Talker for instant response
    const response = await fastTalk({
      message,
      userId,
      threadId: conversationId,
      userProfile,
    });

    logger.info('[Fast Chat] Fast response sent', {
      responseType: response.responseType,
      hasFollowUp: response.hasFollowUp,
      jobId: response.jobId,
      latencyMs: response.latencyMs,
    });

    return NextResponse.json({
      content: response.content,
      agent: response.routing.agent,
      threadId: response.threadId,
      hasFollowUp: response.hasFollowUp,
      jobId: response.jobId,
      responseType: response.responseType,
      routing: {
        agent: response.routing.agent,
        confidence: response.routing.confidence,
        rationale: response.routing.rationale,
      },
      latencyMs: response.latencyMs,
    });
  } catch (error) {
    logger.error('[Fast Chat] Error', { error });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to process message',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chat/fast
 * Health check and capability info
 */
export async function GET() {
  return NextResponse.json({
    name: 'Fast Chat API',
    description: 'Instant responses with background deep processing',
    version: '1.0.0',
    capabilities: {
      fastTalker: true,
      deepThinker: true,
      decoupledUX: true,
    },
    responseTypes: [
      'acknowledgment',
      'clarification',
      'preview',
      'action_preview',
      'direct',
    ],
    latencyTarget: '300-800ms',
  });
}
