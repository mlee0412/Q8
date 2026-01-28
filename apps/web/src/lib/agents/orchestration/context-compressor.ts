/**
 * Context Compressor
 * Intelligently compresses long conversation history to reduce token usage
 * while preserving important context and conversation flow
 *
 * Strategies:
 * - Rolling summarization of older messages
 * - Key fact extraction
 * - Importance-based message retention
 * - Topic clustering
 */

import OpenAI from 'openai';
import { logger } from '@/lib/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  agent?: string;
  timestamp?: number;
  importance?: number;
}

export interface CompressedContext {
  summary: string;
  keyFacts: string[];
  recentMessages: Message[];
  totalOriginalTokens: number;
  totalCompressedTokens: number;
  compressionRatio: number;
}

export interface CompressionConfig {
  maxTokens: number;
  recentMessageCount: number;
  summaryMaxTokens: number;
  enableKeyFactExtraction: boolean;
  importanceThreshold: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_CONFIG: CompressionConfig = {
  maxTokens: 4000,
  recentMessageCount: 6,
  summaryMaxTokens: 500,
  enableKeyFactExtraction: true,
  importanceThreshold: 0.7,
};

// Rough token estimation (4 chars per token on average)
const CHARS_PER_TOKEN = 4;

// =============================================================================
// CONTEXT COMPRESSOR
// =============================================================================

export class ContextCompressor {
  private config: CompressionConfig;
  private openai: OpenAI | null = null;

