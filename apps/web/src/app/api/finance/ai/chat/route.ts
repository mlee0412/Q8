import { NextRequest, NextResponse } from 'next/server';
import {
  financeAdvisorConfig,
  executeFinanceAdvisorTool,
  getFinancialContext,
} from '@/lib/agents/sub-agents/finance-advisor';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
} from '@/lib/auth/api-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// Message interface
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * POST /api/finance/ai/chat
 * Handle finance-related chat messages with AI for authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user from session
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }
    const userId = user.id;

    const body = await request.json();
    const { message, conversationHistory = [] } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    // Get financial context for the system prompt
    const financialContext = await getFinancialContext(userId);

    // Build messages array
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `${financeAdvisorConfig.instructions}\n\n${financialContext}`,
      },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      {
        role: 'user',
        content: message,
      },
    ];

    // Call the AI model
    const response = await callFinanceModel(messages, userId);

    // Store the conversation in the database for history
    await storeConversation(userId, message, response.content);

    return NextResponse.json({
      response: response.content,
      toolsUsed: response.toolsUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Finance chat error', { error });
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}

/**
 * Call the finance model with tool support
 */
async function callFinanceModel(
  messages: ChatMessage[],
  userId: string
): Promise<{ content: string; toolsUsed: string[] }> {
  const toolsUsed: string[] = [];

  // Use OpenAI-compatible API (can be routed through LiteLLM)
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_KEY || process.env.OPENAI_API_KEY;
  const baseUrl = process.env.LITELLM_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai';

  if (!apiKey) {
    throw new Error('No AI API key configured');
  }

  // First call to get initial response or tool calls
  let response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gemini-2.0-flash',
      messages,
      tools: financeAdvisorConfig.openaiTools.map((t) => ({
        type: 'function',
        function: t.function,
      })),
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('AI API error', { errorText });
    throw new Error(`AI API error: ${response.status}`);
  }

  let result = await response.json();
  let assistantMessage = result.choices?.[0]?.message;

  // Handle tool calls in a loop (max 5 iterations)
  let iterations = 0;
  const maxIterations = 5;

  while (assistantMessage?.tool_calls && iterations < maxIterations) {
    iterations++;
    const toolCalls = assistantMessage.tool_calls as ToolCall[];

    // Add assistant message with tool calls to messages
    messages.push({
      role: 'assistant',
      content: assistantMessage.content || '',
    });

    // Execute each tool call
    for (const toolCall of toolCalls) {
      const toolName = toolCall.function.name;
      const toolArgs = JSON.parse(toolCall.function.arguments || '{}');

      logger.info('[FinanceChat] Executing tool', { toolName, toolArgs });
      toolsUsed.push(toolName);

      const toolResult = await executeFinanceAdvisorTool(toolName, toolArgs, userId);

      // Add tool result to messages
      messages.push({
        role: 'user', // Tool results are added as user messages in this format
        content: `Tool ${toolName} result: ${JSON.stringify(toolResult)}`,
      });
    }

    // Call the model again with tool results
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gemini-2.0-flash',
        messages,
        tools: financeAdvisorConfig.openaiTools.map((t) => ({
          type: 'function',
          function: t.function,
        })),
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('AI API error on tool loop', { errorText });
      throw new Error(`AI API error: ${response.status}`);
    }

    result = await response.json();
    assistantMessage = result.choices?.[0]?.message;
  }

  return {
    content: assistantMessage?.content || 'I apologize, I was unable to generate a response.',
    toolsUsed,
  };
}

/**
 * Store conversation in the database
 */
async function storeConversation(
  userId: string,
  userMessage: string,
  assistantResponse: string
): Promise<void> {
  try {
    // Check if table exists and insert
    const { error } = await supabase.from('finance_chat_history').insert({
      user_id: userId,
      user_message: userMessage,
      assistant_response: assistantResponse,
      created_at: new Date().toISOString(),
    });

    if (error) {
      // Table might not exist yet, log but don't fail
      logger.warn('Could not store chat history', { message: error.message });
    }
  } catch (err) {
    // Non-critical, just log
    logger.warn('Chat history storage error', { err });
  }
}

/**
 * GET /api/finance/ai/chat
 * Get chat history for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user from session
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }
    const userId = user.id;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    const { data, error } = await supabase
      .from('finance_chat_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Table might not exist
      logger.warn('Could not fetch chat history', { message: error.message });
      return NextResponse.json({ history: [], count: 0 });
    }

    // Transform to conversation format
    const history = (data || []).map((item) => ({
      id: item.id,
      userMessage: item.user_message,
      assistantResponse: item.assistant_response,
      createdAt: item.created_at,
    }));

    return NextResponse.json({
      history,
      count: history.length,
    });
  } catch (error) {
    logger.error('Chat history fetch error', { error });
    return NextResponse.json(
      { error: 'Failed to fetch chat history' },
      { status: 500 }
    );
  }
}
