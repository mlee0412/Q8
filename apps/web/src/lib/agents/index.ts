/**
 * Orchestrator Agent
 * The main router that delegates to specialized sub-agents
 * Powered by GPT-5.1
 */

import { getModel, type AgentType } from './model_factory';
import { initializeCoderAgent } from './sub-agents/coder';
import { initializeResearcherAgent } from './sub-agents/researcher';
import { initializeSecretaryAgent } from './sub-agents/secretary';
import { initializePersonalityAgent } from './sub-agents/personality';
import { initializeHomeAgent } from './sub-agents/home';
import { addMessage, getConversationHistory } from './conversation-store';
import { buildDeviceSummary } from './home-context';
import { homeAssistantTools, executeHomeAssistantTool } from './home-tools';
import type { AgentContext, AgentMessage, AgentResponse, EnrichedContext } from './types';
import { buildContextSummary, getGreeting } from './context-provider';
import { buildMemoryContext, addConversationEntry } from '@/lib/memory';

export const orchestratorConfig = {
  name: 'Q8',
  model: getModel('orchestrator'),
  instructions: `You are Q8, a hyper-intelligent personal assistant.

Your Goal: Route user requests to the specialist best suited for the task.

Routing Rules:
- Coding/GitHub/Supabase → Transfer to Dev Agent (Claude Sonnet 4.5)
- Search/Facts/Research → Transfer to Research Agent (Perplexity Sonar Pro)
- Email/Calendar/Docs → Transfer to Secretary (Gemini 3.0 Pro)
- Home Control/IoT → Transfer to Home Agent
- Casual Chat/Creative → Transfer to Personality Agent (Grok 4.1)

Always maintain the persona of a helpful, witty assistant.
When a sub-agent returns an answer, synthesize it and speak it back naturally.
You are the user's single point of contact - they should feel like they're talking to one unified intelligence.`,
};

export async function initializeOrchestrator() {
  // Initialize all sub-agents
  const coderAgent = await initializeCoderAgent();
  const researcherAgent = await initializeResearcherAgent();
  const secretaryAgent = await initializeSecretaryAgent();
  const personalityAgent = await initializePersonalityAgent();
  const homeAgent = await initializeHomeAgent();

  return {
    ...orchestratorConfig,
    subAgents: {
      coder: coderAgent,
      researcher: researcherAgent,
      secretary: secretaryAgent,
      personality: personalityAgent,
      home: homeAgent,
    },
  };
}

/**
 * Process a message through the orchestrator
 * This is the main entry point for the agent swarm
 * Accepts both basic AgentContext and EnrichedContext
 */
export async function processMessage(
  message: AgentMessage,
  context: AgentContext | EnrichedContext
): Promise<AgentResponse> {
  try {
    // Add user message to conversation history
    addMessage(context.sessionId, 'user', message.content);

    // Add to memory system
    addConversationEntry(context.sessionId, context.userId, {
      role: 'user',
      content: message.content,
    });

    // Check if this is enriched context
    const isEnriched = 'location' in context && typeof context.location === 'object' && 'address' in context.location;

    // Analyze message to determine routing
    const routingDecision = analyzeMessageForRouting(message.content);

    // Determine which agent to use
    let targetAgent: AgentType = 'personality';
    if (routingDecision.includes('code') || routingDecision.includes('github')) {
      targetAgent = 'coder';
    } else if (routingDecision.includes('search') || routingDecision.includes('research')) {
      targetAgent = 'researcher';
    } else if (routingDecision.includes('calendar') || routingDecision.includes('email')) {
      targetAgent = 'secretary';
    } else if (routingDecision.includes('home')) {
      targetAgent = 'home';
    }

    // Get model configuration for the selected agent
    const modelConfig = getModel(targetAgent);

    // Check if API key is available
    if (!modelConfig.apiKey) {
      return {
        content: `⚠️ API key not configured for ${targetAgent}. Please add the required environment variable to use this agent.`,
        agent: targetAgent,
        metadata: {
          timestamp: new Date().toISOString(),
          context,
          routingDecision,
          error: 'Missing API key',
        },
      };
    }

    // Make actual LLM API call
    const { OpenAI } = await import('openai');
    const client = new OpenAI({
      apiKey: modelConfig.apiKey,
      baseURL: modelConfig.baseURL,
    });

    // OpenAI reasoning models (GPT-5.1, o1, o3, etc.) don't support:
    // - temperature, top_p, presence_penalty, frequency_penalty
    // - max_tokens (must use max_completion_tokens)
    // See: https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/reasoning
    const isOpenAIReasoningModel = !modelConfig.baseURL || modelConfig.baseURL.includes('openai.com');

    // Build system prompt with context
    const systemPrompt = await getSystemPromptForAgent(targetAgent, context as EnrichedContext);

    // Get conversation history for context
    const conversationHistory = getConversationHistory(context.sessionId);

    // Build messages array with history
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
    ];

    // For home agent, use function calling to execute actions
    if (targetAgent === 'home') {
      return await processHomeAgentRequest(client, modelConfig, messages, context, routingDecision);
    }

    // Standard completion for other agents
    const completion = await client.chat.completions.create({
      model: modelConfig.model,
      messages,
      ...(isOpenAIReasoningModel
        ? { max_completion_tokens: 1000 }
        : { max_tokens: 1000, temperature: 0.7 }),
    });

    const responseContent = completion.choices[0]?.message?.content ||
      'Sorry, I received an empty response. Please try again.';

    // Add assistant response to conversation history
    addMessage(context.sessionId, 'assistant', responseContent, targetAgent);

    return {
      content: responseContent,
      agent: targetAgent,
      metadata: {
        timestamp: new Date().toISOString(),
        context,
        routingDecision,
        model: modelConfig.model,
      },
    };
  } catch (error) {
    console.error('Agent orchestration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      content: `Sorry, I encountered an error: ${errorMessage}. Please check your API keys and try again.`,
      agent: 'orchestrator',
      metadata: {
        timestamp: new Date().toISOString(),
        context,
        error: errorMessage,
      },
    };
  }
}

