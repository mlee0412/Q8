/**
 * Unified Orchestration Service
 * Single entry point for both streaming and non-streaming chat flows
 * Consolidates routing, tool orchestration, and response generation
 */

// Imports updated to use new modules
import { getModel, getModelChain, type AgentType, type ModelConfig } from '../model_factory';
import { buildEnrichedContext } from '../context-provider';
import { addMessage, getConversationHistory } from '../conversation-store';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { ChatMessageInsert } from '@/lib/supabase/types';
import type { EnrichedContext } from '../types';

import {
  buildSystemPrompt,
  fetchMemoryContext,
  getDocumentContext,
} from './context-builder';
import { ORCHESTRATOR_WRAPPER_PROMPT } from './constants';
import { getRoutingContext, updateTopicContext } from './topic-tracker';
import {
  getAgentTools,
  executeAgentTool,
} from './agent-runner';
import type {
  ExtendedAgentType,
  RoutingDecision,
  OrchestrationRequest,
  OrchestrationResponse,
  OrchestrationEvent,
  ToolEvent,
} from './types';
import { route } from './router';
import { logRoutingTelemetry, recordImplicitFeedback } from './metrics';
import { getConversationContext } from '@/lib/documents/processor';
import { detectHandoffSignal, stripHandoffMarkers, processHandoff } from './handoff';
import { getResponseCache, isCacheable, calculateTTL } from './response-cache';
import { maybeCompress, needsCompression } from './context-compressor';
import { getQualityScorer, getFeedbackTracker, scoreResponse } from './quality-scorer';
import { generateSuggestions, getTimeOfDay, type Suggestion } from './proactive-suggestions';
import {
  startSpeculativeExecution,
  getSpeculativeResult,
  waitForSpeculativeResult,
} from './speculative-executor';

/**
 * Retry configuration for API calls
 * Increased delays to handle persistent rate limits
 */
const RETRY_CONFIG = {
  maxRetries: 5,
  baseDelayMs: 2000,
  maxDelayMs: 30000,
};

/**
 * Fallback model chain for rate limit resilience
 * When primary model hits rate limit, try these in order
 */
const FALLBACK_MODELS: Record<string, string[]> = {
  'gpt-4o': ['gpt-4o-mini', 'gpt-4-turbo'],
  'gpt-5.1': ['gpt-4o', 'gpt-4o-mini'],
  'gpt-5-nano': ['gpt-4o-mini', 'gpt-3.5-turbo'],
  'o3-mini': ['gpt-4o-mini', 'gpt-4o'],
};

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an error is a rate limit error (429)
 * Handles both OpenAI SDK errors and generic errors
 */
function isRateLimitError(error: unknown): boolean {
  // Check for OpenAI SDK error with status property
  if (error && typeof error === 'object') {
    const errObj = error as { status?: number; code?: string; message?: string };
    if (errObj.status === 429) return true;
    if (errObj.code === 'rate_limit_exceeded') return true;
  }

  // Check error message
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('429') || message.includes('rate limit') || message.includes('too many requests');
  }

  // Check stringified error
  const errorStr = String(error).toLowerCase();
  return errorStr.includes('429') || errorStr.includes('rate limit');
}

/**
 * Options for retry with model fallback
 */
interface RetryOptions {
  config?: typeof RETRY_CONFIG;
  fallbackModels?: string[];
  currentModel?: string;
}

/**
 * Retry wrapper with exponential backoff for API calls
 * Specifically handles 429 rate limit errors with longer delays
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  context: string,
  options: RetryOptions = {}
): Promise<T> {
  const config = options.config || RETRY_CONFIG;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (!isRateLimitError(error)) {
        // Non-rate-limit errors should not be retried
        throw error;
      }

      const isLastAttempt = attempt === config.maxRetries - 1;

      if (!isLastAttempt) {
        // Exponential backoff with jitter - longer delays for rate limits
        const delay = Math.min(
          config.baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000,
          config.maxDelayMs
        );
        logger.warn(`Rate limited on ${context}, retrying in ${Math.round(delay)}ms`, {
          attempt: attempt + 1,
          maxRetries: config.maxRetries,
          errorMessage: lastError.message,
        });
        await sleep(delay);
      } else {
        logger.error(`Rate limit persisted after ${config.maxRetries} retries: ${context}`, {
          errorMessage: lastError.message,
        });
      }
    }
  }

  throw lastError || new Error(`Failed after ${config.maxRetries} retries: ${context}`);
}

/**
 * Create an OpenAI-compatible client for a given model config
 */
