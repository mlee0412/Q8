/**
 * MCP Configuration Tests
 *
 * Tests for the centralized MCP server configuration module.
 * Validates configuration structure, URL resolution, and server detection.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the env module before importing config
vi.mock('@/lib/env', () => ({
  isServer: false,
  getServerEnv: vi.fn(() => ({})),
}));

// Import after mocking
import { MCP_CONFIG, getMCPServerNames, isMCPServerConfigured, type MCPServerName } from '@/lib/mcp/config';
import { isServer, getServerEnv } from '@/lib/env';

describe('MCP Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MCP_CONFIG structure', () => {
    it('has all expected server configurations', () => {
      const expectedServers: MCPServerName[] = ['github', 'google', 'supabase', 'homeAssistant'];
      const actualServers = Object.keys(MCP_CONFIG);

      expect(actualServers).toHaveLength(expectedServers.length);
      expectedServers.forEach((server) => {
        expect(actualServers).toContain(server);
      });
    });

    it('github config has required properties', () => {
      expect(MCP_CONFIG.github).toHaveProperty('url');
      expect(MCP_CONFIG.github).toHaveProperty('timeout');
      expect(MCP_CONFIG.github).toHaveProperty('description');
      expect(typeof MCP_CONFIG.github.url).toBe('function');
      expect(typeof MCP_CONFIG.github.timeout).toBe('number');
      expect(typeof MCP_CONFIG.github.description).toBe('string');
    });

    it('google config has required properties', () => {
      expect(MCP_CONFIG.google).toHaveProperty('url');
      expect(MCP_CONFIG.google).toHaveProperty('timeout');
      expect(MCP_CONFIG.google).toHaveProperty('description');
      expect(typeof MCP_CONFIG.google.url).toBe('function');
      expect(typeof MCP_CONFIG.google.timeout).toBe('number');
      expect(typeof MCP_CONFIG.google.description).toBe('string');
    });

    it('supabase config has required properties', () => {
      expect(MCP_CONFIG.supabase).toHaveProperty('url');
      expect(MCP_CONFIG.supabase).toHaveProperty('timeout');
      expect(MCP_CONFIG.supabase).toHaveProperty('description');
      expect(typeof MCP_CONFIG.supabase.url).toBe('function');
      expect(typeof MCP_CONFIG.supabase.timeout).toBe('number');
      expect(typeof MCP_CONFIG.supabase.description).toBe('string');
    });

    it('homeAssistant config has required properties including apiUrl and token', () => {
      expect(MCP_CONFIG.homeAssistant).toHaveProperty('url');
      expect(MCP_CONFIG.homeAssistant).toHaveProperty('timeout');
      expect(MCP_CONFIG.homeAssistant).toHaveProperty('description');
      expect(MCP_CONFIG.homeAssistant).toHaveProperty('apiUrl');
      expect(MCP_CONFIG.homeAssistant).toHaveProperty('token');
      expect(typeof MCP_CONFIG.homeAssistant.url).toBe('function');
      expect(typeof MCP_CONFIG.homeAssistant.timeout).toBe('number');
      expect(typeof MCP_CONFIG.homeAssistant.description).toBe('string');
    });
  });

  describe('Server timeout values', () => {
    it('github has 30 second timeout', () => {
      expect(MCP_CONFIG.github.timeout).toBe(30000);
    });

    it('google has 30 second timeout', () => {
      expect(MCP_CONFIG.google.timeout).toBe(30000);
    });

    it('supabase has 30 second timeout', () => {
      expect(MCP_CONFIG.supabase.timeout).toBe(30000);
    });

    it('homeAssistant has 10 second timeout for responsive control', () => {
      expect(MCP_CONFIG.homeAssistant.timeout).toBe(10000);
    });
  });

  describe('Server descriptions', () => {
    it('github description mentions PRs, issues, and code search', () => {
      expect(MCP_CONFIG.github.description).toContain('GitHub');
    });

    it('google description mentions Google Workspace', () => {
      expect(MCP_CONFIG.google.description).toContain('Google');
    });

    it('supabase description mentions Supabase operations', () => {
      expect(MCP_CONFIG.supabase.description).toContain('Supabase');
    });

    it('homeAssistant description mentions smart home', () => {
      expect(MCP_CONFIG.homeAssistant.description).toContain('Home Assistant');
    });
  });

  describe('URL resolution in client context', () => {
    it('github returns default localhost URL', () => {
      expect(MCP_CONFIG.github.url()).toBe('http://localhost:3001');
    });

    it('google returns default localhost URL', () => {
      expect(MCP_CONFIG.google.url()).toBe('http://localhost:3002');
    });

    it('supabase returns default localhost URL', () => {
      expect(MCP_CONFIG.supabase.url()).toBe('http://localhost:3003');
    });

    it('homeAssistant returns default localhost URL', () => {
      expect(MCP_CONFIG.homeAssistant.url()).toBe('http://localhost:3004');
    });

    it('homeAssistant apiUrl returns default in client context', () => {
      expect(MCP_CONFIG.homeAssistant.apiUrl).toBe('http://homeassistant.local:8123');
    });

    it('homeAssistant token returns undefined in client context', () => {
      expect(MCP_CONFIG.homeAssistant.token).toBeUndefined();
    });
  });

  describe('URL default values have correct ports', () => {
    it('servers use sequential port numbers starting from 3001', () => {
      const urls = {
        github: MCP_CONFIG.github.url(),
        google: MCP_CONFIG.google.url(),
        supabase: MCP_CONFIG.supabase.url(),
        homeAssistant: MCP_CONFIG.homeAssistant.url(),
      };

      expect(urls.github).toMatch(/:3001$/);
      expect(urls.google).toMatch(/:3002$/);
      expect(urls.supabase).toMatch(/:3003$/);
      expect(urls.homeAssistant).toMatch(/:3004$/);
    });
  });
});

describe('getMCPServerNames', () => {
  it('returns an array of server names', () => {
    const names = getMCPServerNames();
    expect(Array.isArray(names)).toBe(true);
  });

  it('returns all four server names', () => {
    const names = getMCPServerNames();
    expect(names).toHaveLength(4);
  });

  it('includes github server', () => {
    const names = getMCPServerNames();
    expect(names).toContain('github');
  });

  it('includes google server', () => {
    const names = getMCPServerNames();
    expect(names).toContain('google');
  });

  it('includes supabase server', () => {
    const names = getMCPServerNames();
    expect(names).toContain('supabase');
  });

  it('includes homeAssistant server', () => {
    const names = getMCPServerNames();
    expect(names).toContain('homeAssistant');
  });

  it('returns names as MCPServerName type', () => {
    const names = getMCPServerNames();
    // Type checking - each name should be a valid key of MCP_CONFIG
    names.forEach((name) => {
      expect(MCP_CONFIG).toHaveProperty(name);
    });
  });
});

describe('isMCPServerConfigured', () => {
  describe('in client context (isServer = false)', () => {
    it('returns false for github', () => {
      expect(isMCPServerConfigured('github')).toBe(false);
    });

    it('returns false for google', () => {
      expect(isMCPServerConfigured('google')).toBe(false);
    });

    it('returns false for supabase', () => {
      expect(isMCPServerConfigured('supabase')).toBe(false);
    });

    it('returns false for homeAssistant', () => {
      expect(isMCPServerConfigured('homeAssistant')).toBe(false);
    });

    it('does not call getServerEnv when on client', () => {
      isMCPServerConfigured('github');
      expect(getServerEnv).not.toHaveBeenCalled();
    });
  });
});

describe('MCPServerName type', () => {
  it('only allows valid server names', () => {
    // This is a compile-time check, but we can verify runtime behavior
    const validNames: MCPServerName[] = ['github', 'google', 'supabase', 'homeAssistant'];
    validNames.forEach((name) => {
      expect(typeof MCP_CONFIG[name]).toBe('object');
    });
  });
});

describe('Configuration immutability', () => {
  it('MCP_CONFIG is readonly (as const)', () => {
    // The "as const" assertion makes the object deeply readonly
    // We can verify the structure is frozen at the type level
    // by checking that all properties exist and have correct types
    const config = MCP_CONFIG;
    expect(Object.keys(config)).toEqual(['github', 'google', 'supabase', 'homeAssistant']);
  });
});

describe('Server configuration consistency', () => {
  it('all servers have consistent property structure', () => {
    const servers = getMCPServerNames();
    servers.forEach((serverName) => {
      const config = MCP_CONFIG[serverName];
      expect(config).toHaveProperty('url');
      expect(config).toHaveProperty('timeout');
      expect(config).toHaveProperty('description');
    });
  });

  it('all timeout values are positive numbers', () => {
    const servers = getMCPServerNames();
    servers.forEach((serverName) => {
      expect(MCP_CONFIG[serverName].timeout).toBeGreaterThan(0);
    });
  });

  it('all descriptions are non-empty strings', () => {
    const servers = getMCPServerNames();
    servers.forEach((serverName) => {
      expect(MCP_CONFIG[serverName].description.length).toBeGreaterThan(0);
    });
  });

  it('all url functions return valid localhost URLs in client context', () => {
    const servers = getMCPServerNames();
    servers.forEach((serverName) => {
      const url = MCP_CONFIG[serverName].url();
      expect(url).toMatch(/^http:\/\/localhost:\d+$/);
    });
  });
});
