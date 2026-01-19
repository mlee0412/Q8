/**
 * Context Provider
 * Builds enriched context for all agents with time, location, weather, and user info
 */

import { getWeather, type WeatherData } from './tools/weather';
import { logger } from '@/lib/logger';
import type { EnrichedContext, UserProfile, SessionState } from './types';

// User's home location (configured)
const USER_LOCATION = {
  address: '125 W. 31st Street, New York, NY 10001',
  city: 'New York',
  state: 'NY',
  country: 'USA',
  zipCode: '10001',
  coordinates: {
    lat: 40.7472,
    long: -73.9903,
  },
} as const;

// Default user profile (can be overridden from Supabase)
const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'User',
  timezone: 'America/New_York',
  communicationStyle: 'concise',
  preferences: {},
};

// Cache weather data (refresh every 15 minutes)
let weatherCache: { data: WeatherData | null; timestamp: number } = {
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
async function getCachedWeather(): Promise<WeatherData | null> {
  const now = Date.now();

  if (weatherCache.data && now - weatherCache.timestamp < WEATHER_CACHE_TTL) {
    return weatherCache.data;
  }

  try {
    const weather = await getWeather(
      USER_LOCATION.coordinates.lat,
      USER_LOCATION.coordinates.long
    );
    weatherCache = { data: weather, timestamp: now };
    return weather;
  } catch (error) {
    logger.error('Failed to fetch weather', { lat: USER_LOCATION.coordinates.lat, long: USER_LOCATION.coordinates.long, error });
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

  // Get hour in user's timezone
  const hourString = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    hour12: false,
    timeZone: profile.timezone,
  });
  const hour = parseInt(hourString, 10);

  // Fetch weather (cached)
  const weather = await getCachedWeather();

  return {
    // IDs
    userId,
    sessionId,

    // Temporal context
    currentTime: now,
    timezone: profile.timezone,
    localTimeFormatted: formatTime(now, profile.timezone),
    localDateFormatted: formatDate(now, profile.timezone),
    dayOfWeek: getDayOfWeek(now, profile.timezone),
    isWeekend: isWeekend(now, profile.timezone),
    timeOfDay: getTimeOfDay(hour),

    // Location context
    location: {
      address: USER_LOCATION.address,
      city: USER_LOCATION.city,
      state: USER_LOCATION.state,
      country: USER_LOCATION.country,
      zipCode: USER_LOCATION.zipCode,
      coordinates: USER_LOCATION.coordinates,
    },

    // Weather context
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
      timezone: profile.timezone,
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
