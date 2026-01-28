/**
 * Model Factory - Multi-Provider Model Selection with Fallbacks
 *
 * This module provides intelligent model routing with:
 * - Environment-driven model overrides (Q8_ROUTER_MODEL, Q8_CODER_MODEL, etc.)
 * - Automatic fallback chains when primary models are unavailable
 * - OpenAI SDK-compatible endpoints for all providers
 * - Nano Banana image generation support (Gemini 3 Pro Image / 2.5 Flash Image)
 *
 * Model Strategy (as of Jan 2026 - UPDATED):
 * - Orchestrator: GPT-5.2 (best agentic) → GPT-5-mini → GPT-4.1
 * - DevBot: Claude Opus 4.5 → Sonnet 4.5 → GPT-5.2
 * - ResearchBot: Perplexity sonar-reasoning-pro → sonar-pro → sonar
 * - SecretaryBot: Gemini 3 Pro → Gemini 3 Flash → Gemini 2.5 Flash
 * - HomeBot: GPT-5.2 → GPT-5-mini (needs tool calling)
 * - FinanceBot: Gemini 3 Pro → Gemini 3 Flash
 * - PersonalityBot: Grok-4 → GPT-5.2
 * - ImageGen: Gemini 3 Pro Image (Nano Banana Pro) → Gemini 2.5 Flash Image
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
  | 'finance'
  | 'imagegen';

export interface ModelConfig {
  /** Model identifier (e.g., 'gpt-5.2', 'claude-opus-4-5-20250929') */
  model: string;
  /** Optional base URL for non-OpenAI providers */
  baseURL?: string;
  /** API key for this provider */
  apiKey?: string;
  /** Provider name for logging */
  provider?: string;
  /** Whether this is a fallback model */
  isFallback?: boolean;
  /** Whether this model supports image/vision input */
  supportsVision?: boolean;
  /** Whether this model can generate images */
  supportsImageGen?: boolean;
  /** Maximum number of images for input (for vision models) */
  maxImageInputs?: number;
  /** Maximum output resolution for image generation */
  maxImageResolution?: '1k' | '2k' | '4k';
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
 * Optimized for Tier 1 OpenAI accounts (use gpt-4o-mini for highest limits)
 * Can be overridden via environment variables
 */
const PRIMARY_MODELS: Record<AgentType, ModelDefinition> = {
  orchestrator: {
    model: 'gpt-4o', // Good balance of capability and rate limits
    envKey: 'OPENAI_API_KEY',
    provider: 'openai',
  },
  coder: {
    model: 'claude-sonnet-4-5-20250929', // Claude for coding
    baseURL: 'https://api.anthropic.com/v1/',
    envKey: 'ANTHROPIC_API_KEY',
    provider: 'anthropic',
  },
  researcher: {
    model: 'sonar-pro', // Perplexity for research
    baseURL: 'https://api.perplexity.ai',
    envKey: 'PERPLEXITY_API_KEY',
    provider: 'perplexity',
  },
  secretary: {
    model: 'gemini-2.0-flash', // Google for secretary tasks
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    envKey: 'GOOGLE_GENERATIVE_AI_KEY',
    provider: 'google',
  },
  personality: {
    model: 'gpt-4o-mini', // Fast, high-limit model for personality
    envKey: 'OPENAI_API_KEY',
    provider: 'openai',
  },
  home: {
    model: 'gpt-4o-mini', // High limits for home automation
    envKey: 'OPENAI_API_KEY',
    provider: 'openai',
  },
  finance: {
    model: 'gemini-2.0-flash', // Google for finance
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    envKey: 'GOOGLE_GENERATIVE_AI_KEY',
    provider: 'google',
  },
  imagegen: {
    model: 'gpt-4o-mini', // Uses chat model to orchestrate image tools
    envKey: 'OPENAI_API_KEY',
    provider: 'openai',
  },
};

/**
 * Fallback chains for each agent type
 * Used when primary model's API key is not available
 */
/**
 * Fallback chains prioritize gpt-4o-mini for Tier 1 accounts
 * gpt-4o-mini has ~7x higher rate limits than gpt-4 class models at Tier 1
 */
