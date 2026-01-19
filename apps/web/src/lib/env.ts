/**
 * Centralized Environment Variable Validation
 *
 * This module validates environment variables based on context:
 * - Client (browser): Only NEXT_PUBLIC_* variables are available
 * - Server: All variables including secrets
 *
 * Usage:
 * ```typescript
 * // For client-safe code (works everywhere)
 * import { clientEnv } from '@/lib/env';
 * const client = createClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);
 *
 * // For server-only code (API routes, Server Components)
 * import { getServerEnv, integrations } from '@/lib/env';
 * const serverVars = getServerEnv();
 * if (integrations.plaid.isConfigured) { ... }
 * ```
 */

import { z } from 'zod';

/**
 * Check if we're running on the server
 */
export const isServer = typeof window === 'undefined';

/**
 * Client-side environment variables schema
 * These are exposed to the browser via NEXT_PUBLIC_ prefix
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
});

/**
 * Server-side environment variables schema
 * These are only available on the server
 */
const serverOnlyEnvSchema = z.object({
  // Supabase Server Keys
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required'),
  SUPABASE_ACCESS_TOKEN: z.string().optional(),
  SUPABASE_PROJECT_ID: z.string().optional(),

  // AI Providers (At least one required)
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_KEY: z.string().optional(),
  PERPLEXITY_API_KEY: z.string().optional(),
  XAI_API_KEY: z.string().optional(),

  // Tool Integrations (Optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_PERSONAL_ACCESS_TOKEN: z.string().optional(),
  SPOTIFY_CLIENT_ID: z.string().optional(),
  SPOTIFY_CLIENT_SECRET: z.string().optional(),
  SQUARE_ACCESS_TOKEN: z.string().optional(),
  HASS_TOKEN: z.string().optional(),
  HASS_URL: z.string().url().optional().or(z.literal('')),
  OPENWEATHER_API_KEY: z.string().optional(),

  // Finance Integrations
  PLAID_CLIENT_ID: z.string().optional(),
  PLAID_SECRET: z.string().optional(),
  PLAID_ENV: z.enum(['sandbox', 'development', 'production']).optional(),
  SNAPTRADE_CLIENT_ID: z.string().optional(),
  SNAPTRADE_CONSUMER_KEY: z.string().optional(),

  // Upstash Redis (Rate Limiting)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  RATE_LIMIT_ENABLED: z
    .string()
    .optional()
    .transform((val) => val !== 'false'),

  // MCP Server URLs
  GITHUB_MCP_URL: z.string().url().optional(),
  GOOGLE_MCP_URL: z.string().url().optional(),
  SUPABASE_MCP_URL: z.string().url().optional(),
  HOME_ASSISTANT_MCP_URL: z.string().url().optional(),

  // Vercel (Auto-populated in deployment)
  VERCEL_URL: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

/**
 * Full server environment schema (includes client vars)
 */
const fullServerEnvSchema = clientEnvSchema.merge(serverOnlyEnvSchema);

export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type ServerEnv = z.infer<typeof fullServerEnvSchema>;

/**
 * Validate and return client environment variables
 * Safe to use in both client and server contexts
 */
function validateClientEnv(): ClientEnv {
  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const errorMessages = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${msgs?.join(', ')}`)
      .join('\n');

    throw new Error(
      `Client environment validation failed:\n${errorMessages}\n\nPlease check your .env.local file.`
    );
  }

  return parsed.data;
}

/**
 * Validate and return all server environment variables
 * Only call this on the server!
 */
function validateServerEnv(): ServerEnv {
  if (!isServer) {
    throw new Error('Server environment variables cannot be accessed on the client');
  }

  const parsed = fullServerEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const errorMessages = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${msgs?.join(', ')}`)
      .join('\n');

    throw new Error(
      `Server environment validation failed:\n${errorMessages}\n\nPlease check your .env.local file.`
    );
  }

  return parsed.data;
}

/**
 * Client environment variables
 * Safe to use everywhere - only includes NEXT_PUBLIC_* variables
 */
export const clientEnv = validateClientEnv();

/**
 * Server environment variables cache
 */
let _serverEnv: ServerEnv | null = null;

/**
 * Get server environment variables
 * Only use in server-side code (API routes, Server Components, etc.)
 */
export function getServerEnv(): ServerEnv {
  if (!isServer) {
    throw new Error('Server environment variables cannot be accessed on the client');
  }
  if (!_serverEnv) {
    _serverEnv = validateServerEnv();
  }
  return _serverEnv;
}

/**
 * Type-safe environment variable access for specific integrations
 * Server-only - will throw if accessed on client
 */
function createIntegrations() {
  if (!isServer) {
    // Return a proxy that throws helpful errors on client access
    const handler: ProxyHandler<typeof placeholderIntegrations> = {
      get(_, prop) {
        throw new Error(
          `Cannot access integrations.${String(prop)} on the client. ` +
            'Integration configuration is only available in server-side code.'
        );
      },
    };
    return new Proxy(placeholderIntegrations, handler);
  }

  const serverVars = getServerEnv();

  return {
    plaid: {
      isConfigured: Boolean(serverVars.PLAID_CLIENT_ID && serverVars.PLAID_SECRET),
      clientId: serverVars.PLAID_CLIENT_ID,
      secret: serverVars.PLAID_SECRET,
      env: serverVars.PLAID_ENV ?? 'sandbox',
    },
    snaptrade: {
      isConfigured: Boolean(serverVars.SNAPTRADE_CLIENT_ID && serverVars.SNAPTRADE_CONSUMER_KEY),
      clientId: serverVars.SNAPTRADE_CLIENT_ID,
      consumerKey: serverVars.SNAPTRADE_CONSUMER_KEY,
    },
    spotify: {
      isConfigured: Boolean(serverVars.SPOTIFY_CLIENT_ID && serverVars.SPOTIFY_CLIENT_SECRET),
      clientId: serverVars.SPOTIFY_CLIENT_ID,
      clientSecret: serverVars.SPOTIFY_CLIENT_SECRET,
    },
    github: {
      isConfigured: Boolean(serverVars.GITHUB_PERSONAL_ACCESS_TOKEN),
      token: serverVars.GITHUB_PERSONAL_ACCESS_TOKEN,
    },
    homeAssistant: {
      isConfigured: Boolean(serverVars.HASS_TOKEN && serverVars.HASS_URL),
      token: serverVars.HASS_TOKEN,
      url: serverVars.HASS_URL,
    },
    openWeather: {
      isConfigured: Boolean(serverVars.OPENWEATHER_API_KEY),
      apiKey: serverVars.OPENWEATHER_API_KEY,
    },
  } as const;
}

// Placeholder for type inference
const placeholderIntegrations = {
  plaid: {
    isConfigured: false as boolean,
    clientId: undefined as string | undefined,
    secret: undefined as string | undefined,
    env: 'sandbox' as 'sandbox' | 'development' | 'production',
  },
  snaptrade: {
    isConfigured: false as boolean,
    clientId: undefined as string | undefined,
    consumerKey: undefined as string | undefined,
  },
  spotify: {
    isConfigured: false as boolean,
    clientId: undefined as string | undefined,
    clientSecret: undefined as string | undefined,
  },
  github: {
    isConfigured: false as boolean,
    token: undefined as string | undefined,
  },
  homeAssistant: {
    isConfigured: false as boolean,
    token: undefined as string | undefined,
    url: undefined as string | undefined,
  },
  openWeather: {
    isConfigured: false as boolean,
    apiKey: undefined as string | undefined,
  },
};

export const integrations = createIntegrations();
