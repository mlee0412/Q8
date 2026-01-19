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
];

/**
 * Heuristic routing based on keyword matching
 * Used as fallback when LLM routing is slow or unavailable
 */
export function heuristicRoute(message: string): RoutingDecision {
  const lowerMessage = message.toLowerCase();
  const words = lowerMessage.split(/\s+/);

  let bestMatch: { agent: ExtendedAgentType; score: number; capability: AgentCapability } | null = null;

  for (const capability of AGENT_CAPABILITIES) {
    let score = 0;
    const matchedKeywords: string[] = [];

    for (const keyword of capability.keywords) {
      if (keyword.includes(' ')) {
        // Multi-word keyword - check phrase
        if (lowerMessage.includes(keyword)) {
          score += 2;
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

    // Normalize score by keyword count for fair comparison
    const normalizedScore = score / Math.sqrt(capability.keywords.length);

    if (!bestMatch || normalizedScore > bestMatch.score) {
      bestMatch = {
        agent: capability.agent,
        score: normalizedScore,
        capability,
      };
    }
  }

  // Default to personality if no strong match
  if (!bestMatch || bestMatch.score < 0.5) {
    return {
      agent: 'personality',
      confidence: 0.5,
      rationale: 'No specific domain detected, using general assistant',
      source: 'heuristic',
    };
  }

  // Calculate confidence based on score
  const confidence = Math.min(0.95, 0.5 + bestMatch.score * 0.15);

  return {
    agent: bestMatch.agent,
    confidence,
    rationale: `Matched ${bestMatch.capability.name}: ${bestMatch.capability.description}`,
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
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Use a fast model for routing
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a routing classifier. Respond with valid JSON only.' },
        { role: 'user', content: routerPrompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 200,
      temperature: 0.1,
    });

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
 * Tries LLM routing first, falls back to heuristic if needed
 */
export async function route(
  message: string,
  options: {
    policy?: RoutingPolicy;
    forceHeuristic?: boolean;
    timeout?: number;
  } = {}
): Promise<RoutingDecision> {
  const { policy = DEFAULT_ROUTING_POLICY, forceHeuristic = false, timeout = 1000 } = options;

  // Use heuristic only if forced or LLM unavailable
  if (forceHeuristic || !process.env.OPENAI_API_KEY) {
    return heuristicRoute(message);
  }

  // Race LLM routing against timeout
  const llmPromise = llmRoute(message, policy);
  const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeout));

  const result = await Promise.race([llmPromise, timeoutPromise]);

  if (result === null) {
    logger.warn('LLM routing timed out, using heuristic', { timeout });
    const heuristicResult = heuristicRoute(message);
    return {
      ...heuristicResult,
      source: 'fallback',
      rationale: `LLM routing timed out, using heuristic: ${heuristicResult.rationale}`,
    };
  }

  // Check confidence threshold
  if (result.confidence < policy.minLLMConfidence) {
    const heuristicResult = heuristicRoute(message);
    // If heuristic agrees, boost confidence
    if (heuristicResult.agent === result.agent) {
      return {
        ...result,
        confidence: Math.min(1, result.confidence + 0.15),
        rationale: `${result.rationale} (confirmed by heuristic)`,
      };
    }
    // If they disagree and LLM confidence is very low, prefer heuristic
    if (result.confidence < 0.5) {
      return {
        ...heuristicResult,
        source: 'fallback',
        rationale: `LLM confidence too low (${result.confidence}), using heuristic: ${heuristicResult.rationale}`,
      };
    }
  }

  return result;
}
