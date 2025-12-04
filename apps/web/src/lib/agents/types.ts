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
