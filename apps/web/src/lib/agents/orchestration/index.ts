/**
 * Unified Orchestration Module
 * Single entry point for multi-agent orchestration
 */

// Types
export type {
  ExtendedAgentType,
  RoutingDecision,
  OrchestrationRequest,
  OrchestrationResponse,
  OrchestrationEvent,
  ToolEvent,
  AgentCapability,
  RoutingPolicy,
} from './types';

export { DEFAULT_ROUTING_POLICY } from './types';

// Router
export { route, heuristicRoute, llmRoute, AGENT_CAPABILITIES } from './router';

// Vector Router
export {
  vectorRoute,
  hybridRoute,
  submitRoutingFeedback,
  addRoutingExample,
  seedExampleEmbeddings,
  getRoutingStats,
  getSimilarExamples,
} from './vector-router';

// Metrics
export {
  logRoutingTelemetry,
  recordImplicitFeedback,
  getRoutingMetrics,
  calculateAgentScore,
  type AgentMetrics,
  type RoutingTelemetryEvent,
} from './metrics';

// Service
export { processMessage, streamMessage } from './service';