/**
 * Process home agent requests with function calling
 * Executes actual Home Assistant commands
 */
async function processHomeAgentRequest(
  client: InstanceType<typeof import('openai').OpenAI>,
  modelConfig: { model: string; baseURL?: string; apiKey?: string },
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  context: AgentContext | EnrichedContext,
  routingDecision: string
): Promise<AgentResponse> {
  // First call: Let LLM decide which tools to use
  const completion = await client.chat.completions.create({
    model: modelConfig.model,
    messages,
    tools: homeAssistantTools,
    tool_choice: 'auto',
    max_completion_tokens: 1000,
  });

  const assistantMessage = completion.choices[0]?.message;
  const toolCalls = assistantMessage?.tool_calls;

  // If no tool calls, just return the text response
  if (!toolCalls || toolCalls.length === 0) {
    const responseContent = assistantMessage?.content || 
      'I understand your request, but I need more specific information about which device to control.';
    
    addMessage(context.sessionId, 'assistant', responseContent, 'home');
    
    return {
      content: responseContent,
      agent: 'home',
      metadata: {
        timestamp: new Date().toISOString(),
        context,
        routingDecision,
        model: modelConfig.model,
      },
    };
  }

  // Execute all tool calls
  const toolResults: Array<{ tool: string; result: { success: boolean; message: string; data?: unknown } }> = [];
  
  for (const toolCall of toolCalls) {
    const functionName = toolCall.function.name;
    const functionArgs = JSON.parse(toolCall.function.arguments);

    const result = await executeHomeAssistantTool(functionName, functionArgs);
    toolResults.push({ tool: functionName, result });
  }

  // Build a response summarizing what was done
  const allSucceeded = toolResults.every(r => r.result.success);
  const summaryParts = toolResults.map(r => r.result.message);
  
  // Second call: Ask LLM to summarize the results naturally
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

  const followUpCompletion = await client.chat.completions.create({
    model: modelConfig.model,
    messages: followUpMessages as Parameters<typeof client.chat.completions.create>[0]['messages'],
    max_completion_tokens: 500,
  });

  const finalResponse = followUpCompletion.choices[0]?.message?.content ||
    (allSucceeded 
      ? `Done! ${summaryParts.join('. ')}`
      : `There were some issues: ${summaryParts.join('. ')}`);

  // Add to conversation history
  addMessage(context.sessionId, 'assistant', finalResponse, 'home');

  return {
    content: finalResponse,
    agent: 'home',
    metadata: {
      timestamp: new Date().toISOString(),
      context,
      routingDecision,
      model: modelConfig.model,
      toolsExecuted: toolResults.map(r => ({ tool: r.tool, success: r.result.success })),
    },
  };
}

/**
 * Get system prompt for each agent type
 * Now async to support fetching dynamic context (e.g., HA devices, memory)
 */
