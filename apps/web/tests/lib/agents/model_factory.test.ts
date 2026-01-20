/**
 * Model Factory Tests
 *
 * Comprehensive tests for the LiteLLM adapter that routes
 * different agent types to their specialized AI models.
 *
 * Tests cover:
 * - Correct model configuration for each agent type
 * - API key environment variable reading
 * - BaseURL patterns for each provider
 * - Error handling for unknown agent types
 * - Configuration structure validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store original env to restore after tests
const originalEnv = process.env;

describe('Model Factory', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    // Set up test API keys
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.PERPLEXITY_API_KEY = 'test-perplexity-key';
    process.env.GOOGLE_GENERATIVE_AI_KEY = 'test-google-key';
    process.env.XAI_API_KEY = 'test-xai-key';
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('getModel - Agent Type Configurations', () => {
    describe('orchestrator agent', () => {
      it('returns GPT-5.1 model', async () => {
        const { getModel } = await import('@/lib/agents/model_factory');
        const config = getModel('orchestrator');
        expect(config.model).toBe('gpt-5.1-chat-latest');
      });

      it('uses OPENAI_API_KEY', async () => {
        const { getModel } = await import('@/lib/agents/model_factory');
        const config = getModel('orchestrator');
        expect(config.apiKey).toBe('test-openai-key');
      });

      it('has no custom baseURL (uses OpenAI default)', async () => {
        const { getModel } = await import('@/lib/agents/model_factory');
        const config = getModel('orchestrator');
        expect(config.baseURL).toBeUndefined();
      });
    });

    describe('coder agent', () => {
      it('returns Claude Sonnet 4.5 model', async () => {
        const { getModel } = await import('@/lib/agents/model_factory');
        const config = getModel('coder');
        expect(config.model).toBe('claude-sonnet-4-5');
      });

      it('uses Anthropic baseURL', async () => {
        const { getModel } = await import('@/lib/agents/model_factory');
        const config = getModel('coder');
        expect(config.baseURL).toBe('https://api.anthropic.com/v1/');
      });

      it('uses ANTHROPIC_API_KEY', async () => {
        const { getModel } = await import('@/lib/agents/model_factory');
        const config = getModel('coder');
        expect(config.apiKey).toBe('test-anthropic-key');
      });
    });

    describe('researcher agent', () => {
      it('returns Perplexity Sonar Pro model', async () => {
        const { getModel } = await import('@/lib/agents/model_factory');
        const config = getModel('researcher');
        expect(config.model).toBe('sonar-pro');
      });

      it('uses Perplexity baseURL', async () => {
        const { getModel } = await import('@/lib/agents/model_factory');
        const config = getModel('researcher');
        expect(config.baseURL).toBe('https://api.perplexity.ai');
      });

      it('uses PERPLEXITY_API_KEY', async () => {
        const { getModel } = await import('@/lib/agents/model_factory');
        const config = getModel('researcher');
        expect(config.apiKey).toBe('test-perplexity-key');
      });
    });

    describe('secretary agent', () => {
      it('returns Gemini 3.0 Pro model', async () => {
        const { getModel } = await import('@/lib/agents/model_factory');
        const config = getModel('secretary');
        expect(config.model).toBe('gemini-3-pro-preview-11-2025');
      });

      it('uses Google Generative AI baseURL', async () => {
        const { getModel } = await import('@/lib/agents/model_factory');
        const config = getModel('secretary');
        expect(config.baseURL).toBe(
          'https://generativelanguage.googleapis.com/v1beta/openai/'
        );
      });

      it('uses GOOGLE_GENERATIVE_AI_KEY', async () => {
        const { getModel } = await import('@/lib/agents/model_factory');
        const config = getModel('secretary');
        expect(config.apiKey).toBe('test-google-key');
      });
    });

    describe('personality agent', () => {
      it('returns Grok 4.1 Fast Non-Reasoning model', async () => {
        const { getModel } = await import('@/lib/agents/model_factory');
        const config = getModel('personality');
        expect(config.model).toBe('grok-4-1-fast-non-reasoning');
      });

      it('uses X.AI baseURL', async () => {
        const { getModel } = await import('@/lib/agents/model_factory');
        const config = getModel('personality');
        expect(config.baseURL).toBe('https://api.x.ai/v1');
      });

      it('uses XAI_API_KEY', async () => {
        const { getModel } = await import('@/lib/agents/model_factory');
        const config = getModel('personality');
        expect(config.apiKey).toBe('test-xai-key');
      });
    });

    describe('home agent', () => {
      it('returns GPT-5.1 model', async () => {
        const { getModel } = await import('@/lib/agents/model_factory');
        const config = getModel('home');
        expect(config.model).toBe('gpt-5.1-chat-latest');
      });

      it('uses OPENAI_API_KEY', async () => {
        const { getModel } = await import('@/lib/agents/model_factory');
        const config = getModel('home');
        expect(config.apiKey).toBe('test-openai-key');
      });

      it('has no custom baseURL (uses OpenAI default)', async () => {
        const { getModel } = await import('@/lib/agents/model_factory');
        const config = getModel('home');
        expect(config.baseURL).toBeUndefined();
      });
    });

    describe('finance agent', () => {
      it('returns Gemini 3.0 Pro model', async () => {
        const { getModel } = await import('@/lib/agents/model_factory');
        const config = getModel('finance');
        expect(config.model).toBe('gemini-3-pro-preview-11-2025');
      });

      it('uses Google Generative AI baseURL', async () => {
        const { getModel } = await import('@/lib/agents/model_factory');
        const config = getModel('finance');
        expect(config.baseURL).toBe(
          'https://generativelanguage.googleapis.com/v1beta/openai/'
        );
      });

      it('uses GOOGLE_GENERATIVE_AI_KEY', async () => {
        const { getModel } = await import('@/lib/agents/model_factory');
        const config = getModel('finance');
        expect(config.apiKey).toBe('test-google-key');
      });
    });
  });

  describe('Model Config Structure', () => {
    it('all configs have required model property', async () => {
      const { getModel } = await import('@/lib/agents/model_factory');
      const agentTypes = [
        'orchestrator',
        'coder',
        'researcher',
        'secretary',
        'personality',
        'home',
        'finance',
      ] as const;

      for (const agentType of agentTypes) {
        const config = getModel(agentType);
        expect(config).toHaveProperty('model');
        expect(typeof config.model).toBe('string');
        expect(config.model.length).toBeGreaterThan(0);
      }
    });

    it('all configs have apiKey property', async () => {
      const { getModel } = await import('@/lib/agents/model_factory');
      const agentTypes = [
        'orchestrator',
        'coder',
        'researcher',
        'secretary',
        'personality',
        'home',
        'finance',
      ] as const;

      for (const agentType of agentTypes) {
        const config = getModel(agentType);
        expect(config).toHaveProperty('apiKey');
      }
    });

    it('third-party providers have baseURL defined', async () => {
      const { getModel } = await import('@/lib/agents/model_factory');
      const thirdPartyAgents = [
        'coder',
        'researcher',
        'secretary',
        'personality',
        'finance',
      ] as const;

      for (const agentType of thirdPartyAgents) {
        const config = getModel(agentType);
        expect(config.baseURL).toBeDefined();
        expect(typeof config.baseURL).toBe('string');
      }
    });

    it('OpenAI agents have no baseURL', async () => {
      const { getModel } = await import('@/lib/agents/model_factory');
      const openAIAgents = ['orchestrator', 'home'] as const;

      for (const agentType of openAIAgents) {
        const config = getModel(agentType);
        expect(config.baseURL).toBeUndefined();
      }
    });
  });

  describe('API Key Environment Variables', () => {
    it('reads OPENAI_API_KEY for orchestrator', async () => {
      process.env.OPENAI_API_KEY = 'custom-openai-key';
      vi.resetModules();
      const { getModel } = await import('@/lib/agents/model_factory');
      const config = getModel('orchestrator');
      expect(config.apiKey).toBe('custom-openai-key');
    });

    it('reads ANTHROPIC_API_KEY for coder', async () => {
      process.env.ANTHROPIC_API_KEY = 'custom-anthropic-key';
      vi.resetModules();
      const { getModel } = await import('@/lib/agents/model_factory');
      const config = getModel('coder');
      expect(config.apiKey).toBe('custom-anthropic-key');
    });

    it('reads PERPLEXITY_API_KEY for researcher', async () => {
      process.env.PERPLEXITY_API_KEY = 'custom-perplexity-key';
      vi.resetModules();
      const { getModel } = await import('@/lib/agents/model_factory');
      const config = getModel('researcher');
      expect(config.apiKey).toBe('custom-perplexity-key');
    });

    it('reads GOOGLE_GENERATIVE_AI_KEY for secretary', async () => {
      process.env.GOOGLE_GENERATIVE_AI_KEY = 'custom-google-key';
      vi.resetModules();
      const { getModel } = await import('@/lib/agents/model_factory');
      const config = getModel('secretary');
      expect(config.apiKey).toBe('custom-google-key');
    });

    it('reads XAI_API_KEY for personality', async () => {
      process.env.XAI_API_KEY = 'custom-xai-key';
      vi.resetModules();
      const { getModel } = await import('@/lib/agents/model_factory');
      const config = getModel('personality');
      expect(config.apiKey).toBe('custom-xai-key');
    });

    it('returns undefined apiKey when env var is not set', async () => {
      delete process.env.OPENAI_API_KEY;
      vi.resetModules();
      const { getModel } = await import('@/lib/agents/model_factory');
      const config = getModel('orchestrator');
      expect(config.apiKey).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('throws error for unknown agent type', async () => {
      const { getModel } = await import('@/lib/agents/model_factory');
      // Cast to any to test runtime error handling
      expect(() => getModel('unknown' as never)).toThrow(
        'Unknown agent type: unknown'
      );
    });

    it('throws error with descriptive message', async () => {
      const { getModel } = await import('@/lib/agents/model_factory');
      expect(() => getModel('invalid-agent' as never)).toThrow(
        /Unknown agent type/
      );
    });

    it('throws error for empty string agent type', async () => {
      const { getModel } = await import('@/lib/agents/model_factory');
      expect(() => getModel('' as never)).toThrow('Unknown agent type');
    });
  });

  describe('BaseURL Patterns', () => {
    it('Anthropic baseURL ends with trailing slash', async () => {
      const { getModel } = await import('@/lib/agents/model_factory');
      const config = getModel('coder');
      expect(config.baseURL).toMatch(/\/$/);
    });

    it('Perplexity baseURL has no trailing slash', async () => {
      const { getModel } = await import('@/lib/agents/model_factory');
      const config = getModel('researcher');
      expect(config.baseURL).not.toMatch(/\/$/);
    });

    it('Google baseURL includes OpenAI compatibility path', async () => {
      const { getModel } = await import('@/lib/agents/model_factory');
      const config = getModel('secretary');
      expect(config.baseURL).toContain('/openai/');
    });

    it('X.AI baseURL follows standard pattern', async () => {
      const { getModel } = await import('@/lib/agents/model_factory');
      const config = getModel('personality');
      expect(config.baseURL).toBe('https://api.x.ai/v1');
    });

    it('all baseURLs use HTTPS', async () => {
      const { getModel } = await import('@/lib/agents/model_factory');
      const agentsWithBaseURL = [
        'coder',
        'researcher',
        'secretary',
        'personality',
        'finance',
      ] as const;

      for (const agentType of agentsWithBaseURL) {
        const config = getModel(agentType);
        expect(config.baseURL).toMatch(/^https:\/\//);
      }
    });
  });

  describe('Model Consistency', () => {
    it('orchestrator and home use same model', async () => {
      const { getModel } = await import('@/lib/agents/model_factory');
      const orchestrator = getModel('orchestrator');
      const home = getModel('home');
      expect(orchestrator.model).toBe(home.model);
    });

    it('secretary and finance use same model', async () => {
      const { getModel } = await import('@/lib/agents/model_factory');
      const secretary = getModel('secretary');
      const finance = getModel('finance');
      expect(secretary.model).toBe(finance.model);
    });

    it('secretary and finance use same baseURL', async () => {
      const { getModel } = await import('@/lib/agents/model_factory');
      const secretary = getModel('secretary');
      const finance = getModel('finance');
      expect(secretary.baseURL).toBe(finance.baseURL);
    });
  });

  describe('Type Exports', () => {
    it('exports getModel function', async () => {
      const module = await import('@/lib/agents/model_factory');
      expect(typeof module.getModel).toBe('function');
    });

    it('getModel returns correct ModelConfig structure', async () => {
      const { getModel } = await import('@/lib/agents/model_factory');
      const config = getModel('orchestrator');
      // Verify the config matches ModelConfig interface structure
      expect(config).toMatchObject({
        model: expect.any(String),
      });
      // Optional properties should either be string or undefined
      if (config.baseURL !== undefined) {
        expect(typeof config.baseURL).toBe('string');
      }
      if (config.apiKey !== undefined) {
        expect(typeof config.apiKey).toBe('string');
      }
    });

    it('all valid agent types are accepted', async () => {
      const { getModel } = await import('@/lib/agents/model_factory');
      const validAgentTypes = [
        'orchestrator',
        'coder',
        'researcher',
        'secretary',
        'personality',
        'home',
        'finance',
      ] as const;

      // All valid types should return a config without throwing
      for (const agentType of validAgentTypes) {
        expect(() => getModel(agentType)).not.toThrow();
      }
    });
  });
});
