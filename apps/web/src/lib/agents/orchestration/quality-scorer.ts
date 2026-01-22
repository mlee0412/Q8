/**
 * Response Quality Scorer & Feedback Loop
 * Tracks response quality and enables continuous improvement
 *
 * Features:
 * - Multi-dimensional quality scoring
 * - Implicit feedback detection (regenerations, follow-ups, sentiment)
 * - Agent performance tracking
 * - Quality trend analysis
 * - Automatic threshold adjustment
 */

import { supabaseAdmin } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { ExtendedAgentType } from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface QualityScore {
  overall: number; // 0-1
  dimensions: {
    relevance: number;
    completeness: number;
    clarity: number;
    accuracy: number;
    helpfulness: number;
  };
  flags: {
    containsCode: boolean;
    containsCitations: boolean;
    isStructured: boolean;
    isActionable: boolean;
  };
}

export interface FeedbackSignal {
  type: 'explicit' | 'implicit';
  signal: 'positive' | 'negative' | 'neutral';
  source: 'thumbs' | 'regenerate' | 'followup' | 'abandon' | 'sentiment';
  strength: number; // 0-1
  timestamp: number;
}

export interface AgentQualityMetrics {
  agent: ExtendedAgentType;
  avgQuality: number;
  responseCount: number;
  positiveFeedback: number;
  negativeFeedback: number;
  regenerationRate: number;
  avgLatency: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface QualityConfig {
  minScoreForCache: number;
  regenerationPenalty: number;
  positiveFeedbackBoost: number;
  decayFactor: number;
  trendWindow: number; // days
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_CONFIG: QualityConfig = {
  minScoreForCache: 0.7,
  regenerationPenalty: 0.15,
  positiveFeedbackBoost: 0.1,
  decayFactor: 0.95,
  trendWindow: 7,
};

// Patterns for quality detection
const QUALITY_PATTERNS = {
  actionable: /\b(click|open|run|execute|install|create|update|delete|visit|try)\b/i,
  structured: /^(\d+\.|[-*])\s/m,
  citation: /\[[\d\w]+\]|\(\d{4}\)|https?:\/\//,
  code: /```|`[^`]+`/,
  hedging: /\b(maybe|perhaps|might|possibly|I think|not sure)\b/i,
  confident: /\b(definitely|certainly|absolutely|clearly|obviously)\b/i,
};

// =============================================================================
// QUALITY SCORER
// =============================================================================

export class QualityScorer {
  private config: QualityConfig;

  constructor(config: Partial<QualityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Score response relevance to query
   */
  private scoreRelevance(response: string, query: string): number {
    const queryWords = new Set(
      query.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
    );
    const responseWords = response.toLowerCase();

    let matchCount = 0;
    for (const word of queryWords) {
      if (responseWords.includes(word)) matchCount++;
    }

    return queryWords.size > 0 ? Math.min(1, matchCount / queryWords.size + 0.3) : 0.5;
  }

  /**
   * Score response completeness
   */
  private scoreCompleteness(response: string, query: string): number {
    let score = 0.5;

    // Has proper ending
    if (/[.!?]\s*$/.test(response)) score += 0.15;

    // Reasonable length
    const words = response.split(/\s+/).length;
    if (words >= 20 && words <= 500) score += 0.15;
    else if (words < 10) score -= 0.2;

    // Answers questions
    if (query.includes('?') && !response.includes('?')) score += 0.1;

    // Contains examples or details
    if (response.includes('for example') || response.includes('such as')) score += 0.1;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Score response clarity
   */
  private scoreClarity(response: string): number {
    let score = 0.6;

    // Penalize hedging language
    const hedgingMatches = response.match(QUALITY_PATTERNS.hedging);
    if (hedgingMatches) score -= hedgingMatches.length * 0.05;

    // Reward confident language
    if (QUALITY_PATTERNS.confident.test(response)) score += 0.1;

    // Reward structured responses
    if (QUALITY_PATTERNS.structured.test(response)) score += 0.1;

    // Penalize very long sentences
    const sentences = response.split(/[.!?]+/);
    const avgSentenceLength = response.length / (sentences.length || 1);
    if (avgSentenceLength > 200) score -= 0.1;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Score helpfulness
   */
  private scoreHelpfulness(response: string): number {
    let score = 0.5;

    // Actionable content
    if (QUALITY_PATTERNS.actionable.test(response)) score += 0.15;

    // Code snippets for technical queries
    if (QUALITY_PATTERNS.code.test(response)) score += 0.1;

    // Citations/sources
    if (QUALITY_PATTERNS.citation.test(response)) score += 0.1;

    // Multiple points/steps
    const listItems = (response.match(/^[\s]*[-*•]\s+/gm) || []).length;
    if (listItems >= 2) score += 0.1;

    // Penalize refusals
    if (/I (can't|cannot|won't|am unable)/i.test(response)) score -= 0.2;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate overall quality score
   */
  score(response: string, query: string): QualityScore {
    const relevance = this.scoreRelevance(response, query);
    const completeness = this.scoreCompleteness(response, query);
    const clarity = this.scoreClarity(response);
    const helpfulness = this.scoreHelpfulness(response);

    // Accuracy is harder to measure without ground truth - use proxy
    const accuracy = (relevance + completeness) / 2;

    const overall =
      relevance * 0.25 +
      completeness * 0.2 +
      clarity * 0.15 +
      accuracy * 0.2 +
      helpfulness * 0.2;

    return {
      overall,
      dimensions: {
        relevance,
        completeness,
        clarity,
        accuracy,
        helpfulness,
      },
      flags: {
        containsCode: QUALITY_PATTERNS.code.test(response),
        containsCitations: QUALITY_PATTERNS.citation.test(response),
        isStructured: QUALITY_PATTERNS.structured.test(response),
        isActionable: QUALITY_PATTERNS.actionable.test(response),
      },
    };
  }

  /**
   * Detect implicit feedback signals
   */
  detectImplicitFeedback(
    currentMessage: string,
    previousResponse: string,
    timeSinceResponse: number
  ): FeedbackSignal | null {
    const lowerMessage = currentMessage.toLowerCase();

    // Regeneration request
    if (/\b(again|retry|regenerate|try again|redo)\b/.test(lowerMessage)) {
      return {
        type: 'implicit',
        signal: 'negative',
        source: 'regenerate',
        strength: 0.7,
        timestamp: Date.now(),
      };
    }

    // Follow-up question (neutral to positive)
    if (currentMessage.includes('?') && timeSinceResponse < 60000) {
      return {
        type: 'implicit',
        signal: 'neutral',
        source: 'followup',
        strength: 0.3,
        timestamp: Date.now(),
      };
    }

    // Positive sentiment
    if (/\b(thanks|perfect|great|awesome|helpful|exactly)\b/.test(lowerMessage)) {
      return {
        type: 'implicit',
        signal: 'positive',
        source: 'sentiment',
        strength: 0.6,
        timestamp: Date.now(),
      };
    }

    // Negative sentiment
    if (/\b(wrong|incorrect|no|not what|doesn't work|useless)\b/.test(lowerMessage)) {
      return {
        type: 'implicit',
        signal: 'negative',
        source: 'sentiment',
        strength: 0.6,
        timestamp: Date.now(),
      };
    }

    return null;
  }

  /**
   * Check if response quality is good enough for caching
   */
  isWorthCaching(score: QualityScore): boolean {
    return score.overall >= this.config.minScoreForCache;
  }

  /**
   * Adjust quality score based on feedback
   */
  adjustScoreWithFeedback(score: QualityScore, feedback: FeedbackSignal): QualityScore {
    let adjustment = 0;

    if (feedback.signal === 'positive') {
      adjustment = this.config.positiveFeedbackBoost * feedback.strength;
    } else if (feedback.signal === 'negative') {
      adjustment = -this.config.regenerationPenalty * feedback.strength;
    }

    return {
      ...score,
      overall: Math.max(0, Math.min(1, score.overall + adjustment)),
    };
  }
}

// =============================================================================
// FEEDBACK TRACKER
// =============================================================================

export class FeedbackTracker {
  private scorer: QualityScorer;

  constructor(config?: Partial<QualityConfig>) {
    this.scorer = new QualityScorer(config);
  }

  /**
   * Record quality score and feedback to database
   */
  async recordQuality(
    userId: string,
    threadId: string,
    messageId: string,
    agent: ExtendedAgentType,
    query: string,
    response: string,
    latencyMs: number
  ): Promise<QualityScore> {
    const score = this.scorer.score(response, query);

    try {
      await supabaseAdmin.from('response_quality').insert({
        user_id: userId,
        thread_id: threadId,
        message_id: messageId,
        agent,
        quality_overall: score.overall,
        quality_relevance: score.dimensions.relevance,
        quality_completeness: score.dimensions.completeness,
        quality_clarity: score.dimensions.clarity,
        quality_helpfulness: score.dimensions.helpfulness,
        latency_ms: latencyMs,
        has_code: score.flags.containsCode,
        has_citations: score.flags.containsCitations,
        is_structured: score.flags.isStructured,
      });
    } catch (error) {
      // Table might not exist yet - log and continue
      logger.debug('Failed to record quality (table may not exist)', { error });
    }

    return score;
  }

  /**
   * Record feedback signal
   */
  async recordFeedback(
    userId: string,
    messageId: string,
    feedback: FeedbackSignal
  ): Promise<void> {
    try {
      await supabaseAdmin.from('response_feedback').insert({
        user_id: userId,
        message_id: messageId,
        feedback_type: feedback.type,
        feedback_signal: feedback.signal,
        feedback_source: feedback.source,
        strength: feedback.strength,
      });
    } catch (error) {
      logger.debug('Failed to record feedback (table may not exist)', { error });
    }
  }

  /**
   * Get agent quality metrics
   */
  async getAgentMetrics(agent: ExtendedAgentType, days: number = 7): Promise<AgentQualityMetrics | null> {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabaseAdmin
        .from('response_quality')
        .select('quality_overall, latency_ms, created_at')
        .eq('agent', agent)
        .gte('created_at', since);

      if (error || !data || data.length === 0) return null;

      const avgQuality = data.reduce((sum, d) => sum + (d.quality_overall || 0), 0) / data.length;
      const avgLatency = data.reduce((sum, d) => sum + (d.latency_ms || 0), 0) / data.length;

      // Calculate trend (compare first half to second half)
      const midpoint = Math.floor(data.length / 2);
      const firstHalf = data.slice(0, midpoint);
      const secondHalf = data.slice(midpoint);

      const firstAvg = firstHalf.reduce((sum, d) => sum + (d.quality_overall || 0), 0) / (firstHalf.length || 1);
      const secondAvg = secondHalf.reduce((sum, d) => sum + (d.quality_overall || 0), 0) / (secondHalf.length || 1);

      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      if (secondAvg - firstAvg > 0.05) trend = 'improving';
      else if (firstAvg - secondAvg > 0.05) trend = 'declining';

      return {
        agent,
        avgQuality,
        responseCount: data.length,
        positiveFeedback: 0, // Would need feedback table join
        negativeFeedback: 0,
        regenerationRate: 0,
        avgLatency,
        trend,
      };
    } catch (error) {
      logger.debug('Failed to get agent metrics', { error });
      return null;
    }
  }
}

// =============================================================================
// SINGLETON & UTILITIES
// =============================================================================

let scorerInstance: QualityScorer | null = null;
let trackerInstance: FeedbackTracker | null = null;

export function getQualityScorer(): QualityScorer {
  if (!scorerInstance) {
    scorerInstance = new QualityScorer();
  }
  return scorerInstance;
}

export function getFeedbackTracker(): FeedbackTracker {
  if (!trackerInstance) {
    trackerInstance = new FeedbackTracker();
  }
  return trackerInstance;
}

/**
 * Quick quality score
 */
export function scoreResponse(response: string, query: string): QualityScore {
  return getQualityScorer().score(response, query);
}

/**
 * Check if quality meets threshold
 */
export function meetsQualityThreshold(score: QualityScore, threshold: number = 0.7): boolean {
  return score.overall >= threshold;
}
