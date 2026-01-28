/**
 * Intelligent LLM Router
 * Replaces keyword-based routing with LLM + heuristic fallback
 * Priority: task success > latency > cost
 */

import type {
  ExtendedAgentType,
  RoutingDecision,
  AgentCapability,
  RoutingPolicy,
} from './types';
import { DEFAULT_ROUTING_POLICY } from './types';
import { getRoutingMetrics } from './metrics';
import { logger } from '@/lib/logger';
import type { RoutingContext } from './topic-tracker';

/**
 * Agent capability definitions for routing decisions
 */
export const AGENT_CAPABILITIES: AgentCapability[] = [
  {
    agent: 'coder',
    name: 'DevBot',
    description: 'Expert software engineer for coding, debugging, and GitHub operations',
    capabilities: [
      'Code review and analysis',
      'Bug fixing and debugging',
      'GitHub PR and issue management',
      'SQL and database operations',
      'Architecture recommendations',
    ],
    keywords: [
      'code', 'bug', 'debug', 'github', 'pr', 'pull request', 'implement',
      'function', 'class', 'error', 'exception', 'sql', 'database', 'query',
      'api', 'endpoint', 'refactor', 'review', 'commit', 'merge', 'branch',
    ],
    tools: ['github_search_code', 'github_get_pr', 'supabase_query', 'supabase_rpc'],
  },
  {
    agent: 'researcher',
    name: 'ResearchBot',
    description: 'Real-time web search and research with Perplexity',
    capabilities: [
      'Real-time web search',
      'Fact verification',
      'News and current events',
      'Academic research',
      'Documentation lookup',
    ],
    keywords: [
      'search', 'find', 'research', 'what is', 'tell me about', 'news',
      'latest', 'current', 'how does', 'explain', 'define', 'compare',
      'article', 'source', 'reference', 'look up', 'information',
    ],
    tools: ['web_search', 'perplexity_search'],
  },
  {
    agent: 'secretary',
    name: 'SecretaryBot',
    description: 'Personal productivity assistant with Google Workspace access',
    capabilities: [
      'Email management (Gmail)',
      'Calendar scheduling',
      'Google Drive file access',
      'Meeting coordination',
      'Task reminders',
    ],
    keywords: [
      'calendar', 'schedule', 'email', 'meeting', 'appointment', 'gmail',
      'drive', 'remind', 'task', 'event', 'invite', 'reschedule', 'cancel',
      'book', 'agenda', 'availability', 'send email', 'check email',
    ],
    tools: ['gmail_send', 'gmail_search', 'calendar_create', 'calendar_list', 'drive_search'],
  },
  {
    agent: 'home',
    name: 'HomeBot',
    description: 'Smart home controller with Home Assistant integration',
    capabilities: [
      'Light control',
      'Thermostat/HVAC control',
      'Lock management',
      'Scene activation',
      'Device status monitoring',
    ],
    keywords: [
      'light', 'lamp', 'thermostat', 'temperature', 'turn on', 'turn off',
      'lock', 'door', 'blinds', 'fan', 'hvac', 'scene', 'automation',
      'smart home', 'device', 'sensor', 'climate', 'brightness', 'dim',
    ],
    tools: ['control_device', 'set_climate', 'get_devices', 'activate_scene'],
  },
  {
    agent: 'finance',
    name: 'FinanceAdvisor',
    description: 'Personal finance expert with access to financial data',
    capabilities: [
      'Balance sheet analysis',
      'Spending tracking and insights',
      'Bill management',
      'Subscription auditing',
      'Wealth projection',
      'Affordability analysis',
    ],
    keywords: [
      'money', 'finance', 'budget', 'spending', 'expense', 'income', 'save',
      'savings', 'invest', 'investment', 'stock', 'portfolio', 'net worth',
      'account', 'balance', 'transaction', 'bill', 'payment', 'subscription',
      'afford', 'cost', 'price', 'bank', 'credit', 'debt', 'loan', 'wealth',
    ],
    tools: [
      'get_balance_sheet', 'get_spending_summary', 'get_upcoming_bills',
      'find_subscriptions', 'can_i_afford', 'project_wealth',
    ],
  },
  {
    agent: 'personality',
    name: 'Q8',
    description: 'Friendly conversational AI for general chat and assistance',
    capabilities: [
      'General conversation',
      'Creative writing',
      'Brainstorming',
      'Emotional support',
      'Fun interactions',
    ],
    keywords: [
      'hello', 'hi', 'hey', 'thanks', 'thank you', 'how are you', 'joke',
      'story', 'chat', 'talk', 'help', 'advice', 'opinion', 'think',
      'feel', 'recommend', 'suggest', 'idea', 'creative', 'write',
    ],
    tools: [],
  },
  {
    agent: 'imagegen',
    name: 'ImageGen',
    description: 'AI image generation and analysis using Nano Banana (Gemini)',
    capabilities: [
      'Text-to-image generation',
      'Image editing with natural language',
      'Diagram and flowchart creation',
      'Chart and data visualization',
      'Image analysis and description',
      'Multi-image comparison',
    ],
    keywords: [
      // Image generation phrases (multi-word)
      'generate image', 'generate an image', 'generate a image', 'create image',
      'create an image', 'create a image', 'make an image', 'make a image',
      'draw me', 'draw a', 'draw an', 'make me a picture', 'make a picture',
      'create a picture', 'generate a picture', 'create visual', 'create a visual',
      // Diagram/chart phrases
      'create diagram', 'create a diagram', 'make diagram', 'make a diagram',
      'draw diagram', 'create chart', 'create a chart', 'make chart', 'make a chart',
      'pie chart', 'bar chart', 'architecture diagram', 'flowchart', 'mindmap',
      // Analysis phrases
      'analyze image', 'analyze this image', 'describe image', 'describe this image',
      'what is in this image', 'look at this image',
      // Single-word keywords (high signal)
      'visualize', 'illustration', 'infographic', 'mockup', 'sketch', 'render',
      'diagram', 'graph', 'screenshot',
      // Trigger words that strongly suggest image intent
      'image', 'picture', 'photo', 'visual', 'graphic', 'artwork', 'drawing',
    ],
    tools: ['generate_image', 'edit_image', 'create_diagram', 'create_chart', 'analyze_image', 'compare_images'],
  },
];

