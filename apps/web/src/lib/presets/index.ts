/**
 * Presets Module - Barrel Export
 * Context-aware preset suggestions for the chat interface
 */

// Configuration
export {
  PRESET_SUGGESTIONS,
  AGENT_COLORS,
  CATEGORY_CONFIG,
  getPresetsByCategory,
  getPresetsByAgent,
  getDefaultPresets,
  type PresetSuggestion,
  type PresetCategory,
  type ExtendedAgentType,
} from './preset-config';

// Context Resolution
export {
  getTimeOfDay,
  getTimeBasedPresets,
  getServiceBasedCategories,
  filterPresetsByServices,
  getContextualPresets,
  getTimeBasedGreeting,
  getContextualSubtitle,
  getPresetHistory,
  recordPresetUsage,
  getFrequentPresetIds,
  getRecentPresetIds,
  type TimeOfDay,
  type ServiceAvailability,
  type PresetContext,
  type PresetHistoryEntry,
} from './context-resolver';
