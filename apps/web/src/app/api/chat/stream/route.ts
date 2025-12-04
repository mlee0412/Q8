/**
 * Streaming Chat API Route
 * Server-sent events (SSE) for real-time response streaming
 * Includes tool execution visibility
 */

import { NextRequest } from 'next/server';
import { getModel, type AgentType } from '@/lib/agents/model_factory';
import { buildEnrichedContext, buildContextSummary, getGreeting } from '@/lib/agents/context-provider';
import { addMessage, getConversationHistory } from '@/lib/agents/conversation-store';
import { buildDeviceSummary } from '@/lib/agents/home-context';
import { homeAssistantTools, executeHomeAssistantTool } from '@/lib/agents/home-tools';
import { executeDefaultTool } from '@/lib/agents/tools/default-tools';
import type { EnrichedContext } from '@/lib/agents/types';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { ChatMessageInsert } from '@/lib/supabase/types';

export const runtime = 'edge';

interface StreamRequest {
  message: string;
  userId: string;
  threadId?: string; // Optional - creates new thread if not provided
  userProfile?: {
    name?: string;
    timezone?: string;
    communicationStyle?: 'concise' | 'detailed';
  };
}

/**
 * Stream event types for client consumption
 */
type StreamEvent =
  | { type: 'routing'; agent: string; reason: string }
  | { type: 'tool_start'; tool: string; args: Record<string, unknown> }
  | { type: 'tool_end'; tool: string; success: boolean; result?: unknown }
  | { type: 'content'; delta: string }
  | { type: 'done'; fullContent: string; agent: string; threadId: string }
  | { type: 'thread_created'; threadId: string }
  | { type: 'memory_extracted'; count: number }
  | { type: 'error'; message: string };

/**
 * Encode SSE event
 */
function encodeSSE(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Analyze message for routing (same as in index.ts)
 */
function analyzeMessageForRouting(message: string): { agent: AgentType; reason: string } {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes('code') ||
    lowerMessage.includes('bug') ||
    lowerMessage.includes('github') ||
    lowerMessage.includes('pr') ||
    lowerMessage.includes('implement') ||
    lowerMessage.includes('debug') ||
    lowerMessage.includes('sql') ||
    lowerMessage.includes('database')
  ) {
    return { agent: 'coder', reason: 'Code/development related request' };
  }

  if (
    lowerMessage.includes('search') ||
    lowerMessage.includes('find') ||
    lowerMessage.includes('research') ||
    lowerMessage.includes('what is') ||
    lowerMessage.includes('tell me about') ||
    lowerMessage.includes('news') ||
    lowerMessage.includes('latest')
  ) {
    return { agent: 'researcher', reason: 'Research/search query' };
  }

  if (
    lowerMessage.includes('calendar') ||
    lowerMessage.includes('schedule') ||
    lowerMessage.includes('email') ||
    lowerMessage.includes('meeting') ||
    lowerMessage.includes('appointment') ||
    lowerMessage.includes('gmail') ||
    lowerMessage.includes('drive')
  ) {
    return { agent: 'secretary', reason: 'Calendar/email/productivity task' };
  }

  if (
    lowerMessage.includes('light') ||
    lowerMessage.includes('lamp') ||
    lowerMessage.includes('thermostat') ||
    lowerMessage.includes('temperature') ||
    lowerMessage.includes('turn on') ||
    lowerMessage.includes('turn off') ||
    lowerMessage.includes('home') ||
    lowerMessage.includes('lock') ||
    lowerMessage.includes('door') ||
    lowerMessage.includes('blinds') ||
    lowerMessage.includes('fan') ||
    lowerMessage.includes('hvac') ||
    lowerMessage.includes('scene') ||
    lowerMessage.includes('automation')
  ) {
    return { agent: 'home', reason: 'Smart home control request' };
  }

  return { agent: 'personality', reason: 'General conversation' };
}

/**
 * Get system prompt for agent with context
 */
