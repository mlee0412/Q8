/**
 * Telemetry Service
 * Centralized observability for routing decisions, model selection, and tool outcomes
 * Feeds back into adaptive routing (Phase 2)
 */

import { supabaseAdmin } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { ExtendedAgentType, RoutingDecision } from '../orchestration/types';

/**
 * Telemetry event types
 */
export type TelemetryEventType =
  | 'routing_decision'
  | 'model_selection'
  | 'tool_execution'
  | 'memory_retrieval'
  | 'response_generated'
  | 'user_feedback'
  | 'error';

/**
 * Base telemetry event
 */
export interface TelemetryEvent {
  id?: string;
  eventType: TelemetryEventType;
  userId: string;
  threadId: string;
  messageId?: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

/**
 * Routing decision telemetry
 */
export interface RoutingTelemetry extends TelemetryEvent {
  eventType: 'routing_decision';
  metadata: {
    selectedAgent: ExtendedAgentType;
    routingSource: 'llm' | 'heuristic' | 'fallback';
    confidence: number;
    latencyMs: number;
    fallbackAgent?: ExtendedAgentType;
    candidateAgents?: Array<{ agent: ExtendedAgentType; score: number }>;
  };
}

/**
 * Model selection telemetry
 */
export interface ModelTelemetry extends TelemetryEvent {
  eventType: 'model_selection';
  metadata: {
    model: string;
    provider: string;
    agent: ExtendedAgentType;
    reasoningMode?: 'standard' | 'reasoning';
    contextTokens?: number;
  };
}

/**
 * Tool execution telemetry
 */
export interface ToolTelemetry extends TelemetryEvent {
  eventType: 'tool_execution';
  metadata: {
    toolName: string;
    agent: ExtendedAgentType;
    success: boolean;
    durationMs: number;
    errorMessage?: string;
    resultSize?: number;
  };
}

/**
 * Memory retrieval telemetry
 */
export interface MemoryTelemetry extends TelemetryEvent {
  eventType: 'memory_retrieval';
  metadata: {
    queryLength: number;
    memoriesRetrieved: number;
    avgRelevanceScore: number;
    retrievalMethod: 'vector' | 'keyword' | 'hybrid';
    durationMs: number;
  };
}

/**
 * Response generated telemetry
 */
export interface ResponseTelemetry extends TelemetryEvent {
  eventType: 'response_generated';
  metadata: {
    agent: ExtendedAgentType;
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalDurationMs: number;
    toolsUsed: string[];
    memoriesUsed: number;
    citationsIncluded: number;
    streaming: boolean;
  };
}

/**
 * User feedback telemetry
 */
export interface FeedbackTelemetry extends TelemetryEvent {
  eventType: 'user_feedback';
  metadata: {
    feedbackType: 'positive' | 'negative' | 'retry' | 'manual_switch' | 'copy' | 'regenerate';
    agent: ExtendedAgentType;
    previousAgent?: ExtendedAgentType;
    messageContent?: string;
  };
}

/**
 * Error telemetry
 */
export interface ErrorTelemetry extends TelemetryEvent {
  eventType: 'error';
  metadata: {
    errorType: string;
    errorMessage: string;
    agent?: ExtendedAgentType;
    tool?: string;
    stack?: string;
    recoverable: boolean;
  };
}

/**
 * Telemetry collector buffer for batched writes
 */
class TelemetryCollector {
  private buffer: TelemetryEvent[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private readonly maxBufferSize = 50;
  private readonly flushIntervalMs = 5000;

  constructor() {
    if (typeof window === 'undefined') {
      // Server-side: start flush interval
      this.startFlushInterval();
    }
  }

  private startFlushInterval() {
    if (this.flushInterval) return;
    this.flushInterval = setInterval(() => this.flush(), this.flushIntervalMs);
  }

  /**
   * Add an event to the buffer
   */
  async record(event: Omit<TelemetryEvent, 'id' | 'timestamp'>): Promise<void> {
    const fullEvent: TelemetryEvent = {
      ...event,
      timestamp: new Date(),
    };

    this.buffer.push(fullEvent);

    // Flush if buffer is full
    if (this.buffer.length >= this.maxBufferSize) {
      await this.flush();
    }
  }

  /**
   * Flush all buffered events to storage
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const events = [...this.buffer];
    this.buffer = [];

    try {
      await supabaseAdmin.from('telemetry_events').insert(
        events.map((event) => ({
          event_type: event.eventType,
          user_id: event.userId,
          thread_id: event.threadId,
          message_id: event.messageId,
          metadata: event.metadata,
          created_at: event.timestamp.toISOString(),
        }))
      );
    } catch (error) {
      logger.error('Failed to flush telemetry events', { error, eventCount: events.length, service: 'telemetry' });
      // Re-add failed events to buffer (with size limit)
      this.buffer = [...events.slice(0, this.maxBufferSize / 2), ...this.buffer];
    }
  }

  /**
   * Stop the collector
   */
  stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush().catch((error) => logger.error('Telemetry flush failed on stop', { error, service: 'telemetry' }));
  }
}

// Singleton instance
const collector = new TelemetryCollector();

// ============================================================
// Convenience functions for common telemetry events
// ============================================================

/**
 * Record a routing decision
 */
export async function recordRoutingDecision(
  userId: string,
  threadId: string,
  decision: RoutingDecision,
  latencyMs: number
): Promise<void> {
  await collector.record({
    eventType: 'routing_decision',
    userId,
    threadId,
    metadata: {
      selectedAgent: decision.agent,
      routingSource: decision.source,
      confidence: decision.confidence,
      latencyMs,
      fallbackAgent: decision.fallbackAgent,
    },
  } as Omit<RoutingTelemetry, 'id' | 'timestamp'>);
}

/**
 * Record a tool execution
 */
export async function recordToolExecution(
  userId: string,
  threadId: string,
  toolName: string,
  agent: ExtendedAgentType,
  success: boolean,
  durationMs: number,
  errorMessage?: string
): Promise<void> {
  await collector.record({
    eventType: 'tool_execution',
    userId,
    threadId,
    metadata: {
      toolName,
      agent,
      success,
      durationMs,
      errorMessage,
    },
  } as Omit<ToolTelemetry, 'id' | 'timestamp'>);
}

/**
 * Record memory retrieval
 */
export async function recordMemoryRetrieval(
  userId: string,
  threadId: string,
  queryLength: number,
  memoriesRetrieved: number,
  avgRelevanceScore: number,
  retrievalMethod: 'vector' | 'keyword' | 'hybrid',
  durationMs: number
): Promise<void> {
  await collector.record({
    eventType: 'memory_retrieval',
    userId,
    threadId,
    metadata: {
      queryLength,
      memoriesRetrieved,
      avgRelevanceScore,
      retrievalMethod,
      durationMs,
    },
  } as Omit<MemoryTelemetry, 'id' | 'timestamp'>);
}

/**
 * Record user feedback
 */
export async function recordUserFeedback(
  userId: string,
  threadId: string,
  feedbackType: FeedbackTelemetry['metadata']['feedbackType'],
  agent: ExtendedAgentType,
  previousAgent?: ExtendedAgentType
): Promise<void> {
  await collector.record({
    eventType: 'user_feedback',
    userId,
    threadId,
    metadata: {
      feedbackType,
      agent,
      previousAgent,
    },
  } as Omit<FeedbackTelemetry, 'id' | 'timestamp'>);
}

/**
 * Record an error
 */
export async function recordError(
  userId: string,
  threadId: string,
  errorType: string,
  errorMessage: string,
  recoverable: boolean,
  context?: { agent?: ExtendedAgentType; tool?: string; stack?: string }
): Promise<void> {
  await collector.record({
    eventType: 'error',
    userId,
    threadId,
    metadata: {
      errorType,
      errorMessage,
      recoverable,
      ...context,
    },
  } as Omit<ErrorTelemetry, 'id' | 'timestamp'>);
}

/**
 * Flush pending telemetry (for graceful shutdown)
 */
export async function flushTelemetry(): Promise<void> {
  await collector.flush();
}

export { collector as telemetryCollector };