/**
 * Heuristic routing based on keyword matching
 * Used as fallback when LLM routing is slow or unavailable
 *
 * Scoring system:
 * - Multi-word phrase match: 3 points (high specificity)
 * - Single word match: 1 point
 * - Raw score is used (no normalization that would penalize agents with more keywords)
 * - Threshold of 1 point minimum for any match
 */
export function heuristicRoute(message: string): RoutingDecision {
  const lowerMessage = message.toLowerCase();
  const words = lowerMessage.split(/\s+/);

  let bestMatch: { agent: ExtendedAgentType; score: number; matchedKeywords: string[]; capability: AgentCapability } | null = null;

  for (const capability of AGENT_CAPABILITIES) {
    let score = 0;
    const matchedKeywords: string[] = [];

    for (const keyword of capability.keywords) {
      if (keyword.includes(' ')) {
        // Multi-word keyword - check phrase (high specificity = more points)
        if (lowerMessage.includes(keyword)) {
          score += 3;
          matchedKeywords.push(keyword);
        }
      } else {
        // Single word - check word boundary
        if (words.includes(keyword) || lowerMessage.includes(keyword)) {
          score += 1;
          matchedKeywords.push(keyword);
        }
      }
    }

    // Use raw score - no normalization that would penalize agents with more keywords
    // Instead, we track the number of matched keywords for confidence calculation
    if (!bestMatch || score > bestMatch.score) {
      bestMatch = {
        agent: capability.agent,
        score,
        matchedKeywords,
        capability,
      };
    }
  }

  // Default to personality if no keywords matched at all
  if (!bestMatch || bestMatch.score < 1) {
    return {
      agent: 'personality',
      confidence: 0.5,
      rationale: 'No specific domain detected, using general assistant',
      source: 'heuristic',
    };
  }

  // Calculate confidence based on raw score and number of matched keywords
  // Higher scores and more matched keywords = higher confidence
  const matchRatio = bestMatch.matchedKeywords.length / Math.min(10, bestMatch.capability.keywords.length);
  const scoreBonus = Math.min(0.3, bestMatch.score * 0.05);
  const confidence = Math.min(0.95, 0.5 + matchRatio * 0.3 + scoreBonus);

  logger.debug('Heuristic routing result', {
    agent: bestMatch.agent,
    score: bestMatch.score,
    matchedKeywords: bestMatch.matchedKeywords.slice(0, 5),
    confidence,
  });

  return {
    agent: bestMatch.agent,
    confidence,
    rationale: `Matched ${bestMatch.capability.name}: ${bestMatch.matchedKeywords.slice(0, 3).join(', ')}`,
    fallbackAgent: 'personality',
    toolPlan: bestMatch.capability.tools.slice(0, 3),
    source: 'heuristic',
  };
}

/**
 * LLM-based routing for intelligent agent selection
 */
