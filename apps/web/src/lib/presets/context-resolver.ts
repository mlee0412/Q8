/**
 * Context Resolver for Dynamic Preset Suggestions
 * Determines which presets to show based on time, services, and user history
 */

import type { PresetSuggestion, PresetCategory, ExtendedAgentType } from './preset-config';
import { PRESET_SUGGESTIONS, getPresetsByCategory } from './preset-config';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export interface ServiceAvailability {
  homeAssistant: boolean;
  google: boolean;
  github: boolean;
  finance: boolean;
  spotify: boolean;
}

export interface PresetContext {
  timeOfDay: TimeOfDay;
  hour: number;
  services: ServiceAvailability;
  recentPresets: string[];
}

/**
 * Get the current time of day
 */
export function getTimeOfDay(hour?: number): TimeOfDay {
  const h = hour ?? new Date().getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

/**
 * Time-based preset boosting
 * Returns preset IDs that should be prioritized for the current time
 */
export function getTimeBasedPresets(timeOfDay: TimeOfDay): string[] {
  const presetsByTime: Record<TimeOfDay, string[]> = {
    morning: [
      'secretary-calendar',    // Check today's schedule
      'research-weather',      // Weather for the day
      'research-news',         // Morning news
      'personality-chat',      // Good morning chat
    ],
    afternoon: [
      'secretary-email',       // Check emails
      'secretary-meetings',    // Upcoming meetings
      'coder-prs',             // Check PRs (work time)
      'research-search',       // Research tasks
    ],
    evening: [
      'home-lights-on',        // Lighting for evening
      'home-thermostat',       // Adjust temperature
      'personality-creative',  // Creative time
      'finance-spending',      // Review finances
    ],
    night: [
      'home-lock',             // Lock doors
      'home-lights-on',        // Dim lights
      'personality-joke',      // Wind down
      'secretary-calendar',    // Tomorrow's schedule
    ],
  };

  return presetsByTime[timeOfDay] || [];
}

/**
 * Service-based preset filtering
 * Returns which categories should be shown based on available services
 */
export function getServiceBasedCategories(services: ServiceAvailability): PresetCategory[] {
  const categories: PresetCategory[] = ['fun']; // Always show fun/personality

  if (services.homeAssistant) {
    categories.push('smart-home');
  }
  if (services.google) {
    categories.push('productivity');
  }
  if (services.github) {
    categories.push('dev');
  }
  if (services.finance) {
    categories.push('finance');
  }
  // Research is always available (uses web search)
  categories.push('research');

  return categories;
}

/**
 * Filter presets by available services
 */
export function filterPresetsByServices(
  presets: PresetSuggestion[],
  services: ServiceAvailability
): PresetSuggestion[] {
  const agentServiceMap: Record<ExtendedAgentType, keyof ServiceAvailability | null> = {
    home: 'homeAssistant',
    secretary: 'google',
    coder: 'github',
    finance: 'finance',
    researcher: null, // Always available
    personality: null, // Always available
    orchestrator: null,
  };

  return presets.filter((preset) => {
    const requiredService = agentServiceMap[preset.agent];
    if (requiredService === null) return true;
    return services[requiredService];
  });
}

/**
 * Get contextual presets based on all factors
 */
export function getContextualPresets(context: PresetContext): PresetSuggestion[] {
  const { timeOfDay, services, recentPresets } = context;

  // Start with all presets
  let presets = [...PRESET_SUGGESTIONS];

  // Filter by available services
  presets = filterPresetsByServices(presets, services);

  // Get time-based boosted preset IDs
  const boostedIds = new Set(getTimeBasedPresets(timeOfDay));

  // Score and sort presets
  const scoredPresets = presets.map((preset) => {
    let score = 0;

    // Boost time-relevant presets
    if (boostedIds.has(preset.id)) {
      score += 10;
    }

    // Boost recently used presets (but not too much)
    const recentIndex = recentPresets.indexOf(preset.id);
    if (recentIndex !== -1) {
      score += Math.max(0, 5 - recentIndex); // More recent = higher boost
    }

    // Base priority score
    score += (5 - preset.priority); // Lower priority number = higher score

    return { preset, score };
  });

  // Sort by score descending
  scoredPresets.sort((a, b) => b.score - a.score);

  return scoredPresets.map((s) => s.preset);
}

/**
 * Get greeting based on time of day
 */
export function getTimeBasedGreeting(timeOfDay: TimeOfDay): string {
  const greetings: Record<TimeOfDay, string> = {
    morning: 'Good morning! What can I help you with today?',
    afternoon: 'Good afternoon! How can I assist you?',
    evening: 'Good evening! What would you like to do?',
    night: 'Working late? How can I help?',
  };
  return greetings[timeOfDay];
}

/**
 * Get contextual subtitle based on time
 */
export function getContextualSubtitle(timeOfDay: TimeOfDay): string {
  const subtitles: Record<TimeOfDay, string> = {
    morning: 'Start your day productively',
    afternoon: 'Stay on top of things',
    evening: 'Wind down and get organized',
    night: 'Quick actions before bed',
  };
  return subtitles[timeOfDay];
}

// ============================================
// Preset History Management (localStorage)
// ============================================

const HISTORY_KEY = 'q8_preset_history';
const MAX_HISTORY = 20;

export interface PresetHistoryEntry {
  presetId: string;
  usageCount: number;
  lastUsed: number; // timestamp
}

/**
 * Get preset usage history from localStorage
 */
export function getPresetHistory(): PresetHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as PresetHistoryEntry[];
  } catch {
    return [];
  }
}

/**
 * Record a preset usage
 */
export function recordPresetUsage(presetId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const history = getPresetHistory();
    const existing = history.find((h) => h.presetId === presetId);

    if (existing) {
      existing.usageCount += 1;
      existing.lastUsed = Date.now();
    } else {
      history.push({
        presetId,
        usageCount: 1,
        lastUsed: Date.now(),
      });
    }

    // Sort by last used and trim to max
    history.sort((a, b) => b.lastUsed - a.lastUsed);
    const trimmed = history.slice(0, MAX_HISTORY);

    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Get frequently used preset IDs (sorted by usage)
 */
export function getFrequentPresetIds(): string[] {
  const history = getPresetHistory();
  return history
    .sort((a, b) => b.usageCount - a.usageCount)
    .map((h) => h.presetId);
}

/**
 * Get recently used preset IDs
 */
export function getRecentPresetIds(): string[] {
  const history = getPresetHistory();
  return history
    .sort((a, b) => b.lastUsed - a.lastUsed)
    .map((h) => h.presetId);
}
