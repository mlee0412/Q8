/**
 * WeatherWidget Utilities
 * Helper functions for temperature conversion, formatting, and calculations
 */

import type { TemperatureUnit, AQICategory, UVCategory, MoonPhaseName } from './types';
import { WIND_DIRECTIONS, BEAUFORT_SCALE } from './constants';

export function convertTemperature(temp: number, unit: TemperatureUnit): number {
  if (unit === 'celsius') {
    return Math.round((temp - 32) * (5 / 9));
  }
  return Math.round(temp);
}

export function formatTemperature(temp: number, unit: TemperatureUnit): string {
  const converted = convertTemperature(temp, unit);
  return `${converted}°${unit === 'celsius' ? 'C' : 'F'}`;
}

export function getWindDirection(degrees: number): { label: string; full: string } {
  const direction = WIND_DIRECTIONS.find(
    (d) => degrees >= d.min && degrees < d.max
  );
  return direction || { label: 'N', full: 'North' };
}

export function getBeaufortScale(speedMph: number): { label: string; description: string; level: number } {
  const index = BEAUFORT_SCALE.findIndex((b) => speedMph <= b.max);
  const scale = BEAUFORT_SCALE[index] ?? BEAUFORT_SCALE[BEAUFORT_SCALE.length - 1];
  if (!scale) {
    return { label: 'Unknown', description: 'Unknown wind conditions', level: 0 };
  }
  return { label: scale.label, description: scale.description, level: index };
}

export function formatWindSpeed(speed: number, unit: TemperatureUnit): string {
  if (unit === 'celsius') {
    const kmh = Math.round(speed * 1.60934);
    return `${kmh} km/h`;
  }
  return `${Math.round(speed)} mph`;
}

export function formatVisibility(meters: number, unit: TemperatureUnit): string {
  if (unit === 'celsius') {
    const km = meters / 1000;
    return km >= 1 ? `${km.toFixed(1)} km` : `${meters} m`;
  }
  const miles = meters / 1609.34;
  return `${miles.toFixed(1)} mi`;
}

export function formatPressure(hPa: number, unit: TemperatureUnit): string {
  if (unit === 'celsius') {
    return `${hPa} hPa`;
  }
  const inHg = hPa * 0.02953;
  return `${inHg.toFixed(2)} inHg`;
}

export function getAQICategory(aqi: number): AQICategory {
  if (aqi <= 50) return 'good';
  if (aqi <= 100) return 'moderate';
  if (aqi <= 150) return 'unhealthy-sensitive';
  if (aqi <= 200) return 'unhealthy';
  if (aqi <= 300) return 'very-unhealthy';
  return 'hazardous';
}

export function getUVCategory(uv: number): UVCategory {
  if (uv <= 2) return 'low';
  if (uv <= 5) return 'moderate';
  if (uv <= 7) return 'high';
  if (uv <= 10) return 'very-high';
  return 'extreme';
}

export function getMoonPhase(date: Date = new Date()): MoonPhaseName {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const c = Math.floor(365.25 * year);
  const e = Math.floor(30.6 * month);
  const jd = c + e + day - 694039.09;
  const phase = jd / 29.53058867;
  const phaseIndex = Math.floor((phase - Math.floor(phase)) * 8);

  const phases: MoonPhaseName[] = [
    'new',
    'waxing-crescent',
    'first-quarter',
    'waxing-gibbous',
    'full',
    'waning-gibbous',
    'last-quarter',
    'waning-crescent',
  ];

  return phases[phaseIndex] || 'new';
}

export function getMoonIllumination(date: Date = new Date()): number {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const c = Math.floor(365.25 * year);
  const e = Math.floor(30.6 * month);
  const jd = c + e + day - 694039.09;
  const phase = jd / 29.53058867;
  const dayInCycle = (phase - Math.floor(phase)) * 29.53058867;

  const illumination = Math.abs(Math.cos((dayInCycle / 29.53058867) * 2 * Math.PI));
  return Math.round(illumination * 100);
}