const FALLBACK_CHAINS: Record<AgentType, ModelDefinition[]> = {
  orchestrator: [
    { model: 'gpt-4o-mini', envKey: 'OPENAI_API_KEY', provider: 'openai' }, // Highest Tier 1 limits
    { model: 'gpt-4o', envKey: 'OPENAI_API_KEY', provider: 'openai' },
    { model: 'gpt-3.5-turbo', envKey: 'OPENAI_API_KEY', provider: 'openai' },
  ],
  coder: [
    {
      model: 'claude-sonnet-4-5-20250929',
      baseURL: 'https://api.anthropic.com/v1/',
      envKey: 'ANTHROPIC_API_KEY',
      provider: 'anthropic',
    },
    { model: 'gpt-4o-mini', envKey: 'OPENAI_API_KEY', provider: 'openai' },
    { model: 'gpt-4o', envKey: 'OPENAI_API_KEY', provider: 'openai' },
  ],
  researcher: [
    {
      model: 'sonar-pro',
      baseURL: 'https://api.perplexity.ai',
      envKey: 'PERPLEXITY_API_KEY',
      provider: 'perplexity',
    },
    {
      model: 'sonar',
      baseURL: 'https://api.perplexity.ai',
      envKey: 'PERPLEXITY_API_KEY',
      provider: 'perplexity',
    },
    { model: 'gpt-4o-mini', envKey: 'OPENAI_API_KEY', provider: 'openai' },
  ],
  secretary: [
    {
      model: 'gemini-2.0-flash',
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      envKey: 'GOOGLE_GENERATIVE_AI_KEY',
      provider: 'google',
    },
    {
      model: 'gemini-1.5-flash',
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      envKey: 'GOOGLE_GENERATIVE_AI_KEY',
      provider: 'google',
    },
    { model: 'gpt-4o-mini', envKey: 'OPENAI_API_KEY', provider: 'openai' },
  ],
  personality: [
    { model: 'gpt-4o-mini', envKey: 'OPENAI_API_KEY', provider: 'openai' },
    { model: 'gpt-4o', envKey: 'OPENAI_API_KEY', provider: 'openai' },
    { model: 'gpt-3.5-turbo', envKey: 'OPENAI_API_KEY', provider: 'openai' },
  ],
  home: [
    { model: 'gpt-4o-mini', envKey: 'OPENAI_API_KEY', provider: 'openai' },
    { model: 'gpt-4o', envKey: 'OPENAI_API_KEY', provider: 'openai' },
    { model: 'gpt-3.5-turbo', envKey: 'OPENAI_API_KEY', provider: 'openai' },
  ],
  finance: [
    {
      model: 'gemini-2.0-flash',
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      envKey: 'GOOGLE_GENERATIVE_AI_KEY',
      provider: 'google',
    },
    { model: 'gpt-4o-mini', envKey: 'OPENAI_API_KEY', provider: 'openai' },
    { model: 'gpt-4o', envKey: 'OPENAI_API_KEY', provider: 'openai' },
  ],
  imagegen: [
    { model: 'gpt-4o-mini', envKey: 'OPENAI_API_KEY', provider: 'openai' },
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
  imagegen: 'Q8_IMAGEGEN_MODEL',
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
 * Get all available models in order of preference for an agent type
 * Used for runtime fallback when primary model hits rate limits
 */
export function getModelChain(agentType: AgentType): ModelConfig[] {
  const chain: ModelConfig[] = [];

  // 1. Check for environment variable override first
  const overrideEnv = MODEL_ENV_OVERRIDES[agentType];
  const override = overrideEnv ? process.env[overrideEnv] : undefined;

  if (override) {
    const parsed = parseModelOverride(override);
    if (parsed && parsed.envKey && hasApiKey(parsed.envKey)) {
      chain.push(buildConfig(parsed as ModelDefinition, false));
    }
  }

  // 2. Add primary model
  const primary = PRIMARY_MODELS[agentType];
  if (hasApiKey(primary.envKey)) {
    // Don't duplicate if override was the same as primary
    if (!chain.some(c => c.model === primary.model && c.provider === primary.provider)) {
      chain.push(buildConfig(primary, false));
    }
  }

  // 3. Add all fallbacks with available API keys
  const fallbacks = FALLBACK_CHAINS[agentType];
  for (const fallback of fallbacks) {
    if (hasApiKey(fallback.envKey)) {
      // Don't duplicate models already in chain
      if (!chain.some(c => c.model === fallback.model && c.provider === fallback.provider)) {
        chain.push(buildConfig(fallback, true));
      }
    }
  }

  return chain;
}

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
/**
 * Get image generation model configuration
 * @param mode - 'fast' for quick generation (Nano Banana), 'pro' for high quality (Nano Banana Pro)
 */
export function getImageModel(mode: 'fast' | 'pro' = 'fast'): ModelConfig {
  const imageModels = {
    fast: {
      model: 'gemini-2.5-flash-image',
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      envKey: 'GOOGLE_GENERATIVE_AI_KEY',
      provider: 'google',
      supportsImageGen: true,
      maxImageInputs: 3,
      maxImageResolution: '1k' as const,
    },
    pro: {
      model: 'gemini-3-pro-image-preview',
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      envKey: 'GOOGLE_GENERATIVE_AI_KEY',
      provider: 'google',
      supportsImageGen: true,
      maxImageInputs: 14,
      maxImageResolution: '4k' as const,
    },
  };

  const selected = imageModels[mode];
  
  if (!hasApiKey(selected.envKey)) {
    logger.warn(`[ModelFactory] Image model ${mode} API key not available`);
  }

  return {
    model: selected.model,
    baseURL: selected.baseURL,
    apiKey: getApiKey(selected.envKey),
    provider: selected.provider,
    supportsImageGen: selected.supportsImageGen,
    maxImageInputs: selected.maxImageInputs,
    maxImageResolution: selected.maxImageResolution,
  };
}

/**
 * Check if a model supports vision (image input)
 */
export function supportsVision(agentType: AgentType): boolean {
  const visionCapableAgents: AgentType[] = ['coder', 'secretary', 'finance', 'imagegen'];
  return visionCapableAgents.includes(agentType);
}

/**
 * Check model health (API key present)
 */
export function checkModelHealth(): Record<AgentType, { available: boolean; model: string; provider: string }> {
  const agents: AgentType[] = ['orchestrator', 'coder', 'researcher', 'secretary', 'personality', 'home', 'finance', 'imagegen'];
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
