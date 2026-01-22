/**
 * Chat API Route
 * Server-side LLM processing with agent orchestration
 * Uses unified orchestration service (non-streaming fallback)
 *
 * NOTE: Prefer /api/chat/stream for real-time streaming responses.
 * This endpoint is maintained for backward compatibility.
 */

import { NextRequest, NextResponse } from 'next/server';
import { processMessage, type ExtendedAgentType } from '@/lib/agents/orchestration';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/auth/api-auth';
import { chatMessageSchema, validationErrorResponse } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const body = await request.json();

    // Validate input
    const parseResult = chatMessageSchema.safeParse(body);
    if (!parseResult.success) {
      return validationErrorResponse(parseResult.error);
    }

    const { message, conversationId, userProfile, forceAgent } = parseResult.data as {
      message: string;
      conversationId?: string;
      userProfile?: {
        name?: string;
        timezone?: string;
        communicationStyle?: 'concise' | 'detailed';
      };
      forceAgent?: ExtendedAgentType;
    };
    const userId = user.id;

    logger.info('[Chat API] Received request', {
      messageLength: message.length,
      userId,
      threadId: conversationId,
    });

    // Process through unified orchestration service
    const response = await processMessage({
      message,
      userId,
      threadId: conversationId,
      userProfile,
      forceAgent,
      showToolExecutions: true,
    });

    logger.info('[Chat API] Response received', {
      agent: response.agent,
      contentLength: response.content.length,
      routingSource: response.routing.source,
      routingConfidence: response.routing.confidence,
    });

    // Return response in backward-compatible format with additional fields
    return NextResponse.json({
      content: response.content,
      agent: response.agent,
      threadId: response.threadId,
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
      memoriesUsed: response.memoriesUsed,
      citations: response.citations,
      metadata: response.metadata,
    });
  } catch (error) {
    logger.error('[Chat API] Error', { error });
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
