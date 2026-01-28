/**
 * Topic Tracker
 * Tracks conversation topics and detects topic switches for intelligent routing
 */

import { supabaseAdmin } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { ExtendedAgentType } from './types';

/**
 * Interrupted task context for "switch back" functionality
 */
export interface InterruptedTask {
  /** The agent handling the interrupted task */
  agent: ExtendedAgentType;
  /** Topic that was interrupted */
  topic: string;
  /** Keywords from the interrupted conversation */
  keywords: string[];
  /** Timestamp when interrupted */
  interruptedAt: string;
  /** The last user message before interruption */
  lastUserMessage: string;
  /** Number of messages in the interrupted topic */
  messageCount: number;
}

/**
 * Topic context stored in thread metadata
 */
export interface TopicContext {
  /** Current topic summary */
  currentTopic: string;
  /** Last agent that handled a message */
  lastAgent: ExtendedAgentType;
  /** Recent agent history (last 5) */
  recentAgents: ExtendedAgentType[];
  /** Topic keywords extracted from recent messages */
  topicKeywords: string[];
  /** Timestamp of last topic update */
  lastUpdated: string;
  /** Number of consecutive messages on same topic */
  topicContinuity: number;
  /** Cached message embeddings for semantic similarity */
  recentEmbeddings?: Array<{ text: string; embedding: number[] }>;
  /** Interrupted task for "switch back" prompts */
  interruptedTask?: InterruptedTask;
}

/**
 * Default topic context for new threads
 */
const DEFAULT_TOPIC_CONTEXT: TopicContext = {
  currentTopic: '',
  lastAgent: 'personality',
  recentAgents: [],
  topicKeywords: [],
  lastUpdated: new Date().toISOString(),
  topicContinuity: 0,
  recentEmbeddings: [],
  interruptedTask: undefined,
};

/**
 * Get topic context from thread metadata
 */
export async function getTopicContext(threadId: string): Promise<TopicContext | null> {
  try {
    const { data: thread } = await supabaseAdmin
      .from('threads')
      .select('metadata')
      .eq('id', threadId)
      .single();

    if (!thread?.metadata) {
      return null;
    }

    const metadata = thread.metadata as Record<string, unknown>;
    if (metadata.topicContext) {
      return metadata.topicContext as TopicContext;
    }

    return null;
  } catch (error) {
    logger.warn('Failed to get topic context', { threadId, error });
    return null;
  }
}

/**
 * Update topic context in thread metadata
 */
export async function updateTopicContext(
  threadId: string,
  agent: ExtendedAgentType,
  message: string,
  existingContext: TopicContext | null
): Promise<TopicContext> {
  const context = existingContext || { ...DEFAULT_TOPIC_CONTEXT };

  // Update recent agents (keep last 5)
  const recentAgents = [agent, ...context.recentAgents].slice(0, 5);

  // Detect if this is a topic switch
  const isTopicSwitch = context.lastAgent !== agent &&
                         context.lastAgent !== 'personality' &&
                         agent !== 'personality';

  // Extract simple keywords from message (lightweight, no LLM call)
  const newKeywords = extractKeywords(message);

  // Merge keywords, keeping most recent
  const topicKeywords = [...new Set([...newKeywords, ...context.topicKeywords])].slice(0, 10);

  // Update continuity counter
  const topicContinuity = isTopicSwitch ? 1 : context.topicContinuity + 1;

  // Build new topic summary (simple heuristic)
  const currentTopic = buildTopicSummary(agent, topicKeywords, context.currentTopic, isTopicSwitch);

  // Handle interrupted task tracking
  let interruptedTask = context.interruptedTask;

  // If switching topics and previous topic had significant engagement, save it as interrupted
  if (isTopicSwitch && context.topicContinuity >= 2 && context.lastAgent !== 'personality') {
    interruptedTask = {
      agent: context.lastAgent,
      topic: context.currentTopic,
      keywords: context.topicKeywords.slice(0, 5),
      interruptedAt: new Date().toISOString(),
      lastUserMessage: message, // We don't have the previous message here, will be last known
      messageCount: context.topicContinuity,
    };
    logger.debug('Interrupted task saved', {
      threadId,
      interruptedAgent: context.lastAgent,
      interruptedTopic: context.currentTopic,
    });
  }

  // Clear interrupted task if we returned to it
  if (interruptedTask && agent === interruptedTask.agent) {
    logger.debug('Returned to interrupted task', { threadId, agent });
    interruptedTask = undefined;
  }

  const newContext: TopicContext = {
    currentTopic,
    lastAgent: agent,
    recentAgents,
    topicKeywords,
    lastUpdated: new Date().toISOString(),
    topicContinuity,
    recentEmbeddings: context.recentEmbeddings, // Preserve embeddings
    interruptedTask,
  };

  // Save to thread metadata
  try {
    const { data: thread } = await supabaseAdmin
      .from('threads')
      .select('metadata')
      .eq('id', threadId)
      .single();

    const existingMetadata = (thread?.metadata as Record<string, unknown>) || {};

    await supabaseAdmin
      .from('threads')
      .update({
        metadata: {
          ...existingMetadata,
          topicContext: newContext,
        },
      })
      .eq('id', threadId);

    logger.debug('Topic context updated', {
      threadId,
      agent,
      isTopicSwitch,
      topicContinuity: newContext.topicContinuity,
    });
  } catch (error) {
    logger.warn('Failed to save topic context', { threadId, error });
  }

  return newContext;
}

