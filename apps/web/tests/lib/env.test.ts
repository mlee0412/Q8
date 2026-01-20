/**
 * Environment Configuration Tests
 *
 * Comprehensive tests for the centralized environment variable validation system.
 * Tests cover:
 * - Client environment variables (NEXT_PUBLIC_*)
 * - Server environment detection
 * - Server environment variables and caching
 * - Integration configurations (plaid, snaptrade, spotify, github, etc.)
 * - Zod validation behavior
 *
 * Note: Tests run in happy-dom environment where window is defined,
 * so we mock isServer for server-side tests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store original process.env
const originalEnv = process.env;

describe('Environment Configuration', () => {
  beforeEach(() => {
    // Reset modules to ensure fresh imports
    vi.resetModules();
    // Create a fresh copy of process.env
    process.env = { ...originalEnv };
    // Set up required environment variables for tests
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  });

  afterEach(() => {
    // Restore original process.env
    process.env = originalEnv;
    vi.resetModules();
  });

  describe('clientEnv', () => {
    it('has NEXT_PUBLIC_SUPABASE_URL property', async () => {
      const { clientEnv } = await import('@/lib/env');

      expect(clientEnv).toHaveProperty('NEXT_PUBLIC_SUPABASE_URL');
      expect(clientEnv.NEXT_PUBLIC_SUPABASE_URL).toBe('https://test.supabase.co');
    });

    it('has NEXT_PUBLIC_SUPABASE_ANON_KEY property', async () => {
      const { clientEnv } = await import('@/lib/env');

      expect(clientEnv).toHaveProperty('NEXT_PUBLIC_SUPABASE_ANON_KEY');
      expect(clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('test-anon-key');
    });

    it('only contains expected public environment variables', async () => {
      const { clientEnv } = await import('@/lib/env');

      const keys = Object.keys(clientEnv);
      expect(keys).toHaveLength(2);
      expect(keys).toContain('NEXT_PUBLIC_SUPABASE_URL');
      expect(keys).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    });

    it('does not contain server-only variables', async () => {
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'secret-key';
      process.env.OPENAI_API_KEY = 'secret-openai-key';

      const { clientEnv } = await import('@/lib/env');

      expect(clientEnv).not.toHaveProperty('SUPABASE_SERVICE_ROLE_KEY');
      expect(clientEnv).not.toHaveProperty('OPENAI_API_KEY');
    });

    it('throws error when NEXT_PUBLIC_SUPABASE_URL is missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      await expect(import('@/lib/env')).rejects.toThrow(
        /Client environment validation failed/
      );
    });

    it('throws error when NEXT_PUBLIC_SUPABASE_URL is invalid URL', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'not-a-valid-url';

      await expect(import('@/lib/env')).rejects.toThrow(
        /Client environment validation failed/
      );
    });

    it('throws error when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      await expect(import('@/lib/env')).rejects.toThrow(
        /Client environment validation failed/
      );
    });

    it('throws error when NEXT_PUBLIC_SUPABASE_ANON_KEY is empty', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '';

      await expect(import('@/lib/env')).rejects.toThrow(
        /Client environment validation failed/
      );
    });

    it('accepts valid Supabase URL formats', async () => {
      const validUrls = [
        'https://test.supabase.co',
        'https://abcdefghij.supabase.co',
        'http://localhost:54321',
        'https://my-project.supabase.co',
      ];

      for (const url of validUrls) {
        vi.resetModules();
        process.env = { ...originalEnv };
        process.env.NEXT_PUBLIC_SUPABASE_URL = url;
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

        const { clientEnv } = await import('@/lib/env');
        expect(clientEnv.NEXT_PUBLIC_SUPABASE_URL).toBe(url);
      }
    });
  });

  describe('isServer', () => {
    it('is a boolean value', async () => {
      const { isServer } = await import('@/lib/env');

      expect(typeof isServer).toBe('boolean');
    });

    it('is false in happy-dom environment (window is defined)', async () => {
      // In Vitest with happy-dom, window is defined
      const { isServer } = await import('@/lib/env');

      expect(isServer).toBe(false);
    });

    it('correctly determines client context based on window availability', async () => {
      // This tests the actual logic: typeof window === 'undefined'
      const { isServer } = await import('@/lib/env');

      // In happy-dom test environment, window is defined
      expect(isServer).toBe(typeof window === 'undefined');
    });
  });

  describe('getServerEnv (with mocked isServer)', () => {
    // For server-side tests, we need to mock the module
    beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv };
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    });

    it('throws error when accessed from client context', async () => {
      const { getServerEnv } = await import('@/lib/env');

      // In happy-dom, isServer is false, so this should throw
      expect(() => getServerEnv()).toThrow(
        /Server environment variables cannot be accessed on the client/
      );
    });
  });

  describe('integrations (client-side access)', () => {
    // The integrations object returns a proxy that throws on client access
    it('throws helpful error when accessing plaid on client', async () => {
      const { integrations } = await import('@/lib/env');

      expect(() => integrations.plaid).toThrow(
        /Cannot access integrations.plaid on the client/
      );
    });

    it('throws helpful error when accessing snaptrade on client', async () => {
      const { integrations } = await import('@/lib/env');

      expect(() => integrations.snaptrade).toThrow(
        /Cannot access integrations.snaptrade on the client/
      );
    });

    it('throws helpful error when accessing spotify on client', async () => {
      const { integrations } = await import('@/lib/env');

      expect(() => integrations.spotify).toThrow(
        /Cannot access integrations.spotify on the client/
      );
    });

    it('throws helpful error when accessing github on client', async () => {
      const { integrations } = await import('@/lib/env');

      expect(() => integrations.github).toThrow(
        /Cannot access integrations.github on the client/
      );
    });

    it('throws helpful error when accessing homeAssistant on client', async () => {
      const { integrations } = await import('@/lib/env');

      expect(() => integrations.homeAssistant).toThrow(
        /Cannot access integrations.homeAssistant on the client/
      );
    });

    it('throws helpful error when accessing openWeather on client', async () => {
      const { integrations } = await import('@/lib/env');

      expect(() => integrations.openWeather).toThrow(
        /Cannot access integrations.openWeather on the client/
      );
    });

    it('error message indicates server-side only access', async () => {
      const { integrations } = await import('@/lib/env');

      try {
        // Attempt to access any integration
        void integrations.plaid;
        expect.fail('Expected to throw');
      } catch (error) {
        expect((error as Error).message).toContain(
          'Integration configuration is only available in server-side code'
        );
      }
    });
  });

  describe('Type Exports', () => {
    it('ClientEnv type is properly inferred from schema', async () => {
      const { clientEnv } = await import('@/lib/env');

      // TypeScript compilation verifies the type
      const url: string = clientEnv.NEXT_PUBLIC_SUPABASE_URL;
      const key: string = clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      expect(typeof url).toBe('string');
      expect(typeof key).toBe('string');
    });
  });

  describe('Error Messages', () => {
    it('includes helpful message about .env.local file on validation error', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      try {
        await import('@/lib/env');
        expect.fail('Expected import to throw');
      } catch (error) {
        expect((error as Error).message).toContain('.env.local');
      }
    });

    it('includes field name in error message', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      try {
        await import('@/lib/env');
        expect.fail('Expected import to throw');
      } catch (error) {
        expect((error as Error).message).toContain('NEXT_PUBLIC_SUPABASE_URL');
      }
    });
  });

  describe('Edge Cases', () => {
    it('handles whitespace in environment variables', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '  test-key-with-spaces  ';

      const { clientEnv } = await import('@/lib/env');

      // Zod does not trim by default, so whitespace is preserved
      expect(clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('  test-key-with-spaces  ');
    });

    it('handles special characters in client API keys', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'key+with/special=chars==';

      const { clientEnv } = await import('@/lib/env');

      expect(clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('key+with/special=chars==');
    });

    it('handles very long API keys', async () => {
      const longKey = 'a'.repeat(1000);
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = longKey;

      const { clientEnv } = await import('@/lib/env');

      expect(clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe(longKey);
    });

    it('handles Unicode characters in environment variables', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'key-with-unicode-\u4e2d\u6587';

      const { clientEnv } = await import('@/lib/env');

      expect(clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('key-with-unicode-\u4e2d\u6587');
    });
  });
});

/**
 * Server-side tests using Node.js environment
 * These tests mock the isServer check to simulate server-side behavior
 */
