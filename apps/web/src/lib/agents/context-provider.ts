/**
 * Context Provider
 * Builds enriched context for all agents with time, location, weather, and user info
 */

import { getWeather, type WeatherData } from './tools/weather';
import { logger } from '@/lib/logger';
import type { EnrichedContext, UserProfile, SessionState } from './types';

// Default location (used when user location is not available)
const DEFAULT_LOCATION = {
  address: 'Location not set',
  city: 'Unknown',
  state: '',
  country: '',
  zipCode: '',
  coordinates: {
    lat: 0,
    long: 0,
  },
} as const;

// Default user profile (can be overridden from user settings or browser detection)
const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'User',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  communicationStyle: 'concise',
  preferences: {},
};

/**
 * Detect timezone from browser/system
 */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

// Cache weather data (refresh every 15 minutes)
interface CachedWeather extends WeatherData {
  cachedLat: number;
  cachedLong: number;
}
let weatherCache: { data: CachedWeather | null; timestamp: number } = {
  data: null,
  timestamp: 0,
};
const WEATHER_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

/**
 * Get time of day category
 */
function getTimeOfDay(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * Get greeting based on time of day
 */
export function getGreeting(timeOfDay: string): string {
  switch (timeOfDay) {
    case 'morning':
      return 'Good morning';
    case 'afternoon':
      return 'Good afternoon';
    case 'evening':
      return 'Good evening';
    case 'night':
      return 'Good night';
    default:
      return 'Hello';
  }
}

/**
 * Format date for display
 */
function formatDate(date: Date, timezone: string): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: timezone,
  });
}

/**
 * Format time for display
 */
function formatTime(date: Date, timezone: string): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone,
  });
}

/**
 * Get day of week
 */
function getDayOfWeek(date: Date, timezone: string): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    timeZone: timezone,
  });
}

/**
 * Check if weekend
 */
function isWeekend(date: Date, timezone: string): boolean {
  const dayName = getDayOfWeek(date, timezone);
  return dayName === 'Saturday' || dayName === 'Sunday';
}

/**
 * Fetch weather with caching
 */
async function getCachedWeather(lat: number, long: number): Promise<WeatherData | null> {
  // Skip if no valid coordinates
  if (!lat || !long || (lat === 0 && long === 0)) {
    return null;
  }

  const now = Date.now();

  // Check if cache is still valid for these coordinates
  if (
    weatherCache.data &&
    now - weatherCache.timestamp < WEATHER_CACHE_TTL &&
    weatherCache.data.cachedLat === lat &&
    weatherCache.data.cachedLong === long
  ) {
    return weatherCache.data;
  }

  try {
    const weather = await getWeather(lat, long);
    // Store coordinates with weather data for cache validation
    const cachedWeather: CachedWeather = { ...weather, cachedLat: lat, cachedLong: long };
    weatherCache = { data: cachedWeather, timestamp: now };
    return weather;
  } catch (error) {
    logger.error('Failed to fetch weather', { lat, long, error });
    return weatherCache.data; // Return stale data if available
  }
}

/**
 * Build enriched context for agent requests
 */
