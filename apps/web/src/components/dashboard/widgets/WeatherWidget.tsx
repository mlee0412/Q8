'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Cloud,
  CloudRain,
  CloudSnow,
  Sun,
  Wind,
  Droplets,
  MapPin,
  Sunrise,
  Sunset,
  RefreshCw,
  AlertTriangle,
  CloudLightning,
  CloudFog,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeatherCurrent {
  temp: number;
  feelsLike: number;
  tempMin: number;
  tempMax: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDeg: number;
  condition: string;
  description: string;
  icon: string;
  visibility: number;
  clouds: number;
  sunrise: string;
  sunset: string;
  cityName: string;
}

interface ForecastDay {
  date: string;
  temp: number;
  tempMin: number;
  tempMax: number;
  condition: string;
  description: string;
  icon: string;
  precipitation: number;
}

interface WeatherResponse {
  current: WeatherCurrent;
  forecast: ForecastDay[] | null;
  updatedAt: string;
}

interface WeatherWidgetProps {
  /**
   * Location override (city name)
   */
  location?: string;

  /**
   * Latitude for coordinates-based lookup
   */
  lat?: number;

  /**
   * Longitude for coordinates-based lookup
   */
  lon?: number;

  /**
   * Temperature unit
   * @default 'fahrenheit'
   */
  unit?: 'celsius' | 'fahrenheit';

  /**
   * Show 5-day forecast
   * @default true
   */
  showForecast?: boolean;

  /**
   * Bento grid column span
   * @default 2
   */
  colSpan?: 1 | 2 | 3 | 4;

  /**
   * Bento grid row span
   * @default 2
   */
  rowSpan?: 1 | 2 | 3 | 4;

  /**
   * Additional CSS classes
   */
  className?: string;
}

const WEATHER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Clear: Sun,
  Clouds: Cloud,
  Rain: CloudRain,
  Drizzle: CloudRain,
  Snow: CloudSnow,
  Thunderstorm: CloudLightning,
  Mist: CloudFog,
  Fog: CloudFog,
  Haze: CloudFog,
  Wind: Wind,
};

const CONDITION_GRADIENTS: Record<string, string> = {
  Clear: 'from-amber-500/30 via-orange-500/20 to-yellow-500/10',
  Clouds: 'from-slate-500/30 via-gray-500/20 to-blue-500/10',
  Rain: 'from-blue-600/30 via-indigo-500/20 to-slate-500/10',
  Drizzle: 'from-blue-400/30 via-cyan-500/20 to-slate-500/10',
  Snow: 'from-blue-200/30 via-white/20 to-slate-300/10',
  Thunderstorm: 'from-purple-600/30 via-indigo-600/20 to-slate-700/10',
  Mist: 'from-gray-400/30 via-slate-400/20 to-white/10',
  Fog: 'from-gray-400/30 via-slate-400/20 to-white/10',
  Haze: 'from-yellow-400/30 via-orange-300/20 to-gray-400/10',
};

/**
 * Enhanced Weather Widget
 *
 * Displays current weather conditions with 5-day forecast, sunrise/sunset,
 * and weather-appropriate background gradients.
 *
 * Features:
 * - Real API integration with OpenWeatherMap
 * - Current temperature and conditions
 * - 5-day forecast with precipitation chance
 * - Humidity, wind speed, sunrise/sunset
 * - Animated weather-appropriate backgrounds
 * - Auto-refresh every 10 minutes
 */