async function getSystemPrompt(agentType: AgentType, context: EnrichedContext): Promise<string> {
  const contextBlock = buildContextSummary(context);
  const greeting = getGreeting(context.timeOfDay);

  const basePrompts: Record<string, string> = {
    coder: `You are DevBot, an expert software engineer powered by Claude Sonnet 4.5.

Your capabilities:
- **Code Review**: Analyze code for bugs, performance issues, and best practices
- **GitHub Operations**: Search code, manage PRs/issues, access files
- **Supabase Database**: Run SQL queries, inspect schemas, perform vector search
- **Architecture**: Design patterns, refactoring recommendations

Provide clear, well-documented code following best practices.`,

    researcher: `You are ResearchBot, powered by Perplexity Sonar Pro with real-time web search.

Your capabilities:
- **Real-time Web Search**: Access to current web information
- **Fact Verification**: Cross-reference multiple sources
- **News & Current Events**: Latest news and developments
- **Academic Research**: Technical papers and documentation

Always cite your sources. Distinguish between facts and opinions.`,

    secretary: `You are SecretaryBot, a personal secretary with access to Google Workspace.

Your capabilities:
- **Email (Gmail)**: Read, search, send, draft, and manage emails
- **Calendar**: View, create, update, and delete events
- **Drive**: Search and access files in Google Drive

Confirm destructive actions before executing. Provide clear summaries.`,

    personality: `You are Q8, a friendly, witty, and intelligent personal AI assistant.

${greeting}! You're here to help with anything the user needs.

Your style:
- Be conversational and engaging
- Show personality while remaining helpful
- Use humor when appropriate
- Be concise but thorough`,

    orchestrator: `You are Q8, the main orchestrator of a multi-agent AI system.`,
  };

  if (agentType === 'home') {
    const deviceSummary = await buildDeviceSummary();
    return `You are HomeBot, a smart home controller with access to Home Assistant.

${contextBlock}

USE THE TOOLS to execute commands. When asked to control devices:
1. Identify the correct entity_id from the device list
2. Use the appropriate tool (control_device, set_climate, etc.)
3. You can control multiple devices in one request

${deviceSummary}`;
  }

  return `${basePrompts[agentType] || 'You are a helpful AI assistant.'}

${contextBlock}`;
}

/**
 * Extract memories asynchronously (fire and forget)
 */
function extractMemoriesAsync(userId: string, threadId: string, userMessage: string, assistantMessage: string) {
  // Fire and forget - don't await
  fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/memories/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, threadId, userMessage, assistantMessage }),
  }).catch(err => console.warn('[Stream API] Memory extraction failed:', err));
}

/**
 * Generate thread title after 3+ messages if not already set
 */
