'use client';

import { motion } from 'framer-motion';
import { Droplets } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WeatherIcon } from '../components/WeatherIcon';
import type { HourlyForecast as HourlyForecastType, TemperatureUnit } from '../types';

interface HourlyForecastProps {
  hourly: HourlyForecastType[];
  unit: TemperatureUnit;
  convertTemp: (temp: number) => number;
  compact?: boolean;
}

export function HourlyForecast({
  hourly,
  unit,
  convertTemp,
  compact = false,
}: HourlyForecastProps) {
  if (!hourly || hourly.length === 0) {
    return (
      <div className="text-center py-8 text-white/60">
        Hourly forecast data not available
      </div>
    );
  }

  const formatHour = (timeStr: string) => {
    const date = new Date(timeStr);
    const hour = date.getHours();
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
  };

  const maxTemp = Math.max(...hourly.map((h) => h.temp));
  const minTemp = Math.min(...hourly.map((h) => h.temp));
  const tempRange = maxTemp - minTemp || 1;

  return (
    <div className={cn('overflow-x-auto scrollbar-thin', compact ? '' : 'pb-4')}>
      <div className={cn('flex gap-3', compact ? 'min-w-max' : 'min-w-max')}>
        {hourly.map((hour, index) => {
          const tempPercent = ((hour.temp - minTemp) / tempRange) * 100;

          return (
            <motion.div
              key={hour.time}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className={cn(
                'flex flex-col items-center',
                compact ? 'min-w-[50px]' : 'min-w-[70px]'
              )}
            >
              {/* Time */}
              <p className="text-xs text-white/60 mb-2">
                {index === 0 ? 'Now' : formatHour(hour.time)}
              </p>

              {/* Weather Icon */}
              <WeatherIcon
                condition={hour.condition}
                size="sm"
                animated={false}
                className="mb-2"
              />

              {/* Temperature */}
              <p className="text-sm font-semibold text-white mb-1">
                {convertTemp(hour.temp)}°
              </p>

              {/* Precipitation */}
              {hour.precipitation > 0.1 && (
                <div className="flex items-center gap-0.5 text-xs text-blue-400">
                  <Droplets className="h-3 w-3" />
                  <span>{Math.round(hour.precipitation * 100)}%</span>
                </div>
              )}

              {/* Temperature bar (only in full view) */}
              {!compact && (
                <div className="w-1 h-12 bg-white/10 rounded-full mt-2 relative overflow-hidden">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${tempPercent}%` }}
                    transition={{ delay: index * 0.03 + 0.2 }}
                    className="absolute bottom-0 w-full bg-gradient-to-t from-blue-500 to-amber-400 rounded-full"
                  />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

HourlyForecast.displayName = 'HourlyForecast';
