/**
 * Suggestions API Route
 * Get proactive suggestions based on context
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateSuggestions, getQuickActions } from '@/lib/memory';
import { buildEnrichedContext } from '@/lib/agents/context-provider';
import { getConversationContext } from '@/lib/memory/memory-store';
import type { SuggestionContext } from '@/lib/memory/types';

export const runtime = 'edge';

interface SuggestionsRequest {
  userId: string;
  sessionId: string;
  pendingTasks?: number;
  upcomingEvents?: number;
  lastInteraction?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SuggestionsRequest;
    const { userId, sessionId, pendingTasks = 0, upcomingEvents = 0, lastInteraction } = body;

    if (!userId || !sessionId) {
      return NextResponse.json(
        { error: 'userId and sessionId are required' },
        { status: 400 }
      );
    }

    // Get enriched context
    const enrichedContext = await buildEnrichedContext(userId, sessionId);

    // Get recent conversation topics
    const recentConversation = getConversationContext(sessionId, 10);
    const recentTopics = [...new Set(
      recentConversation
        .flatMap(c => c.entities?.map(e => e.value) || [])
        .filter(Boolean)
    )];

    // Build suggestion context
    const suggestionContext: SuggestionContext = {
      currentTime: enrichedContext.currentTime,
      dayOfWeek: enrichedContext.dayOfWeek,
      timeOfDay: enrichedContext.timeOfDay,
      weather: enrichedContext.weather ? {
        temp: enrichedContext.weather.temp,
        condition: enrichedContext.weather.condition,
      } : undefined,
      recentTopics,
      pendingTasks,
      upcomingEvents,
      lastInteraction: lastInteraction ? new Date(lastInteraction) : undefined,
    };

    // Generate suggestions
    const suggestions = generateSuggestions(userId, sessionId, suggestionContext);

    // Get quick actions
    const quickActions = getQuickActions(suggestionContext);

    return NextResponse.json({
      success: true,
      suggestions,
      quickActions,
      context: {
        timeOfDay: suggestionContext.timeOfDay,
        dayOfWeek: suggestionContext.dayOfWeek,
        weather: suggestionContext.weather,
      },
    });
  } catch (error) {
    console.error('[Suggestions API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