async function createClient(modelConfig: ModelConfig): Promise<InstanceType<typeof import('openai').default>> {
  const { OpenAI } = await import('openai');
  return new OpenAI({
    apiKey: modelConfig.apiKey,
    baseURL: modelConfig.baseURL,
    maxRetries: 3, // Reduced retries per model - we'll try fallbacks instead
    timeout: 60000,
  });
}

/**
 * Execute a completion with model fallback on rate limits
 * Tries each model in the chain until one succeeds
 */
async function executeWithFallback<T>(
  modelChain: ModelConfig[],
  fn: (client: InstanceType<typeof import('openai').default>, model: string) => Promise<T>,
  context: string
): Promise<{ result: T; usedModel: ModelConfig }> {
  if (modelChain.length === 0) {
    throw new Error(`No models available for ${context}`);
  }

  const errors: Array<{ model: string; provider: string; error: string }> = [];

  for (let i = 0; i < modelChain.length; i++) {
    const modelConfig = modelChain[i]!; // Non-null assertion - we checked length above
    const isLastModel = i === modelChain.length - 1;

    try {
      const client = await createClient(modelConfig);
      const result = await fn(client, modelConfig.model);

      // Log if we used a fallback
      if (i > 0) {
        logger.info(`[Fallback] Successfully used fallback model`, {
          context,
          usedModel: modelConfig.model,
          provider: modelConfig.provider,
          attemptedModels: errors.map(e => e.model),
        });
      }

      return { result, usedModel: modelConfig };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push({
        model: modelConfig.model,
        provider: modelConfig.provider || 'unknown',
        error: errorMessage,
      });

      // Only retry on rate limits, throw immediately for other errors
      if (!isRateLimitError(error)) {
        throw new Error(`[${modelConfig.provider}/${modelConfig.model}] ${errorMessage}`);
      }

      // Log the rate limit
      logger.warn(`[RateLimit] ${modelConfig.provider}/${modelConfig.model} rate limited`, {
        context,
        model: modelConfig.model,
        provider: modelConfig.provider,
        willTryFallback: !isLastModel,
        errorMessage,
      });

      // If this was the last model, throw with comprehensive error
      if (isLastModel) {
        const modelsAttempted = errors.map(e => `${e.provider}/${e.model}`).join(', ');
        throw new Error(
          `All models rate limited for ${context}. Tried: ${modelsAttempted}. ` +
          `Last error: ${errorMessage}. Please wait a moment before retrying.`
        );
      }

      // Brief delay before trying next model
      await sleep(500);
    }
  }

  // This shouldn't be reached, but TypeScript needs it
  throw new Error(`No models available for ${context}`);
}

/**
 * Generate a unique message ID
 * Uses crypto.randomUUID() for consistent, collision-free IDs
 */
function generateMessageId(): string {
  return crypto.randomUUID();
}

/**
 * Agent system prompts
 */


/**
 * Build complete system prompt for an agent with context
 */




// =============================================================================
// TOOL EXECUTION WITH TIMEOUTS AND ERROR BOUNDARIES
// =============================================================================

/**
 * Per-tool timeout configuration (in milliseconds)
 * Tools that call external APIs get longer timeouts
 */


/**
 * Execute a promise with timeout
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  toolName: string
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`Tool '${toolName}' timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutHandle!);
    return result;
  } catch (error) {
    clearTimeout(timeoutHandle!);
    throw error;
  }
}

/**
 * Classify error type for better error handling
 */
function classifyError(error: unknown): { code: string; recoverable: boolean } {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('timed out')) {
    return { code: 'TIMEOUT', recoverable: true };
  }
  if (message.includes('Failed to fetch') || message.includes('ECONNREFUSED')) {
    return { code: 'CONNECTION_ERROR', recoverable: true };
  }
  if (message.includes('not found') || message.includes('404')) {
    return { code: 'NOT_FOUND', recoverable: false };
  }
  if (message.includes('Unauthorized') || message.includes('401') || message.includes('403')) {
    return { code: 'AUTH_ERROR', recoverable: false };
  }
  if (message.includes('rate limit') || message.includes('429')) {
    return { code: 'RATE_LIMITED', recoverable: true };
  }
  if (message.includes('Validation') || message.includes('Invalid')) {
    return { code: 'VALIDATION_ERROR', recoverable: false };
  }

  return { code: 'UNKNOWN_ERROR', recoverable: false };
}

// =============================================================================
// ORCHESTRATOR WRAPPER - UNIFIED Q8 VOICE
// =============================================================================

/**
 * Agents that should bypass the wrapper (already speak as Q8 or are the orchestrator)
 */
const WRAPPER_BYPASS_AGENTS = new Set<ExtendedAgentType>(['personality', 'orchestrator']);

