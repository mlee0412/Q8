/**
 * Agent Hand-Off Protocol
 * Manages explicit and implicit agent transfers with context preservation
 *
 * This module provides:
 * - Detection of hand-off signals in agent responses
 * - Context building for receiving agents
 * - Hand-off processing and routing
 */

import type { ExtendedAgentType } from './types';

// =============================================================================
// TYPES
// =============================================================================

export type HandoffType =
  | 'explicit' // Agent explicitly requests hand-off via marker
  | 'implicit' // Routing decides to switch based on content
  | 'user_request' // User @mentions specific agent
  | 'escalation' // Agent cannot handle, escalates
  | 'completion'; // Task complete, return to orchestrator

export interface HandoffContext {
  fromAgent: ExtendedAgentType;
  toAgent: ExtendedAgentType;
  type: HandoffType;
  reason: string;

  // Preserved context for receiving agent
  taskSummary?: string;
  relevantTools?: string[];
  userIntent?: string;
  partialResults?: unknown;
}

export interface HandoffSignal {
  type: 'HANDOFF';
  target: ExtendedAgentType;
  reason: string;
  context?: Record<string, unknown>;
}

export interface HandoffResult {
  targetAgent: ExtendedAgentType;
  contextPrompt: string;
  shouldNotifyUser: boolean;
}

// =============================================================================
// AGENT NAME MAPPING
// =============================================================================

/**
 * Map natural language agent names to agent types
 */
const AGENT_NAME_MAP: Record<string, ExtendedAgentType> = {
  // Coder variations
  devbot: 'coder',
  dev: 'coder',
  coder: 'coder',
  developer: 'coder',
  code: 'coder',
  programming: 'coder',
  github: 'coder',

  // Researcher variations
  researchbot: 'researcher',
  research: 'researcher',
  researcher: 'researcher',
  search: 'researcher',
  lookup: 'researcher',
  find: 'researcher',

  // Secretary variations
  secretary: 'secretary',
  secretarybot: 'secretary',
  calendar: 'secretary',
  email: 'secretary',
  schedule: 'secretary',
  meeting: 'secretary',

  // Home variations
  homebot: 'home',
  home: 'home',
  smarthome: 'home',
  lights: 'home',
  thermostat: 'home',
  'home assistant': 'home',

  // Finance variations
  finance: 'finance',
  financebot: 'finance',
  advisor: 'finance',
  money: 'finance',
  budget: 'finance',
  financial: 'finance',

  // Personality variations
  q8: 'personality',
  personality: 'personality',
  chat: 'personality',
  talk: 'personality',

  // ImageGen variations
  imagegen: 'imagegen',
  image: 'imagegen',
  picture: 'imagegen',
  photo: 'imagegen',
  generate: 'imagegen',
};

/**
 * Map a natural language name to an agent type
 */
export function mapNameToAgent(name: string): ExtendedAgentType | null {
  const normalized = name.toLowerCase().trim();
  return AGENT_NAME_MAP[normalized] || null;
}

// =============================================================================
// HAND-OFF DETECTION
// =============================================================================

/**
 * Detect hand-off signals in agent responses
 *
 * Supports multiple patterns:
 * 1. Explicit markers: [HANDOFF:agent_name]
 * 2. Natural language: "Let me pass this to DevBot"
 * 3. Capability references: "This needs code expertise"
 */
