/**
 * MCP Integration Index
 * Exports all MCP client functionality
 */

export * from './client';
export * from './config';
export * from './tools/github';
export * from './tools/google';
export * from './tools/supabase';
export * from './tools/home-assistant';
export * from './tools/finance';

import { initGitHubTools } from './tools/github';
import { initGoogleTools } from './tools/google';
import { initSupabaseTools } from './tools/supabase';
import { initHomeAssistantTools } from './tools/home-assistant';

/**
 * Initialize all MCP servers
 */
export async function initializeAllMCPServers() {
  const results = await Promise.allSettled([
    initGitHubTools(),
    initGoogleTools(),
    initSupabaseTools(),
    initHomeAssistantTools(),
  ]);

  const summary = {
    github: results[0].status === 'fulfilled',
    google: results[1].status === 'fulfilled',
    supabase: results[2].status === 'fulfilled',
    homeAssistant: results[3].status === 'fulfilled',
  };

  return summary;
}