/**
 * Wrap a sub-agent response in the orchestrator's unified voice
 * This ensures all responses feel like they come from a single "Q8" intelligence
 */
async function wrapResponseAsOrchestrator(
  subAgentResponse: string,
  subAgent: ExtendedAgentType,
  toolsUsed: string[],
  userMessage: string
): Promise<string> {
  // Skip wrapping for personality/orchestrator agents
  if (WRAPPER_BYPASS_AGENTS.has(subAgent)) {
    return subAgentResponse;
  }

  // Skip wrapping for very short responses (likely simple acknowledgments)
  if (subAgentResponse.length < 50) {
    return subAgentResponse;
  }

  try {
    const { OpenAI } = await import('openai');
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 5, // SDK handles exponential backoff automatically
      timeout: 30000,
    });

    const toolContext = toolsUsed.length > 0
      ? `\nTools used by sub-agent: ${toolsUsed.join(', ')}`
      : '';

    const wrapperMessages = [
      { role: 'system' as const, content: ORCHESTRATOR_WRAPPER_PROMPT },
      {
        role: 'user' as const,
        content: `User's original request: "${userMessage}"

Sub-agent (${subAgent}) response:
${subAgentResponse}
${toolContext}

Re-author this response in Q8's voice:`,
      },
    ];

    // SDK's built-in retry handles 429 errors with exponential backoff
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini', // Fast, cheap model for wrapper
      messages: wrapperMessages,
      max_tokens: 1500,
      temperature: 0.7,
    });

    const wrappedContent = completion.choices[0]?.message?.content;
    if (wrappedContent && wrappedContent.length > 0) {
      return wrappedContent;
    }

    // Fallback to original if wrapper fails
    return subAgentResponse;
  } catch (error) {
    logger.warn('Orchestrator wrapper failed, using original response', { subAgent, error });
    return subAgentResponse;
  }
}

/**
 * Stream the orchestrator wrapper response
 * Returns an async generator of content deltas
 */
async function* streamWrapResponseAsOrchestrator(
  subAgentResponse: string,
  subAgent: ExtendedAgentType,
  toolsUsed: string[],
  userMessage: string
): AsyncGenerator<string> {
  // Skip wrapping for personality/orchestrator agents
  if (WRAPPER_BYPASS_AGENTS.has(subAgent)) {
    yield subAgentResponse;
    return;
  }

  // Skip wrapping for very short responses
  if (subAgentResponse.length < 50) {
    yield subAgentResponse;
    return;
  }

  try {
    const { OpenAI } = await import('openai');
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 5, // SDK handles exponential backoff automatically
      timeout: 30000,
    });

    const toolContext = toolsUsed.length > 0
      ? `\nTools used by sub-agent: ${toolsUsed.join(', ')}`
      : '';

    const wrapperMessages = [
      { role: 'system' as const, content: ORCHESTRATOR_WRAPPER_PROMPT },
      {
        role: 'user' as const,
        content: `User's original request: "${userMessage}"

Sub-agent (${subAgent}) response:
${subAgentResponse}
${toolContext}

Re-author this response in Q8's voice:`,
      },
    ];

    const stream = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: wrapperMessages,
      max_tokens: 1500,
      temperature: 0.7,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        yield delta;
      }
    }
  } catch (error) {
    logger.warn('Orchestrator wrapper streaming failed, using original response', { subAgent, error });
    yield subAgentResponse;
  }
}

/**
 * Process a message through the orchestration system (non-streaming)
 */
