/**
 * GitHub MCP Tool Definitions
 * Wrappers for GitHub MCP server tools
 */

import { mcpClient } from '../client';

export const GITHUB_MCP_URL = process.env.GITHUB_MCP_URL || 'http://localhost:3001';

/**
 * Initialize GitHub MCP tools
 */
export async function initGitHubTools() {
  await mcpClient.registerServer('github', GITHUB_MCP_URL);
  return mcpClient.getServerTools('github');
}

/**
 * GitHub tool helper functions
 */

export async function searchCode(query: string, repo?: string) {
  return mcpClient.executeTool('github_search_code', { query, repo });
}

export async function getFileContent(repo: string, path: string, ref?: string) {
  return mcpClient.executeTool('github_get_file', { repo, path, ref });
}

export async function createIssue(repo: string, title: string, body: string) {
  return mcpClient.executeTool('github_create_issue', { repo, title, body });
}

export async function createPR(repo: string, title: string, head: string, base: string, body?: string) {
  return mcpClient.executeTool('github_create_pr', { repo, title, head, base, body });
}

export async function listPRs(repo: string, state?: 'open' | 'closed' | 'all') {
  return mcpClient.executeTool('github_list_prs', { repo, state });
}

export async function triggerWorkflow(repo: string, workflowId: string, ref: string) {
  return mcpClient.executeTool('github_trigger_workflow', { repo, workflowId, ref });
}