export async function llmRoute(
  message: string,
  policy: RoutingPolicy = DEFAULT_ROUTING_POLICY
): Promise<RoutingDecision> {
  const startTime = Date.now();

  try {
    // Build agent descriptions for the router
    const agentDescriptions = AGENT_CAPABILITIES.map((cap) => ({
      id: cap.agent,
      name: cap.name,
      description: cap.description,
      capabilities: cap.capabilities,
    }));

    // Get performance metrics for each agent
    const metrics = await getRoutingMetrics();

    const routerPrompt = `You are a routing system for a multi-agent AI assistant. Analyze the user's message and select the best agent.

## Available Agents
${JSON.stringify(agentDescriptions, null, 2)}

## Agent Performance (last 24h)
${JSON.stringify(metrics, null, 2)}

## Routing Policy
- Primary goal: Task SUCCESS (${policy.successWeight * 100}% weight)
- Secondary goal: Low LATENCY (${policy.latencyWeight * 100}% weight)
- Tertiary goal: Low COST (${policy.costWeight * 100}% weight)

## User Message
"${message}"

## Instructions
Select the agent most likely to successfully complete this task. Consider:
1. Which agent's capabilities best match the user's intent?
2. What is the agent's recent success rate?
3. Is this a clear-cut case or ambiguous?

Respond with JSON only:
{
  "agent": "agent_id",
  "confidence": 0.0-1.0,
  "rationale": "brief explanation",
  "fallbackAgent": "agent_id or null",
  "toolPlan": ["tool1", "tool2"] or []
}`;

    const { OpenAI } = await import('openai');

    // Router models - using gpt-4o-mini first (highest rate limits at Tier 1)
    // Tier 1 limits: gpt-4o-mini has ~3500 RPM vs gpt-4 class ~500 RPM
    const routerModels: string[] = ['gpt-4o-mini', 'gpt-3.5-turbo'];
    let completion;
    let lastError: Error | undefined;

    for (let modelIndex = 0; modelIndex < routerModels.length; modelIndex++) {
      const model = routerModels[modelIndex] as string;

      // Create client with SDK's built-in retry (5 retries with exponential backoff)
      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        maxRetries: 5, // SDK handles exponential backoff automatically
        timeout: 30000, // 30 second timeout per request
      });

      try {
        completion = await client.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: 'You are a routing classifier. Respond with valid JSON only.' },
            { role: 'user', content: routerPrompt },
          ],
          response_format: { type: 'json_object' },
          max_tokens: 200,
          temperature: 0.1,
        });
        // Success - break out of model loop
        break;
      } catch (modelError) {
        lastError = modelError instanceof Error ? modelError : new Error(String(modelError));
        logger.warn(`Router model ${model} failed after SDK retries`, {
          error: lastError.message,
          modelIndex,
        });

        // If this is the last model, fall through to heuristic routing
        if (modelIndex === routerModels.length - 1) {
          throw lastError;
        }

        // Brief delay before trying next model
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (!completion) {
      throw new Error('All router models failed');
    }

    const elapsed = Date.now() - startTime;

    // Check if we exceeded latency budget
    if (elapsed > policy.maxLLMRoutingLatency) {
      logger.warn('LLM routing exceeded latency budget', { elapsed, budget: policy.maxLLMRoutingLatency });
    }

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('Empty response from router');
    }

    const parsed = JSON.parse(response) as {
      agent: string;
      confidence: number;
      rationale: string;
      fallbackAgent?: string;
      toolPlan?: string[];
    };

    // Validate agent ID
    const validAgents = AGENT_CAPABILITIES.map((c) => c.agent);
    if (!validAgents.includes(parsed.agent as ExtendedAgentType)) {
      throw new Error(`Invalid agent: ${parsed.agent}`);
    }

    return {
      agent: parsed.agent as ExtendedAgentType,
      confidence: parsed.confidence,
      rationale: parsed.rationale,
      fallbackAgent: parsed.fallbackAgent as ExtendedAgentType | undefined,
      toolPlan: parsed.toolPlan,
      source: 'llm',
      performanceContext: metrics[parsed.agent as ExtendedAgentType],
    };
  } catch (error) {
    logger.error('LLM routing failed', { message, error });
    // Fall back to heuristic routing
    const heuristicResult = heuristicRoute(message);
    return {
      ...heuristicResult,
      source: 'fallback',
      rationale: `LLM routing failed, using heuristic: ${heuristicResult.rationale}`,
    };
  }
}

/**
 * Unified routing function
 *
 * Routing priority:
 * 1. Topic context bias (if continuing same topic)
 * 2. Vector routing (semantic similarity) - fastest, most accurate for known patterns
 * 3. LLM routing (with timeout) - handles novel queries
 * 4. Heuristic routing (keyword matching) - fallback
 */
