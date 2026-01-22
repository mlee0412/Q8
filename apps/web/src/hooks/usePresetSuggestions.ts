/**
 * usePresetSuggestions Hook
 * Combines time, service availability, and user history for dynamic presets
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { PresetSuggestion } from '@/lib/presets/preset-config';
import { PRESET_SUGGESTIONS } from '@/lib/presets/preset-config';
import {
  getTimeOfDay,
  getContextualPresets,
  getRecentPresetIds,
  recordPresetUsage,
  getTimeBasedGreeting,
  getContextualSubtitle,
  type ServiceAvailability,
  type TimeOfDay,
  type PresetContext,
} from '@/lib/presets/context-resolver';

interface UsePresetSuggestionsOptions {
  maxPresets?: number;
  refreshInterval?: number; // ms, for time-based updates
}

interface UsePresetSuggestionsResult {
  presets: PresetSuggestion[];
  allPresets: PresetSuggestion[];
  timeOfDay: TimeOfDay;
  greeting: string;
  subtitle: string;
  services: ServiceAvailability;
  isLoading: boolean;
  recordUsage: (presetId: string) => void;
  refresh: () => void;
}

const DEFAULT_SERVICES: ServiceAvailability = {
  homeAssistant: false,
  google: false,
  github: false,
  finance: false,
  spotify: false,
};

export function usePresetSuggestions(
  options: UsePresetSuggestionsOptions = {}
): UsePresetSuggestionsResult {
  const { maxPresets = 4, refreshInterval = 60000 } = options;

  const [services, setServices] = useState<ServiceAvailability>(DEFAULT_SERVICES);
  const [isLoading, setIsLoading] = useState(true);
  const [recentPresets, setRecentPresets] = useState<string[]>([]);
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());

  // Fetch service availability on mount
  useEffect(() => {
    async function fetchServices() {
      try {
        const response = await fetch('/api/services/status');
        if (response.ok) {
          const data = await response.json();
          setServices(data);
        }
      } catch (error) {
        console.warn('Failed to fetch service status:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchServices();
  }, []);

  // Load recent presets from localStorage
  useEffect(() => {
    setRecentPresets(getRecentPresetIds());
  }, []);

  // Update time periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const newHour = new Date().getHours();
      if (newHour !== currentHour) {
        setCurrentHour(newHour);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [currentHour, refreshInterval]);

  // Compute time of day
  const timeOfDay = useMemo(() => getTimeOfDay(currentHour), [currentHour]);

  // Build context
  const context: PresetContext = useMemo(
    () => ({
      timeOfDay,
      hour: currentHour,
      services,
      recentPresets,
    }),
    [timeOfDay, currentHour, services, recentPresets]
  );

  // Get contextual presets
  const allPresets = useMemo(
    () => getContextualPresets(context),
    [context]
  );

  // Top presets for default view
  const presets = useMemo(
    () => allPresets.slice(0, maxPresets),
    [allPresets, maxPresets]
  );

  // Greeting and subtitle
  const greeting = useMemo(() => getTimeBasedGreeting(timeOfDay), [timeOfDay]);
  const subtitle = useMemo(() => getContextualSubtitle(timeOfDay), [timeOfDay]);

  // Record usage and refresh
  const recordUsage = useCallback((presetId: string) => {
    recordPresetUsage(presetId);
    setRecentPresets(getRecentPresetIds());
  }, []);

  const refresh = useCallback(() => {
    setCurrentHour(new Date().getHours());
    setRecentPresets(getRecentPresetIds());
  }, []);

  return {
    presets,
    allPresets,
    timeOfDay,
    greeting,
    subtitle,
    services,
    isLoading,
    recordUsage,
    refresh,
  };
}