export function WeatherWidget({
  location,
  lat,
  lon,
  unit = 'fahrenheit',
  showForecast = true,
  colSpan = 2,
  rowSpan = 2,
  className,
}: WeatherWidgetProps) {
  const [data, setData] = useState<WeatherResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchWeather = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams();

      if (location) {
        params.set('city', location);
      } else if (lat && lon) {
        params.set('lat', lat.toString());
        params.set('lon', lon.toString());
      }

      if (showForecast) {
        params.set('forecast', 'true');
      }

      const response = await fetch(`/api/weather?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch weather data');
      }

      const weatherData = await response.json();
      setData(weatherData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Weather fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load weather');
    } finally {
      setIsLoading(false);
    }
  }, [location, lat, lon, showForecast]);

  useEffect(() => {
    fetchWeather();
    // Refresh every 10 minutes
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchWeather]);

  const convertTemp = (temp: number) => {
    if (unit === 'celsius') {
      return Math.round((temp - 32) * (5 / 9));
    }
    return Math.round(temp);
  };

  const getWeatherIcon = (condition: string) => {
    return WEATHER_ICONS[condition] || Cloud;
  };

  const getGradient = (condition: string) => {
    return CONDITION_GRADIENTS[condition] || CONDITION_GRADIENTS.Clouds;
  };

  const getDayName = (dateStr: string, index: number) => {
    if (index === 0) return 'Today';
    if (index === 1) return 'Tomorrow';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const WeatherIcon = data ? getWeatherIcon(data.current.condition) : Cloud;
  const gradient = data ? getGradient(data.current.condition) : '';

  // Map colSpan to Tailwind classes - full width on mobile, specified span on md+
  const colSpanClasses: Record<number, string> = {
    1: 'col-span-1',
    2: 'col-span-1 md:col-span-2',
    3: 'col-span-1 md:col-span-3',
    4: 'col-span-1 md:col-span-4',
  };

  // Map rowSpan to Tailwind classes
  const rowSpanClasses: Record<number, string> = {
    1: 'row-span-1',
    2: 'row-span-2',
    3: 'row-span-3',
    4: 'row-span-4',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn('glass-panel rounded-xl relative overflow-hidden w-full', colSpanClasses[colSpan], rowSpanClasses[rowSpan], className)}
    >
      {/* Animated Background Gradient */}
      <motion.div
        className={cn('absolute inset-0 bg-gradient-to-br', gradient)}
        animate={{ opacity: [0.5, 0.7, 0.5] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Content */}
      <div className="relative h-full flex flex-col p-4">
        {/* Loading State */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={fetchWeather}
              className="text-xs text-neon-primary hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Weather Data */}
        {data && !isLoading && !error && (
          <>
            {/* Header with Location & Refresh */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{data.current.cityName}</span>
              </div>
              <button
                onClick={fetchWeather}
                className="p-1.5 rounded-lg hover:bg-glass-bg transition-colors"
                title={lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Refresh'}
              >
                <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>

            {/* Current Weather */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold">
                    {convertTemp(data.current.temp)}°
                  </span>
                  <span className="text-xl text-muted-foreground">
                    {unit === 'celsius' ? 'C' : 'F'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Feels like {convertTemp(data.current.feelsLike)}°
                </p>
                <p className="text-sm font-medium capitalize mt-1">
                  {data.current.description}
                </p>
              </div>

              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                  rotate: data.current.condition === 'Clear' ? [0, 5, -5, 0] : 0,
                }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <WeatherIcon className="h-20 w-20 text-neon-primary" />
              </motion.div>
            </div>

            {/* Weather Details Grid */}
            <div className="grid grid-cols-4 gap-2 mb-4 text-xs">
              <div className="glass-panel rounded-lg p-2 text-center">
                <Droplets className="h-4 w-4 mx-auto mb-1 text-blue-400" />
                <p className="text-muted-foreground">Humidity</p>
                <p className="font-semibold">{data.current.humidity}%</p>
              </div>
              <div className="glass-panel rounded-lg p-2 text-center">
                <Wind className="h-4 w-4 mx-auto mb-1 text-teal-400" />
                <p className="text-muted-foreground">Wind</p>
                <p className="font-semibold">{Math.round(data.current.windSpeed)} mph</p>
              </div>
              <div className="glass-panel rounded-lg p-2 text-center">
                <Sunrise className="h-4 w-4 mx-auto mb-1 text-orange-400" />
                <p className="text-muted-foreground">Sunrise</p>
                <p className="font-semibold">{data.current.sunrise}</p>
              </div>
              <div className="glass-panel rounded-lg p-2 text-center">
                <Sunset className="h-4 w-4 mx-auto mb-1 text-purple-400" />
                <p className="text-muted-foreground">Sunset</p>
                <p className="font-semibold">{data.current.sunset}</p>
              </div>
            </div>

            {/* 5-Day Forecast */}
            {showForecast && data.forecast && data.forecast.length > 0 && (
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-2">5-Day Forecast</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {data.forecast.map((day, index) => {
                    const DayIcon = getWeatherIcon(day.condition);
                    return (
                      <motion.div
                        key={day.date}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex-shrink-0 glass-panel rounded-lg p-2 text-center min-w-[60px]"
                      >
                        <p className="text-xs font-medium mb-1">
                          {getDayName(day.date, index)}
                        </p>
                        <DayIcon className="h-5 w-5 mx-auto mb-1 text-neon-primary" />
                        <div className="flex items-center justify-center gap-1 text-xs">
                          <span className="font-semibold">{convertTemp(day.tempMax)}°</span>
                          <span className="text-muted-foreground">
                            {convertTemp(day.tempMin)}°
                          </span>
                        </div>
                        {day.precipitation > 0.3 && (
                          <p className="text-xs text-blue-400 mt-1">
                            {Math.round(day.precipitation * 100)}%
                          </p>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* High/Low for Today */}
            <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>H: {convertTemp(data.current.tempMax)}°</span>
              <span>L: {convertTemp(data.current.tempMin)}°</span>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

WeatherWidget.displayName = 'WeatherWidget';
