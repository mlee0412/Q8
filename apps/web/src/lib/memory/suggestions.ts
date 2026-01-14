/**
 * Proactive Suggestions Engine
 * Generates contextual suggestions based on time, weather, history
 */

import type { 
  ProactiveSuggestion, 
  SuggestionContext,
  MemoryEntry,
} from './types';
import { searchMemories, getUserPreferences, getShortTermMemory } from './memory-store';

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `sug_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate proactive suggestions based on context
 */
export function generateSuggestions(
  userId: string,
  sessionId: string,
  context: SuggestionContext
): ProactiveSuggestion[] {
  const suggestions: ProactiveSuggestion[] = [];

  // Time-based suggestions
  const timeSuggestions = getTimeSuggestions(context);
  suggestions.push(...timeSuggestions);

  // Weather-based suggestions
  if (context.weather) {
    const weatherSuggestions = getWeatherSuggestions(context.weather, context.timeOfDay);
    suggestions.push(...weatherSuggestions);
  }

  // Memory-based suggestions
  const memorySuggestions = getMemorySuggestions(userId, context);
  suggestions.push(...memorySuggestions);

  // Follow-up suggestions based on recent topics
  if (context.recentTopics.length > 0) {
    const followUpSuggestions = getFollowUpSuggestions(context.recentTopics);
    suggestions.push(...followUpSuggestions);
  }

  // Task reminders
  if (context.pendingTasks > 0) {
    suggestions.push({
      id: generateId(),
      type: 'reminder',
      title: 'Pending Tasks',
      description: `You have ${context.pendingTasks} pending task${context.pendingTasks > 1 ? 's' : ''}`,
      action: {
        type: 'message',
        payload: 'What are my pending tasks?',
      },
      priority: 'medium',
      context: 'tasks',
      dismissed: false,
      createdAt: new Date(),
    });
  }

  // Calendar alerts
  if (context.upcomingEvents > 0) {
    suggestions.push({
      id: generateId(),
      type: 'alert',
      title: 'Upcoming Events',
      description: `You have ${context.upcomingEvents} event${context.upcomingEvents > 1 ? 's' : ''} coming up`,
      action: {
        type: 'message',
        payload: 'What\'s on my calendar today?',
      },
      priority: 'high',
      context: 'calendar',
      dismissed: false,
      createdAt: new Date(),
    });
  }

  // Re-engagement suggestion
  if (context.lastInteraction) {
    const hoursSinceLastInteraction = 
      (Date.now() - context.lastInteraction.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLastInteraction > 24) {
      suggestions.push({
        id: generateId(),
        type: 'follow-up',
        title: 'Welcome Back!',
        description: 'Would you like a summary of what you might have missed?',
        action: {
          type: 'message',
          payload: 'What\'s new since I was last here?',
        },
        priority: 'low',
        context: 're-engagement',
        dismissed: false,
        createdAt: new Date(),
      });
    }
  }

  // Sort by priority and limit
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1));

  return suggestions.slice(0, 5);
}

/**
 * Get time-based suggestions
 */
function getTimeSuggestions(context: SuggestionContext): ProactiveSuggestion[] {
  const suggestions: ProactiveSuggestion[] = [];
  const hour = context.currentTime.getHours();

  // Morning suggestions
  if (context.timeOfDay === 'morning') {
    suggestions.push({
      id: generateId(),
      type: 'tip',
      title: 'Good Morning!',
      description: 'Would you like a briefing for today?',
      action: {
        type: 'message',
        payload: 'Give me my morning briefing',
      },
      priority: 'medium',
      context: 'morning-routine',
      dismissed: false,
      createdAt: new Date(),
    });

    // Weekday vs weekend
    if (context.dayOfWeek !== 'Saturday' && context.dayOfWeek !== 'Sunday') {
      suggestions.push({
        id: generateId(),
        type: 'tip',
        title: 'Work Day',
        description: 'Check your calendar for today\'s meetings',
        action: {
          type: 'message',
          payload: 'What meetings do I have today?',
        },
        priority: 'medium',
        context: 'work',
        dismissed: false,
        createdAt: new Date(),
      });
    }
  }

  // Evening suggestions
  if (context.timeOfDay === 'evening') {
    suggestions.push({
      id: generateId(),
      type: 'tip',
      title: 'End of Day',
      description: 'Review what you accomplished today',
      action: {
        type: 'message',
        payload: 'What did I accomplish today?',
      },
      priority: 'low',
      context: 'evening-review',
      dismissed: false,
      createdAt: new Date(),
    });
  }

  // Night suggestions
  if (context.timeOfDay === 'night') {
    suggestions.push({
      id: generateId(),
      type: 'tip',
      title: 'Getting Late',
      description: 'Would you like to set a wake-up reminder?',
      action: {
        type: 'message',
        payload: 'Set an alarm for 7am tomorrow',
      },
      priority: 'low',
      context: 'bedtime',
      dismissed: false,
      createdAt: new Date(),
    });
  }

  // Friday afternoon
  if (context.dayOfWeek === 'Friday' && context.timeOfDay === 'afternoon') {
    suggestions.push({
      id: generateId(),
      type: 'tip',
      title: 'Weekend Planning',
      description: 'Any plans for the weekend?',
      action: {
        type: 'message',
        payload: 'What\'s the weather forecast for this weekend?',
      },
      priority: 'low',
      context: 'weekend',
      dismissed: false,
      createdAt: new Date(),
    });
  }

  return suggestions;
}

/**
 * Get weather-based suggestions
 */
function getWeatherSuggestions(
  weather: { temp: number; condition: string },
  timeOfDay: string
): ProactiveSuggestion[] {
  const suggestions: ProactiveSuggestion[] = [];
  const condition = weather.condition.toLowerCase();

  // Rain suggestions
  if (condition.includes('rain') || condition.includes('drizzle')) {
    suggestions.push({
      id: generateId(),
      type: 'alert',
      title: 'Rain Expected',
      description: 'Don\'t forget your umbrella!',
      priority: 'medium',
      context: 'weather',
      dismissed: false,
      createdAt: new Date(),
    });
  }

  // Snow suggestions
  if (condition.includes('snow')) {
    suggestions.push({
      id: generateId(),
      type: 'alert',
      title: 'Snow Alert',
      description: 'Bundle up and check road conditions',
      action: {
        type: 'message',
        payload: 'What are the road conditions today?',
      },
      priority: 'high',
      context: 'weather',
      dismissed: false,
      createdAt: new Date(),
    });
  }

  // Hot weather
  if (weather.temp > 85) {
    suggestions.push({
      id: generateId(),
      type: 'tip',
      title: 'Hot Day',
      description: `It's ${Math.round(weather.temp)}°F - stay hydrated!`,
      priority: 'medium',
      context: 'weather',
      dismissed: false,
      createdAt: new Date(),
    });
  }

  // Cold weather
  if (weather.temp < 32) {
    suggestions.push({
      id: generateId(),
      type: 'alert',
      title: 'Freezing Outside',
      description: `It's ${Math.round(weather.temp)}°F - dress warmly!`,
      priority: 'medium',
      context: 'weather',
      dismissed: false,
      createdAt: new Date(),
    });
  }

  // Nice weather
  if (
    (condition.includes('clear') || condition.includes('sunny')) &&
    weather.temp >= 60 &&
    weather.temp <= 80 &&
    timeOfDay !== 'night'
  ) {
    suggestions.push({
      id: generateId(),
      type: 'tip',
      title: 'Beautiful Day',
      description: 'Perfect weather for outdoor activities!',
      action: {
        type: 'message',
        payload: 'What are some outdoor activities nearby?',
      },
      priority: 'low',
      context: 'weather',
      dismissed: false,
      createdAt: new Date(),
    });
  }

  return suggestions;
}

