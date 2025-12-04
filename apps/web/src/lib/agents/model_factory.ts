/**
 * Model Factory - LiteLLM Adapter
 * Routes different agent types to their specialized models
 */

export type AgentType = 'orchestrator' | 'coder' | 'researcher' | 'secretary' | 'personality' | 'home';

export interface ModelConfig {
  model: string;
  baseURL?: string;
  apiKey?: string;
}

/**
 * Get model configuration for a specific agent type
 * Uses OpenAI SDK-compatible endpoints for multiple providers (verified Nov 2025)
 */
export function getModel(agentType: AgentType): ModelConfig {
  switch (agentType) {
    case 'orchestrator':
      // GPT-5.1 Instant for routing, reasoning, and voice (OpenAI)
      return {
        model: 'gpt-5.1-chat-latest',
        apiKey: process.env.OPENAI_API_KEY,
      };

    case 'coder':
      // Claude Sonnet 4.5 for coding tasks (Anthropic via OpenAI SDK)
      return {
        model: 'claude-sonnet-4-5',
        baseURL: 'https://api.anthropic.com/v1/',
        apiKey: process.env.ANTHROPIC_API_KEY,
      };

    case 'researcher':
      // Perplexity Sonar Pro for real-time web search
      return {
        model: 'sonar-pro',
        baseURL: 'https://api.perplexity.ai',
        apiKey: process.env.PERPLEXITY_API_KEY,
      };

    case 'secretary':
      // Gemini 3.0 Pro for massive context (Google via OpenAI SDK)
      return {
        model: 'gemini-3-pro-preview-11-2025',
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        apiKey: process.env.GOOGLE_GENERATIVE_AI_KEY,
      };

    case 'personality':
      // Grok 4.1 Fast for fun, creative chat (X.AI via OpenAI SDK)
      // Using non-reasoning mode for faster responses
      return {
        model: 'grok-4-1-fast-non-reasoning',
        baseURL: 'https://api.x.ai/v1',
        apiKey: process.env.XAI_API_KEY,
      };

    case 'home':
      // GPT-5.1 Instant for home automation tasks
      return {
        model: 'gpt-5.1-chat-latest',
        apiKey: process.env.OPENAI_API_KEY,
      };

    default:
      throw new Error(`Unknown agent type: ${agentType}`);
  }
}
