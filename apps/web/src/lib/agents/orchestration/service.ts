/**
 * Unified Orchestration Service
 * Single entry point for both streaming and non-streaming chat flows
 * Consolidates routing, tool orchestration, and response generation
 */

// Imports updated to use new modules
import { getModel, type AgentType } from '../model_factory';
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

    // Get model configuration (finance has its own model in model_factory)
    const modelConfig = getModel(targetAgent);

    if (!modelConfig.apiKey) {
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

    const conversationHistory = (dbMessages || [])
      .filter((m: { role: string }) => m.role !== 'system')
      .map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    // Build messages
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
    ];

    // Get tools for agent
    const tools = getAgentTools(routingDecision.agent);

    // Initialize OpenAI client
    const { OpenAI } = await import('openai');
    const client = new OpenAI({
      apiKey: modelConfig.apiKey,
      baseURL: modelConfig.baseURL,
    });

    // Execute completion with optional tools
    const toolExecutions: ToolEvent[] = [];
    let responseContent: string;

    if (tools.length > 0) {
      // Agent with tools
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
        // Execute tools
        const toolMessages: Array<{ role: 'tool'; tool_call_id: string; content: string }> = [];

        for (const toolCall of toolCalls) {
          const toolStartTime = Date.now();
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);

          const result = await executeAgentTool(
            routingDecision.agent,
            functionName,
            functionArgs,
            userId
          );

          const duration = Date.now() - toolStartTime;

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
    yield { type: 'agent_start', agent: routingDecision.agent };

    const targetAgent = routingDecision.agent as AgentType;
    const modelConfig = getModel(targetAgent);

    if (!modelConfig.apiKey) {
      yield { type: 'error', message: `API key not configured for ${targetAgent}`, recoverable: false };
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

    const conversationHistory = (dbMessages || [])
      .filter((m: { role: string }) => m.role !== 'system')
      .map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
    ];

    // Initialize OpenAI
    const { OpenAI } = await import('openai');
    const client = new OpenAI({
      apiKey: modelConfig.apiKey,
      baseURL: modelConfig.baseURL,
    });

    // Get tools
    const tools = getAgentTools(routingDecision.agent);
    const toolExecutions: ToolEvent[] = [];
    let fullContent = '';

    if (tools.length > 0) {
      // Tool-using agent
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
        const toolMessages: Array<{ role: 'tool'; tool_call_id: string; content: string }> = [];

        for (const toolCall of toolCalls) {
          const toolId = toolCall.id;
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          const toolStartTime = Date.now();

          if (showToolExecutions) {
            yield { type: 'tool_start', tool: functionName, args: functionArgs, id: toolId };
          }

          const result = await executeAgentTool(
            routingDecision.agent,
            functionName,
            functionArgs,
            userId
          );

          const duration = Date.now() - toolStartTime;

          toolExecutions.push({
            id: toolId,
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
              id: toolId,
              duration,
            };
          }

          toolMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        }

        // Get follow-up response (non-streaming to collect for wrapper)
        const followUp = await client.chat.completions.create({
          model: modelConfig.model,
          messages: [
            ...messages,
            { role: 'assistant', content: null, tool_calls: toolCalls },
            ...toolMessages,
          ] as Parameters<typeof client.chat.completions.create>[0]['messages'],
          max_completion_tokens: 1000,
        });

        fullContent = followUp.choices[0]?.message?.content || 'I executed the requested actions.';
      } else if (assistantMessage?.content) {
        // No tools called, just content
        fullContent = assistantMessage.content;
      }
    } else {
      // Standard completion (non-streaming to collect for wrapper)
      const completion = await client.chat.completions.create({
        model: modelConfig.model,
        messages,
        max_tokens: 1000,
      });

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

    // Trigger async memory extraction
    extractMemoriesAsync(userId, threadId, message, fullContent);

    yield { type: 'done', fullContent, agent: routingDecision.agent, threadId };
  } catch (error) {
    logger.error('Orchestration streaming error', { userId, threadId: providedThreadId, error });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    yield { type: 'error', message: errorMessage, recoverable: true };
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
