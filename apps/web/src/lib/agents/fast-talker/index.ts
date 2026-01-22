/**
 * Fast Talker Service
 *
 * Provides instant responses (~300-800ms) while queueing background processing.
 *
 * Response Types:
 * - acknowledgment: "Got it, looking into that..."
 * - clarification: "Just to clarify, do you mean X or Y?"
 * - preview: "Here's what I'm planning to do..."
 * - action_preview: "I'll turn on the lights. Working on it..."
 *
 * The Fast Talker uses a small, fast model (Gemini Flash or GPT-4o-mini)
 * to generate quick responses, then queues a Deep Thinker job for the full answer.
 */

import { getModel } from '../model_factory';
import { route } from '../orchestration/router';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { ExtendedAgentType, RoutingDecision } from '../orchestration/types';

// =============================================================================
// TYPES
// =============================================================================

export interface FastTalkerRequest {
  message: string;
  userId: string;
  threadId?: string;
  userProfile?: {
    name?: string;
    timezone?: string;
    communicationStyle?: 'concise' | 'detailed';
  };
}

export interface FastTalkerResponse {
  /** The instant response content */
  content: string;
  /** Type of fast response */
  responseType: 'acknowledgment' | 'clarification' | 'preview' | 'action_preview';
  /** ID of the background job (if queued) */
  jobId?: string;
  /** Whether a follow-up deep response is expected */
  hasFollowUp: boolean;
  /** Thread ID */
  threadId: string;
  /** Routing decision */
  routing: RoutingDecision;
  /** Latency in ms */
  latencyMs: number;
}

export interface MessageClassification {
  /** Whether this needs deep processing */
  needsDeepProcessing: boolean;
  /** Suggested fast response type */
  responseType: 'acknowledgment' | 'clarification' | 'preview' | 'action_preview';
  /** Confidence in classification (0-1) */
  confidence: number;
  /** Whether user needs clarification */
  needsClarification: boolean;
  /** Clarification question if needed */
  clarificationQuestion?: string;
  /** Preview of planned action */
  actionPreview?: string;
}

// =============================================================================
// CLASSIFICATION
// =============================================================================

/**
 * Simple patterns for quick message classification
 * Avoids LLM call for obvious cases
 */
const QUICK_PATTERNS = {
  // Greetings - fast response, no deep processing
  greeting: /^(hi|hello|hey|good\s*(morning|afternoon|evening)|what'?s\s*up)/i,

  // Simple questions - fast response, may need deep processing
  simpleQuestion: /^(what\s*(is|are)|how\s*(do|does|can)|when|where|who)\s/i,

  // Commands - action preview, needs deep processing
  command: /^(turn|set|activate|enable|disable|start|stop|create|delete|send|schedule)/i,

  // Research - acknowledgment, needs deep processing
  research: /^(search|find|look\s*up|research|tell\s*me\s*about|explain)/i,

  // Code - acknowledgment, needs deep processing
  code: /^(write|implement|fix|debug|review|refactor|create\s*(a|the)?\s*(function|class|component))/i,
};

/**
 * Classify message using pattern matching (fast) or LLM (when needed)
 */
async function classifyMessage(message: string): Promise<MessageClassification> {
  const lowerMessage = message.toLowerCase().trim();

  // Quick pattern matching
  if (QUICK_PATTERNS.greeting.test(lowerMessage)) {
    return {
      needsDeepProcessing: false,
      responseType: 'acknowledgment',
      confidence: 0.95,
      needsClarification: false,
    };
  }

  if (QUICK_PATTERNS.command.test(lowerMessage)) {
    return {
      needsDeepProcessing: true,
      responseType: 'action_preview',
      confidence: 0.85,
      needsClarification: false,
      actionPreview: extractActionPreview(message),
    };
  }

  if (QUICK_PATTERNS.research.test(lowerMessage) || QUICK_PATTERNS.code.test(lowerMessage)) {
    return {
      needsDeepProcessing: true,
      responseType: 'acknowledgment',
      confidence: 0.80,
      needsClarification: false,
    };
  }

  // Default: needs deep processing
  return {
    needsDeepProcessing: true,
    responseType: 'preview',
    confidence: 0.60,
    needsClarification: false,
  };
}

/**
 * Extract a simple action preview from command messages
 */
function extractActionPreview(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('turn on')) return 'turning on';
  if (lower.includes('turn off')) return 'turning off';
  if (lower.includes('set')) return 'setting';
  if (lower.includes('send')) return 'sending';
  if (lower.includes('create')) return 'creating';
  if (lower.includes('schedule')) return 'scheduling';

  return 'working on';
}