async function getSystemPromptForAgent(agentType: AgentType, context?: EnrichedContext): Promise<string> {
  // Build context summary if enriched context is available
  const contextBlock = context ? buildContextSummary(context) : '';
  const greeting = context ? getGreeting(context.timeOfDay) : 'Hello';
  
  // Build memory context if we have user/session info
  const memoryBlock = context ? buildMemoryContext(context.userId, context.sessionId) : '';
  
  const basePrompts: Record<string, string> = {
    coder: `You are DevBot, an expert software engineer powered by Claude Sonnet 4.5.

Your capabilities:
- **Code Review**: Analyze code for bugs, performance issues, and best practices
- **GitHub Operations**: Search code, manage PRs/issues, access files
- **Supabase Database**: Run SQL queries, inspect schemas, perform vector search
- **Architecture**: Design patterns, refactoring recommendations

Provide clear, well-documented code following best practices.
Consider security implications, especially for database operations.`,

    researcher: `You are ResearchBot, a research specialist powered by Perplexity Sonar Pro with real-time web search.

Your capabilities:
- **Real-time Web Search**: Access to current web information
- **Fact Verification**: Cross-reference multiple sources
- **News & Current Events**: Latest news and developments
- **Academic Research**: Technical papers and documentation

Always cite your sources. Distinguish between facts and opinions clearly.`,

    secretary: `You are SecretaryBot, a personal secretary with access to Google Workspace.

Your capabilities:
- **Email (Gmail)**: Read, search, send, draft, and manage emails
- **Calendar**: View, create, update, and delete events
- **Drive**: Search and access files in Google Drive
- **Time Management**: Help with scheduling and organization

Confirm destructive actions before executing. Provide clear summaries.`,

    personality: `You are Q8, a friendly, witty, and intelligent personal AI assistant.

${greeting}! You're here to help with anything the user needs.

Your style:
- Be conversational and engaging
- Show personality while remaining helpful
- Use humor when appropriate
- Be concise but thorough

You have awareness of the current time, location, and conditions to provide contextually relevant responses.`,

    orchestrator: `You are Q8, the main orchestrator of a multi-agent AI system.

Route requests to the appropriate specialist:
- Code/GitHub/Database → DevBot (Claude)
- Search/Research/Facts → ResearchBot (Perplexity)
- Email/Calendar/Docs → SecretaryBot (Gemini)
- Home Control/IoT → HomeBot
- Casual Chat → Personality Agent (Grok)

Synthesize responses naturally - users should feel like they're talking to one unified intelligence.`,
  };

  // Special handling for home agent with device context
  if (agentType === 'home') {
    const deviceSummary = await buildDeviceSummary();
    return `You are HomeBot, a smart home controller with access to Home Assistant.

${contextBlock}

You have tools to control the user's smart home. USE THE TOOLS to execute commands - don't just describe what you would do.

When asked to control devices:
1. Identify the correct entity_id from the device list below
2. Use the appropriate tool (control_device, set_climate, activate_scene, etc.)
3. You can control multiple devices in one request
4. For ambiguous requests, ask for clarification before acting

Available tools:
- control_device: Turn on/off/toggle lights, switches, fans
- set_climate: Set thermostat temperature and mode
- activate_scene: Activate a scene
- control_media: Play/pause/volume for media players
- control_cover: Open/close blinds and covers
- control_lock: Lock/unlock doors
- get_device_state: Check current state of any device

${deviceSummary}

Remember: You have full context of the conversation. Refer back to previous messages when relevant.`;
  }

  const basePrompt = basePrompts[agentType] || 'You are a helpful AI assistant.';
  
  // Inject context into the prompt if available
  // Combine all context blocks
  const contextParts = [basePrompt];
  if (contextBlock) contextParts.push(contextBlock);
  if (memoryBlock) contextParts.push(memoryBlock);
  
  return contextParts.join('\n\n');
}

/**
 * Simple keyword-based routing analysis
 * Can be enhanced with LLM-based classification later
 */
function analyzeMessageForRouting(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes('code') ||
    lowerMessage.includes('bug') ||
    lowerMessage.includes('github') ||
    lowerMessage.includes('pr') ||
    lowerMessage.includes('implement')
  ) {
    return 'code';
  }

  if (
    lowerMessage.includes('search') ||
    lowerMessage.includes('find') ||
    lowerMessage.includes('research') ||
    lowerMessage.includes('what is') ||
    lowerMessage.includes('tell me about')
  ) {
    return 'search';
  }

  if (
    lowerMessage.includes('calendar') ||
    lowerMessage.includes('schedule') ||
    lowerMessage.includes('email') ||
    lowerMessage.includes('meeting')
  ) {
    return 'calendar';
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
    return 'home';
  }

  return 'chat';
}

export * from './types';
export * from './model_factory';
