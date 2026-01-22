/**
 * Tool Validation Schemas
 * Zod schemas for validating tool inputs and outputs
 */

import { z } from 'zod';

// =============================================================================
// COMMON SCHEMAS
// =============================================================================

/**
 * Standard tool result envelope
 */
export const toolResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.unknown().optional(),
  error: z.object({
    code: z.string().optional(),
    details: z.string().optional(),
  }).optional(),
  meta: z.object({
    durationMs: z.number().optional(),
    traceId: z.string().optional(),
    source: z.string().optional(),
  }).optional(),
});

export type ToolResultInput = z.infer<typeof toolResultSchema>;

// =============================================================================
// GITHUB TOOL SCHEMAS
// =============================================================================

export const githubSearchCodeSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  repo: z.string().regex(/^[\w-]+\/[\w-]+$/, 'Repo must be in owner/repo format').optional(),
  language: z.string().optional(),
});

export const githubGetFileSchema = z.object({
  repo: z.string().regex(/^[\w-]+\/[\w-]+$/, 'Repo must be in owner/repo format'),
  path: z.string().min(1, 'File path is required'),
  ref: z.string().optional(),
});

export const githubListPrsSchema = z.object({
  repo: z.string().regex(/^[\w-]+\/[\w-]+$/, 'Repo must be in owner/repo format'),
  state: z.enum(['open', 'closed', 'all']).optional(),
});

export const githubCreateIssueSchema = z.object({
  repo: z.string().regex(/^[\w-]+\/[\w-]+$/, 'Repo must be in owner/repo format'),
  title: z.string().min(1, 'Issue title is required'),
  body: z.string().min(1, 'Issue body is required'),
  labels: z.array(z.string()).optional(),
});

export const githubCreatePrSchema = z.object({
  repo: z.string().regex(/^[\w-]+\/[\w-]+$/, 'Repo must be in owner/repo format'),
  title: z.string().min(1, 'PR title is required'),
  head: z.string().min(1, 'Source branch is required'),
  base: z.string().min(1, 'Target branch is required'),
  body: z.string().optional(),
});

// =============================================================================
// SUPABASE TOOL SCHEMAS
// =============================================================================

export const supabaseRunSqlSchema = z.object({
  query: z.string().min(1, 'SQL query is required'),
});

export const supabaseGetSchemaSchema = z.object({
  table: z.string().optional(),
});

export const supabaseVectorSearchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  table: z.string().min(1, 'Table name is required'),
  limit: z.number().min(1).max(100).optional(),
});

// =============================================================================
// GOOGLE WORKSPACE TOOL SCHEMAS
// =============================================================================

export const gmailListMessagesSchema = z.object({
  query: z.string().optional(),
  maxResults: z.number().min(1).max(50).optional(),
  labelIds: z.array(z.string()).optional(),
});

export const gmailSendMessageSchema = z.object({
  to: z.string().email('Valid email address required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  cc: z.string().optional(),
  bcc: z.string().optional(),
});

export const calendarListEventsSchema = z.object({
  calendarId: z.string().optional(),
  timeMin: z.string().datetime().optional(),
  timeMax: z.string().datetime().optional(),
});

export const calendarCreateEventSchema = z.object({
  summary: z.string().min(1, 'Event title is required'),
  start: z.string().datetime('Start time must be ISO format'),
  end: z.string().datetime('End time must be ISO format'),
  description: z.string().optional(),
});

// =============================================================================
// HOME ASSISTANT TOOL SCHEMAS
// =============================================================================

export const homeControlDeviceSchema = z.object({
  entity_id: z.string().regex(/^\w+\.\w+$/, 'Entity ID must be domain.name format'),
  action: z.enum(['turn_on', 'turn_off', 'toggle']),
  brightness_pct: z.number().min(0).max(100).optional(),
  color_name: z.string().optional(),
});

export const homeSetClimateSchema = z.object({
  entity_id: z.string().regex(/^climate\.\w+$/, 'Entity ID must be climate.name format'),
  temperature: z.number().min(50).max(90),
  hvac_mode: z.enum(['heat', 'cool', 'auto', 'off']).optional(),
});

// =============================================================================
// FINANCE TOOL SCHEMAS
// =============================================================================

export const financeCanAffordSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  description: z.string().optional(),
  timeframe_days: z.number().min(1).max(365).optional(),
});

export const financeProjectWealthSchema = z.object({
  years: z.number().min(1).max(50),
  monthly_savings: z.number().min(0).optional(),
  annual_return_rate: z.number().min(-0.5).max(0.5).optional(),
});

// =============================================================================
// DEFAULT UTILITY TOOL SCHEMAS
// =============================================================================

export const getDatetimeSchema = z.object({
  timezone: z.string().optional(),
  format: z.enum(['full', 'date', 'time', 'relative']).optional(),
});

export const calculateSchema = z.object({
  expression: z.string().min(1, 'Expression is required'),
});

export const getWeatherSchema = z.object({
  city: z.string().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
});

// =============================================================================
// ROUTING DECISION SCHEMA
// =============================================================================

export const routingDecisionSchema = z.object({
  agent: z.enum(['orchestrator', 'coder', 'researcher', 'secretary', 'personality', 'home', 'finance']),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  fallbackAgent: z.enum(['orchestrator', 'coder', 'researcher', 'secretary', 'personality', 'home', 'finance']).optional(),
  toolPlan: z.array(z.string()).optional(),
  source: z.enum(['llm', 'heuristic', 'fallback']),
});

export type RoutingDecisionInput = z.infer<typeof routingDecisionSchema>;

// =============================================================================
// TOOL SCHEMA REGISTRY
// =============================================================================

/**
 * Map of tool names to their validation schemas
 * Used for runtime validation of tool arguments
 */
export const toolSchemaRegistry: Record<string, z.ZodSchema> = {
  // GitHub
  github_search_code: githubSearchCodeSchema,
  github_get_file: githubGetFileSchema,
  github_list_prs: githubListPrsSchema,
  github_create_issue: githubCreateIssueSchema,
  github_create_pr: githubCreatePrSchema,

  // Supabase
  supabase_run_sql: supabaseRunSqlSchema,
  supabase_get_schema: supabaseGetSchemaSchema,
  supabase_vector_search: supabaseVectorSearchSchema,

  // Gmail
  gmail_list_messages: gmailListMessagesSchema,
  gmail_send_message: gmailSendMessageSchema,

  // Calendar
  calendar_list_events: calendarListEventsSchema,
  calendar_create_event: calendarCreateEventSchema,

  // Home Assistant
  control_device: homeControlDeviceSchema,
  set_climate: homeSetClimateSchema,

  // Finance
  can_i_afford: financeCanAffordSchema,
  project_wealth: financeProjectWealthSchema,

  // Default utilities
  get_current_datetime: getDatetimeSchema,
  calculate: calculateSchema,
  get_weather: getWeatherSchema,
};

/**
 * Validate tool arguments against registered schema
 */
export function validateToolArgs(
  toolName: string,
  args: unknown
): { success: true; data: unknown } | { success: false; error: z.ZodError } {
  const schema = toolSchemaRegistry[toolName];

  if (!schema) {
    // No schema registered - pass through (allow unknown tools)
    return { success: true, data: args };
  }

  const result = schema.safeParse(args);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, error: result.error };
}
