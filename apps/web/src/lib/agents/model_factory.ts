/**
 * Model Factory - Multi-Provider Model Selection with Fallbacks
 *
 * This module provides intelligent model routing with:
 * - Environment-driven model overrides (Q8_ROUTER_MODEL, Q8_CODER_MODEL, etc.)
 * - Automatic fallback chains when primary models are unavailable
 * - OpenAI SDK-compatible endpoints for all providers
 *
 * Model Strategy (as of Jan 2026):
 * - Router: gpt-4o-mini (fast, cheap for classification)
 * - DevBot: Claude Opus 4.5 → Sonnet 4.5 → gpt-4o
 * - ResearchBot: Perplexity sonar-pro → sonar
 * - SecretaryBot: Gemini 3.0 Pro → Gemini 2.0 Flash
 * - HomeBot: gpt-5.1 → gpt-4o (needs tool calling)
 * - FinanceBot: Gemini 3.0 Pro → gpt-4o
 * - PersonalityBot: grok-4-1 → gpt-4o
 */

import { logger } from '@/lib/logger';

// =============================================================================
// TYPES
// =============================================================================

export type AgentType =
  | 'orchestrator'
  | 'coder'
  | 'researcher'
  | 'secretary'
  | 'personality'
  | 'home'
  | 'finance';

export interface ModelConfig {
  /** Model identifier (e.g., 'gpt-4o', 'claude-sonnet-4-5') */
  model: string;
  /** Optional base URL for non-OpenAI providers */
  baseURL?: string;
  /** API key for this provider */
  apiKey?: string;
  /** Provider name for logging */
  provider?: string;
  /** Whether this is a fallback model */
  isFallback?: boolean;
}

interface ModelDefinition {
  model: string;
  baseURL?: string;
  envKey: string;
  provider: string;
}

// =============================================================================
// MODEL DEFINITIONS
// =============================================================================

/**
 * Primary models for each agent type
 * Can be overridden via environment variables
 */
const PRIMARY_MODELS: Record<AgentType, ModelDefinition> = {
  orchestrator: {
    model: 'gpt-5.1-chat-latest',
    envKey: 'OPENAI_API_KEY',
    provider: 'openai',
  },
  coder: {
    model: 'claude-opus-4-5-20250514',
    baseURL: 'https://api.anthropic.com/v1/',
    envKey: 'ANTHROPIC_API_KEY',
    provider: 'anthropic',
  },
  researcher: {
    model: 'sonar-pro',
    baseURL: 'https://api.perplexity.ai',
    envKey: 'PERPLEXITY_API_KEY',
    provider: 'perplexity',
  },
  secretary: {
    model: 'gemini-2.5-pro-preview-06-05',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    envKey: 'GOOGLE_GENERATIVE_AI_KEY',
    provider: 'google',
  },
  personality: {
    model: 'grok-4-1-fast-non-reasoning',
    baseURL: 'https://api.x.ai/v1',
    envKey: 'XAI_API_KEY',
    provider: 'xai',
  },
  home: {
    model: 'gpt-5.1-chat-latest',
    envKey: 'OPENAI_API_KEY',
    provider: 'openai',
  },
  finance: {
    model: 'gemini-2.5-pro-preview-06-05',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    envKey: 'GOOGLE_GENERATIVE_AI_KEY',
    provider: 'google',
  },
};

/**
 * Fallback chains for each agent type
 * Used when primary model's API key is not available
 */
const FALLBACK_CHAINS: Record<AgentType, ModelDefinition[]> = {
  orchestrator: [
    { model: 'gpt-4o', envKey: 'OPENAI_API_KEY', provider: 'openai' },
    { model: 'gpt-4o-mini', envKey: 'OPENAI_API_KEY', provider: 'openai' },
  ],
  coder: [
    {
      model: 'claude-sonnet-4-5-20250514',
      baseURL: 'https://api.anthropic.com/v1/',
      envKey: 'ANTHROPIC_API_KEY',
      provider: 'anthropic',
    },
    { model: 'gpt-4o', envKey: 'OPENAI_API_KEY', provider: 'openai' },
  ],
  researcher: [
    {
      model: 'sonar',
      baseURL: 'https://api.perplexity.ai',
      envKey: 'PERPLEXITY_API_KEY',
      provider: 'perplexity',
    },
    { model: 'gpt-4o', envKey: 'OPENAI_API_KEY', provider: 'openai' },
  ],
  secretary: [
    {
      model: 'gemini-2.0-flash',
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      envKey: 'GOOGLE_GENERATIVE_AI_KEY',
      provider: 'google',
    },
    { model: 'gpt-4o', envKey: 'OPENAI_API_KEY', provider: 'openai' },
  ],
  personality: [
    { model: 'gpt-4o', envKey: 'OPENAI_API_KEY', provider: 'openai' },
    { model: 'gpt-4o-mini', envKey: 'OPENAI_API_KEY', provider: 'openai' },
  ],
  home: [
    { model: 'gpt-4o', envKey: 'OPENAI_API_KEY', provider: 'openai' },
    { model: 'gpt-4o-mini', envKey: 'OPENAI_API_KEY', provider: 'openai' },
  ],
  finance: [
    {
      model: 'gemini-2.0-flash',
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      envKey: 'GOOGLE_GENERATIVE_AI_KEY',
      provider: 'google',
    },
    { model: 'gpt-4o', envKey: 'OPENAI_API_KEY', provider: 'openai' },
  ],
};

/**
 * Environment variable overrides for each agent type
 * Format: Q8_{AGENT}_MODEL
 */