/**
 * Extract simple keywords from a message (no LLM, fast heuristic)
 */
function extractKeywords(message: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
    'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
    'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
    'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here',
    'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
    'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or',
    'because', 'until', 'while', 'although', 'though', 'after', 'before',
    'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you',
    'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself',
    'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them',
    'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this',
    'that', 'these', 'those', 'am', 'please', 'thanks', 'thank', 'hello',
    'hi', 'hey', 'okay', 'ok', 'yes', 'no', 'yeah', 'yep', 'nope',
  ]);

  const words = message
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));

  // Return unique words, prioritizing longer ones
  return [...new Set(words)]
    .sort((a, b) => b.length - a.length)
    .slice(0, 5);
}

/**
 * Build a simple topic summary based on agent and keywords
 */
function buildTopicSummary(
  agent: ExtendedAgentType,
  keywords: string[],
  previousTopic: string,
  isTopicSwitch: boolean
): string {
  const agentTopics: Record<ExtendedAgentType, string> = {
    coder: 'coding/development',
    researcher: 'research/information',
    secretary: 'productivity/scheduling',
    home: 'smart home',
    finance: 'finances/money',
    personality: 'general chat',
    orchestrator: 'general',
    imagegen: 'image generation',
  };

  const agentTopic = agentTopics[agent] || 'general';

  if (isTopicSwitch || !previousTopic) {
    // New topic
    const keywordStr = keywords.slice(0, 3).join(', ');
    return keywordStr ? `${agentTopic}: ${keywordStr}` : agentTopic;
  }

  // Continue existing topic, maybe update keywords
  return previousTopic;
}

/**
 * Detect if the current message represents a topic switch
 * Returns routing bias information
 */
export function detectTopicSwitch(
  message: string,
  topicContext: TopicContext | null
): {
  isSwitch: boolean;
  suggestedAgent: ExtendedAgentType | null;
  confidence: number;
  reason: string;
} {
  if (!topicContext || topicContext.topicContinuity === 0) {
    return {
      isSwitch: false,
      suggestedAgent: null,
      confidence: 0,
      reason: 'No topic history',
    };
  }

  const lowerMessage = message.toLowerCase();

  // Check for explicit topic switch indicators
  const switchIndicators = [
    'by the way',
    'btw',
    'changing topic',
    'different question',
    'unrelated',
    'also',
    'another thing',
    'speaking of',
    'on another note',
    'quick question',
  ];

  const hasExplicitSwitch = switchIndicators.some((indicator) =>
    lowerMessage.includes(indicator)
  );

  // Check if message keywords overlap with current topic keywords
  const messageKeywords = new Set(extractKeywords(message));
  const topicKeywords = new Set(topicContext.topicKeywords);
  const overlap = [...messageKeywords].filter((k) => topicKeywords.has(k)).length;
  const overlapRatio = messageKeywords.size > 0 ? overlap / messageKeywords.size : 0;

  // High overlap = likely same topic
  if (overlapRatio > 0.3 && !hasExplicitSwitch) {
    return {
      isSwitch: false,
      suggestedAgent: topicContext.lastAgent,
      confidence: 0.6 + overlapRatio * 0.3,
      reason: `Continuing ${topicContext.currentTopic} (keyword overlap: ${Math.round(overlapRatio * 100)}%)`,
    };
  }

  // Low overlap or explicit switch indicator
  if (hasExplicitSwitch || overlapRatio < 0.1) {
    return {
      isSwitch: true,
      suggestedAgent: null, // Let router decide
      confidence: hasExplicitSwitch ? 0.8 : 0.5,
      reason: hasExplicitSwitch
        ? 'Explicit topic switch detected'
        : 'Low keyword overlap with current topic',
    };
  }

  // Ambiguous - slight bias toward current agent
  return {
    isSwitch: false,
    suggestedAgent: topicContext.lastAgent,
    confidence: 0.4,
    reason: 'Ambiguous, slight bias toward current topic',
  };
}

