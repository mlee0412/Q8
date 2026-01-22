/**
 * Speculative Parallel Router
 * Queries multiple agents simultaneously for complex/ambiguous requests
 * Returns the best response based on quality scoring
 *
 * Benefits:
 * - Reduced latency for multi-agent scenarios
 * - Better response quality through competition
 * - Automatic fallback handling
 * - Cross-agent validation for accuracy
 */

import OpenAI from 'openai';
import { getModel, type AgentType } from '../model_factory';
import { logger } from '@/lib/logger';
import type { ExtendedAgentType, RoutingDecision } from './types';
import { AGENT_CAPABILITIES } from './router';

// =============================================================================
// TYPES
// =============================================================================

export interface SpeculativeResult {
  agent: ExtendedAgentType;
  response: string;
  latency: number;
  confidence: number;
  quality: number;
  success: boolean;
  error?: string;
}

export interface SpeculativeConfig {
  maxParallelAgents: number;
  timeoutMs: number;
  minConfidenceToRun: number;
  qualityThreshold: number;
  enableCrossValidation: boolean;
}

export interface SpeculativeResponse {
  bestResult: SpeculativeResult;
  allResults: SpeculativeResult[];
  crossValidated: boolean;
  consensusScore: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_CONFIG: SpeculativeConfig = {
  maxParallelAgents: 3,
  timeoutMs: 15000,
  minConfidenceToRun: 0.3,
  qualityThreshold: 0.7,
  enableCrossValidation: true,
};

// Agent pairs that can validate each other
const VALIDATION_PAIRS: Record<ExtendedAgentType, ExtendedAgentType[]> = {
  coder: ['researcher'],
  researcher: ['coder', 'personality'],
  secretary: ['personality'],
  home: ['personality'],
  finance: ['researcher'],
  personality: ['researcher'],
  imagegen: ['personality'],
  orchestrator: [],
};

// =============================================================================
// QUALITY SCORING
// =============================================================================

/**
 * Score response quality based on multiple factors
 */
export function scoreResponseQuality(
  response: string,
  query: string,
  agent: ExtendedAgentType
): number {
  let score = 0.5; // Base score

  // Length appropriateness (not too short, not too long)
  const wordCount = response.split(/\s+/).length;
  if (wordCount >= 20 && wordCount <= 500) {
    score += 0.1;
  } else if (wordCount < 10) {
    score -= 0.2;
  }

  // Relevance - check if response contains query keywords
  const queryKeywords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const responseWords = response.toLowerCase();
  const keywordMatches = queryKeywords.filter((kw) => responseWords.includes(kw)).length;
  const keywordScore = queryKeywords.length > 0 ? keywordMatches / queryKeywords.length : 0;
  score += keywordScore * 0.15;

  // Completeness - check for sentence endings
  const sentences = response.match(/[.!?]/g)?.length || 0;
  if (sentences >= 1) {
    score += 0.1;
  }

  // Agent-specific quality checks
  const agentCapability = AGENT_CAPABILITIES.find((c) => c.agent === agent);
  if (agentCapability) {
    // Check if response uses expected terminology
    const capabilityKeywords = agentCapability.capabilities.join(' ').toLowerCase();
    const usesAgentTerminology = capabilityKeywords.split(/\s+/).some((term) =>
      term.length > 4 && responseWords.includes(term)
    );
    if (usesAgentTerminology) {
      score += 0.1;
    }
  }

  // Penalize generic/unhelpful responses
  const genericPhrases = [
    "i don't know",
    "i'm not sure",
    "i cannot",
    "i'm unable",
    "as an ai",
    "i don't have access",
  ];
  if (genericPhrases.some((phrase) => responseWords.includes(phrase))) {
    score -= 0.2;
  }

  // Bonus for structured responses (lists, code blocks)
  if (response.includes('- ') || response.includes('1.') || response.includes('```')) {
    score += 0.05;
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Calculate consensus score among multiple responses
 */
export function calculateConsensus(results: SpeculativeResult[]): number {
  if (results.length < 2) return 1.0;

  const successfulResults = results.filter((r) => r.success);
  if (successfulResults.length < 2) return 0.5;

  // Simple semantic similarity via keyword overlap
  const keywordSets = successfulResults.map((r) => {
    return new Set(
      r.response
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 4)
    );
  });

  let totalOverlap = 0;
  let comparisons = 0;

  for (let i = 0; i < keywordSets.length; i++) {
    for (let j = i + 1; j < keywordSets.length; j++) {
      const setA = keywordSets[i];
      const setB = keywordSets[j];
      if (!setA || !setB) continue;

      const intersection = new Set([...setA].filter((x) => setB.has(x)));
      const union = new Set([...setA, ...setB]);
      const jaccard = union.size > 0 ? intersection.size / union.size : 0;
      totalOverlap += jaccard;
      comparisons++;
    }
  }

  return comparisons > 0 ? totalOverlap / comparisons : 0.5;
}

// =============================================================================
// SPECULATIVE ROUTER
// =============================================================================

export class SpeculativeRouter {
  private config: SpeculativeConfig;

  constructor(config: Partial<SpeculativeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Determine which agents to query speculatively
   */
  selectAgentsForQuery(
    routingDecisions: Array<{ agent: ExtendedAgentType; confidence: number }>
  ): ExtendedAgentType[] {
    // Filter by minimum confidence
    const eligible = routingDecisions.filter(
      (d) => d.confidence >= this.config.minConfidenceToRun
    );

    // Sort by confidence and take top N
    return eligible
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this.config.maxParallelAgents)
      .map((d) => d.agent);
  }

  /**
   * Query a single agent with timeout
   */
  private async queryAgent(
    agent: ExtendedAgentType,
    message: string,
    systemPrompt: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<SpeculativeResult> {
    const startTime = Date.now();

    try {
      const modelConfig = getModel(agent);

      // Create OpenAI client with agent-specific config
      const client = new OpenAI({
        apiKey: modelConfig.apiKey || process.env.OPENAI_API_KEY,
        baseURL: modelConfig.baseURL,
      });

      const response = await Promise.race([
        client.chat.completions.create({
          model: modelConfig.model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversationHistory.slice(-6),
            { role: 'user', content: message },
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), this.config.timeoutMs)
        ),
      ]);

      const content = response.choices[0]?.message?.content || '';
      const latency = Date.now() - startTime;
      const quality = scoreResponseQuality(content, message, agent);

      return {
        agent,
        response: content,
        latency,
        confidence: quality,
        quality,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('Speculative query failed', { agent, error: errorMessage });

      return {
        agent,
        response: '',
        latency: Date.now() - startTime,
        confidence: 0,
        quality: 0,
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Query multiple agents in parallel
   */
  async queryParallel(
    agents: ExtendedAgentType[],
    message: string,
    systemPrompts: Map<ExtendedAgentType, string>,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<SpeculativeResponse> {
    logger.info('Starting speculative routing', { agents, message: message.slice(0, 50) });

    // Query all agents in parallel
    const results = await Promise.all(
      agents.map((agent) =>
        this.queryAgent(
          agent,
          message,
          systemPrompts.get(agent) || '',
          conversationHistory
        )
      )
    );

    // Filter successful results
    const successfulResults = results.filter((r) => r.success && r.quality >= this.config.qualityThreshold);

    if (successfulResults.length === 0) {
      // All failed or below threshold - return best attempt
      const bestAttempt = results.sort((a, b) => b.quality - a.quality)[0];
      return {
        bestResult: bestAttempt || {
          agent: agents[0] || 'personality',
          response: 'I apologize, but I encountered an issue processing your request.',
          latency: 0,
          confidence: 0,
          quality: 0,
          success: false,
        },
        allResults: results,
        crossValidated: false,
        consensusScore: 0,
      };
    }

    // Calculate consensus
    const consensusScore = calculateConsensus(successfulResults);

    // Select best result
    const bestResult = successfulResults.sort((a, b) => {
      // Weight: 60% quality, 30% latency (inverse), 10% confidence
      const scoreA = a.quality * 0.6 + (1 - a.latency / this.config.timeoutMs) * 0.3 + a.confidence * 0.1;
      const scoreB = b.quality * 0.6 + (1 - b.latency / this.config.timeoutMs) * 0.3 + b.confidence * 0.1;
      return scoreB - scoreA;
    })[0]!;

    logger.info('Speculative routing complete', {
      bestAgent: bestResult.agent,
      quality: bestResult.quality.toFixed(2),
      latency: bestResult.latency,
      consensus: consensusScore.toFixed(2),
    });

    return {
      bestResult,
      allResults: results,
      crossValidated: successfulResults.length > 1 && consensusScore > 0.5,
      consensusScore,
    };
  }

  /**
   * Determine if speculative routing should be used
   */
  shouldUseSpeculative(routingDecision: RoutingDecision): boolean {
    // Use speculative routing when:
    // 1. Confidence is medium (not clearly one agent)
    if (routingDecision.confidence >= 0.4 && routingDecision.confidence <= 0.8) {
      return true;
    }

    // 2. Query is complex (multiple potential agents)
    if (routingDecision.fallbackAgent && routingDecision.fallbackAgent !== routingDecision.agent) {
      return true;
    }

    // 3. Source is heuristic (less reliable)
    if (routingDecision.source === 'heuristic') {
      return true;
    }

    return false;
  }
}

// =============================================================================
// SINGLETON & UTILITIES
// =============================================================================

let routerInstance: SpeculativeRouter | null = null;

export function getSpeculativeRouter(): SpeculativeRouter {
  if (!routerInstance) {
    routerInstance = new SpeculativeRouter();
  }
  return routerInstance;
}

/**
 * Quick speculative query
 */
export async function speculativeQuery(
  agents: ExtendedAgentType[],
  message: string,
  systemPrompts: Map<ExtendedAgentType, string>,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<SpeculativeResponse> {
  return getSpeculativeRouter().queryParallel(agents, message, systemPrompts, history);
}
