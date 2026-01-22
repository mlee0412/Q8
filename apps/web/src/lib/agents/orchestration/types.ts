/**
 * Orchestration Types
 * Shared types for the unified orchestration system
 */

import type { AgentType } from '../model_factory';
import type { EnrichedContext } from '../types';

/**
 * Extended agent types including finance advisor and image generation
 * Note: AgentType from model_factory now includes 'imagegen'
 */
export type ExtendedAgentType = AgentType;

/**
 * Routing decision with structured output
 * Phase 2/3 enhancement: includes performance and vector routing metrics
 */
export interface RoutingDecision {
  /** Selected agent for the task */
  agent: ExtendedAgentType;
  /** Confidence score (0-1) for the routing decision */
  confidence: number;
  /** Explanation for why this agent was selected */
  rationale: string;
  /** Fallback agent if primary fails or confidence is low */
  fallbackAgent?: ExtendedAgentType;
  /** Planned tools to use (if known) */
  toolPlan?: string[];
  /** Source of routing decision */
  source: 'llm' | 'heuristic' | 'fallback' | 'vector';
  /** Performance/vector metrics that influenced this decision */
  performanceContext?: {
    // LLM/Heuristic metrics
    agentSuccessRate?: number;
    avgLatency?: number;
    recentFailures?: number;
    // Vector routing metrics
    matchCount?: number;
    avgSimilarity?: number;
    avgQuality?: number;
  };
}

/**
 * Tool execution event for streaming
 */
export interface ToolEvent {
  id: string;
  type: 'start' | 'end';
  tool: string;
  args?: Record<string, unknown>;
  result?: unknown;
  success?: boolean;
  duration?: number;
  timestamp: Date;
}

/**
 * Streaming event types for unified output
 */
export type OrchestrationEvent =
  | { type: 'routing'; decision: RoutingDecision }
  | { type: 'agent_start'; agent: ExtendedAgentType }
  | { type: 'handoff'; from: ExtendedAgentType; to: ExtendedAgentType; reason: string }
  | { type: 'tool_start'; tool: string; args: Record<string, unknown>; id: string }
  | { type: 'tool_end'; tool: string; success: boolean; result?: unknown; id: string; duration?: number }
  | { type: 'content'; delta: string }
  | { type: 'tts_chunk'; text: string; isComplete: boolean }
  | { type: 'citation'; source: string; url?: string; relevance?: number }
  | { type: 'memory_used'; memoryId: string; content: string; relevance: number }
  | { type: 'image_generated'; imageData: string; mimeType: string; caption?: string; model?: string }
  | { type: 'image_analyzed'; analysis: string; imageUrl?: string }
  | { type: 'done'; fullContent: string; agent: ExtendedAgentType; threadId: string; images?: Array<{ data: string; mimeType: string; caption?: string }> }
  | { type: 'thread_created'; threadId: string }
  | { type: 'memory_extracted'; count: number }
  | { type: 'error'; message: string; recoverable?: boolean };

/**
 * Orchestration request input
 */
/** Input method for the message */
export type InputMethod = 'keyboard' | 'microphone' | 'hotkey';

/** Conversation mode */
export type ConversationMode = 'text' | 'voice' | 'ambient';

export interface OrchestrationRequest {
  message: string;
  userId: string;
  threadId?: string;
  userProfile?: {
    name?: string;
    timezone?: string;
    communicationStyle?: 'concise' | 'detailed';
  };
  /** Override automatic routing */
  forceAgent?: ExtendedAgentType;
  /** Include tool execution visibility */
  showToolExecutions?: boolean;
  /** How the message was input */
  inputMethod?: InputMethod;
  /** Enable streaming TTS chunks for voice mode */
  enableStreamingTTS?: boolean;
  /** Current conversation mode */
  mode?: ConversationMode;
}

/**
 * Orchestration response output
 */
