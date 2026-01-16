/**
 * Chat API Route
 * Server-side LLM processing with agent orchestration
 * Now with enriched context (time, location, weather)
 */

import { NextRequest, NextResponse } from 'next/server';
import { processMessage } from '@/lib/agents';
import { buildEnrichedContext } from '@/lib/agents/context-provider';
import type { AgentMessage } from '@/lib/agents/types';

export const runtime = 'nodejs';

interface ChatRequest {
  message: string;
  userId: string;
  conversationId: string;
  userProfile?: {
    name?: string;
    timezone?: string;
    communicationStyle?: 'concise' | 'detailed';
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequest;
    const { message, userId, conversationId, userProfile } = body;

    console.log('[Chat API] Received request:', { message, userId, conversationId });

    if (!message || !userId) {
      return NextResponse.json(
        { error: 'Message and userId are required' },
        { status: 400 }
      );
    }

    // Create agent message
    const agentMessage: AgentMessage = {
      content: message,
      role: 'user',
    };

    // Build enriched context with time, location, weather
    const sessionId = conversationId || Date.now().toString();
    const enrichedContext = await buildEnrichedContext(
      userId,
      sessionId,
      userProfile ? {
        name: userProfile.name,
        timezone: userProfile.timezone,
        communicationStyle: userProfile.communicationStyle,
        preferences: {},
      } : undefined
    );

    console.log('[Chat API] Enriched context built:', {
      time: enrichedContext.localTimeFormatted,
      location: enrichedContext.location.city,
      weather: enrichedContext.weather?.condition,
    });

    console.log('[Chat API] Processing message through orchestrator...');

    // Process message through agent orchestrator with enriched context
    const response = await processMessage(agentMessage, enrichedContext);

    console.log('[Chat API] Response received:', {
      agent: response.agent,
      contentLength: response.content.length,
    });

    // Return response with context metadata
    return NextResponse.json({
      content: response.content,
      agent: response.agent,
      metadata: {
        ...response.metadata,
        context: {
          time: enrichedContext.localTimeFormatted,
          date: enrichedContext.localDateFormatted,
          location: enrichedContext.location.city,
          weather: enrichedContext.weather ? {
            temp: enrichedContext.weather.temp,
            condition: enrichedContext.weather.condition,
          } : null,
        },
      },
    });
  } catch (error) {
    console.error('[Chat API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error('[Chat API] Error details:', { errorMessage, errorStack });

    return NextResponse.json(
      {
        error: 'Failed to process message',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
