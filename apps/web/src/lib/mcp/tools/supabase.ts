/**
 * Supabase MCP Tool Definitions
 * Database and backend operations
 */

import { mcpClient } from '../client';

export const SUPABASE_MCP_URL = process.env.SUPABASE_MCP_URL || 'http://localhost:3003';

/**
 * Initialize Supabase MCP tools
 */
export async function initSupabaseTools() {
  await mcpClient.registerServer('supabase', SUPABASE_MCP_URL);
  return mcpClient.getServerTools('supabase');
}

/**
 * Supabase tool helper functions
 */

export async function runSQL(query: string) {
  return mcpClient.executeTool('supabase_run_sql', { query });
}

export async function getSchema(table?: string) {
  return mcpClient.executeTool('supabase_get_schema', { table });
}

export async function vectorSearch(query: string, table: string, limit?: number) {
  return mcpClient.executeTool('supabase_vector_search', { query, table, limit });
}
