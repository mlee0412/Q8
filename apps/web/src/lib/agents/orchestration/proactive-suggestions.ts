/**
 * Proactive Suggestions Engine
 * Anticipates user needs based on context, time, and conversation patterns
 *
 * Features:
 * - Time-based suggestions (morning routine, end of day)
 * - Context-aware follow-ups
 * - Pattern recognition for common workflows
 * - Smart action predictions
 * - Conversation continuation hints
 */

import { logger } from '@/lib/logger';
import type { ExtendedAgentType } from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface Suggestion {
  id: string;
  text: string;
  action: string;
  agent: ExtendedAgentType;
  confidence: number;
  category: SuggestionCategory;
  priority: number;
  expiresAt?: number;
}

export type SuggestionCategory =
  | 'follow_up'
  | 'time_based'
  | 'workflow'
  | 'reminder'
  | 'exploration'
  | 'action';

export interface ConversationContext {
  lastMessage: string;
  lastAgent: ExtendedAgentType;
  topics: string[];
  messageCount: number;
  threadDuration: number; // milliseconds
}

export interface UserContext {
  userId: string;
  timezone: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: number;
  recentAgents: ExtendedAgentType[];
  preferences?: {
    communicationStyle?: 'concise' | 'detailed';
  };
}

// =============================================================================
// SUGGESTION PATTERNS
// =============================================================================

interface SuggestionPattern {
  trigger: RegExp | ((ctx: ConversationContext) => boolean);
  suggestions: Array<{
    text: string;
    action: string;
    agent: ExtendedAgentType;
    confidence: number;
    category: SuggestionCategory;
  }>;
}

const FOLLOW_UP_PATTERNS: SuggestionPattern[] = [
  {
    trigger: /\b(created?|made|built|wrote)\s+(a|the|an)\s+\w+/i,
    suggestions: [
      { text: 'Review the changes', action: 'Can you review what we just created?', agent: 'coder', confidence: 0.7, category: 'follow_up' },
      { text: 'Test it out', action: 'How can I test this?', agent: 'coder', confidence: 0.6, category: 'follow_up' },
    ],
  },
  {
    trigger: /\b(scheduled?|booked?|set up)\s+(a|the|an)?\s*(meeting|appointment|call)/i,
    suggestions: [
      { text: 'Add to calendar', action: 'Add this to my calendar', agent: 'secretary', confidence: 0.8, category: 'action' },
      { text: 'Send invite', action: 'Send calendar invites to attendees', agent: 'secretary', confidence: 0.7, category: 'action' },
    ],
  },
  {
    trigger: /\b(research|found|discovered|learned)\b.*\b(about|that|how)\b/i,
    suggestions: [
      { text: 'Dig deeper', action: 'Tell me more about this topic', agent: 'researcher', confidence: 0.6, category: 'exploration' },
      { text: 'Save for later', action: 'Save this information for later reference', agent: 'personality', confidence: 0.5, category: 'action' },
    ],
  },
  {
    trigger: /\b(turn(ed)?|set|adjust(ed)?)\s+(on|off|the)\s+\w+\s*(light|lamp|thermostat|temperature)/i,
    suggestions: [
      { text: 'Create scene', action: 'Save this as a scene for later', agent: 'home', confidence: 0.6, category: 'action' },
      { text: 'Set schedule', action: 'Schedule this to happen automatically', agent: 'home', confidence: 0.5, category: 'workflow' },
    ],
  },
  {
    trigger: /\b(spent|budget|expense|cost|price)\b/i,
    suggestions: [
      { text: 'See breakdown', action: 'Show me a breakdown of my spending', agent: 'finance', confidence: 0.7, category: 'follow_up' },
      { text: 'Set budget alert', action: 'Set a budget alert for this category', agent: 'finance', confidence: 0.5, category: 'action' },
    ],
  },
];