export function detectHandoffSignal(response: string): HandoffSignal | null {
  // Pattern 1: Explicit marker [HANDOFF:agent_name]
  const explicitMatch = response.match(/\[HANDOFF:(\w+)\](?:\s*(.+))?/i);
  if (explicitMatch && typeof explicitMatch[1] === 'string') {
    const targetName: string = explicitMatch[1];
    const target = mapNameToAgent(targetName);
    if (target) {
      return {
        type: 'HANDOFF',
        target,
        reason: explicitMatch[2]?.trim() || 'Explicit hand-off requested',
      };
    }
  }

  // Pattern 2: Natural language hand-off phrases
  const handoffPhrases = [
    {
      pattern: /let me (?:pass|transfer|hand) (?:this |it )?(?:over )?to (\w+)/i,
      extractAgent: (m: RegExpMatchArray) => m[1],
    },
    {
      pattern: /I(?:'ll| will) (?:get|have|ask) (\w+) to (?:help|handle|take care)/i,
      extractAgent: (m: RegExpMatchArray) => m[1],
    },
    {
      pattern: /(\w+) (?:would be|is) better suited (?:for|to handle) this/i,
      extractAgent: (m: RegExpMatchArray) => m[1],
    },
    {
      pattern: /this (?:requires|needs) (\w+)(?:'s)? (?:expertise|help|capabilities)/i,
      extractAgent: (m: RegExpMatchArray) => m[1],
    },
    {
      pattern: /transferring (?:you )?to (\w+)/i,
      extractAgent: (m: RegExpMatchArray) => m[1],
    },
  ];

  for (const { pattern, extractAgent } of handoffPhrases) {
    const match = response.match(pattern);
    if (match && match[0]) {
      const agentName = extractAgent(match);
      if (agentName) {
        const targetAgent = mapNameToAgent(agentName);
        if (targetAgent) {
          return {
            type: 'HANDOFF',
            target: targetAgent,
            reason: match[0],
          };
        }
      }
    }
  }

  // Pattern 3: Capability-based detection (when agent admits limitation)
  const limitationPhrases = [
    {
      pattern: /I (?:can't|cannot|don't have access to|am not able to) .*(?:code|program|github)/i,
      target: 'coder' as ExtendedAgentType,
    },
    {
      pattern: /I (?:can't|cannot|don't have access to|am not able to) .*(?:search|web|internet|current)/i,
      target: 'researcher' as ExtendedAgentType,
    },
    {
      pattern: /I (?:can't|cannot|don't have access to|am not able to) .*(?:calendar|email|schedule)/i,
      target: 'secretary' as ExtendedAgentType,
    },
    {
      pattern: /I (?:can't|cannot|don't have access to|am not able to) .*(?:smart home|lights|thermostat)/i,
      target: 'home' as ExtendedAgentType,
    },
  ];

  for (const { pattern, target } of limitationPhrases) {
    if (pattern.test(response)) {
      return {
        type: 'HANDOFF',
        target,
        reason: 'Agent indicated capability limitation',
      };
    }
  }

  return null;
}

// =============================================================================
// CONTEXT BUILDING
// =============================================================================

/**
 * Extended conversation message with optional metadata
 */
interface ConversationMessage {
  role: string;
  content: string;
  agentName?: string;
  toolResults?: Array<{ tool: string; result: unknown }>;
}

/**
 * Build context prompt for receiving agent during hand-off
 * Enhanced with 6-message history, tool results, and clear intent tracking
 */
export async function buildHandoffContext(
  fromAgent: ExtendedAgentType,
  toAgent: ExtendedAgentType,
  conversationHistory: Array<ConversationMessage>,
  handoffReason: string,
  partialResults?: unknown,
  options?: {
    userOriginalIntent?: string;
    toolExecutions?: Array<{ tool: string; success: boolean; result?: unknown }>;
    interruptedTopic?: string;
  }
): Promise<string> {
  // Get recent conversation context (increased to last 6 messages)
  const recentHistory = conversationHistory
    .slice(-6)
    .map((m) => {
      const truncatedContent =
        m.content.length > 400 ? m.content.slice(0, 400) + '...' : m.content;
      const agentTag = m.agentName ? ` [${m.agentName}]` : '';
      return `**${m.role}${agentTag}**: ${truncatedContent}`;
    })
    .join('\n\n');

  // Build tool execution summary if available
  let toolSummary = '';
  if (options?.toolExecutions && options.toolExecutions.length > 0) {
    const toolLines = options.toolExecutions.map((t) => {
      const status = t.success ? '✓' : '✗';
      const resultPreview = t.result
        ? ` → ${JSON.stringify(t.result).slice(0, 100)}${
            JSON.stringify(t.result).length > 100 ? '...' : ''
          }`
        : '';
      return `- ${status} ${t.tool}${resultPreview}`;
    });
    toolSummary = `\n### Tool Executions by Previous Agent\n${toolLines.join('\n')}\n`;
  }

  // Build interrupted topic note if applicable
  const interruptedNote = options?.interruptedTopic
    ? `\n**Note**: The user may want to return to "${options.interruptedTopic}" after this.\n`
    : '';

  // Build original intent note if the request evolved
  const intentNote = options?.userOriginalIntent
    ? `\n**Original user intent**: ${options.userOriginalIntent}\n`
    : '';

  const contextPrompt = `
## Hand-off Context

You are receiving a hand-off from **${fromAgent}**.

**Reason for hand-off**: ${handoffReason}
${intentNote}
### Recent Conversation
${recentHistory}
${toolSummary}
${
  partialResults
    ? `### Partial Results from Previous Agent
\`\`\`json
${JSON.stringify(partialResults, null, 2)}
\`\`\``
    : ''
}
${interruptedNote}
### Your Task
Continue the conversation naturally. Address the user's needs using your specialized capabilities.

**Important Guidelines**:
- Do NOT repeat what the previous agent already said
- Do NOT introduce yourself unless contextually appropriate
- Pick up where the conversation left off
- If you have the information/capability needed, provide it directly
- Use any partial results provided to build upon previous work
`.trim();

  return contextPrompt;
}

// =============================================================================
// HAND-OFF PROCESSING
// =============================================================================

/**
 * Process a detected hand-off signal
 */
export async function processHandoff(
  handoff: HandoffSignal,
  currentState: {
    fromAgent: ExtendedAgentType;
    userId: string;
    threadId: string;
    message: string;
    conversationHistory: Array<{ role: string; content: string }>;
    partialResults?: unknown;
  }
): Promise<HandoffResult> {
  const contextPrompt = await buildHandoffContext(
    currentState.fromAgent,
    handoff.target,
    currentState.conversationHistory,
    handoff.reason,
    currentState.partialResults
  );

  return {
    targetAgent: handoff.target,
    contextPrompt,
    shouldNotifyUser: true,
  };
}

/**
 * Create a hand-off marker for agents to use
 */
export function createHandoffMarker(
  target: ExtendedAgentType,
  reason?: string
): string {
  return `[HANDOFF:${target}]${reason ? ` ${reason}` : ''}`;
}

/**
 * Strip hand-off markers from response before sending to user
 */
export function stripHandoffMarkers(response: string): string {
  return response
    .replace(/\[HANDOFF:\w+\](?:\s*[^\n]*)?/gi, '')
    .trim();
}

/**
 * Check if an agent switch is a valid hand-off
 * (prevents circular hand-offs and invalid targets)
 */
export function isValidHandoff(
  from: ExtendedAgentType,
  to: ExtendedAgentType,
  recentAgents: ExtendedAgentType[]
): { valid: boolean; reason?: string } {
  // Can't hand off to self
  if (from === to) {
    return { valid: false, reason: 'Cannot hand off to the same agent' };
  }

  // Detect circular hand-offs (same agent appeared twice in last 3)
  const recentThree = recentAgents.slice(-3);
  if (recentThree.filter((a) => a === to).length >= 2) {
    return {
      valid: false,
      reason: 'Circular hand-off detected - agent was recently active',
    };
  }

  return { valid: true };
}
