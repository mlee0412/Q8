/**
 * Agent Performance Metrics
 * Tracks success rates, latency, and feedback for adaptive routing
 * Phase 2: Feeds into routing policy engine
 */

import { supabaseAdmin } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { ExtendedAgentType } from './types';

/**
 * Performance metrics for a single agent
 */
export interface AgentMetrics {
  agent: ExtendedAgentType;
  successRate: number;
  avgLatency: number;
  totalRequests: number;
  recentFailures: number;
  lastUpdated: Date;
}

/**
 * Routing telemetry event
 */
export interface RoutingTelemetryEvent {
  id?: string;
  userId: string;
  threadId: string;
  messageId?: string;
  selectedAgent: ExtendedAgentType;
  routingSource: 'llm' | 'heuristic' | 'fallback';
  confidence: number;
  latencyMs: number;
  success: boolean;
  toolsUsed: string[];
  fallbackUsed: boolean;
  userFeedback?: 'positive' | 'negative' | 'retry' | 'manual_switch';
  createdAt?: Date;
}

/**
 * Log a routing decision and its outcome
 */
export async function logRoutingTelemetry(event: RoutingTelemetryEvent): Promise<void> {
  try {
    // Check if table exists, if not, this is a no-op
    await supabaseAdmin.from('routing_telemetry').insert({
      user_id: event.userId,
      thread_id: event.threadId,
      message_id: event.messageId,
      selected_agent: event.selectedAgent,
      routing_source: event.routingSource,
      confidence: event.confidence,
      latency_ms: event.latencyMs,
      success: event.success,
      tools_used: event.toolsUsed,
      fallback_used: event.fallbackUsed,
      user_feedback: event.userFeedback,
    });
  } catch (error) {
    // Log but don't fail - telemetry is non-critical
    logger.warn('Failed to log routing telemetry', { userId: event.userId, threadId: event.threadId, error });
  }
}

/**
 * Record implicit feedback signals
 */
export async function recordImplicitFeedback(
  userId: string,
  threadId: string,
  agent: ExtendedAgentType,
  signal: 'retry' | 'manual_switch' | 'tool_failure' | 'timeout'
): Promise<void> {
  try {
    await supabaseAdmin.from('routing_feedback').insert({
      user_id: userId,
      thread_id: threadId,
      agent,
      signal_type: signal,
    });
  } catch (error) {
    logger.warn('Failed to record feedback', { userId, threadId, agent, signal, error });
  }
}

/**
 * Get aggregated performance metrics for all agents
 * Used by the router to make informed decisions
 */
export async function getRoutingMetrics(): Promise<Record<ExtendedAgentType, AgentMetrics | undefined>> {
  const defaultMetrics: Record<string, AgentMetrics | undefined> = {
    coder: undefined,
    researcher: undefined,
    secretary: undefined,
    home: undefined,
    finance: undefined,
    personality: undefined,
    orchestrator: undefined,
  };

  try {
    // Get metrics from the last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
      .from('routing_telemetry')
      .select('selected_agent, success, latency_ms')
      .gte('created_at', since);

    if (error || !data) {
      return defaultMetrics as Record<ExtendedAgentType, AgentMetrics | undefined>;
    }

    // Aggregate by agent
    const agentData: Record<string, { successes: number; failures: number; latencies: number[] }> = {};

    for (const row of data) {
      const agent = row.selected_agent as string;
      if (!agentData[agent]) {
        agentData[agent] = { successes: 0, failures: 0, latencies: [] };
      }
      if (row.success) {
        agentData[agent].successes++;
      } else {
        agentData[agent].failures++;
      }
      agentData[agent].latencies.push(row.latency_ms);
    }

    // Calculate metrics
    const metrics: Record<string, AgentMetrics | undefined> = { ...defaultMetrics };

    for (const [agent, data] of Object.entries(agentData)) {
      const total = data.successes + data.failures;
      metrics[agent] = {
        agent: agent as ExtendedAgentType,
        successRate: total > 0 ? data.successes / total : 1,
        avgLatency: data.latencies.length > 0
          ? data.latencies.reduce((a, b) => a + b, 0) / data.latencies.length
          : 0,
        totalRequests: total,
        recentFailures: data.failures,
        lastUpdated: new Date(),
      };
    }

    return metrics as Record<ExtendedAgentType, AgentMetrics | undefined>;
  } catch (error) {
    logger.warn('Failed to fetch routing metrics', { error });
    return defaultMetrics as Record<ExtendedAgentType, AgentMetrics | undefined>;
  }
}

/**
 * Get feedback signals for a specific user/thread
 */
export async function getUserFeedbackSignals(
  userId: string,
  limit: number = 50
): Promise<Array<{ agent: ExtendedAgentType; signal: string; createdAt: Date }>> {
  try {
    const { data } = await supabaseAdmin
      .from('routing_feedback')
      .select('agent, signal_type, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return (data || []).map((row) => ({
      agent: row.agent as ExtendedAgentType,
      signal: row.signal_type,
      createdAt: new Date(row.created_at),
    }));
  } catch {
    return [];
  }
}

/**
 * Calculate weighted agent score based on policy
 * Higher score = better agent choice
 */
export function calculateAgentScore(
  metrics: AgentMetrics | undefined,
  policy: { successWeight: number; latencyWeight: number; costWeight: number }
): number {
  if (!metrics) {
    return 0.5; // Default neutral score
  }

  // Normalize latency (lower is better, max 10s)
  const normalizedLatency = 1 - Math.min(metrics.avgLatency / 10000, 1);

  // Cost is approximated by request count (more requests = higher cost)
  // For now, we treat all agents as equal cost
  const normalizedCost = 0.8;

  return (
    metrics.successRate * policy.successWeight +
    normalizedLatency * policy.latencyWeight +
    normalizedCost * policy.costWeight
  );
}