const TIME_BASED_SUGGESTIONS: Record<string, Suggestion[]> = {
  morning: [
    { id: 'morning-1', text: 'Check today\'s schedule', action: 'What\'s on my calendar today?', agent: 'secretary', confidence: 0.8, category: 'time_based', priority: 1 },
    { id: 'morning-2', text: 'Review overnight emails', action: 'Any important emails from overnight?', agent: 'secretary', confidence: 0.7, category: 'time_based', priority: 2 },
    { id: 'morning-3', text: 'Check the weather', action: 'What\'s the weather like today?', agent: 'personality', confidence: 0.6, category: 'time_based', priority: 3 },
  ],
  afternoon: [
    { id: 'afternoon-1', text: 'Check remaining tasks', action: 'What tasks do I have left today?', agent: 'secretary', confidence: 0.7, category: 'time_based', priority: 1 },
  ],
  evening: [
    { id: 'evening-1', text: 'Review day summary', action: 'Give me a summary of today', agent: 'secretary', confidence: 0.7, category: 'time_based', priority: 1 },
    { id: 'evening-2', text: 'Prepare for tomorrow', action: 'What do I have scheduled tomorrow?', agent: 'secretary', confidence: 0.6, category: 'time_based', priority: 2 },
    { id: 'evening-3', text: 'Set evening mood', action: 'Set the lights to evening mode', agent: 'home', confidence: 0.5, category: 'time_based', priority: 3 },
  ],
  night: [
    { id: 'night-1', text: 'Goodnight routine', action: 'Run my goodnight routine', agent: 'home', confidence: 0.7, category: 'time_based', priority: 1 },
  ],
};

// =============================================================================
// PROACTIVE SUGGESTIONS ENGINE
// =============================================================================

export class ProactiveSuggestionsEngine {
  private recentSuggestions: Set<string> = new Set();
  private suggestionCooldown = 5 * 60 * 1000; // 5 minutes