const MODEL_ENV_OVERRIDES: Record<AgentType, string> = {
  orchestrator: 'Q8_ROUTER_MODEL',
  coder: 'Q8_CODER_MODEL',
  researcher: 'Q8_RESEARCH_MODEL',
  secretary: 'Q8_SECRETARY_MODEL',
  personality: 'Q8_PERSONALITY_MODEL',
  home: 'Q8_HOME_MODEL',
  finance: 'Q8_FINANCE_MODEL',
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Check if an API key is available for a given environment variable
 */
function hasApiKey(envKey: string): boolean {
  const key = process.env[envKey];
  return !!key && key.length > 0;
}

/**
 * Get API key for a given environment variable
 */
function getApiKey(envKey: string): string | undefined {
  return process.env[envKey];
}

/**
 * Parse a model override string
 * Format: "model_name" or "provider:model_name"
 */
function parseModelOverride(override: string): Partial<ModelDefinition> | null {
  if (!override) return null;

  // Check if it's a provider:model format
  if (override.includes(':')) {
    const [provider, model] = override.split(':');
    const providerConfigs: Record<string, Partial<ModelDefinition>> = {
      openai: { envKey: 'OPENAI_API_KEY', provider: 'openai' },
      anthropic: {
        baseURL: 'https://api.anthropic.com/v1/',
        envKey: 'ANTHROPIC_API_KEY',
        provider: 'anthropic',
      },
      google: {
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        envKey: 'GOOGLE_GENERATIVE_AI_KEY',
        provider: 'google',
      },
      perplexity: {
        baseURL: 'https://api.perplexity.ai',
        envKey: 'PERPLEXITY_API_KEY',
        provider: 'perplexity',
      },
      xai: {
        baseURL: 'https://api.x.ai/v1',
        envKey: 'XAI_API_KEY',
        provider: 'xai',
      },
    };

    const config = providerConfigs[provider || ''];
    if (config && model) {
      return { ...config, model };
    }
  }

  // Plain model name - assume OpenAI
  return { model: override, envKey: 'OPENAI_API_KEY', provider: 'openai' };
}

/**
 * Build ModelConfig from ModelDefinition
 */
function buildConfig(def: ModelDefinition, isFallback = false): ModelConfig {
  return {
    model: def.model,
    baseURL: def.baseURL,
    apiKey: getApiKey(def.envKey),
    provider: def.provider,
    isFallback,
  };
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Get model configuration for a specific agent type
 *
 * Resolution order:
 * 1. Environment variable override (Q8_{AGENT}_MODEL)
 * 2. Primary model (if API key available)
 * 3. Fallback chain (first available)
 *
 * @param agentType - The type of agent requesting a model
 * @returns ModelConfig with model, baseURL, apiKey, and provider info
 */
export function getModel(agentType: AgentType): ModelConfig {
  // 1. Check for environment variable override
  const overrideEnv = MODEL_ENV_OVERRIDES[agentType];
  const override = overrideEnv ? process.env[overrideEnv] : undefined;

  if (override) {
    const parsed = parseModelOverride(override);
    if (parsed && parsed.envKey && hasApiKey(parsed.envKey)) {
      logger.debug(`[ModelFactory] Using override for ${agentType}`, {
        model: parsed.model,
        provider: parsed.provider,
      });
      return buildConfig(parsed as ModelDefinition, false);
    }
    // Override specified but API key not available - log warning and continue
    logger.warn(`[ModelFactory] Override ${override} for ${agentType} has no API key, using fallback`);
  }

  // 2. Try primary model
  const primary = PRIMARY_MODELS[agentType];
  if (hasApiKey(primary.envKey)) {
    return buildConfig(primary, false);
  }

  // 3. Try fallback chain
  const fallbacks = FALLBACK_CHAINS[agentType];
  for (const fallback of fallbacks) {
    if (hasApiKey(fallback.envKey)) {
      logger.info(`[ModelFactory] Using fallback for ${agentType}`, {
        primary: primary.model,
        fallback: fallback.model,
        provider: fallback.provider,
      });
      return buildConfig(fallback, true);
    }
  }

  // 4. Return primary without API key (will fail gracefully at call time)
  logger.error(`[ModelFactory] No API key available for ${agentType}`, {
    primary: primary.model,
    fallbacksChecked: fallbacks.map(f => f.model),
  });
  return buildConfig(primary, false);
}

/**
 * Get all available models for an agent type (for UI selection)
 */
export function getAvailableModels(agentType: AgentType): ModelConfig[] {
  const available: ModelConfig[] = [];

  const primary = PRIMARY_MODELS[agentType];
  if (hasApiKey(primary.envKey)) {
    available.push(buildConfig(primary, false));
  }

  const fallbacks = FALLBACK_CHAINS[agentType];
  for (const fallback of fallbacks) {
    if (hasApiKey(fallback.envKey)) {
      available.push(buildConfig(fallback, true));
    }
  }

  return available;
}

/**
 * Check model health (API key present)
 */
export function checkModelHealth(): Record<AgentType, { available: boolean; model: string; provider: string }> {
  const agents: AgentType[] = ['orchestrator', 'coder', 'researcher', 'secretary', 'personality', 'home', 'finance'];
  const result: Record<string, { available: boolean; model: string; provider: string }> = {};

  for (const agent of agents) {
    const config = getModel(agent);
    result[agent] = {
      available: !!config.apiKey,
      model: config.model,
      provider: config.provider || 'unknown',
    };
  }

  return result as Record<AgentType, { available: boolean; model: string; provider: string }>;
}
