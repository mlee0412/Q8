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
  location?: string;
  lat?: number;
  lon?: number;
  unit?: 'celsius' | 'fahrenheit';
  showForecast?: boolean;
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2 | 3 | 4;
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

// Reduced opacity gradients for calmer visual
const CONDITION_GRADIENTS: Record<string, string> = {
  Clear: 'from-amber-500/20 via-orange-500/10 to-transparent',
  Clouds: 'from-slate-500/20 via-gray-500/10 to-transparent',
  Rain: 'from-blue-600/20 via-indigo-500/10 to-transparent',
  Drizzle: 'from-blue-400/20 via-cyan-500/10 to-transparent',
  Snow: 'from-blue-200/20 via-white/10 to-transparent',
  Thunderstorm: 'from-purple-600/20 via-indigo-600/10 to-transparent',
  Mist: 'from-gray-400/20 via-slate-400/10 to-transparent',
  Fog: 'from-gray-400/20 via-slate-400/10 to-transparent',
  Haze: 'from-yellow-400/20 via-orange-300/10 to-transparent',
};

/**
 * Weather Widget v2.0
 *
 * Uses matte surface with subtle gradient overlay.
 * Reduced neon density for calmer productivity feel.
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

  const colSpanClasses: Record<number, string> = {
    1: 'col-span-1',
    2: 'col-span-1 md:col-span-2',
    3: 'col-span-1 md:col-span-3',
    4: 'col-span-1 md:col-span-4',
  };

  const rowSpanClasses: Record<number, string> = {
    1: 'row-span-1',
    2: 'row-span-2',
    3: 'row-span-3',
    4: 'row-span-4',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'surface-matte relative overflow-hidden w-full',
        colSpanClasses[colSpan],
        rowSpanClasses[rowSpan],
        className
      )}
    >
      {/* Subtle Background Gradient */}
      <div className={cn('absolute inset-0 bg-gradient-to-br pointer-events-none', gradient)} />

      {/* Content */}
      <div className="relative h-full flex flex-col p-4">
        {/* Loading State */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-text-muted" />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="empty-state">
            <AlertTriangle className="empty-state-icon text-warning" />
            <p className="empty-state-title">Unable to load weather</p>
            <p className="empty-state-description">{error}</p>
            <button onClick={fetchWeather} className="btn-ghost focus-ring mt-2">
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
                <MapPin className="h-4 w-4 text-text-muted" />
                <span className="text-label">{data.current.cityName}</span>
              </div>
              <button
                onClick={fetchWeather}
                className="btn-icon btn-icon-sm focus-ring"
                title={lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Refresh'}
                aria-label="Refresh weather"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Current Weather */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-text-primary">
                    {convertTemp(data.current.temp)}°
                  </span>
                  <span className="text-xl text-text-muted">
                    {unit === 'celsius' ? 'C' : 'F'}
                  </span>
                </div>
                <p className="text-caption mt-1">
                  Feels like {convertTemp(data.current.feelsLike)}°
                </p>
                <p className="text-label capitalize mt-1">
                  {data.current.description}
                </p>
              </div>

              <motion.div
                animate={{
                  scale: [1, 1.03, 1],
                  rotate: data.current.condition === 'Clear' ? [0, 3, -3, 0] : 0,
                }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              >
                <WeatherIcon className="h-16 w-16 text-neon-primary opacity-80" />
              </motion.div>
            </div>

            {/* Weather Details Grid - using card-item utility */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="card-item text-center">
                <Droplets className="h-4 w-4 mx-auto mb-1 text-info" />
                <p className="text-caption">Humidity</p>
                <p className="text-label">{data.current.humidity}%</p>
              </div>
              <div className="card-item text-center">
                <Wind className="h-4 w-4 mx-auto mb-1 text-success" />
                <p className="text-caption">Wind</p>
                <p className="text-label">{Math.round(data.current.windSpeed)} mph</p>
              </div>
              <div className="card-item text-center">
                <Sunrise className="h-4 w-4 mx-auto mb-1 text-warning" />
                <p className="text-caption">Sunrise</p>
                <p className="text-label">{data.current.sunrise}</p>
              </div>
              <div className="card-item text-center">
                <Sunset className="h-4 w-4 mx-auto mb-1 text-neon-primary" />
                <p className="text-caption">Sunset</p>
                <p className="text-label">{data.current.sunset}</p>
              </div>
            </div>

            {/* 5-Day Forecast */}
            {showForecast && data.forecast && data.forecast.length > 0 && (
              <div className="flex-1">
                <p className="text-caption mb-2">5-Day Forecast</p>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                  {data.forecast.map((day, index) => {
                    const DayIcon = getWeatherIcon(day.condition);
                    return (
                      <motion.div
                        key={day.date}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="card-item flex-shrink-0 text-center min-w-[60px]"
                      >
                        <p className="text-xs font-medium mb-1 text-text-secondary">
                          {getDayName(day.date, index)}
                        </p>
                        <DayIcon className="h-5 w-5 mx-auto mb-1 text-text-secondary" />
                        <div className="flex items-center justify-center gap-1 text-xs">
                          <span className="font-semibold text-text-primary">
                            {convertTemp(day.tempMax)}°
                          </span>
                          <span className="text-text-muted">
                            {convertTemp(day.tempMin)}°
                          </span>
                        </div>
                        {day.precipitation > 0.3 && (
                          <p className="text-xs text-info mt-1">
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
            <div className="flex items-center justify-center gap-4 mt-2 text-caption">
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
