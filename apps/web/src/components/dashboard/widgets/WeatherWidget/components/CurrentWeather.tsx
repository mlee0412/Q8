'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { WeatherIcon } from './WeatherIcon';
import type { CurrentWeatherProps } from '../types';

export function CurrentWeather({
  current,
  unit,
  convertTemp,
}: CurrentWeatherProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-baseline gap-1">
          <motion.span
            key={current.temp}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-bold text-text-primary"
          >
            {convertTemp(current.temp)}°
          </motion.span>
          <span className="text-xl text-text-muted">
            {unit === 'celsius' ? 'C' : 'F'}
          </span>
        </div>
        <p className="text-caption mt-1">
          Feels like {convertTemp(current.feelsLike)}°
        </p>
        <p className="text-label capitalize mt-1 text-text-secondary">
          {current.description}
        </p>
      </div>

      <WeatherIcon
        condition={current.condition}
        size="xl"
        animated
        className="opacity-90"
      />
    </div>
  );
}

CurrentWeather.displayName = 'CurrentWeather';
