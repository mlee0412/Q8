/**
 * Agent Module
 * Unified entry point for multi-agent orchestration
 *
 * ARCHITECTURE:
 * All agent functionality is now centralized in lib/agents/orchestration/service.ts.
 * This file serves as a clean re-export layer.
 *
 * Usage:
 *   import { processMessage, streamMessage } from '@/lib/agents';
 *   // OR import directly from orchestration
 *   import { processMessage, streamMessage } from '@/lib/agents/orchestration';
 */

import { getModel } from './model_factory';

// ============================================================================
// UNIFIED ORCHESTRATION SERVICE EXPORTS
// ============================================================================

// Service functions
export { processMessage, streamMessage } from './orchestration/service';

// Types
export type {
  OrchestrationRequest,
  OrchestrationResponse,
  OrchestrationEvent,
  ExtendedAgentType,
  RoutingDecision,
  ToolEvent,
  AgentCapability,
  RoutingPolicy,
} from './orchestration/types';

export { DEFAULT_ROUTING_POLICY } from './orchestration/types';

// Router functions (for advanced usage)
export { route, heuristicRoute, llmRoute, AGENT_CAPABILITIES } from './orchestration/router';

// Metrics (for telemetry/debugging)
export {
  logRoutingTelemetry,
  recordImplicitFeedback,
  getRoutingMetrics,
} from './orchestration/metrics';

// ============================================================================
// MODEL & TYPE EXPORTS
// ============================================================================

export * from './types';
export * from './model_factory';

// ============================================================================
// LEGACY CONFIG (for backward compatibility)
// ============================================================================

/**
 * Legacy orchestrator configuration
 * @deprecated Use processMessage/streamMessage directly
 */
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

/**
 * @deprecated Sub-agents are now initialized automatically by the orchestration service.
 * This function is maintained for backward compatibility only.
 */
export async function initializeOrchestrator() {
  // Sub-agents are now lazy-loaded by the orchestration service
  // This is a no-op for compatibility
  return orchestratorConfig;
}