export async function route(
  message: string,
  options: {
    policy?: RoutingPolicy;
    forceHeuristic?: boolean;
    enableVector?: boolean;
    timeout?: number;
    routingContext?: RoutingContext;
  } = {}
): Promise<RoutingDecision> {
  const {
    policy = DEFAULT_ROUTING_POLICY,
    forceHeuristic = false,
    enableVector = true,
    timeout = 1000,
    routingContext,
  } = options;

  // Use heuristic only if forced or no API key
  if (forceHeuristic || !process.env.OPENAI_API_KEY) {
    return applyTopicBias(heuristicRoute(message), routingContext);
  }

  // 0. Check topic context for strong continuation signal
  if (routingContext?.topicSwitch && !routingContext.topicSwitch.isSwitch) {
    const { suggestedAgent, confidence, reason } = routingContext.topicSwitch;

    // If high confidence continuation and suggested agent is not personality
    if (suggestedAgent && suggestedAgent !== 'personality' && confidence >= 0.6) {
      logger.info('Topic continuation detected, biasing toward previous agent', {
        suggestedAgent,
        confidence,
        reason,
      });

      // Still run heuristic to validate
      const heuristicResult = heuristicRoute(message);

      // If heuristic agrees or is ambiguous, use topic suggestion
      if (heuristicResult.agent === suggestedAgent || heuristicResult.confidence < 0.7) {
        return {
          agent: suggestedAgent,
          confidence: Math.min(0.95, confidence + 0.1),
          rationale: `Topic continuation: ${reason}`,
          fallbackAgent: heuristicResult.agent !== suggestedAgent ? heuristicResult.agent : 'personality',
          source: 'heuristic',
        };
      }
    }
  }

  // 1. Try vector routing first (fast semantic search)
  if (enableVector) {
    try {
      const { vectorRoute } = await import('./vector-router');
      const vectorPromise = vectorRoute(message);
      const vectorTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 500));

      const vectorResult = await Promise.race([vectorPromise, vectorTimeout]);

      if (vectorResult && vectorResult.confidence >= 0.7) {
        logger.info('Vector routing succeeded', {
          agent: vectorResult.agent,
          confidence: vectorResult.confidence,
        });
        return applyTopicBias(vectorResult, routingContext);
      }
    } catch (error) {
      logger.warn('Vector routing failed, trying LLM', { error });
    }
  }

  // 2. Try LLM routing (with timeout)
  const llmPromise = llmRoute(message, policy);
  const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeout));

  const result = await Promise.race([llmPromise, timeoutPromise]);

  if (result === null) {
    logger.warn('LLM routing timed out, using heuristic', { timeout });
    const heuristicResult = heuristicRoute(message);
    return applyTopicBias({
      ...heuristicResult,
      source: 'fallback',
      rationale: `LLM routing timed out, using heuristic: ${heuristicResult.rationale}`,
    }, routingContext);
  }

  // Check confidence threshold
  if (result.confidence < policy.minLLMConfidence) {
    const heuristicResult = heuristicRoute(message);
    // If heuristic agrees, boost confidence
    if (heuristicResult.agent === result.agent) {
      return applyTopicBias({
        ...result,
        confidence: Math.min(1, result.confidence + 0.15),
        rationale: `${result.rationale} (confirmed by heuristic)`,
      }, routingContext);
    }
    // If they disagree and LLM confidence is very low, prefer heuristic
    if (result.confidence < 0.5) {
      return applyTopicBias({
        ...heuristicResult,
        source: 'fallback',
        rationale: `LLM confidence too low (${result.confidence}), using heuristic: ${heuristicResult.rationale}`,
      }, routingContext);
    }
  }

  return applyTopicBias(result, routingContext);
}

/**
 * Apply topic context bias to routing decision
 * Adjusts confidence based on topic continuity
 */
function applyTopicBias(
  decision: RoutingDecision,
  routingContext?: RoutingContext
): RoutingDecision {
  if (!routingContext?.topicContext) {
    return decision;
  }

  const { topicContext, topicSwitch } = routingContext;

  // If continuing same agent, boost confidence slightly
  if (!topicSwitch.isSwitch && decision.agent === topicContext.lastAgent) {
    return {
      ...decision,
      confidence: Math.min(0.98, decision.confidence + 0.05),
      rationale: `${decision.rationale} (topic continuity boost)`,
    };
  }

  // If switching topics, note it in rationale
  if (topicSwitch.isSwitch) {
    return {
      ...decision,
      rationale: `${decision.rationale} (topic switch from ${topicContext.currentTopic})`,
    };
  }

  return decision;
}