/**
 * Get routing context from topic tracker
 * Used by router to bias decisions
 */
/**
 * Switch-back suggestion for interrupted tasks
 */
export interface SwitchBackSuggestion {
  /** Whether to suggest switching back */
  shouldSuggest: boolean;
  /** The interrupted task to return to */
  interruptedTask?: InterruptedTask;
  /** Suggested prompt for returning */
  suggestedPrompt?: string;
  /** Time since interruption in minutes */
  minutesSinceInterruption?: number;
}

/**
 * Check if we should suggest returning to an interrupted task
 */
export function checkSwitchBackSuggestion(
  topicContext: TopicContext | null,
  currentAgent: ExtendedAgentType
): SwitchBackSuggestion {
  if (!topicContext?.interruptedTask) {
    return { shouldSuggest: false };
  }

  const { interruptedTask } = topicContext;

  // Don't suggest if we're back on the interrupted agent
  if (currentAgent === interruptedTask.agent) {
    return { shouldSuggest: false };
  }

  // Check how long ago the task was interrupted
  const interruptedAt = new Date(interruptedTask.interruptedAt);
  const minutesSinceInterruption = Math.round((Date.now() - interruptedAt.getTime()) / 60000);

  // Don't suggest if it's been too long (> 30 minutes)
  if (minutesSinceInterruption > 30) {
    return { shouldSuggest: false };
  }

  // Only suggest after 2+ messages on tangent topic
  if (topicContext.topicContinuity < 2) {
    return { shouldSuggest: false };
  }

  // Build suggested prompt
  const agentNames: Record<ExtendedAgentType, string> = {
    coder: 'coding',
    researcher: 'research',
    secretary: 'scheduling',
    home: 'smart home',
    finance: 'finances',
    personality: 'chat',
    orchestrator: 'general',
    imagegen: 'images',
  };

  const topicName = agentNames[interruptedTask.agent] || interruptedTask.topic;
  const suggestedPrompt = `Would you like to continue with ${topicName}?`;

  return {
    shouldSuggest: true,
    interruptedTask,
    suggestedPrompt,
    minutesSinceInterruption,
  };
}

export interface RoutingContext {
  topicContext: TopicContext | null;
  topicSwitch: ReturnType<typeof detectTopicSwitch>;
  switchBackSuggestion?: SwitchBackSuggestion;
}

export async function getRoutingContext(
  threadId: string | undefined,
  message: string
): Promise<RoutingContext> {
  if (!threadId) {
    return {
      topicContext: null,
      topicSwitch: {
        isSwitch: false,
        suggestedAgent: null,
        confidence: 0,
        reason: 'New thread',
      },
    };
  }

  const topicContext = await getTopicContext(threadId);
  const topicSwitch = detectTopicSwitch(message, topicContext);

  // Check for switch-back suggestion (but only if not actively switching)
  let switchBackSuggestion: SwitchBackSuggestion | undefined;
  if (!topicSwitch.isSwitch && topicContext?.lastAgent) {
    switchBackSuggestion = checkSwitchBackSuggestion(topicContext, topicContext.lastAgent);
  }

  return { topicContext, topicSwitch, switchBackSuggestion };
}

/**
 * Parse @mentions from a message
 * Returns the agent to force and the cleaned message
 */
export function parseAgentMention(message: string): {
  forceAgent: ExtendedAgentType | null;
  cleanedMessage: string;
} {
  const mentionPatterns: Record<string, ExtendedAgentType> = {
    '@coder': 'coder',
    '@devbot': 'coder',
    '@dev': 'coder',
    '@researcher': 'researcher',
    '@research': 'researcher',
    '@secretary': 'secretary',
    '@calendar': 'secretary',
    '@home': 'home',
    '@smarthome': 'home',
    '@homebot': 'home',
    '@finance': 'finance',
    '@money': 'finance',
    '@imagegen': 'imagegen',
    '@image': 'imagegen',
    '@personality': 'personality',
    '@q8': 'personality',
  };

  const lowerMessage = message.toLowerCase();

  for (const [pattern, agent] of Object.entries(mentionPatterns)) {
    if (lowerMessage.startsWith(pattern + ' ') || lowerMessage === pattern) {
      // Remove the mention from the message
      const cleanedMessage = message.substring(pattern.length).trim();
      return { forceAgent: agent, cleanedMessage: cleanedMessage || message };
    }
  }

  return { forceAgent: null, cleanedMessage: message };
}