  constructor(config: Partial<CompressionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        maxRetries: 5,
        timeout: 30000,
      });
    }
  }

  /**
   * Estimate token count for text
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  }

  /**
   * Estimate total tokens for messages
   */
  estimateMessagesTokens(messages: Message[]): number {
    return messages.reduce((total, msg) => {
      return total + this.estimateTokens(msg.content) + 4; // +4 for role tokens
    }, 0);
  }

  /**
   * Calculate message importance based on content
   */
  calculateImportance(message: Message): number {
    let importance = 0.5; // Base importance

    const content = message.content.toLowerCase();

    // Questions are important
    if (content.includes('?')) importance += 0.1;

    // Action items and decisions
    if (/\b(decided|agreed|will|must|should|important|remember)\b/.test(content)) {
      importance += 0.15;
    }

    // Personal information
    if (/\b(my name|i am|i live|i work|i like|my favorite)\b/.test(content)) {
      importance += 0.2;
    }

    // Code or technical content
    if (/```|function|class|const|let|var|import/.test(message.content)) {
      importance += 0.1;
    }

    // User messages generally more important than assistant
    if (message.role === 'user') importance += 0.1;

    // Cap at 1.0
    return Math.min(1.0, importance);
  }

  /**
   * Extract key facts from messages
   */
  async extractKeyFacts(messages: Message[]): Promise<string[]> {
    if (!this.openai || messages.length === 0) return [];

    const conversationText = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n')
      .slice(0, 8000); // Limit input

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Extract key facts from this conversation. Focus on:
- User preferences and personal information
- Decisions made
- Important context for future reference
- Action items or commitments

Return as a JSON array of strings. Max 10 facts.`,
          },
          { role: 'user', content: conversationText },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 300,
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      return Array.isArray(result.facts) ? result.facts : [];
    } catch (error) {
      logger.warn('Failed to extract key facts', { error });
      return [];
    }
  }

  /**
   * Generate summary of older messages
   */
  async summarizeMessages(messages: Message[]): Promise<string> {
    if (!this.openai || messages.length === 0) {
      return this.fallbackSummarize(messages);
    }

    const conversationText = messages
      .map((m) => `${m.role}${m.agent ? ` (${m.agent})` : ''}: ${m.content}`)
      .join('\n')
      .slice(0, 12000);

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Summarize this conversation concisely while preserving:
- The main topics discussed
- Any decisions or conclusions
- User preferences mentioned
- Important context for continuing the conversation

Keep the summary under 200 words. Write in third person.`,
          },
          { role: 'user', content: conversationText },
        ],
        max_tokens: this.config.summaryMaxTokens,
        temperature: 0.3,
      });

      return response.choices[0]?.message?.content || this.fallbackSummarize(messages);
    } catch (error) {
      logger.warn('Failed to summarize messages', { error });
      return this.fallbackSummarize(messages);
    }
  }

  /**
   * Fallback summarization without LLM
   */
  private fallbackSummarize(messages: Message[]): string {
    // Extract first sentence of each message for a basic summary
    const summaryParts = messages.slice(0, 5).map((m) => {
      const firstSentence = m.content.match(/^[^.!?]+[.!?]/)?.[0] || m.content.slice(0, 100);
      return `${m.role === 'user' ? 'User' : 'Assistant'}: ${firstSentence}`;
    });

    return `Previous conversation summary:\n${summaryParts.join('\n')}`;
  }

  /**
   * Compress conversation context
   */
  async compress(messages: Message[]): Promise<CompressedContext> {
    const totalOriginalTokens = this.estimateMessagesTokens(messages);

    // If under limit, no compression needed
    if (totalOriginalTokens <= this.config.maxTokens) {
      return {
        summary: '',
        keyFacts: [],
        recentMessages: messages,
        totalOriginalTokens,
        totalCompressedTokens: totalOriginalTokens,
        compressionRatio: 1.0,
      };
    }

    // Calculate importance for all messages
    const messagesWithImportance = messages.map((msg) => ({
      ...msg,
      importance: msg.importance ?? this.calculateImportance(msg),
    }));

    // Keep most recent messages
    const recentMessages = messagesWithImportance.slice(-this.config.recentMessageCount);
    const olderMessages = messagesWithImportance.slice(0, -this.config.recentMessageCount);

    // Also keep highly important older messages
    const importantOlderMessages = olderMessages.filter(
      (m) => (m.importance ?? 0) >= this.config.importanceThreshold
    );

    // Generate summary and extract key facts in parallel
    const [summary, keyFacts] = await Promise.all([
      this.summarizeMessages(olderMessages),
      this.config.enableKeyFactExtraction ? this.extractKeyFacts(olderMessages) : Promise.resolve([]),
    ]);

    // Combine recent with important older messages
    const finalMessages = [...importantOlderMessages, ...recentMessages];

    // Calculate compression stats
    const summaryTokens = this.estimateTokens(summary);
    const factsTokens = this.estimateTokens(keyFacts.join(' '));
    const messagesTokens = this.estimateMessagesTokens(finalMessages);
    const totalCompressedTokens = summaryTokens + factsTokens + messagesTokens;

    logger.info('Context compressed', {
      originalTokens: totalOriginalTokens,
      compressedTokens: totalCompressedTokens,
      ratio: (totalCompressedTokens / totalOriginalTokens).toFixed(2),
      messagesBefore: messages.length,
      messagesAfter: finalMessages.length,
    });

    return {
      summary,
      keyFacts,
      recentMessages: finalMessages,
      totalOriginalTokens,
      totalCompressedTokens,
      compressionRatio: totalCompressedTokens / totalOriginalTokens,
    };
  }

  /**
   * Build compressed context string for system prompt
   */
  buildContextString(compressed: CompressedContext): string {
    const parts: string[] = [];

    if (compressed.summary) {
      parts.push(`## Conversation Summary\n${compressed.summary}`);
    }

    if (compressed.keyFacts.length > 0) {
      parts.push(`## Key Facts\n${compressed.keyFacts.map((f) => `- ${f}`).join('\n')}`);
    }

    return parts.join('\n\n');
  }
}

// =============================================================================
// SINGLETON & UTILITIES
// =============================================================================

let compressorInstance: ContextCompressor | null = null;

export function getContextCompressor(): ContextCompressor {
  if (!compressorInstance) {
    compressorInstance = new ContextCompressor();
  }
  return compressorInstance;
}

/**
 * Quick check if compression is needed
 */
export function needsCompression(messages: Message[], maxTokens: number = 4000): boolean {
  const estimatedTokens = messages.reduce((total, msg) => {
    return total + Math.ceil(msg.content.length / CHARS_PER_TOKEN) + 4;
  }, 0);
  return estimatedTokens > maxTokens;
}

/**
 * Compress messages if needed, otherwise return as-is
 */
export async function maybeCompress(
  messages: Message[],
  config?: Partial<CompressionConfig>
): Promise<{ messages: Message[]; contextPrefix?: string }> {
  const compressor = config ? new ContextCompressor(config) : getContextCompressor();

  if (!needsCompression(messages, config?.maxTokens)) {
    return { messages };
  }

  const compressed = await compressor.compress(messages);
  const contextPrefix = compressor.buildContextString(compressed);

  return {
    messages: compressed.recentMessages,
    contextPrefix: contextPrefix || undefined,
  };
}