export function getSunPosition(
  sunrise: string,
  sunset: string,
  currentTime: Date = new Date()
): { progress: number; isDay: boolean } {
  const parseTime = (timeStr: string): number => {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match || !match[1] || !match[2] || !match[3]) return 0;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const sunriseMinutes = parseTime(sunrise);
  const sunsetMinutes = parseTime(sunset);
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  const isDay = currentMinutes >= sunriseMinutes && currentMinutes <= sunsetMinutes;
  
  if (!isDay) {
    return { progress: currentMinutes < sunriseMinutes ? 0 : 100, isDay: false };
  }

  const dayLength = sunsetMinutes - sunriseMinutes;
  const elapsed = currentMinutes - sunriseMinutes;
  const progress = Math.min(100, Math.max(0, (elapsed / dayLength) * 100));

  return { progress, isDay: true };
}

export function getDayName(dateStr: string, index: number): string {
  if (index === 0) return 'Today';
  if (index === 1) return 'Tomorrow';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

export function getFullDayName(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

export function getWeatherInsight(
  condition: string,
  temp: number,
  feelsLike: number,
  humidity: number,
  windSpeed: number
): string[] {
  const insights: string[] = [];

  if (condition.toLowerCase().includes('rain') || condition.toLowerCase().includes('drizzle')) {
    insights.push("Don't forget your umbrella today!");
  }

  if (condition.toLowerCase().includes('thunder') || condition.toLowerCase().includes('storm')) {
    insights.push('Thunderstorms expected. Consider staying indoors if possible.');
  }

  if (condition.toLowerCase().includes('snow')) {
    insights.push('Snow expected. Drive carefully and bundle up!');
  }

  if (temp > 90) {
    insights.push("It's hot today! Stay hydrated and seek shade.");
  } else if (temp < 32) {
    insights.push("It's freezing! Dress warmly with layers.");
  }

  if (Math.abs(feelsLike - temp) > 10) {
    if (feelsLike < temp) {
      insights.push(`Wind chill makes it feel like ${Math.round(feelsLike)}°F. Dress warmer!`);
    } else {
      insights.push(`Heat index makes it feel like ${Math.round(feelsLike)}°F. Stay cool!`);
    }
  }

  if (humidity > 80) {
    insights.push('High humidity today. It may feel muggy outside.');
  } else if (humidity < 30) {
    insights.push('Low humidity. Consider using moisturizer and staying hydrated.');
  }

  if (windSpeed > 20) {
    insights.push('Strong winds expected. Secure loose outdoor items.');
  }

  if (condition === 'Clear' && temp >= 60 && temp <= 80) {
    insights.push('Perfect weather for outdoor activities!');
  }

  return insights;
}

export function getOutfitRecommendation(temp: number, condition: string, windSpeed: number): string {
  const isRainy = condition.toLowerCase().includes('rain') || condition.toLowerCase().includes('drizzle');
  const isSnowy = condition.toLowerCase().includes('snow');
  const isWindy = windSpeed > 15;

  if (temp < 32) {
    return isSnowy
      ? 'Heavy winter coat, boots, gloves, and a warm hat'
      : 'Heavy coat, layers, and warm accessories';
  }

  if (temp < 50) {
    if (isRainy) return 'Warm jacket with waterproof layer, boots';
    if (isWindy) return 'Windbreaker over a sweater, scarf recommended';
    return 'Light jacket or sweater, long pants';
  }

  if (temp < 65) {
    if (isRainy) return 'Light rain jacket, umbrella';
    return 'Light layers, long sleeves optional';
  }

  if (temp < 80) {
    if (isRainy) return 'Light rain jacket or umbrella, breathable clothes';
    return 'Light, breathable clothing';
  }

  return 'Light, loose-fitting clothes. Stay cool and hydrated!';
}

export function getPrecipitationDescription(probability: number): string {
  if (probability < 0.1) return 'No precipitation expected';
  if (probability < 0.3) return 'Slight chance of precipitation';
  if (probability < 0.5) return 'Chance of precipitation';
  if (probability < 0.7) return 'Likely precipitation';
  if (probability < 0.9) return 'High chance of precipitation';
  return 'Precipitation expected';
}
