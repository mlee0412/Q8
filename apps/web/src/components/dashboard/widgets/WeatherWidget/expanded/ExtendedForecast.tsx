'use client';

import { motion } from 'framer-motion';
import { Droplets, Wind } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WeatherIcon } from '../components/WeatherIcon';
import { getFullDayName, getDayName } from '../utils';
import type { ForecastDay, TemperatureUnit } from '../types';

interface ExtendedForecastProps {
  forecast: ForecastDay[];
  unit: TemperatureUnit;
  convertTemp: (temp: number) => number;
  compact?: boolean;
}

export function ExtendedForecast({
  forecast,
  unit,
  convertTemp,
  compact = false,
}: ExtendedForecastProps) {
  if (!forecast || forecast.length === 0) {
    return (
      <div className="text-center py-8 text-white/60">
        Forecast data not available
      </div>
    );
  }

  const maxTemp = Math.max(...forecast.map((d) => d.tempMax));
  const minTemp = Math.min(...forecast.map((d) => d.tempMin));
  const tempRange = maxTemp - minTemp || 1;

  if (compact) {
    return (
      <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-2">
        {forecast.map((day, index) => (
          <motion.div
            key={day.date}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex flex-col items-center min-w-[60px] p-2 rounded-lg bg-white/5"
          >
            <p className="text-xs text-white/60 mb-1">
              {getDayName(day.date, index)}
            </p>
            <WeatherIcon
              condition={day.condition}
              size="sm"
              animated={false}
              className="mb-1"
            />
            <div className="flex gap-1 text-xs">
              <span className="font-semibold text-white">
                {convertTemp(day.tempMax)}°
              </span>
              <span className="text-white/50">{convertTemp(day.tempMin)}°</span>
            </div>
            {day.precipitation > 0.2 && (
              <div className="flex items-center gap-0.5 text-xs text-blue-400 mt-1">
                <Droplets className="h-3 w-3" />
                <span>{Math.round(day.precipitation * 100)}%</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {forecast.map((day, index) => {
        const highPercent = ((day.tempMax - minTemp) / tempRange) * 100;
        const lowPercent = ((day.tempMin - minTemp) / tempRange) * 100;

        return (
          <motion.div
            key={day.date}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            {/* Day */}
            <div className="w-24 flex-shrink-0">
              <p className="text-sm font-medium text-white">
                {getDayName(day.date, index)}
              </p>
              <p className="text-xs text-white/50">
                {new Date(day.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>

            {/* Icon & Condition */}
            <div className="flex items-center gap-2 w-32 flex-shrink-0">
              <WeatherIcon
                condition={day.condition}
                size="md"
                animated={false}
              />
              <span className="text-xs text-white/70 capitalize truncate">
                {day.description}
              </span>
            </div>

            {/* Precipitation */}
            <div className="w-16 flex-shrink-0">
              {day.precipitation > 0.1 ? (
                <div className="flex items-center gap-1 text-blue-400">
                  <Droplets className="h-4 w-4" />
                  <span className="text-sm">
                    {Math.round(day.precipitation * 100)}%
                  </span>
                </div>
              ) : (
                <span className="text-sm text-white/30">—</span>
              )}
            </div>

            {/* Temperature Range Bar */}
            <div className="flex-1 flex items-center gap-3">
              <span className="text-sm text-white/50 w-8 text-right">
                {convertTemp(day.tempMin)}°
              </span>
              <div className="flex-1 h-2 bg-white/10 rounded-full relative overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${highPercent - lowPercent}%`,
                    left: `${lowPercent}%`,
                  }}
                  transition={{ delay: index * 0.05 + 0.2 }}
                  className="absolute h-full bg-gradient-to-r from-blue-400 via-green-400 to-amber-400 rounded-full"
                  style={{ left: `${lowPercent}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-white w-8">
                {convertTemp(day.tempMax)}°
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

ExtendedForecast.displayName = 'ExtendedForecast';