// =============================================================================
// FAST RESPONSE GENERATION
// =============================================================================

/**
 * Generate a fast response based on classification and routing
 */
async function generateFastResponse(
  message: string,
  classification: MessageClassification,
  routing: RoutingDecision,
  userName?: string
): Promise<string> {
  const greeting = userName ? `${userName}, ` : '';
  const agent = routing.agent;

  // No deep processing needed - respond directly
  if (!classification.needsDeepProcessing) {
    return generateGreetingResponse(message, userName);
  }

  // Clarification needed
  if (classification.needsClarification && classification.clarificationQuestion) {
    return classification.clarificationQuestion;
  }

  // Action preview (commands)
  if (classification.responseType === 'action_preview' && classification.actionPreview) {
    return generateActionPreviewResponse(classification.actionPreview, agent, userName);
  }

  // Default acknowledgment based on agent
  return generateAcknowledgmentResponse(agent, userName);
}

function generateGreetingResponse(message: string, userName?: string): string {
  const responses = [
    `Hey${userName ? ` ${userName}` : ''}! How can I help you today?`,
    `Hi${userName ? ` ${userName}` : ''}! What can I do for you?`,
    `Hello${userName ? ` ${userName}` : ''}! I'm here to help.`,
  ];
  const idx = Math.floor(Math.random() * responses.length);
  return responses[idx] ?? responses[0]!;
}

function generateActionPreviewResponse(
  action: string,
  agent: ExtendedAgentType,
  userName?: string
): string {
  const prefix = userName ? `${userName}, ` : '';

  const responses: Record<ExtendedAgentType, string> = {
    home: `${prefix}On it! I'm ${action} now...`,
    coder: `${prefix}Got it. ${action.charAt(0).toUpperCase() + action.slice(1)} that for you...`,
    secretary: `${prefix}Working on ${action} that now...`,
    finance: `${prefix}Checking the numbers. ${action.charAt(0).toUpperCase() + action.slice(1)}...`,
    researcher: `${prefix}Searching for that information...`,
    personality: `${prefix}Let me help with that...`,
    orchestrator: `${prefix}Processing your request...`,
    imagegen: `${prefix}Creating that visual for you...`,
  };

  return responses[agent] || `${prefix}Working on it...`;
}

function generateAcknowledgmentResponse(agent: ExtendedAgentType, userName?: string): string {
  const prefix = userName ? `${userName}, ` : '';

  const responses: Record<ExtendedAgentType, string[]> = {
    home: [
      `${prefix}Checking your smart home...`,
      `${prefix}Let me see what I can do with your devices...`,
    ],
    coder: [
      `${prefix}Looking at the code now...`,
      `${prefix}Analyzing that for you...`,
      `${prefix}Let me dig into this...`,
    ],
    secretary: [
      `${prefix}Checking your calendar and emails...`,
      `${prefix}Let me look that up in your Google Workspace...`,
    ],
    finance: [
      `${prefix}Analyzing your finances...`,
      `${prefix}Let me crunch those numbers...`,
    ],
    researcher: [
      `${prefix}Searching the web for you...`,
      `${prefix}Let me find the latest information...`,
      `${prefix}Researching that now...`,
    ],
    personality: [
      `${prefix}Let me think about that...`,
      `${prefix}Great question! Looking into it...`,
    ],
    orchestrator: [
      `${prefix}Processing your request...`,
    ],
    imagegen: [
      `${prefix}Generating that image for you...`,
      `${prefix}Creating your visual now...`,
      `${prefix}Let me draw that up...`,
    ],
  };

  const agentResponses = responses[agent] || responses.orchestrator;
  const idx = Math.floor(Math.random() * agentResponses.length);
  return agentResponses[idx] ?? agentResponses[0]!;
}

// =============================================================================
// JOB QUEUEING
// =============================================================================

/**
 * Queue a background job for deep processing
 */