export interface OrchestrationResponse {
  content: string;
  agent: ExtendedAgentType;
  threadId: string;
  routing: RoutingDecision;
  toolExecutions?: ToolEvent[];
  memoriesUsed?: Array<{ id: string; content: string; relevance: number }>;
  citations?: Array<{ source: string; url?: string }>;
  metadata?: {
    latency: number;
    tokenUsage?: { input: number; output: number };
    model: string;
  };
}

/**
 * Agent capability definition for routing
 */
export interface AgentCapability {
  agent: ExtendedAgentType;
  name: string;
  description: string;
  capabilities: string[];
  keywords: string[];
  tools: string[];
  /** Average success rate (0-1) */
  successRate?: number;
  /** Average latency in ms */
  avgLatency?: number;
}

/**
 * Routing policy weights
 * Priority: task success > latency > cost
 */
export interface RoutingPolicy {
  /** Weight for task success (highest priority) */
  successWeight: number;
  /** Weight for latency (second priority) */
  latencyWeight: number;
  /** Weight for cost (third priority) */
  costWeight: number;
  /** Minimum confidence threshold to use LLM routing */
  minLLMConfidence: number;
  /** Maximum latency allowed for LLM routing (ms) */
  maxLLMRoutingLatency: number;
}

/**
 * Default routing policy
 */
export const DEFAULT_ROUTING_POLICY: RoutingPolicy = {
  successWeight: 0.6,
  latencyWeight: 0.25,
  costWeight: 0.15,
  minLLMConfidence: 0.7,
  maxLLMRoutingLatency: 500,
};

// =============================================================================
// UNIFIED AGENT DEFINITION
// =============================================================================

import type { OpenAITool, ToolResult } from '../types';
import type { ModelConfig } from '../model_factory';

/**
 * Tool executor function signature
 * All tool executors follow this pattern for consistency
 */
export type ToolExecutor = (
  toolName: string,
  args: Record<string, unknown>,
  context?: { userId?: string; sessionId?: string }
) => Promise<ToolResult>;

/**
 * System prompt builder function
 * Allows dynamic prompt construction based on context
 */
export type SystemPromptBuilder = (
  context?: EnrichedContext,
  additionalContext?: string
) => string | Promise<string>;

/**
 * Unified Agent Definition
 * Standard interface for all agent types in the swarm
 *
 * This interface ensures consistent structure across:
 * - Tool definitions and execution
 * - System prompt generation
 * - Model configuration
 * - Background processing capabilities
 */
export interface AgentDefinition {
  /** Unique agent identifier (matches ExtendedAgentType) */
  id: ExtendedAgentType;

  /** Display name for the agent */
  name: string;

  /** Brief description of agent capabilities */
  description: string;

  /** Model configuration (from model_factory) */
  modelConfig: ModelConfig;

  /** Base system prompt instructions */
  instructions: string;

  /** Dynamic system prompt builder (optional) */
  buildSystemPrompt?: SystemPromptBuilder;

  /** OpenAI-compatible tool definitions */
  tools: OpenAITool[];

  /** Tool execution function */
  executeTool: ToolExecutor;

  /** Whether this agent can process requests in background */
  canBackground: boolean;

  /** Maximum tokens for response (for cost management) */
  maxResponseTokens?: number;

  /** Tool-specific configuration */
  toolConfig?: {
    /** Default timeout for tool execution (ms) */
    defaultTimeoutMs?: number;
    /** Maximum concurrent tool calls */
    maxConcurrentCalls?: number;
    /** Tools that require user confirmation before execution */
    confirmationRequired?: string[];
  };

  /** Agent-specific capabilities for routing */
  capabilities: AgentCapability;
}

/**
 * Agent registry for dynamic agent lookup
 */
export type AgentRegistry = Map<ExtendedAgentType, AgentDefinition>;

/**
 * Create a partial agent definition (for building)
 */
export type PartialAgentDefinition = Partial<AgentDefinition> & {
  id: ExtendedAgentType;
  name: string;
  tools: OpenAITool[];
  executeTool: ToolExecutor;
};