async function maybeGenerateThreadTitle(threadId: string, messageCount: number) {
  // Only generate title after 3 messages and if not already set
  if (messageCount < 3) return;

  try {
    const { data: thread } = await supabaseAdmin
      .from('threads')
      .select('title')
      .eq('id', threadId)
      .single();

    if (thread?.title) return; // Already has a title

    // Call summarize endpoint
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/threads/${threadId}/summarize`, {
      method: 'POST',
    });
  } catch (err) {
    console.warn('[Stream API] Title generation failed:', err);
  }
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  // Create a TransformStream for streaming
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Process in background
  (async () => {
    try {
      const body = (await request.json()) as StreamRequest;
      const { message, userId, threadId: providedThreadId, userProfile } = body;

      if (!message || !userId) {
        await writer.write(encoder.encode(encodeSSE({ type: 'error', message: 'Message and userId are required' })));
        await writer.close();
        return;
      }

      // Get or create thread
      let threadId: string;
      if (providedThreadId) {
        threadId = providedThreadId;
      } else {
        const { data: newThread, error: threadError } = await supabaseAdmin
          .from('threads')
          .insert({ user_id: userId })
          .select()
          .single();

        if (threadError || !newThread) {
          await writer.write(encoder.encode(encodeSSE({ type: 'error', message: 'Failed to create thread' })));
          await writer.close();
          return;
        }
        threadId = newThread.id;
        await writer.write(encoder.encode(encodeSSE({ type: 'thread_created', threadId })));
      }

      // Fetch relevant memories for context
      let memoryContext = '';
      try {
        const { data: memories } = await supabaseAdmin
          .from('agent_memories')
          .select('content, memory_type, importance')
          .eq('user_id', userId)
          .order('importance', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(10);

        if (memories && memories.length > 0) {
          memoryContext = '\n\n## User Context (from memory)\n' +
            memories.map((m: { content: string; memory_type: string }) => 
              `- [${m.memory_type}] ${m.content}`
            ).join('\n');
        }
      } catch (memError) {
        console.warn('[Stream API] Failed to fetch memories:', memError);
      }

      // Save user message to Supabase
      const userMessageInsert: ChatMessageInsert = {
        thread_id: threadId,
        user_id: userId,
        role: 'user',
        content: message,
      };
      await supabaseAdmin.from('chat_messages').insert(userMessageInsert);

      // Update thread last_message_at
      await supabaseAdmin
        .from('threads')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', threadId);

      // Build enriched context
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

      // Determine routing
      const { agent: targetAgent, reason } = analyzeMessageForRouting(message);

      // Send routing event
      await writer.write(encoder.encode(encodeSSE({ 
        type: 'routing', 
        agent: targetAgent, 
        reason 
      })));

      // Get model config
      const modelConfig = getModel(targetAgent);

      if (!modelConfig.apiKey) {
        await writer.write(encoder.encode(encodeSSE({ 
          type: 'error', 
          message: `API key not configured for ${targetAgent}` 
        })));
        await writer.close();
        return;
      }

      // Build system prompt with memory context
      const baseSystemPrompt = await getSystemPrompt(targetAgent, context);
      const systemPrompt = baseSystemPrompt + memoryContext;

      // Get conversation history from Supabase
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

      // Import OpenAI
      const { OpenAI } = await import('openai');
      const client = new OpenAI({
        apiKey: modelConfig.apiKey,
        baseURL: modelConfig.baseURL,
      });

      // Handle home agent with tools
      if (targetAgent === 'home') {
        await processHomeAgentWithStreaming(
          client,
          modelConfig,
          messages,
          context,
          writer,
          encoder,
          threadId,
          userId,
          message
        );
        return;
      }

      // Standard streaming completion
      const streamResponse = await client.chat.completions.create({
        model: modelConfig.model,
        messages,
        stream: true,
        max_tokens: 1000,
      });

      let fullContent = '';

      for await (const chunk of streamResponse) {
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          fullContent += delta;
          await writer.write(encoder.encode(encodeSSE({ type: 'content', delta })));
        }
      }

      // Save to conversation history (in-memory for backward compat)
      addMessage(sessionId, 'assistant', fullContent, targetAgent);

      // Save assistant message to Supabase
      const assistantMessageInsert: ChatMessageInsert = {
        thread_id: threadId,
        user_id: userId,
        role: 'assistant',
        content: fullContent,
        agent_name: targetAgent,
      };
      await supabaseAdmin.from('chat_messages').insert(assistantMessageInsert);

      // Extract memories from this exchange (async, don't block)
      extractMemoriesAsync(userId, threadId, message, fullContent);

      // Generate thread title if needed (after 3 messages)
      await maybeGenerateThreadTitle(threadId, conversationHistory.length);

      // Send done event
      await writer.write(encoder.encode(encodeSSE({ 
        type: 'done', 
        fullContent, 
        agent: targetAgent,
        threadId
      })));

    } catch (error) {
      console.error('[Stream API] Error:', error);
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

/**
 * Process home agent with tool calling and streaming
 */
async function processHomeAgentWithStreaming(
  client: InstanceType<typeof import('openai').OpenAI>,
  modelConfig: { model: string },
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  context: EnrichedContext,
  writer: WritableStreamDefaultWriter<Uint8Array>,
  encoder: TextEncoder,
  threadId: string,
  userId: string,
  userMessage: string
) {
  // First call to determine tools
  const completion = await client.chat.completions.create({
    model: modelConfig.model,
    messages,
    tools: homeAssistantTools,
    tool_choice: 'auto',
    max_completion_tokens: 1000,
  });

  const assistantMessage = completion.choices[0]?.message;
  const toolCalls = assistantMessage?.tool_calls;

  if (!toolCalls || toolCalls.length === 0) {
    // No tools, just stream the text response
    const content = assistantMessage?.content || 'I need more information about which device to control.';
    
    // Simulate streaming for consistency
    const words = content.split(' ');
    for (const word of words) {
      await writer.write(encoder.encode(encodeSSE({ type: 'content', delta: word + ' ' })));
      await new Promise(resolve => setTimeout(resolve, 30)); // Small delay for effect
    }

    addMessage(context.sessionId, 'assistant', content, 'home');

    // Save to Supabase
    await supabaseAdmin.from('chat_messages').insert({
      thread_id: threadId,
      user_id: userId,
      role: 'assistant',
      content,
      agent_name: 'home',
    });

    extractMemoriesAsync(userId, threadId, userMessage, content);

    await writer.write(encoder.encode(encodeSSE({ type: 'done', fullContent: content, agent: 'home', threadId })));
    await writer.close();
    return;
  }

  // Execute tool calls
  const toolResults: Array<{ 
    tool: string; 
    result: { success: boolean; message: string; data?: unknown } 
  }> = [];

  for (const toolCall of toolCalls) {
    const functionName = toolCall.function.name;
    const functionArgs = JSON.parse(toolCall.function.arguments);

    // Send tool start event
    await writer.write(encoder.encode(encodeSSE({ 
      type: 'tool_start', 
      tool: functionName, 
      args: functionArgs 
    })));

    // Execute tool
    const result = await executeHomeAssistantTool(functionName, functionArgs);
    toolResults.push({ tool: functionName, result });

    // Send tool end event
    await writer.write(encoder.encode(encodeSSE({ 
      type: 'tool_end', 
      tool: functionName, 
      success: result.success,
      result: result.data || result.message
    })));
  }

  // Get natural language summary from LLM
  const followUpMessages = [
    ...messages,
    {
      role: 'assistant' as const,
      content: null,
      tool_calls: toolCalls,
    },
    ...toolCalls.map((tc, i) => ({
      role: 'tool' as const,
      tool_call_id: tc.id,
      content: JSON.stringify(toolResults[i]?.result || { success: false, message: 'Unknown error' }),
    })),
  ];

  const followUpStream = await client.chat.completions.create({
    model: modelConfig.model,
    messages: followUpMessages as Parameters<typeof client.chat.completions.create>[0]['messages'],
    stream: true,
    max_completion_tokens: 500,
  });

  let fullContent = '';

  for await (const chunk of followUpStream) {
    const delta = chunk.choices[0]?.delta?.content || '';
    if (delta) {
      fullContent += delta;
      await writer.write(encoder.encode(encodeSSE({ type: 'content', delta })));
    }
  }

  // Fallback if streaming didn't produce content
  if (!fullContent) {
    const allSucceeded = toolResults.every(r => r.result.success);
    fullContent = allSucceeded 
      ? `Done! ${toolResults.map(r => r.result.message).join('. ')}`
      : `There were some issues: ${toolResults.map(r => r.result.message).join('. ')}`;
    
    await writer.write(encoder.encode(encodeSSE({ type: 'content', delta: fullContent })));
  }

  addMessage(context.sessionId, 'assistant', fullContent, 'home');

  // Save to Supabase
  await supabaseAdmin.from('chat_messages').insert({
    thread_id: threadId,
    user_id: userId,
    role: 'assistant',
    content: fullContent,
    agent_name: 'home',
  });

  extractMemoriesAsync(userId, threadId, userMessage, fullContent);

  await writer.write(encoder.encode(encodeSSE({ type: 'done', fullContent, agent: 'home', threadId })));
  await writer.close();
}