export async function processMessage(
  request: OrchestrationRequest
): Promise<OrchestrationResponse> {
  const startTime = Date.now();
  const { message, userId, threadId: providedThreadId, userProfile, forceAgent } = request;

  try {
    // Get or create thread
    let threadId: string;
    if (providedThreadId) {
      threadId = providedThreadId;
    } else {
      const { data: newThread, error } = await supabaseAdmin
        .from('threads')
        .insert({ user_id: userId })
        .select()
        .single();

      if (error || !newThread) {
        throw new Error('Failed to create thread');
      }
      threadId = newThread.id;
    }

    // Build context
    const sessionId = threadId;
    const context = await buildEnrichedContext(
      userId,
      sessionId,
      userProfile ? {
        name: userProfile.name,
        timezone: userProfile.timezone,
        communicationStyle: userProfile.communicationStyle,
        preferences: {},
      } : undefined
    );

    // Add user message to history
    addMessage(sessionId, 'user', message);

    // Save user message to Supabase
    await supabaseAdmin.from('chat_messages').insert({
      id: generateMessageId(),
      thread_id: threadId,
      user_id: userId,
      role: 'user',
      content: message,
    } as ChatMessageInsert);

    // Get routing context from topic tracker
    const routingContext = await getRoutingContext(threadId, message);

    // Route the message with topic context
    let routingDecision: RoutingDecision;
    if (forceAgent) {
      routingDecision = {
        agent: forceAgent,
        confidence: 1,
        rationale: 'User-specified agent',
        source: 'heuristic',
      };
    } else {
      routingDecision = await route(message, { routingContext });
    }

    const targetAgent = routingDecision.agent as AgentType;

    // Start speculative data fetching in background while building context
    const cancelSpeculative = startSpeculativeExecution(routingDecision, userId);

    // Get model configuration (finance has its own model in model_factory)
    const modelConfig = getModel(targetAgent);

    if (!modelConfig.apiKey) {
      cancelSpeculative();
      throw new Error(`API key not configured for ${targetAgent}`);
    }

    // Build system prompt with memory and document context
    const memoryContext = await fetchMemoryContext(userId);

    // Fetch relevant document context for the query
    let documentContext = '';
    try {
      const docContext = await getConversationContext(userId, threadId, message, 4000);
      if (docContext.content) {
        documentContext = docContext.content;
        logger.debug('Document context retrieved', {
          userId,
          threadId,
          sourceCount: docContext.sources.length,
        });
      }
    } catch (error) {
      logger.warn('Failed to fetch document context', { userId, threadId, error });
    }

    const systemPrompt = await buildSystemPrompt(routingDecision.agent, context, memoryContext, documentContext);

    // Get conversation history
    const { data: dbMessages } = await supabaseAdmin
      .from('chat_messages')
      .select('role, content')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .limit(20);

    const rawConversationHistory = (dbMessages || [])
      .filter((m: { role: string }) => m.role !== 'system')
      .map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    // Apply context compression if history is large
    // This reduces TTFT (Time To First Token) for long conversations
    const { messages: compressedHistory, contextPrefix } = await maybeCompress(
      rawConversationHistory,
      { maxTokens: 4000, recentMessageCount: 8 }
    );

    // Build messages with optional compression prefix
    let finalSystemPrompt = systemPrompt;
    if (contextPrefix) {
      finalSystemPrompt = `${systemPrompt}\n\n${contextPrefix}`;
      logger.debug('Context compressed', {
        originalCount: rawConversationHistory.length,
        compressedCount: compressedHistory.length,
      });
    }

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: finalSystemPrompt },
      ...compressedHistory,
    ];

    // Get tools for agent
    const tools = getAgentTools(routingDecision.agent);

    // Initialize OpenAI client with SDK's built-in retry for rate limits
    const { OpenAI } = await import('openai');
    const client = new OpenAI({
      apiKey: modelConfig.apiKey,
      baseURL: modelConfig.baseURL,
      maxRetries: 5, // SDK handles exponential backoff automatically
      timeout: 60000, // 60 second timeout for completions
    });

    // Execute completion with optional tools
    const toolExecutions: ToolEvent[] = [];
    let responseContent: string;

    if (tools.length > 0) {
      // Agent with tools - SDK handles retry with exponential backoff
      const completion = await client.chat.completions.create({
        model: modelConfig.model,
        messages,
        tools,
        tool_choice: 'auto',
        max_completion_tokens: 1000,
      });

      const assistantMessage = completion.choices[0]?.message;
      const toolCalls = assistantMessage?.tool_calls;

      if (toolCalls && toolCalls.length > 0) {
        // Execute tools IN PARALLEL for latency optimization
        // Check speculative cache first for pre-warmed results
        const toolStartTime = Date.now();

        const toolResults = await Promise.all(
          toolCalls.map(async (toolCall) => {
            const callStartTime = Date.now();
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);

            // Try to get speculative result first (may have been pre-fetched)
            const speculativeResult = await waitForSpeculativeResult(
              userId,
              functionName,
              functionArgs,
              50 // Only wait 50ms for speculative result
            );

            let result;
            let fromCache = false;

            if (speculativeResult) {
              // Use pre-warmed result from speculative execution
              result = { success: true, data: speculativeResult.result, message: 'From speculative cache' };
              fromCache = true;
              logger.debug('Using speculative result (non-streaming)', { tool: functionName });
            } else {
              // Execute tool normally
              result = await executeAgentTool(
                routingDecision.agent,
                functionName,
                functionArgs,
                userId
              );
            }

            const duration = Date.now() - callStartTime;

            return {
              toolCall,
              functionName,
              functionArgs,
              result,
              duration,
              fromCache,
            };
          })
        );

        // Process results after parallel execution
        const toolMessages: Array<{ role: 'tool'; tool_call_id: string; content: string }> = [];

        for (const { toolCall, functionName, functionArgs, result, duration } of toolResults) {
          toolExecutions.push({
            id: toolCall.id,
            type: 'end',
            tool: functionName,
            args: functionArgs,
            result: result.data,
            success: result.success,
            duration,
            timestamp: new Date(),
          });

          toolMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        }

        const cacheHits = toolResults.filter(r => r.fromCache).length;
        logger.debug('Parallel tool execution completed', {
          toolCount: toolCalls.length,
          totalDuration: Date.now() - toolStartTime,
          individualDurations: toolResults.map(r => r.duration),
          speculativeCacheHits: cacheHits,
          speculativeCacheHitRate: cacheHits / toolCalls.length,
        });

        // Get final response with tool results
        const followUp = await client.chat.completions.create({
          model: modelConfig.model,
          messages: [
            ...messages,
            { role: 'assistant', content: null, tool_calls: toolCalls },
            ...toolMessages,
          ] as Parameters<typeof client.chat.completions.create>[0]['messages'],
          max_completion_tokens: 1000,
        });

        responseContent = followUp.choices[0]?.message?.content ||
          'I executed the requested actions.';
      } else {
        responseContent = assistantMessage?.content ||
          'I need more information to help with that.';
      }
    } else {
      // Standard completion without tools
      const isOpenAIReasoningModel = !modelConfig.baseURL || modelConfig.baseURL.includes('openai.com');

      const completion = await client.chat.completions.create({
        model: modelConfig.model,
        messages,
        ...(isOpenAIReasoningModel
          ? { max_completion_tokens: 1000 }
          : { max_tokens: 1000, temperature: 0.7 }),
      });

      responseContent = completion.choices[0]?.message?.content ||
        'Sorry, I received an empty response. Please try again.';
    }

    // Wrap response in orchestrator voice (unified Q8 personality)
    const toolsUsed = toolExecutions.map((t) => t.tool);
    responseContent = await wrapResponseAsOrchestrator(
      responseContent,
      routingDecision.agent,
      toolsUsed,
      message
    );

    // Save assistant response
    addMessage(sessionId, 'assistant', responseContent, routingDecision.agent);

    await supabaseAdmin.from('chat_messages').insert({
      id: generateMessageId(),
      thread_id: threadId,
      user_id: userId,
      role: 'assistant',
      content: responseContent,
      agent_name: routingDecision.agent,
    } as ChatMessageInsert);

    // Log telemetry
    const latency = Date.now() - startTime;
    await logRoutingTelemetry({
      userId,
      threadId,
      selectedAgent: routingDecision.agent,
      routingSource: routingDecision.source,
      confidence: routingDecision.confidence,
      latencyMs: latency,
      success: true,
      toolsUsed: toolExecutions.map((t) => t.tool),
      fallbackUsed: routingDecision.source === 'fallback',
    });

    // Update topic context for future routing
    await updateTopicContext(
      threadId,
      routingDecision.agent,
      message,
      routingContext.topicContext
    );

    return {
      content: responseContent,
      agent: routingDecision.agent,
      threadId,
      routing: routingDecision,
      toolExecutions: toolExecutions.length > 0 ? toolExecutions : undefined,
      metadata: {
        latency,
        model: modelConfig.model,
      },
    };
  } catch (error) {
    logger.error('Orchestration error', { userId, threadId: providedThreadId, error });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log failure
    if (providedThreadId) {
      await recordImplicitFeedback(userId, providedThreadId, 'personality', 'tool_failure');
    }

    throw error;
  }
}