export async function buildEnrichedContext(
  userId: string,
  sessionId: string,
  userProfile?: Partial<UserProfile>,
  sessionState?: Partial<SessionState>
): Promise<EnrichedContext> {
  const profile = { ...DEFAULT_USER_PROFILE, ...userProfile };
  const now = new Date();

  // Use user's timezone or detect from system
  const timezone = profile.timezone || detectTimezone();

  // Get hour in user's timezone
  const hourString = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    hour12: false,
    timeZone: timezone,
  });
  const hour = parseInt(hourString, 10);

  // Build location from user profile or use default
  const userLocation = profile.location || {};
  const location = {
    address: userLocation.address || DEFAULT_LOCATION.address,
    city: userLocation.city || DEFAULT_LOCATION.city,
    state: userLocation.state || DEFAULT_LOCATION.state,
    country: userLocation.country || DEFAULT_LOCATION.country,
    zipCode: userLocation.zipCode || DEFAULT_LOCATION.zipCode,
    coordinates: userLocation.coordinates || DEFAULT_LOCATION.coordinates,
  };

  // Fetch weather based on user's actual location (cached)
  const weather = await getCachedWeather(
    location.coordinates.lat,
    location.coordinates.long
  );

  return {
    // IDs
    userId,
    sessionId,

    // Temporal context (uses actual current time)
    currentTime: now,
    timezone,
    localTimeFormatted: formatTime(now, timezone),
    localDateFormatted: formatDate(now, timezone),
    dayOfWeek: getDayOfWeek(now, timezone),
    isWeekend: isWeekend(now, timezone),
    timeOfDay: getTimeOfDay(hour),

    // Location context (from user profile)
    location,

    // Weather context (based on user's location)
    weather: weather
      ? {
          temp: weather.temp,
          feelsLike: weather.feelsLike,
          condition: weather.condition,
          description: weather.description,
          humidity: weather.humidity,
          windSpeed: weather.windSpeed,
          icon: weather.icon,
          sunrise: weather.sunrise,
          sunset: weather.sunset,
        }
      : undefined,

    // User profile
    user: {
      name: profile.name,
      timezone,
      communicationStyle: profile.communicationStyle,
      preferences: profile.preferences,
    },

    // Session state
    session: {
      conversationTurns: sessionState?.conversationTurns || 0,
      topicsDiscussed: sessionState?.topicsDiscussed || [],
      toolsUsed: sessionState?.toolsUsed || [],
      startedAt: sessionState?.startedAt || now,
    },
  };
}

/**
 * Build a context summary string for injection into system prompts
 */
export function buildContextSummary(context: EnrichedContext): string {
  const lines: string[] = [];

  lines.push('## Current Context');
  lines.push('');

  // Time
  lines.push('### Time & Date');
  lines.push(`- **Current Time**: ${context.localTimeFormatted}`);
  lines.push(`- **Date**: ${context.localDateFormatted}`);
  lines.push(`- **Day**: ${context.dayOfWeek}${context.isWeekend ? ' (Weekend)' : ''}`);
  lines.push(`- **Time of Day**: ${context.timeOfDay}`);
  lines.push(`- **Timezone**: ${context.timezone}`);
  lines.push('');

  // Location
  lines.push('### Location');
  lines.push(`- **Address**: ${context.location.address}`);
  lines.push(`- **City**: ${context.location.city}, ${context.location.state}`);
  lines.push(
    `- **Coordinates**: ${context.location.coordinates.lat}, ${context.location.coordinates.long}`
  );
  lines.push('');

  // Weather
  if (context.weather) {
    lines.push('### Weather');
    lines.push(`- **Temperature**: ${Math.round(context.weather.temp)}°F (feels like ${Math.round(context.weather.feelsLike)}°F)`);
    lines.push(`- **Condition**: ${context.weather.description}`);
    lines.push(`- **Humidity**: ${context.weather.humidity}%`);
    lines.push(`- **Wind**: ${Math.round(context.weather.windSpeed)} mph`);
    if (context.weather.sunrise && context.weather.sunset) {
      lines.push(`- **Sunrise**: ${context.weather.sunrise}`);
      lines.push(`- **Sunset**: ${context.weather.sunset}`);
    }
    lines.push('');
  }

  // User
  lines.push('### User');
  lines.push(`- **Name**: ${context.user.name}`);
  lines.push(`- **Preferred Style**: ${context.user.communicationStyle}`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Get a quick context snippet for lightweight injection
 */
export function getQuickContext(context: EnrichedContext): string {
  const weatherPart = context.weather
    ? `, ${Math.round(context.weather.temp)}°F ${context.weather.condition}`
    : '';

  return `Current: ${context.localTimeFormatted} ${context.dayOfWeek} in ${context.location.city}${weatherPart}`;
}