  /**
   * Generate unique suggestion ID
   */
  private generateId(): string {
    return `sug_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Check if suggestion is on cooldown
   */
  private isOnCooldown(suggestionText: string): boolean {
    return this.recentSuggestions.has(suggestionText);
  }

  /**
   * Mark suggestion as used
   */
  private markUsed(suggestionText: string): void {
    this.recentSuggestions.add(suggestionText);
    setTimeout(() => {
      this.recentSuggestions.delete(suggestionText);
    }, this.suggestionCooldown);
  }

  /**
   * Get time-based suggestions
   */
  getTimeBasedSuggestions(userContext: UserContext): Suggestion[] {
    const timeSuggestions = TIME_BASED_SUGGESTIONS[userContext.timeOfDay] || [];

    return timeSuggestions
      .filter((s) => !this.isOnCooldown(s.text))
      .map((s) => ({ ...s, id: s.id || this.generateId() }));
  }

  /**
   * Get follow-up suggestions based on conversation
   */
  getFollowUpSuggestions(conversationContext: ConversationContext): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const { lastMessage, lastAgent } = conversationContext;

    for (const pattern of FOLLOW_UP_PATTERNS) {
      const matches = typeof pattern.trigger === 'function'
        ? pattern.trigger(conversationContext)
        : pattern.trigger.test(lastMessage);

      if (matches) {
        for (const sug of pattern.suggestions) {
          if (!this.isOnCooldown(sug.text)) {
            suggestions.push({
              id: this.generateId(),
              ...sug,
              priority: suggestions.length + 1,
            });
          }
        }
      }
    }

    // Add generic follow-ups based on last agent
    const agentFollowUps = this.getAgentSpecificFollowUps(lastAgent, lastMessage);
    suggestions.push(...agentFollowUps);

    return suggestions.slice(0, 4); // Limit to top 4
  }

  /**
   * Get agent-specific follow-up suggestions
   */
  private getAgentSpecificFollowUps(agent: ExtendedAgentType, lastMessage: string): Suggestion[] {
    const suggestions: Suggestion[] = [];

    switch (agent) {
      case 'coder':
        if (!this.isOnCooldown('Explain the code')) {
          suggestions.push({
            id: this.generateId(),
            text: 'Explain the code',
            action: 'Can you explain how this code works?',
            agent: 'coder',
            confidence: 0.5,
            category: 'follow_up',
            priority: 10,
          });
        }
        break;

      case 'researcher':
        if (!this.isOnCooldown('Find more sources')) {
          suggestions.push({
            id: this.generateId(),
            text: 'Find more sources',
            action: 'Can you find more sources on this topic?',
            agent: 'researcher',
            confidence: 0.5,
            category: 'exploration',
            priority: 10,
          });
        }
        break;

      case 'finance':
        if (!this.isOnCooldown('Compare to last month')) {
          suggestions.push({
            id: this.generateId(),
            text: 'Compare to last month',
            action: 'How does this compare to last month?',
            agent: 'finance',
            confidence: 0.5,
            category: 'follow_up',
            priority: 10,
          });
        }
        break;
    }

    return suggestions;
  }

  /**
   * Get workflow suggestions based on patterns
   */
  getWorkflowSuggestions(conversationContext: ConversationContext, userContext: UserContext): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // Monday morning - review week
    if (userContext.dayOfWeek === 1 && userContext.timeOfDay === 'morning') {
      if (!this.isOnCooldown('Review this week')) {
        suggestions.push({
          id: this.generateId(),
          text: 'Review this week',
          action: 'What do I have planned this week?',
          agent: 'secretary',
          confidence: 0.7,
          category: 'workflow',
          priority: 1,
        });
      }
    }

    // Friday afternoon - wrap up week
    if (userContext.dayOfWeek === 5 && userContext.timeOfDay === 'afternoon') {
      if (!this.isOnCooldown('Week summary')) {
        suggestions.push({
          id: this.generateId(),
          text: 'Week summary',
          action: 'Give me a summary of this week',
          agent: 'secretary',
          confidence: 0.7,
          category: 'workflow',
          priority: 1,
        });
      }
    }

    // End of month - financial review
    const today = new Date();
    if (today.getDate() >= 28) {
      if (!this.isOnCooldown('Monthly spending')) {
        suggestions.push({
          id: this.generateId(),
          text: 'Monthly spending',
          action: 'Show my spending summary for this month',
          agent: 'finance',
          confidence: 0.6,
          category: 'workflow',
          priority: 2,
        });
      }
    }

    return suggestions;
  }

  /**
   * Get all relevant suggestions
   */
  getSuggestions(
    conversationContext: ConversationContext | null,
    userContext: UserContext
  ): Suggestion[] {
    const allSuggestions: Suggestion[] = [];

    // Time-based suggestions (always relevant)
    allSuggestions.push(...this.getTimeBasedSuggestions(userContext));

    // Follow-up suggestions (if we have conversation context)
    if (conversationContext) {
      allSuggestions.push(...this.getFollowUpSuggestions(conversationContext));
    }

    // Workflow suggestions
    allSuggestions.push(...this.getWorkflowSuggestions(conversationContext || {
      lastMessage: '',
      lastAgent: 'personality',
      topics: [],
      messageCount: 0,
      threadDuration: 0,
    }, userContext));

    // Sort by priority and confidence
    return allSuggestions
      .sort((a, b) => {
        const priorityDiff = a.priority - b.priority;
        if (priorityDiff !== 0) return priorityDiff;
        return b.confidence - a.confidence;
      })
      .slice(0, 5); // Top 5 suggestions
  }

  /**
   * Record that a suggestion was used
   */
  useSuggestion(suggestion: Suggestion): void {
    this.markUsed(suggestion.text);
    logger.debug('Suggestion used', { text: suggestion.text, agent: suggestion.agent });
  }

  /**
   * Get continuation prompts for natural conversation flow
   */
  getContinuationPrompts(lastResponse: string, agent: ExtendedAgentType): string[] {
    const prompts: string[] = [];

    // If response ended with a question
    if (lastResponse.trim().endsWith('?')) {
      return []; // Let user answer
    }

    // Generic continuations
    prompts.push('Tell me more');
    prompts.push('What else should I know?');

    // Agent-specific
    if (agent === 'researcher') {
      prompts.push('Any related topics?');
    } else if (agent === 'coder') {
      prompts.push('Any potential issues?');
    }

    return prompts.slice(0, 3);
  }
}

// =============================================================================
// SINGLETON & UTILITIES
// =============================================================================

let engineInstance: ProactiveSuggestionsEngine | null = null;

export function getProactiveSuggestionsEngine(): ProactiveSuggestionsEngine {
  if (!engineInstance) {
    engineInstance = new ProactiveSuggestionsEngine();
  }
  return engineInstance;
}

/**
 * Quick suggestion generation
 */
export function generateSuggestions(
  conversationContext: ConversationContext | null,
  userContext: UserContext
): Suggestion[] {
  return getProactiveSuggestionsEngine().getSuggestions(conversationContext, userContext);
}

/**
 * Determine time of day from hour
 */
export function getTimeOfDay(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}