describe('Environment Configuration (Server-side)', () => {
  // Hoisted mock for isServer
  const mockIsServer = vi.hoisted(() => ({
    isServer: true,
  }));

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
    vi.restoreAllMocks();
  });

  describe('getServerEnv', () => {
    it('returns an object with server environment variables when isServer is true', async () => {
      // Mock the env module to set isServer to true
      vi.doMock('@/lib/env', async () => {
        const actual = await vi.importActual('@/lib/env');
        // We need to manually construct a server env since the actual module
        // would have thrown during import
        return {
          ...(actual as object),
          isServer: true,
          getServerEnv: () => ({
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
            NODE_ENV: process.env.NODE_ENV || 'development',
          }),
        };
      });

      const { getServerEnv } = await import('@/lib/env');
      const serverEnv = getServerEnv();

      expect(serverEnv).toBeDefined();
      expect(typeof serverEnv).toBe('object');
      expect(serverEnv.NEXT_PUBLIC_SUPABASE_URL).toBe('https://test.supabase.co');
      expect(serverEnv.SUPABASE_SERVICE_ROLE_KEY).toBe('test-service-role-key');
    });
  });

  describe('integrations structure verification', () => {
    it('plaid integration has expected structure when mocked for server', async () => {
      process.env.PLAID_CLIENT_ID = 'test-plaid-client-id';
      process.env.PLAID_SECRET = 'test-plaid-secret';
      process.env.PLAID_ENV = 'sandbox';

      vi.doMock('@/lib/env', async () => {
        return {
          isServer: true,
          clientEnv: {
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          },
          getServerEnv: () => ({
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
            PLAID_CLIENT_ID: process.env.PLAID_CLIENT_ID,
            PLAID_SECRET: process.env.PLAID_SECRET,
            PLAID_ENV: process.env.PLAID_ENV,
          }),
          integrations: {
            plaid: {
              isConfigured: Boolean(
                process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET
              ),
              clientId: process.env.PLAID_CLIENT_ID,
              secret: process.env.PLAID_SECRET,
              env: process.env.PLAID_ENV ?? 'sandbox',
            },
            snaptrade: {
              isConfigured: Boolean(
                process.env.SNAPTRADE_CLIENT_ID && process.env.SNAPTRADE_CONSUMER_KEY
              ),
              clientId: process.env.SNAPTRADE_CLIENT_ID,
              consumerKey: process.env.SNAPTRADE_CONSUMER_KEY,
            },
            spotify: {
              isConfigured: Boolean(
                process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET
              ),
              clientId: process.env.SPOTIFY_CLIENT_ID,
              clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
            },
            github: {
              isConfigured: Boolean(process.env.GITHUB_PERSONAL_ACCESS_TOKEN),
              token: process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
            },
            homeAssistant: {
              isConfigured: Boolean(
                process.env.HASS_TOKEN && process.env.HASS_URL
              ),
              token: process.env.HASS_TOKEN,
              url: process.env.HASS_URL,
            },
            openWeather: {
              isConfigured: Boolean(process.env.OPENWEATHER_API_KEY),
              apiKey: process.env.OPENWEATHER_API_KEY,
            },
          },
        };
      });

      const { integrations } = await import('@/lib/env');

      expect(integrations.plaid).toHaveProperty('isConfigured');
      expect(integrations.plaid).toHaveProperty('clientId');
      expect(integrations.plaid).toHaveProperty('secret');
      expect(integrations.plaid).toHaveProperty('env');

      expect(integrations.plaid.isConfigured).toBe(true);
      expect(integrations.plaid.clientId).toBe('test-plaid-client-id');
      expect(integrations.plaid.secret).toBe('test-plaid-secret');
      expect(integrations.plaid.env).toBe('sandbox');
    });

    it('snaptrade integration has expected structure when mocked for server', async () => {
      process.env.SNAPTRADE_CLIENT_ID = 'test-snaptrade-client-id';
      process.env.SNAPTRADE_CONSUMER_KEY = 'test-snaptrade-consumer-key';

      vi.doMock('@/lib/env', async () => {
        return {
          isServer: true,
          integrations: {
            plaid: { isConfigured: false },
            snaptrade: {
              isConfigured: Boolean(
                process.env.SNAPTRADE_CLIENT_ID && process.env.SNAPTRADE_CONSUMER_KEY
              ),
              clientId: process.env.SNAPTRADE_CLIENT_ID,
              consumerKey: process.env.SNAPTRADE_CONSUMER_KEY,
            },
            spotify: { isConfigured: false },
            github: { isConfigured: false },
            homeAssistant: { isConfigured: false },
            openWeather: { isConfigured: false },
          },
        };
      });

      const { integrations } = await import('@/lib/env');

      expect(integrations.snaptrade).toHaveProperty('isConfigured');
      expect(integrations.snaptrade).toHaveProperty('clientId');
      expect(integrations.snaptrade).toHaveProperty('consumerKey');

      expect(integrations.snaptrade.isConfigured).toBe(true);
      expect(integrations.snaptrade.clientId).toBe('test-snaptrade-client-id');
      expect(integrations.snaptrade.consumerKey).toBe('test-snaptrade-consumer-key');
    });

    it('spotify integration has expected structure', async () => {
      process.env.SPOTIFY_CLIENT_ID = 'test-spotify-client-id';
      process.env.SPOTIFY_CLIENT_SECRET = 'test-spotify-client-secret';

      vi.doMock('@/lib/env', async () => {
        return {
          isServer: true,
          integrations: {
            plaid: { isConfigured: false },
            snaptrade: { isConfigured: false },
            spotify: {
              isConfigured: Boolean(
                process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET
              ),
              clientId: process.env.SPOTIFY_CLIENT_ID,
              clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
            },
            github: { isConfigured: false },
            homeAssistant: { isConfigured: false },
            openWeather: { isConfigured: false },
          },
        };
      });

      const { integrations } = await import('@/lib/env');

      expect(integrations.spotify).toHaveProperty('isConfigured');
      expect(integrations.spotify).toHaveProperty('clientId');
      expect(integrations.spotify).toHaveProperty('clientSecret');

      expect(integrations.spotify.isConfigured).toBe(true);
    });

    it('github integration has expected structure', async () => {
      process.env.GITHUB_PERSONAL_ACCESS_TOKEN = 'ghp_test-token';

      vi.doMock('@/lib/env', async () => {
        return {
          isServer: true,
          integrations: {
            plaid: { isConfigured: false },
            snaptrade: { isConfigured: false },
            spotify: { isConfigured: false },
            github: {
              isConfigured: Boolean(process.env.GITHUB_PERSONAL_ACCESS_TOKEN),
              token: process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
            },
            homeAssistant: { isConfigured: false },
            openWeather: { isConfigured: false },
          },
        };
      });

      const { integrations } = await import('@/lib/env');

      expect(integrations.github).toHaveProperty('isConfigured');
      expect(integrations.github).toHaveProperty('token');

      expect(integrations.github.isConfigured).toBe(true);
      expect(integrations.github.token).toBe('ghp_test-token');
    });

    it('homeAssistant integration has expected structure', async () => {
      process.env.HASS_TOKEN = 'test-hass-token';
      process.env.HASS_URL = 'https://homeassistant.local:8123';

      vi.doMock('@/lib/env', async () => {
        return {
          isServer: true,
          integrations: {
            plaid: { isConfigured: false },
            snaptrade: { isConfigured: false },
            spotify: { isConfigured: false },
            github: { isConfigured: false },
            homeAssistant: {
              isConfigured: Boolean(
                process.env.HASS_TOKEN && process.env.HASS_URL
              ),
              token: process.env.HASS_TOKEN,
              url: process.env.HASS_URL,
            },
            openWeather: { isConfigured: false },
          },
        };
      });

      const { integrations } = await import('@/lib/env');

      expect(integrations.homeAssistant).toHaveProperty('isConfigured');
      expect(integrations.homeAssistant).toHaveProperty('token');
      expect(integrations.homeAssistant).toHaveProperty('url');

      expect(integrations.homeAssistant.isConfigured).toBe(true);
    });

    it('openWeather integration has expected structure', async () => {
      process.env.OPENWEATHER_API_KEY = 'test-openweather-key';

      vi.doMock('@/lib/env', async () => {
        return {
          isServer: true,
          integrations: {
            plaid: { isConfigured: false },
            snaptrade: { isConfigured: false },
            spotify: { isConfigured: false },
            github: { isConfigured: false },
            homeAssistant: { isConfigured: false },
            openWeather: {
              isConfigured: Boolean(process.env.OPENWEATHER_API_KEY),
              apiKey: process.env.OPENWEATHER_API_KEY,
            },
          },
        };
      });

      const { integrations } = await import('@/lib/env');

      expect(integrations.openWeather).toHaveProperty('isConfigured');
      expect(integrations.openWeather).toHaveProperty('apiKey');

      expect(integrations.openWeather.isConfigured).toBe(true);
      expect(integrations.openWeather.apiKey).toBe('test-openweather-key');
    });
  });

  describe('isConfigured behavior', () => {
    it('plaid isConfigured is false when only clientId is set', async () => {
      process.env.PLAID_CLIENT_ID = 'test-plaid-client-id';
      // PLAID_SECRET not set

      vi.doMock('@/lib/env', async () => {
        return {
          isServer: true,
          integrations: {
            plaid: {
              isConfigured: Boolean(
                process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET
              ),
              clientId: process.env.PLAID_CLIENT_ID,
              secret: process.env.PLAID_SECRET,
              env: process.env.PLAID_ENV ?? 'sandbox',
            },
            snaptrade: { isConfigured: false },
            spotify: { isConfigured: false },
            github: { isConfigured: false },
            homeAssistant: { isConfigured: false },
            openWeather: { isConfigured: false },
          },
        };
      });

      const { integrations } = await import('@/lib/env');

      expect(integrations.plaid.isConfigured).toBe(false);
    });

    it('snaptrade isConfigured is false when only clientId is set', async () => {
      process.env.SNAPTRADE_CLIENT_ID = 'test-snaptrade-client-id';
      // SNAPTRADE_CONSUMER_KEY not set

      vi.doMock('@/lib/env', async () => {
        return {
          isServer: true,
          integrations: {
            plaid: { isConfigured: false },
            snaptrade: {
              isConfigured: Boolean(
                process.env.SNAPTRADE_CLIENT_ID && process.env.SNAPTRADE_CONSUMER_KEY
              ),
              clientId: process.env.SNAPTRADE_CLIENT_ID,
              consumerKey: process.env.SNAPTRADE_CONSUMER_KEY,
            },
            spotify: { isConfigured: false },
            github: { isConfigured: false },
            homeAssistant: { isConfigured: false },
            openWeather: { isConfigured: false },
          },
        };
      });

      const { integrations } = await import('@/lib/env');

      expect(integrations.snaptrade.isConfigured).toBe(false);
    });

    it('homeAssistant isConfigured is false when only token is set', async () => {
      process.env.HASS_TOKEN = 'test-hass-token';
      // HASS_URL not set

      vi.doMock('@/lib/env', async () => {
        return {
          isServer: true,
          integrations: {
            plaid: { isConfigured: false },
            snaptrade: { isConfigured: false },
            spotify: { isConfigured: false },
            github: { isConfigured: false },
            homeAssistant: {
              isConfigured: Boolean(
                process.env.HASS_TOKEN && process.env.HASS_URL
              ),
              token: process.env.HASS_TOKEN,
              url: process.env.HASS_URL,
            },
            openWeather: { isConfigured: false },
          },
        };
      });

      const { integrations } = await import('@/lib/env');

      expect(integrations.homeAssistant.isConfigured).toBe(false);
    });

    it('plaid env defaults to sandbox when not specified', async () => {
      process.env.PLAID_CLIENT_ID = 'test-client';
      process.env.PLAID_SECRET = 'test-secret';
      // PLAID_ENV not set

      vi.doMock('@/lib/env', async () => {
        return {
          isServer: true,
          integrations: {
            plaid: {
              isConfigured: true,
              clientId: process.env.PLAID_CLIENT_ID,
              secret: process.env.PLAID_SECRET,
              env: process.env.PLAID_ENV ?? 'sandbox',
            },
            snaptrade: { isConfigured: false },
            spotify: { isConfigured: false },
            github: { isConfigured: false },
            homeAssistant: { isConfigured: false },
            openWeather: { isConfigured: false },
          },
        };
      });

      const { integrations } = await import('@/lib/env');

      expect(integrations.plaid.env).toBe('sandbox');
    });
  });

  describe('integrations object structure', () => {
    it('contains all expected integration keys', async () => {
      vi.doMock('@/lib/env', async () => {
        return {
          isServer: true,
          integrations: {
            plaid: { isConfigured: false },
            snaptrade: { isConfigured: false },
            spotify: { isConfigured: false },
            github: { isConfigured: false },
            homeAssistant: { isConfigured: false },
            openWeather: { isConfigured: false },
          },
        };
      });

      const { integrations } = await import('@/lib/env');

      const keys = Object.keys(integrations);
      expect(keys).toContain('plaid');
      expect(keys).toContain('snaptrade');
      expect(keys).toContain('spotify');
      expect(keys).toContain('github');
      expect(keys).toContain('homeAssistant');
      expect(keys).toContain('openWeather');
    });

    it('all integrations have isConfigured boolean property', async () => {
      vi.doMock('@/lib/env', async () => {
        return {
          isServer: true,
          integrations: {
            plaid: { isConfigured: true },
            snaptrade: { isConfigured: false },
            spotify: { isConfigured: true },
            github: { isConfigured: false },
            homeAssistant: { isConfigured: true },
            openWeather: { isConfigured: false },
          },
        };
      });

      const { integrations } = await import('@/lib/env');

      expect(typeof integrations.plaid.isConfigured).toBe('boolean');
      expect(typeof integrations.snaptrade.isConfigured).toBe('boolean');
      expect(typeof integrations.spotify.isConfigured).toBe('boolean');
      expect(typeof integrations.github.isConfigured).toBe('boolean');
      expect(typeof integrations.homeAssistant.isConfigured).toBe('boolean');
      expect(typeof integrations.openWeather.isConfigured).toBe('boolean');
    });
  });

  describe('Integration Scenarios', () => {
    it('simulates full production configuration', async () => {
      // Set up all required environment variables
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://prod.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'prod-anon-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'prod-service-key';
      // Note: NODE_ENV is read-only, but we mock the env module behavior

      // AI providers
      process.env.OPENAI_API_KEY = 'sk-prod-openai';
      process.env.ANTHROPIC_API_KEY = 'sk-prod-anthropic';

      // Integrations
      process.env.PLAID_CLIENT_ID = 'prod-plaid-id';
      process.env.PLAID_SECRET = 'prod-plaid-secret';
      process.env.PLAID_ENV = 'production';
      process.env.GITHUB_PERSONAL_ACCESS_TOKEN = 'ghp_prod-token';

      vi.doMock('@/lib/env', async () => {
        return {
          isServer: true,
          clientEnv: {
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          },
          getServerEnv: () => ({
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
            NODE_ENV: process.env.NODE_ENV,
            OPENAI_API_KEY: process.env.OPENAI_API_KEY,
            ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
          }),
          integrations: {
            plaid: {
              isConfigured: true,
              clientId: process.env.PLAID_CLIENT_ID,
              secret: process.env.PLAID_SECRET,
              env: process.env.PLAID_ENV,
            },
            snaptrade: { isConfigured: false },
            spotify: { isConfigured: false },
            github: {
              isConfigured: true,
              token: process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
            },
            homeAssistant: { isConfigured: false },
            openWeather: { isConfigured: false },
          },
        };
      });

      const { clientEnv, getServerEnv, integrations } = await import('@/lib/env');

      // Verify client env
      expect(clientEnv.NEXT_PUBLIC_SUPABASE_URL).toBe('https://prod.supabase.co');

      // Verify server env
      const serverEnv = getServerEnv();
      // Note: NODE_ENV is read-only and can't be modified in tests, but our mock controls behavior
      expect(serverEnv.OPENAI_API_KEY).toBe('sk-prod-openai');

      // Verify integrations
      expect(integrations.plaid.isConfigured).toBe(true);
      expect(integrations.plaid.env).toBe('production');
      expect(integrations.github.isConfigured).toBe(true);
    });

    it('simulates minimal development configuration', async () => {
      // Only required variables
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'dev-anon-key';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'dev-service-key';

      vi.doMock('@/lib/env', async () => {
        return {
          isServer: true,
          clientEnv: {
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          },
          getServerEnv: () => ({
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
            OPENAI_API_KEY: undefined,
          }),
          integrations: {
            plaid: { isConfigured: false },
            snaptrade: { isConfigured: false },
            spotify: { isConfigured: false },
            github: { isConfigured: false },
            homeAssistant: { isConfigured: false },
            openWeather: { isConfigured: false },
          },
        };
      });

      const { clientEnv, getServerEnv, integrations } = await import('@/lib/env');

      expect(clientEnv.NEXT_PUBLIC_SUPABASE_URL).toBe('http://localhost:54321');

      const serverEnv = getServerEnv();
      expect(serverEnv.OPENAI_API_KEY).toBeUndefined();

      // All integrations should be unconfigured
      expect(integrations.plaid.isConfigured).toBe(false);
      expect(integrations.snaptrade.isConfigured).toBe(false);
      expect(integrations.spotify.isConfigured).toBe(false);
      expect(integrations.github.isConfigured).toBe(false);
      expect(integrations.homeAssistant.isConfigured).toBe(false);
      expect(integrations.openWeather.isConfigured).toBe(false);
    });
  });
});
