/**
 * Centralized MCP Server Configuration
 *
 * All MCP server URLs and settings are configured here.
 * Uses environment variables with sensible defaults for local development.
 *
 * Usage:
 * ```typescript
 * import { MCP_CONFIG } from '@/lib/mcp/config';
 *
 * const url = MCP_CONFIG.github.url();
 * ```
 */

import { getServerEnv, isServer } from '@/lib/env';

/**
 * Get MCP URL from environment or use default
 * Safe for both client and server contexts (defaults to localhost)
 */
function getMcpUrl(
  envKey: string,
  defaultUrl: string
): () => string {
  return () => {
    if (isServer) {
      const serverEnv = getServerEnv();
      const url = serverEnv[envKey as keyof typeof serverEnv];
      return (typeof url === 'string' && url) || defaultUrl;
    }
    return defaultUrl;
  };
}

/**
 * MCP Server Configuration
 *
 * Each server has:
 * - url: Function that returns the server URL (lazy-evaluated for env access)
 * - timeout: Request timeout in milliseconds
 * - description: Human-readable description
 */
export const MCP_CONFIG = {
  github: {
    url: getMcpUrl('GITHUB_MCP_URL', 'http://localhost:3001'),
    timeout: 30000,
    description: 'GitHub operations (PRs, issues, code search)',
  },
  google: {
    url: getMcpUrl('GOOGLE_MCP_URL', 'http://localhost:3002'),
    timeout: 30000,
    description: 'Google Workspace (Calendar, Gmail, Drive)',
  },
  supabase: {
    url: getMcpUrl('SUPABASE_MCP_URL', 'http://localhost:3003'),
    timeout: 30000,
    description: 'Supabase operations (SQL, migrations)',
  },
  homeAssistant: {
    url: getMcpUrl('HOME_ASSISTANT_MCP_URL', 'http://localhost:3004'),
    timeout: 10000, // Lower timeout for responsive smart home control
    description: 'Home Assistant smart home control',
    get apiUrl(): string {
      if (isServer) {
        return getServerEnv().HASS_URL || 'http://homeassistant.local:8123';
      }
      return 'http://homeassistant.local:8123';
    },
    get token(): string | undefined {
      if (isServer) {
        return getServerEnv().HASS_TOKEN;
      }
      return undefined;
    },
  },
} as const;

export type MCPServerName = keyof typeof MCP_CONFIG;

/**
 * Get all MCP server names
 */
export function getMCPServerNames(): MCPServerName[] {
  return Object.keys(MCP_CONFIG) as MCPServerName[];
}

/**
 * Check if a specific MCP server is likely reachable
 * (Based on configuration being present)
 */
export function isMCPServerConfigured(server: MCPServerName): boolean {
  if (!isServer) return false;

  const serverEnv = getServerEnv();
  switch (server) {
    case 'github':
      return Boolean(serverEnv.GITHUB_MCP_URL || serverEnv.GITHUB_PERSONAL_ACCESS_TOKEN);
    case 'google':
      return Boolean(serverEnv.GOOGLE_MCP_URL || serverEnv.GOOGLE_CLIENT_ID);
    case 'supabase':
      return Boolean(serverEnv.SUPABASE_MCP_URL || serverEnv.SUPABASE_SERVICE_ROLE_KEY);
    case 'homeAssistant':
      return Boolean(serverEnv.HOME_ASSISTANT_MCP_URL || serverEnv.HASS_TOKEN);
    default:
      return false;
  }
}
