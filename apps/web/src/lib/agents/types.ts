/**
 * Agent System Types
 * Shared types for the multi-agent swarm
 */

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Basic agent context (backward compatible)
 */
export interface AgentContext {
  userId: string;
  sessionId: string;
  currentTime: Date;
  location?: {
    lat: number;
    long: number;
  };
  weather?: {
    temp: number;
    condition: string;
  };
}

/**
 * User profile with preferences
 */
export interface UserProfile {
  name: string;
  timezone: string;
  communicationStyle: 'concise' | 'detailed';
  preferences: Record<string, unknown>;
}

/**
 * Session state tracking
 */
export interface SessionState {
  conversationTurns: number;
  topicsDiscussed: string[];
  toolsUsed: string[];
  startedAt: Date;
}

/**
 * Location information
 */
export interface LocationInfo {
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  coordinates: {
    lat: number;
    long: number;
  };
}

/**
 * Weather information
 */
export interface WeatherInfo {
  temp: number;
  feelsLike: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
  icon: string;
  sunrise?: string;
  sunset?: string;
}

/**
 * Enriched context with full environmental awareness
 */
export interface EnrichedContext {
  // IDs
  userId: string;
  sessionId: string;

  // Temporal
  currentTime: Date;
  timezone: string;
  localTimeFormatted: string;
  localDateFormatted: string;
  dayOfWeek: string;
  isWeekend: boolean;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';

  // Location
  location: LocationInfo;

  // Weather (optional - may fail to fetch)
  weather?: WeatherInfo;

  // User
  user: {
    name: string;
    timezone: string;
    communicationStyle: 'concise' | 'detailed';
    preferences: Record<string, unknown>;
  };

  // Session
  session: {
    conversationTurns: number;
    topicsDiscussed: string[];
    toolsUsed: string[];
    startedAt: Date;
  };
}

export interface AgentResponse {
  content: string;
  agent: string;
  metadata?: Record<string, unknown>;
  handoff?: {
    to: string;
    reason: string;
  };
  /** Generated images from image tools */
  images?: Array<{
    /** Base64-encoded image data */
    data: string;
    /** MIME type (e.g., 'image/png', 'image/jpeg') */
    mimeType: string;
    /** Alt text for accessibility */
    alt?: string;
    /** Caption or description */
    caption?: string;
    /** Image dimensions if known */
    width?: number;
    height?: number;
  }>;
}

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (params: unknown) => Promise<unknown>;
}

/**
 * Tool execution tracking for UI
 */
export interface ToolExecution {
  id: string;
  tool: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  args: Record<string, unknown>;
  result?: unknown;
  error?: string;
  duration?: number;
  timestamp: Date;
}

/**
 * OpenAI-compatible tool definition
 */
export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

// =============================================================================
// TOOL RESULT TYPES
// =============================================================================

/**
 * Standard result envelope for all tool executions
 * Provides consistent structure for success/failure across all agents
 */
export interface ToolResult<T = unknown> {
  /** Whether the tool execution succeeded */
  success: boolean;
  /** Human-readable message describing the outcome */
  message: string;
  /** Optional data payload from the tool execution */
  data?: T;
  /** Error details if success is false */
  error?: {
    code?: string;
    details?: string;
  };
  /** Execution metadata */
  meta?: {
    /** Execution duration in milliseconds */
    durationMs?: number;
    /** Trace ID for debugging */
    traceId?: string;
    /** Source of the tool execution */
    source?: string;
  };
}

/**
 * Helper function to create a successful tool result
 */
export function toolSuccess<T>(message: string, data?: T, meta?: ToolResult['meta']): ToolResult<T> {
  return {
    success: true,
    message,
    data,
    meta,
  };
}

/**
 * Helper function to create a failed tool result
 */
export function toolError(message: string, error?: { code?: string; details?: string }, meta?: ToolResult['meta']): ToolResult<never> {
  return {
    success: false,
    message,
    error,
    meta,
  };
}

/**
 * Type guard to check if a tool result was successful
 */
export function isToolSuccess<T>(result: ToolResult<T>): result is ToolResult<T> & { success: true; data: T } {
  return result.success === true;
}

/**
 * Type guard to check if a tool result was a failure
 */
export function isToolError(result: ToolResult): result is ToolResult & { success: false } {
  return result.success === false;
}
