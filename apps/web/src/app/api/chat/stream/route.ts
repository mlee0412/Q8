/**
 * Streaming Chat API Route
 * Server-sent events (SSE) for real-time response streaming
 * Uses unified orchestration service
 */

import { NextRequest, NextResponse } from 'next/server';
import { streamMessage, type OrchestrationEvent, type ExtendedAgentType } from '@/lib/agents/orchestration';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/auth/api-auth';
import { logger } from '@/lib/logger';

// Use Node.js runtime for full compatibility with OpenAI and Supabase SDKs
export const runtime = 'nodejs';
export const maxDuration = 60; // Allow longer streaming responses

interface StreamRequest {
  message: string;
  userId: string;
  threadId?: string;
  userProfile?: {
    name?: string;
    timezone?: string;
    communicationStyle?: 'concise' | 'detailed';
  };
  /** Force a specific agent (bypasses routing) */
  forceAgent?: ExtendedAgentType;
  /** Show tool execution events (default: true) */
  showToolExecutions?: boolean;
}

/**
 * Stream event format - pass all OrchestrationEvent types to frontend
 * No longer filters events - all event types are now supported by the frontend
 */
type StreamEvent =
  | { type: 'routing'; agent: string; reason: string; confidence: number; source: string }
  | { type: 'agent_start'; agent: string }
  | { type: 'handoff'; from: string; to: string; reason: string }
  | { type: 'tool_start'; tool: string; args: Record<string, unknown>; id: string }
  | { type: 'tool_end'; tool: string; success: boolean; result?: unknown; id: string; duration?: number }
  | { type: 'content'; delta: string }
  | { type: 'tts_chunk'; text: string; isComplete: boolean }
  | { type: 'citation'; source: string; url?: string; relevance?: number }
  | { type: 'memory_used'; memoryId: string; content: string; relevance: number }
  | { type: 'image_generated'; imageData: string; mimeType: string; caption?: string; model?: string }
  | { type: 'image_analyzed'; analysis: string; imageUrl?: string }
  | { type: 'done'; fullContent: string; agent: string; threadId: string; images?: Array<{ data: string; mimeType: string; caption?: string }> }
  | { type: 'thread_created'; threadId: string }
  | { type: 'memory_extracted'; count: number }
  | { type: 'widget_action'; widgetId: string; action: string; data?: Record<string, unknown> }
  | { type: 'error'; message: string; recoverable?: boolean };

/**
 * Convert orchestration event to stream format
 * Passes all event types through to the frontend for full visibility
 */
function toStreamEvent(event: OrchestrationEvent): StreamEvent {
  switch (event.type) {
    case 'routing':
      return {
        type: 'routing',
        agent: event.decision.agent,
        reason: event.decision.rationale,
        confidence: event.decision.confidence,
        source: event.decision.source,
      };
    case 'agent_start':
      return {
        type: 'agent_start',
        agent: event.agent,
      };
    case 'handoff':
      return {
        type: 'handoff',
        from: event.from,
        to: event.to,
        reason: event.reason,
      };
    case 'tool_start':
      return {
        type: 'tool_start',
        tool: event.tool,
        args: event.args,
        id: event.id,
      };
    case 'tool_end':
      return {
        type: 'tool_end',
        tool: event.tool,
        success: event.success,
        result: event.result,
        id: event.id,
        duration: event.duration,
      };
    case 'content':
      return {
        type: 'content',
        delta: event.delta,
      };
    case 'tts_chunk':
      return {
        type: 'tts_chunk',
        text: event.text,
        isComplete: event.isComplete,
      };
    case 'citation':
      return {
        type: 'citation',
        source: event.source,
        url: event.url,
        relevance: event.relevance,
      };
    case 'memory_used':
      return {
        type: 'memory_used',
        memoryId: event.memoryId,
        content: event.content,
        relevance: event.relevance,
      };
    case 'image_generated':
      return {
        type: 'image_generated',
        imageData: event.imageData,
        mimeType: event.mimeType,
        caption: event.caption,
        model: event.model,
      };
    case 'image_analyzed':
      return {
        type: 'image_analyzed',
        analysis: event.analysis,
        imageUrl: event.imageUrl,
      };
    case 'done':
      return {
        type: 'done',
        fullContent: event.fullContent,
        agent: event.agent,
        threadId: event.threadId,
        images: event.images,
      };
    case 'thread_created':
      return {
        type: 'thread_created',
        threadId: event.threadId,
      };
    case 'memory_extracted':
      return {
        type: 'memory_extracted',
        count: event.count,
      };
    case 'error':
      return {
        type: 'error',
        message: event.message,
        recoverable: event.recoverable,
      };
  }
}

/**
 * Encode SSE event
 */
function encodeSSE(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: NextRequest) {
  // Authenticate user before starting stream
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const encoder = new TextEncoder();

  // Create a TransformStream for streaming
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Process in background
  (async () => {
    try {
      const body = (await request.json()) as StreamRequest;
      const { message, threadId, userProfile, forceAgent, showToolExecutions = true } = body;
      const userId = user.id; // Use authenticated user ID

      if (!message) {
        await writer.write(encoder.encode(encodeSSE({
          type: 'error',
          message: 'Message is required'
        })));
        await writer.close();
        return;
      }

      // Use unified orchestration streaming
      const eventStream = streamMessage({
        message,
        userId,
        threadId,
        userProfile,
        forceAgent,
        showToolExecutions,
      });

      for await (const event of eventStream) {
        const streamEvent = toStreamEvent(event);
        await writer.write(encoder.encode(encodeSSE(streamEvent)));
      }
    } catch (error) {
      logger.error('[Stream API] Error', { error: error });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await writer.write(encoder.encode(encodeSSE({ type: 'error', message: errorMessage })));
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
