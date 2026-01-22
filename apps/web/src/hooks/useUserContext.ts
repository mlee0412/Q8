'use client';

/**
 * User Context Hook
 * Detects and manages user's timezone, location, and preferences
 * Provides dynamic context for AI agents
 */

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface UserLocation {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  coordinates?: {
    lat: number;
    long: number;
  };
}

export interface UserContextData {
  timezone: string;
  location: UserLocation;
  isLocationLoading: boolean;
  isLocationEnabled: boolean;
  lastUpdated: Date | null;
}

interface UseUserContextOptions {
  enableGeolocation?: boolean;
  cacheKey?: string;
  onLocationChange?: (location: UserLocation) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const LOCATION_CACHE_KEY = 'q8-user-location';
const LOCATION_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// =============================================================================
// HOOK
// =============================================================================

export function useUserContext(options: UseUserContextOptions = {}) {
  const {
    enableGeolocation = true,
    cacheKey = LOCATION_CACHE_KEY,
    onLocationChange,
  } = options;

  const [timezone, setTimezone] = useState<string>('UTC');
  const [location, setLocation] = useState<UserLocation>({});
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Detect timezone on mount
  useEffect(() => {
    try {
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTimezone(detectedTimezone);
      logger.debug('Timezone detected', { timezone: detectedTimezone });
    } catch (error) {
      logger.warn('Failed to detect timezone', { error });
      setTimezone('UTC');
    }
  }, []);

  // Load cached location on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { location: cachedLocation, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;

        if (age < LOCATION_CACHE_TTL && cachedLocation) {
          setLocation(cachedLocation);
          setLastUpdated(new Date(timestamp));
          setIsLocationEnabled(true);
          logger.debug('Loaded cached location', { location: cachedLocation });
        }
      }
    } catch (error) {
      logger.warn('Failed to load cached location', { error });
    }
  }, [cacheKey]);

  // Reverse geocode coordinates to get address
  const reverseGeocode = useCallback(async (lat: number, long: number): Promise<Partial<UserLocation>> => {
    try {
      // Use a free reverse geocoding API (Nominatim/OpenStreetMap)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${long}&zoom=10`,
        {
          headers: {
            'User-Agent': 'Q8-Assistant/1.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Geocoding failed');
      }

      const data = await response.json();
      const address = data.address || {};

      return {
        city: address.city || address.town || address.village || address.municipality,
        state: address.state || address.province || address.region,
        country: address.country,
        zipCode: address.postcode,
      };
    } catch (error) {
      logger.warn('Reverse geocoding failed', { error });
      return {};
    }
  }, []);

  // Request geolocation
  const requestLocation = useCallback(async () => {
    if (!enableGeolocation) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      logger.warn('Geolocation not supported');
      return;
    }

    setIsLocationLoading(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        });
      });

      const { latitude: lat, longitude: long } = position.coords;

      // Get address from coordinates
      const addressInfo = await reverseGeocode(lat, long);

      const newLocation: UserLocation = {
        ...addressInfo,
        coordinates: { lat, long },
      };

      setLocation(newLocation);
      setIsLocationEnabled(true);
      setLastUpdated(new Date());

      // Cache the location
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          location: newLocation,
          timestamp: Date.now(),
        })
      );

      logger.info('Location updated', { city: newLocation.city, country: newLocation.country });
      onLocationChange?.(newLocation);
    } catch (error) {
      const geoError = error as GeolocationPositionError;
      logger.warn('Failed to get location', {
        code: geoError.code,
        message: geoError.message,
      });

      if (geoError.code === 1) {
        // Permission denied
        setIsLocationEnabled(false);
      }
    } finally {
      setIsLocationLoading(false);
    }
  }, [enableGeolocation, cacheKey, reverseGeocode, onLocationChange]);

  // Manually set location (for user preferences)
  const setManualLocation = useCallback((newLocation: UserLocation) => {
    setLocation(newLocation);
    setIsLocationEnabled(true);
    setLastUpdated(new Date());

    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        location: newLocation,
        timestamp: Date.now(),
      })
    );

    logger.info('Manual location set', { city: newLocation.city });
    onLocationChange?.(newLocation);
  }, [cacheKey, onLocationChange]);

  // Clear location
  const clearLocation = useCallback(() => {
    setLocation({});
    setIsLocationEnabled(false);
    setLastUpdated(null);
    localStorage.removeItem(cacheKey);
    logger.info('Location cleared');
  }, [cacheKey]);

  // Build user profile for AI context
  const getUserProfile = useCallback(() => {
    return {
      timezone,
      location: isLocationEnabled ? location : undefined,
    };
  }, [timezone, location, isLocationEnabled]);

  // Get formatted location string
  const getLocationString = useCallback(() => {
    if (!isLocationEnabled || !location.city) {
      return 'Location not set';
    }

    const parts = [location.city];
    if (location.state) parts.push(location.state);
    if (location.country) parts.push(location.country);

    return parts.join(', ');
  }, [isLocationEnabled, location]);

  return {
    // State
    timezone,
    location,
    isLocationLoading,
    isLocationEnabled,
    lastUpdated,

    // Actions
    requestLocation,
    setManualLocation,
    clearLocation,

    // Helpers
    getUserProfile,
    getLocationString,
  };
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Format timezone for display
 */
export function formatTimezone(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    });
    const parts = formatter.formatToParts(now);
    const tzPart = parts.find((p) => p.type === 'timeZoneName');
    return tzPart?.value || timezone;
  } catch {
    return timezone;
  }
}

/**
 * Get current time in a specific timezone
 */
export function getCurrentTimeInTimezone(timezone: string): string {
  try {
    return new Date().toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return new Date().toLocaleTimeString();
  }
}

/**
 * Get current date in a specific timezone
 */
export function getCurrentDateInTimezone(timezone: string): string {
  try {
    return new Date().toLocaleDateString('en-US', {
      timeZone: timezone,
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return new Date().toLocaleDateString();
  }
}
