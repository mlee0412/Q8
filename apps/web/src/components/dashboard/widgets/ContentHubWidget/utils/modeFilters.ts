import type { ContentItem, ContentMode, ModeFilter } from '@/types/contenthub';
import { PRESET_MODES } from '@/types/contenthub';

/**
 * Apply mode-specific filters to content items
 */
export function applyModeFilter(
  content: ContentItem[],
  mode: ContentMode
): ContentItem[] {
  const modeConfig = PRESET_MODES[mode];
  if (!modeConfig || !modeConfig.filter) {
    return content;
  }

  const filter = modeConfig.filter;

  return content.filter((item) => {
    // Filter by source
    if (filter.excludeSources?.includes(item.source)) {
      return false;
    }

    // Filter by content type
    if (filter.excludeTypes?.includes(item.type)) {
      return false;
    }

    // Filter by duration (convert to milliseconds if needed)
    const durationMs = item.duration || 0;
    
    if (filter.minDuration && durationMs < filter.minDuration) {
      return false;
    }
    
    if (filter.maxDuration && durationMs > filter.maxDuration) {
      return false;
    }

    // All filters passed
    return true;
  });
}

/**
 * Sort content by mode preference
 */
export function sortByModePreference(
  content: ContentItem[],
  mode: ContentMode
): ContentItem[] {
  const modeConfig = PRESET_MODES[mode];
  if (!modeConfig?.filter?.preferCategories) {
    return content;
  }

  const preferredCategories = modeConfig.filter.preferCategories;

  return [...content].sort((a, b) => {
    // Check if item matches preferred categories (via type or metadata)
    const aPreferred = preferredCategories.some(
      (cat) =>
        a.type.toLowerCase().includes(cat.toLowerCase()) ||
        a.title.toLowerCase().includes(cat.toLowerCase()) ||
        a.subtitle?.toLowerCase().includes(cat.toLowerCase())
    );
    
    const bPreferred = preferredCategories.some(
      (cat) =>
        b.type.toLowerCase().includes(cat.toLowerCase()) ||
        b.title.toLowerCase().includes(cat.toLowerCase()) ||
        b.subtitle?.toLowerCase().includes(cat.toLowerCase())
    );

    if (aPreferred && !bPreferred) return -1;
    if (!aPreferred && bPreferred) return 1;
    return 0;
  });
}

/**
 * Get filtered and sorted content for a mode
 */
export function getContentForMode(
  content: ContentItem[],
  mode: ContentMode
): ContentItem[] {
  const filtered = applyModeFilter(content, mode);
  return sortByModePreference(filtered, mode);
}

/**
 * Get mode-specific AI prompt additions
 */
export function getModePromptContext(mode: ContentMode): string {
  const prompts: Record<ContentMode, string> = {
    focus: 'Recommend calm, instrumental, or ambient music without lyrics that helps concentration. Avoid upbeat or distracting content.',
    break: 'Recommend light, enjoyable content for relaxation. Include casual videos, fun playlists, or easy listening music.',
    workout: 'Recommend high-energy, upbeat content with strong beats (120-150 BPM). Include motivational playlists and workout videos.',
    sleep: 'Recommend calming, slow-tempo content for winding down. Include ambient sounds, sleep playlists, and meditation content.',
    discover: 'Recommend diverse, new content the user hasn\'t heard before. Mix genres and include trending items and hidden gems.',
  };

  return prompts[mode] || '';
}

/**
 * Get mode-specific search parameters
 */
export function getModeSearchParams(mode: ContentMode): Record<string, string> {
  const params: Record<ContentMode, Record<string, string>> = {
    focus: {
      genre: 'ambient,classical,lo-fi,instrumental',
      energy: 'low',
    },
    break: {
      genre: 'pop,indie,chill',
      energy: 'medium',
    },
    workout: {
      genre: 'electronic,hip-hop,rock',
      energy: 'high',
      tempo: '120-150',
    },
    sleep: {
      genre: 'ambient,classical,nature-sounds',
      energy: 'very-low',
      tempo: '60-80',
    },
    discover: {
      sort: 'trending',
      diversity: 'high',
    },
  };

  return params[mode] || {};
}

export default {
  applyModeFilter,
  sortByModePreference,
  getContentForMode,
  getModePromptContext,
  getModeSearchParams,
};