/**
 * Get memory-based suggestions
 */
function getMemorySuggestions(
  userId: string,
  context: SuggestionContext
): ProactiveSuggestion[] {
  const suggestions: ProactiveSuggestion[] = [];

  // Search for reminders/tasks
  const taskMemories = searchMemories({
    userId,
    types: ['task'],
    minImportance: 'medium',
    limit: 3,
  });

  for (const result of taskMemories) {
    // Check if this memory is relevant to the current context
    const content = result.entry.content.toLowerCase();
    
    // Time-based task relevance
    if (
      (content.includes('morning') && context.timeOfDay === 'morning') ||
      (content.includes('evening') && context.timeOfDay === 'evening') ||
      (content.includes(context.dayOfWeek.toLowerCase()))
    ) {
      suggestions.push({
        id: generateId(),
        type: 'reminder',
        title: 'Remembered Task',
        description: result.entry.content.slice(0, 100),
        action: {
          type: 'message',
          payload: `Tell me more about: ${result.entry.content.slice(0, 50)}`,
        },
        priority: result.entry.importance === 'high' ? 'high' : 'medium',
        context: 'memory',
        dismissed: false,
        createdAt: new Date(),
      });
    }
  }

  return suggestions;
}

/**
 * Get follow-up suggestions based on recent topics
 */
function getFollowUpSuggestions(recentTopics: string[]): ProactiveSuggestion[] {
  const suggestions: ProactiveSuggestion[] = [];

  // Limit to most recent topics
  const topics = recentTopics.slice(-3);

  for (const topic of topics) {
    suggestions.push({
      id: generateId(),
      type: 'follow-up',
      title: 'Continue Discussion',
      description: `Would you like to know more about "${topic}"?`,
      action: {
        type: 'message',
        payload: `Tell me more about ${topic}`,
      },
      priority: 'low',
      context: 'follow-up',
      dismissed: false,
      createdAt: new Date(),
    });
  }

  return suggestions;
}

/**
 * Mark a suggestion as dismissed
 */
export function dismissSuggestion(suggestionId: string): void {
  // TODO: In production, this would update a database to persist dismissal
  void suggestionId; // Acknowledge parameter until persistence is implemented
}

/**
 * Get smart quick actions based on context
 */
export function getQuickActions(context: SuggestionContext): string[] {
  const actions: string[] = [];

  // Time-based actions
  if (context.timeOfDay === 'morning') {
    actions.push('What\'s on my calendar today?');
    actions.push('What\'s the weather like?');
  } else if (context.timeOfDay === 'evening') {
    actions.push('Set a reminder for tomorrow');
    actions.push('What did I miss today?');
  }

  // Always available
  actions.push('What can you help me with?');
  actions.push('Turn on the lights');

  return actions.slice(0, 4);
}