async function queueDeepProcessingJob(
  userId: string,
  threadId: string,
  message: string,
  routing: RoutingDecision,
  userProfile?: FastTalkerRequest['userProfile']
): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('agent_jobs')
    .insert({
      user_id: userId,
      thread_id: threadId,
      trigger_type: 'user_message',
      agent_type: routing.agent,
      priority: routing.confidence > 0.9 ? 'high' : 'normal',
      input_message: message,
      input_context: {
        routing,
        userProfile,
      },
      scheduled_for: new Date().toISOString(),
      timeout_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min timeout
    })
    .select('id')
    .single();

  if (error) {
    logger.error('[FastTalker] Failed to queue job', { error });
    throw new Error(`Failed to queue background job: ${error.message}`);
  }

  return data.id;
}

/**
 * Save fast response to database
 */
async function saveFastResponse(
  userId: string,
  threadId: string,
  jobId: string | undefined,
  content: string,
  responseType: string,
  hasFollowUp: boolean
): Promise<void> {
  await supabaseAdmin.from('fast_responses').insert({
    user_id: userId,
    thread_id: threadId,
    job_id: jobId,
    content,
    response_type: responseType,
    has_follow_up: hasFollowUp,
  });
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Process a message through the Fast Talker
 *
 * Returns an instant response (~300-800ms) and optionally queues
 * a background job for deep processing.
 */
export async function fastTalk(request: FastTalkerRequest): Promise<FastTalkerResponse> {
  const startTime = Date.now();
  const { message, userId, threadId: providedThreadId, userProfile } = request;

  try {
    // 1. Classify the message (fast pattern matching)
    const classification = await classifyMessage(message);

    // 2. Route to determine which agent should handle this
    const routing = await route(message);

    // 3. Get or create thread
    let threadId: string;
    if (providedThreadId) {
      threadId = providedThreadId;
    } else {
      const { data: newThread, error } = await supabaseAdmin
        .from('threads')
        .insert({ user_id: userId })
        .select('id')
        .single();

      if (error || !newThread) {
        throw new Error('Failed to create thread');
      }
      threadId = newThread.id;
    }

    // 4. Generate fast response
    const content = await generateFastResponse(
      message,
      classification,
      routing,
      userProfile?.name
    );

    // 5. Queue background job if deep processing needed
    let jobId: string | undefined;
    const hasFollowUp = classification.needsDeepProcessing;

    if (hasFollowUp) {
      jobId = await queueDeepProcessingJob(
        userId,
        threadId,
        message,
        routing,
        userProfile
      );
    }

    // 6. Save fast response for reference
    await saveFastResponse(
      userId,
      threadId,
      jobId,
      content,
      classification.responseType,
      hasFollowUp
    );

    // 7. Save user message to chat_messages
    await supabaseAdmin.from('chat_messages').insert({
      id: crypto.randomUUID(),
      thread_id: threadId,
      user_id: userId,
      role: 'user',
      content: message,
    });

    // 8. Save fast response as assistant message
    await supabaseAdmin.from('chat_messages').insert({
      id: crypto.randomUUID(),
      thread_id: threadId,
      user_id: userId,
      role: 'assistant',
      content,
      agent_name: 'fast_talker',
      metadata: {
        responseType: classification.responseType,
        hasFollowUp,
        jobId,
      },
    });

    const latencyMs = Date.now() - startTime;

    logger.info('[FastTalker] Response generated', {
      userId,
      threadId,
      responseType: classification.responseType,
      hasFollowUp,
      jobId,
      latencyMs,
    });

    return {
      content,
      responseType: classification.responseType,
      jobId,
      hasFollowUp,
      threadId,
      routing,
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    logger.error('[FastTalker] Error', { error, latencyMs });
    throw error;
  }
}

/**
 * Check if a message should bypass fast talker and go directly to agent
 * (for simple/immediate actions like home control)
 */
export function shouldBypassFastTalker(message: string, routing: RoutingDecision): boolean {
  // Home commands can often execute immediately
  if (routing.agent === 'home' && routing.confidence > 0.9) {
    return true;
  }

  // Simple greetings don't need deep processing
  if (QUICK_PATTERNS.greeting.test(message.toLowerCase())) {
    return true;
  }

  return false;
}
