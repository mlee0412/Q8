/**
 * WeatherWidget Constants
 * Icons, gradients, and configuration mappings
 */

import {
  Cloud,
  CloudRain,
  CloudSnow,
  Sun,
  Wind,
  CloudLightning,
  CloudFog,
  CloudDrizzle,
  Cloudy,
  CloudSun,
  Snowflake,
  Tornado,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { WeatherCondition, AQICategory, UVCategory, AlertSeverity, MoonPhaseName } from './types';

export const WEATHER_ICONS: Record<string, LucideIcon> = {
  Clear: Sun,
  Clouds: Cloud,
  Rain: CloudRain,
  Drizzle: CloudDrizzle,
  Snow: CloudSnow,
  Thunderstorm: CloudLightning,
  Mist: CloudFog,
  Fog: CloudFog,
  Haze: CloudFog,
  Wind: Wind,
  Dust: Wind,
  Smoke: CloudFog,
  Tornado: Tornado,
};

export const CONDITION_GRADIENTS: Record<string, string> = {
  Clear: 'from-amber-500/20 via-orange-500/10 to-yellow-500/5',
  Clouds: 'from-slate-500/20 via-gray-500/10 to-slate-400/5',
  Rain: 'from-blue-600/20 via-indigo-500/10 to-blue-400/5',
  Drizzle: 'from-blue-400/20 via-cyan-500/10 to-blue-300/5',
  Snow: 'from-blue-200/20 via-white/15 to-slate-200/5',
  Thunderstorm: 'from-purple-600/20 via-indigo-600/10 to-violet-500/5',
  Mist: 'from-gray-400/20 via-slate-400/10 to-gray-300/5',
  Fog: 'from-gray-400/20 via-slate-400/10 to-gray-300/5',
  Haze: 'from-yellow-400/20 via-orange-300/10 to-amber-200/5',
  Wind: 'from-teal-400/20 via-cyan-400/10 to-teal-300/5',
  Dust: 'from-orange-400/20 via-amber-400/10 to-yellow-300/5',
  Smoke: 'from-gray-500/20 via-slate-500/10 to-gray-400/5',
  Tornado: 'from-gray-700/20 via-slate-600/10 to-gray-500/5',
};

export const CONDITION_COLORS: Record<string, string> = {
  Clear: 'text-amber-400',
  Clouds: 'text-slate-400',
  Rain: 'text-blue-400',
  Drizzle: 'text-cyan-400',
  Snow: 'text-blue-200',
  Thunderstorm: 'text-purple-400',
  Mist: 'text-gray-400',
  Fog: 'text-gray-400',
  Haze: 'text-yellow-400',
  Wind: 'text-teal-400',
  Dust: 'text-orange-400',
  Smoke: 'text-gray-500',
  Tornado: 'text-gray-600',
};

export const AQI_CONFIG: Record<AQICategory, { label: string; color: string; bgColor: string; description: string }> = {
  good: {
    label: 'Good',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    description: 'Air quality is satisfactory',
  },
  moderate: {
    label: 'Moderate',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    description: 'Acceptable for most people',
  },
  'unhealthy-sensitive': {
    label: 'Unhealthy for Sensitive',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    description: 'Sensitive groups may experience effects',
  },
  unhealthy: {
    label: 'Unhealthy',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    description: 'Everyone may experience health effects',
  },
  'very-unhealthy': {
    label: 'Very Unhealthy',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    description: 'Health alert: increased risk',
  },
  hazardous: {
    label: 'Hazardous',
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/20',
    description: 'Emergency conditions',
  },
};

export const UV_CONFIG: Record<UVCategory, { label: string; color: string; bgColor: string; range: string }> = {
  low: {
    label: 'Low',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    range: '0-2',
  },
  moderate: {
    label: 'Moderate',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    range: '3-5',
  },
  high: {
    label: 'High',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    range: '6-7',
  },
  'very-high': {
    label: 'Very High',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    range: '8-10',
  },
  extreme: {
    label: 'Extreme',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    range: '11+',
  },
};

export const ALERT_SEVERITY_CONFIG: Record<AlertSeverity, { color: string; bgColor: string; borderColor: string }> = {
  minor: {
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  moderate: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
  severe: {
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
  },
  extreme: {
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
};

export const MOON_PHASE_ICONS: Record<MoonPhaseName, string> = {
  new: '🌑',
  'waxing-crescent': '🌒',
  'first-quarter': '🌓',
  'waxing-gibbous': '🌔',
  full: '🌕',
  'waning-gibbous': '🌖',
  'last-quarter': '🌗',
  'waning-crescent': '🌘',
};

export const MOON_PHASE_LABELS: Record<MoonPhaseName, string> = {
  new: 'New Moon',
  'waxing-crescent': 'Waxing Crescent',
  'first-quarter': 'First Quarter',
  'waxing-gibbous': 'Waxing Gibbous',
  full: 'Full Moon',
  'waning-gibbous': 'Waning Gibbous',
  'last-quarter': 'Last Quarter',
  'waning-crescent': 'Waning Crescent',
};

export const WIND_DIRECTIONS = [
  { min: 0, max: 22.5, label: 'N', full: 'North' },
  { min: 22.5, max: 67.5, label: 'NE', full: 'Northeast' },
  { min: 67.5, max: 112.5, label: 'E', full: 'East' },
  { min: 112.5, max: 157.5, label: 'SE', full: 'Southeast' },
  { min: 157.5, max: 202.5, label: 'S', full: 'South' },
  { min: 202.5, max: 247.5, label: 'SW', full: 'Southwest' },
  { min: 247.5, max: 292.5, label: 'W', full: 'West' },
  { min: 292.5, max: 337.5, label: 'NW', full: 'Northwest' },
  { min: 337.5, max: 360, label: 'N', full: 'North' },
];

export const BEAUFORT_SCALE = [
  { max: 1, label: 'Calm', description: 'Smoke rises vertically' },
  { max: 3, label: 'Light Air', description: 'Smoke drifts' },
  { max: 7, label: 'Light Breeze', description: 'Leaves rustle' },
  { max: 12, label: 'Gentle Breeze', description: 'Leaves in motion' },
  { max: 18, label: 'Moderate Breeze', description: 'Small branches move' },
  { max: 24, label: 'Fresh Breeze', description: 'Small trees sway' },
  { max: 31, label: 'Strong Breeze', description: 'Large branches move' },
  { max: 38, label: 'Near Gale', description: 'Whole trees move' },
  { max: 46, label: 'Gale', description: 'Twigs break off' },
  { max: 54, label: 'Strong Gale', description: 'Slight structural damage' },
  { max: 63, label: 'Storm', description: 'Trees uprooted' },
  { max: 72, label: 'Violent Storm', description: 'Widespread damage' },
  { max: Infinity, label: 'Hurricane', description: 'Devastating damage' },
];

export const WEATHER_TABS = [
  { id: 'overview' as const, label: 'Overview', icon: '🌤️' },
  { id: 'hourly' as const, label: 'Hourly', icon: '⏰' },
  { id: 'daily' as const, label: '7-Day', icon: '📅' },
  { id: 'details' as const, label: 'Details', icon: '📊' },
  { id: 'alerts' as const, label: 'Alerts', icon: '⚠️' },
];

export const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

export const DEFAULT_LOCATION = {
  lat: 40.7472,
  lon: -73.9903,
  name: 'New York',
};
