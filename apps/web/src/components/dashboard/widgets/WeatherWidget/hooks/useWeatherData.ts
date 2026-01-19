'use client';

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import type { WeatherResponse, TemperatureUnit } from '../types';
import { REFRESH_INTERVAL, DEFAULT_LOCATION } from '../constants';
import { convertTemperature } from '../utils';

interface UseWeatherDataOptions {
  location?: string;
  lat?: number;
  lon?: number;
  showForecast?: boolean;
  includeHourly?: boolean;
  includeAlerts?: boolean;
  includeAirQuality?: boolean;
  extended?: boolean;
}

interface UseWeatherDataReturn {
  data: WeatherResponse | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

export function useWeatherData(options: UseWeatherDataOptions = {}): UseWeatherDataReturn {
  const {
    location,
    lat,
    lon,
    showForecast = true,
    includeHourly = false,
    includeAlerts = false,
    includeAirQuality = false,
    extended = false,
  } = options;

  const [data, setData] = useState<WeatherResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchWeather = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      }
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

      if (includeHourly) {
        params.set('hourly', 'true');
      }

      if (includeAlerts) {
        params.set('alerts', 'true');
      }

      if (includeAirQuality) {
        params.set('aqi', 'true');
      }

      if (extended) {
        params.set('extended', 'true');
      }

      const response = await fetch(`/api/weather?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Not authenticated');
        }
        throw new Error('Failed to fetch weather data');
      }

      const weatherData: WeatherResponse = await response.json();
      setData(weatherData);
      setLastUpdated(new Date());
    } catch (err) {
      logger.error('Weather fetch error', { error: err });
      setError(err instanceof Error ? err.message : 'Failed to load weather');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [location, lat, lon, showForecast, includeHourly, includeAlerts, includeAirQuality, extended]);

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(() => fetchWeather(true), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchWeather]);

  const refresh = useCallback(async () => {
    await fetchWeather(true);
  }, [fetchWeather]);

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    lastUpdated,
    refresh,
  };
}

export function useTemperatureConversion(unit: TemperatureUnit) {
  const convertTemp = useCallback(
    (temp: number) => convertTemperature(temp, unit),
    [unit]
  );

  return { convertTemp };
}