/**
 * Create a streaming orchestration generator
 * Returns an async generator of OrchestrationEvents
 */
export async function* streamMessage(
  request: OrchestrationRequest
): AsyncGenerator<OrchestrationEvent> {
  const startTime = Date.now();
  const { message, userId, threadId: providedThreadId, userProfile, forceAgent, showToolExecutions = true } = request;

  try {
    // Get or create thread
    let threadId: string;
    if (providedThreadId) {
      threadId = providedThreadId;
    } else {
      const { data: newThread, error } = await supabaseAdmin
        .from('threads')
        .insert({ user_id: userId })
        .select()
        .single();

      if (error || !newThread) {
        yield { type: 'error', message: 'Failed to create thread', recoverable: false };
        return;
      }
      threadId = newThread.id;
      yield { type: 'thread_created', threadId };
    }

    // Build context
    const sessionId = threadId;
    const context = await buildEnrichedContext(
      userId,
      sessionId,
      userProfile ? {
        name: userProfile.name,
        timezone: userProfile.timezone,
        communicationStyle: userProfile.communicationStyle,
        preferences: {},
      } : undefined
    );

    // Add user message
    addMessage(sessionId, 'user', message);

    await supabaseAdmin.from('chat_messages').insert({
      id: generateMessageId(),
      thread_id: threadId,
      user_id: userId,
      role: 'user',
      content: message,
    } as ChatMessageInsert);

    // Check response cache first (for fast repeat queries)
    const cache = getResponseCache();
    const cachedResponse = await cache.get(message, { userId });

    if (cachedResponse) {
      logger.debug('Cache hit - returning cached response', { message: message.slice(0, 50) });
      yield { type: 'routing', decision: { agent: cachedResponse.agent, confidence: 1, rationale: 'Cached response', source: 'heuristic' as const } };
      yield { type: 'agent_start', agent: cachedResponse.agent };
      yield { type: 'content', delta: cachedResponse.response };
      yield { type: 'done', fullContent: cachedResponse.response, agent: cachedResponse.agent, threadId };
      return;
    }

    // Get routing context from topic tracker
    const routingContext = await getRoutingContext(threadId, message);

    // Route the message with topic context
    let routingDecision: RoutingDecision;
    if (forceAgent) {
      routingDecision = {
        agent: forceAgent,
        confidence: 1,
        rationale: 'User-specified agent',
        source: 'heuristic',
      };
    } else {
      routingDecision = await route(message, { routingContext });
    }

    yield { type: 'routing', decision: routingDecision };

    // Start speculative data fetching in background while LLM processes
    // This pre-warms likely tool results based on the routing decision
    const cancelSpeculative = startSpeculativeExecution(routingDecision, userId);

    yield { type: 'agent_start', agent: routingDecision.agent };

    const targetAgent = routingDecision.agent as AgentType;
    const modelChain = getModelChain(targetAgent);

    if (modelChain.length === 0) {
      yield { type: 'error', message: `No models available for ${targetAgent}`, recoverable: false };
      return;
    }

    // Build system prompt with memory and document context
    const memoryContext = await fetchMemoryContext(userId);

    // Fetch relevant document context for the query
    let documentContext = '';
    try {
      const docContext = await getConversationContext(userId, threadId, message, 4000);
      if (docContext.content) {
        documentContext = docContext.content;
        logger.debug('Document context retrieved for streaming', {
          userId,
          threadId,
          sourceCount: docContext.sources.length,
        });
      }
    } catch (error) {
      logger.warn('Failed to fetch document context', { userId, threadId, error });
    }

    const systemPrompt = await buildSystemPrompt(routingDecision.agent, context, memoryContext, documentContext);

    // Get conversation history
    const { data: dbMessages } = await supabaseAdmin
      .from('chat_messages')
      .select('role, content')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .limit(20);

    const rawStreamingHistory = (dbMessages || [])
      .filter((m: { role: string }) => m.role !== 'system')
      .map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    // Apply context compression if history is large
    // This reduces TTFT (Time To First Token) for long conversations
    const { messages: compressedStreamingHistory, contextPrefix: streamingContextPrefix } = await maybeCompress(
      rawStreamingHistory,
      { maxTokens: 4000, recentMessageCount: 8 }
    );

    // Build messages with optional compression prefix
    let streamingSystemPrompt = systemPrompt;
    if (streamingContextPrefix) {
      streamingSystemPrompt = `${systemPrompt}\n\n${streamingContextPrefix}`;
      logger.debug('Streaming context compressed', {
        originalCount: rawStreamingHistory.length,
        compressedCount: compressedStreamingHistory.length,
      });
    }

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: streamingSystemPrompt },
      ...compressedStreamingHistory,
    ];

    // Get tools
    const tools = getAgentTools(routingDecision.agent);
    const toolExecutions: ToolEvent[] = [];
    const collectedImages: Array<{ data: string; mimeType: string; caption?: string }> = [];
    let fullContent = '';
    let usedModelConfig: ModelConfig = modelChain[0]!; // Non-null: checked modelChain.length above

    if (tools.length > 0) {
      // Tool-using agent - use model chain with fallback on rate limits
      const { result: completion, usedModel } = await executeWithFallback(
        modelChain,
        async (client, model) => {
          return client.chat.completions.create({
            model,
            messages,
            tools,
            tool_choice: 'auto',
            max_completion_tokens: 1000,
          });
        },
        `tool-completion/${targetAgent}`
      );
      usedModelConfig = usedModel;

      const assistantMessage = completion.choices[0]?.message;
      const toolCalls = assistantMessage?.tool_calls;

      if (toolCalls && toolCalls.length > 0) {
        const toolMessages: Array<{ role: 'tool'; tool_call_id: string; content: string }> = [];
        const parallelStartTime = Date.now();

        // Parse all tool calls and emit start events immediately
        const parsedToolCalls = toolCalls.map((toolCall) => ({
          id: toolCall.id,
          functionName: toolCall.function.name,
          functionArgs: JSON.parse(toolCall.function.arguments),
          toolCall,
        }));

        // Emit all tool_start events upfront (users see all tools spinning)
        if (showToolExecutions) {
          for (const { id, functionName, functionArgs } of parsedToolCalls) {
            yield { type: 'tool_start', tool: functionName, args: functionArgs, id };
          }
        }

        // Execute ALL tools in PARALLEL for latency optimization
        // Check speculative cache first for pre-warmed results
        const toolResults = await Promise.all(
          parsedToolCalls.map(async ({ id, functionName, functionArgs, toolCall }) => {
            const callStartTime = Date.now();

            // Try to get speculative result first (may have been pre-fetched)
            const speculativeResult = await waitForSpeculativeResult(
              userId,
              functionName,
              functionArgs,
              50 // Only wait 50ms for speculative result
            );

            let result;
            let fromCache = false;

            if (speculativeResult) {
              // Use pre-warmed result from speculative execution
              result = { success: true, data: speculativeResult.result, message: 'From speculative cache' };
              fromCache = true;
              logger.debug('Using speculative result', { tool: functionName });
            } else {
              // Execute tool normally
              result = await executeAgentTool(
                routingDecision.agent,
                functionName,
                functionArgs,
                userId
              );
            }

            const duration = Date.now() - callStartTime;

            return {
              id,
              functionName,
              functionArgs,
              toolCall,
              result,
              duration,
              fromCache,
            };
          })
        );

        // Tool names that produce image generation or analysis results
        const IMAGE_GEN_TOOLS = ['generate_image', 'edit_image', 'create_diagram', 'create_chart'];
        const IMAGE_ANALYSIS_TOOLS = ['analyze_image', 'compare_images'];

        // Emit tool_end events and build messages after parallel execution
        for (const { id, functionName, functionArgs, toolCall, result, duration } of toolResults) {
          toolExecutions.push({
            id,
            type: 'end',
            tool: functionName,
            args: functionArgs,
            result: result.data,
            success: result.success,
            duration,
            timestamp: new Date(),
          });

          if (showToolExecutions) {
            yield {
              type: 'tool_end',
              tool: functionName,
              success: result.success,
              result: result.data || result.message,
              id,
              duration,
            };
          }

          // Emit image_generated events for image generation tools
          if (IMAGE_GEN_TOOLS.includes(functionName) && result.success && result.data) {
            const imgData = result.data as { imageData?: string; mimeType?: string; prompt?: string; instruction?: string; diagramType?: string; chartType?: string; title?: string; description?: string };
            if (imgData.imageData) {
              const caption = (functionArgs as Record<string, unknown>).prompt as string
                || imgData.prompt
                || imgData.instruction
                || imgData.description
                || imgData.title
                || `${imgData.diagramType || imgData.chartType || 'Generated'} image`;
              yield {
                type: 'image_generated',
                imageData: imgData.imageData,
                mimeType: imgData.mimeType || 'image/png',
                caption,
                model: 'gpt-image-1.5',
              };
              collectedImages.push({
                data: imgData.imageData,
                mimeType: imgData.mimeType || 'image/png',
                caption,
              });
            }
          }

          // Emit image_analyzed events for analysis tools
          if (IMAGE_ANALYSIS_TOOLS.includes(functionName) && result.success && result.data) {
            const analysisData = result.data as { analysis?: string; comparison?: string };
            const analysis = analysisData.analysis || analysisData.comparison || (typeof result.data === 'string' ? result.data : JSON.stringify(result.data));
            yield {
              type: 'image_analyzed',
              analysis,
              imageUrl: (functionArgs as Record<string, unknown>).image_url as string | undefined,
            };
          }

          toolMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        }

        const streamingCacheHits = toolResults.filter(r => r.fromCache).length;
        logger.debug('Parallel streaming tool execution completed', {
          toolCount: toolCalls.length,
          totalDuration: Date.now() - parallelStartTime,
          individualDurations: toolResults.map(r => r.duration),
          speculativeCacheHits: streamingCacheHits,
          speculativeCacheHitRate: streamingCacheHits / toolCalls.length,
        });

        // Get follow-up response - use model chain with fallback on rate limits
        const { result: followUp } = await executeWithFallback(
          modelChain,
          async (client, model) => {
            return client.chat.completions.create({
              model,
              messages: [
                ...messages,
                { role: 'assistant', content: null, tool_calls: toolCalls },
                ...toolMessages,
              ] as Parameters<typeof client.chat.completions.create>[0]['messages'],
              max_completion_tokens: 1000,
            });
          },
          `followup-completion/${targetAgent}`
        );

        fullContent = followUp.choices[0]?.message?.content || 'I executed the requested actions.';
      } else if (assistantMessage?.content) {
        // No tools called, just content
        fullContent = assistantMessage.content;
      }
    } else {
      // Standard completion - use model chain with fallback on rate limits
      const { result: completion, usedModel } = await executeWithFallback(
        modelChain,
        async (client, model) => {
          return client.chat.completions.create({
            model,
            messages,
            max_tokens: 1000,
          });
        },
        `completion/${targetAgent}`
      );
      usedModelConfig = usedModel;

      fullContent = completion.choices[0]?.message?.content || '';
    }

    // Ensure we have content
    if (!fullContent) {
      fullContent = 'I apologize, but I couldn\'t generate a response. Please try again.';
      yield { type: 'content', delta: fullContent };
    } else {
      // Check for hand-off signals before wrapping
      const handoffSignal = detectHandoffSignal(fullContent);

      if (handoffSignal) {
        // Emit hand-off event for UI notification
        yield {
          type: 'handoff',
          from: routingDecision.agent,
          to: handoffSignal.target,
          reason: handoffSignal.reason,
        };

        // Strip hand-off markers from content
        fullContent = stripHandoffMarkers(fullContent);

        logger.info('Hand-off detected', {
          from: routingDecision.agent,
          to: handoffSignal.target,
          reason: handoffSignal.reason,
        });
      }

      // Stream the wrapped response in orchestrator voice
      const toolsUsed = toolExecutions.map((t) => t.tool);
      let wrappedContent = '';

      for await (const delta of streamWrapResponseAsOrchestrator(
        fullContent,
        routingDecision.agent,
        toolsUsed,
        message
      )) {
        wrappedContent += delta;
        yield { type: 'content', delta };
      }

      // Use wrapped content for saving
      fullContent = wrappedContent || fullContent;
    }

    // Save response
    addMessage(sessionId, 'assistant', fullContent, routingDecision.agent);

    await supabaseAdmin.from('chat_messages').insert({
      id: generateMessageId(),
      thread_id: threadId,
      user_id: userId,
      role: 'assistant',
      content: fullContent,
      agent_name: routingDecision.agent,
    } as ChatMessageInsert);

    // Log telemetry
    const latency = Date.now() - startTime;
    await logRoutingTelemetry({
      userId,
      threadId,
      selectedAgent: routingDecision.agent,
      routingSource: routingDecision.source,
      confidence: routingDecision.confidence,
      latencyMs: latency,
      success: true,
      toolsUsed: toolExecutions.map((t) => t.tool),
      fallbackUsed: routingDecision.source === 'fallback',
    });

    // Update topic context for future routing
    await updateTopicContext(
      threadId,
      routingDecision.agent,
      message,
      routingContext.topicContext
    );

    // Score response quality and cache if good
    const qualityScore = scoreResponse(fullContent, message);
    if (isCacheable(message, routingDecision.agent) && qualityScore.overall >= 0.7) {
      cache.set(message, fullContent, routingDecision.agent, {
        userId,
        ttl: calculateTTL(message, routingDecision.agent),
        metadata: { latency, quality: qualityScore.overall },
      });
    }

    // Track quality metrics asynchronously
    getFeedbackTracker().recordQuality(
      userId,
      threadId,
      generateMessageId(),
      routingDecision.agent,
      message,
      fullContent,
      latency
    ).catch((err) => logger.debug('Quality tracking failed', { error: err }));

    // Trigger async memory extraction
    extractMemoriesAsync(userId, threadId, message, fullContent);

    yield {
      type: 'done',
      fullContent,
      agent: routingDecision.agent,
      threadId,
      ...(collectedImages.length > 0 ? { images: collectedImages } : {}),
    };
  } catch (error) {
    logger.error('Orchestration streaming error', { userId, threadId: providedThreadId, error });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check if this is a rate limit error and provide user-friendly message
    const isRateLimit = isRateLimitError(error);
    const userMessage = isRateLimit
      ? 'I\'m experiencing high demand right now. Please wait a moment and try again.'
      : errorMessage;

    yield { type: 'error', message: userMessage, recoverable: isRateLimit };
  }
}

/**
 * Extract memories asynchronously (fire and forget)
 */
function extractMemoriesAsync(userId: string, threadId: string, userMessage: string, assistantMessage: string) {
  fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/memories/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, threadId, userMessage, assistantMessage }),
  }).catch((err) => logger.warn('Memory extraction failed', { userId, threadId, error: err }));
}
