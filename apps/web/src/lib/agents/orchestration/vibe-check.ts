/**
 * Vibe Check Service
 * Analyzes user's recent messages to adjust agent tone
 */

import { supabaseAdmin } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import OpenAI from 'openai';

export type SentimentLevel = 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
export type EnergyLevel = 'low' | 'medium' | 'high';

export interface VibeState {
  sentiment: SentimentLevel;
  energy: EnergyLevel;
  dominantEmotion: string;
  toneRecommendation: string;
  confidence: number;
  messageCount: number;
  analyzedAt: string;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 5,
  timeout: 30000,
});

// Cache vibe state per user (refresh every 5 minutes)
const vibeCache = new Map<string, { state: VibeState; timestamp: number }>();
const VIBE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Analyze user's recent messages and return vibe state
 */
export async function analyzeVibe(userId: string): Promise<VibeState> {
  // Check cache first
  const cached = vibeCache.get(userId);
  if (cached && Date.now() - cached.timestamp < VIBE_CACHE_TTL) {
    return cached.state;
  }

  try {
    // Fetch last 10 user messages
    const { data: messages, error } = await supabaseAdmin
      .from('chat_messages')
      .select('content, created_at')
      .eq('user_id', userId)
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error || !messages || messages.length === 0) {
      const defaultState = getDefaultVibeState(0);
      return defaultState;
    }

    // If only 1-2 messages, return neutral
    if (messages.length < 3) {
      const defaultState = getDefaultVibeState(messages.length);
      vibeCache.set(userId, { state: defaultState, timestamp: Date.now() });
      return defaultState;
    }

    // Combine messages for analysis
    const messageText = messages
      .map((m: { content: string }) => m.content)
      .join('\n---\n');

    // Analyze with GPT-4o-mini (fast and cheap)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an emotional intelligence analyzer. Analyze the user's recent messages and determine their current emotional state.

Return a JSON object with:
- sentiment: "very_negative" | "negative" | "neutral" | "positive" | "very_positive"
- energy: "low" | "medium" | "high"
- dominantEmotion: Single word describing the main emotion (e.g., "frustrated", "curious", "excited", "stressed", "content")
- toneRecommendation: Brief guidance for how to respond (e.g., "Be supportive and patient", "Match their enthusiasm", "Keep responses concise")
- confidence: 0-1 confidence in this assessment

Consider:
- Word choice and language patterns
- Punctuation and emphasis usage
- Topic and subject matter
- Questions vs statements
- Any explicit emotional expressions

Return ONLY valid JSON, no explanation.`,
        },
        {
          role: 'user',
          content: `Analyze these recent messages from the user:\n\n${messageText}`,
        },
      ],
      max_tokens: 200,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content || '{}';

    try {
      const parsed = JSON.parse(responseText);
      const vibeState: VibeState = {
        sentiment: parsed.sentiment || 'neutral',
        energy: parsed.energy || 'medium',
        dominantEmotion: parsed.dominantEmotion || 'neutral',
        toneRecommendation: parsed.toneRecommendation || 'Be helpful and friendly',
        confidence: parsed.confidence || 0.7,
        messageCount: messages.length,
        analyzedAt: new Date().toISOString(),
      };

      // Cache the result
      vibeCache.set(userId, { state: vibeState, timestamp: Date.now() });

      logger.debug('Vibe check completed', { userId, vibeState });
      return vibeState;
    } catch {
      logger.warn('Failed to parse vibe analysis', { responseText });
      return getDefaultVibeState(messages.length);
    }
  } catch (error) {
    logger.error('Error analyzing vibe', { userId, error });
    return getDefaultVibeState(0);
  }
}

/**
 * Get default neutral vibe state
 */
function getDefaultVibeState(messageCount: number): VibeState {
  return {
    sentiment: 'neutral',
    energy: 'medium',
    dominantEmotion: 'neutral',
    toneRecommendation: 'Be helpful and friendly',
    confidence: 0.5,
    messageCount,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Build a vibe-aware context section for injection into agent prompts
 */
export function buildVibeContextPrompt(vibeState: VibeState): string {
  // Only include if confidence is above threshold
  if (vibeState.confidence < 0.6 || vibeState.messageCount < 3) {
    return '';
  }

  const lines: string[] = [];
  lines.push('## User Emotional State');
  lines.push('');
  lines.push(`Based on recent conversation:`);
  lines.push(`- **Mood**: ${formatSentiment(vibeState.sentiment)} (${vibeState.dominantEmotion})`);
  lines.push(`- **Energy**: ${formatEnergy(vibeState.energy)}`);
  lines.push(`- **Suggested Approach**: ${vibeState.toneRecommendation}`);
  lines.push('');

  // Add specific guidance based on sentiment
  if (vibeState.sentiment === 'very_negative' || vibeState.sentiment === 'negative') {
    lines.push('**Note**: The user may be frustrated or having a difficult time. Be extra patient, supportive, and understanding. Avoid being overly cheerful or dismissive of their concerns.');
    lines.push('');
  } else if (vibeState.sentiment === 'very_positive' || vibeState.sentiment === 'positive') {
    lines.push('**Note**: The user seems to be in good spirits. Feel free to match their positive energy and be more conversational.');
    lines.push('');
  }

  if (vibeState.energy === 'low') {
    lines.push('**Energy Note**: Keep responses concise and to the point. The user may not have patience for lengthy explanations right now.');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format sentiment for display
 */
function formatSentiment(sentiment: SentimentLevel): string {
  const map: Record<SentimentLevel, string> = {
    very_negative: '😟 Very Low',
    negative: '😔 Low',
    neutral: '😐 Neutral',
    positive: '🙂 Good',
    very_positive: '😊 Great',
  };
  return map[sentiment] || 'Neutral';
}

/**
 * Format energy for display
 */
function formatEnergy(energy: EnergyLevel): string {
  const map: Record<EnergyLevel, string> = {
    low: '🔋 Low',
    medium: '⚡ Normal',
    high: '🚀 High',
  };
  return map[energy] || 'Normal';
}

/**
 * Clear vibe cache for a user (e.g., after a long break)
 */
export function clearVibeCache(userId: string): void {
  vibeCache.delete(userId);
}

/**
 * Get cached vibe state without triggering new analysis
 */
export function getCachedVibe(userId: string): VibeState | null {
  const cached = vibeCache.get(userId);
  if (cached && Date.now() - cached.timestamp < VIBE_CACHE_TTL) {
    return cached.state;
  }
  return null;
}
