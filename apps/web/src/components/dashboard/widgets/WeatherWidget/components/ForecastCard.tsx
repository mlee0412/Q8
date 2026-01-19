'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { WeatherIcon } from './WeatherIcon';
import { getDayName } from '../utils';
import type { ForecastCardProps } from '../types';

export function ForecastCard({
  day,
  index,
  unit,
  convertTemp,
}: ForecastCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="card-item flex-shrink-0 text-center min-w-[60px] p-2 rounded-lg"
    >
      <p className="text-xs font-medium mb-1 text-text-secondary">
        {getDayName(day.date, index)}
      </p>
      <WeatherIcon
        condition={day.condition}
        size="sm"
        animated={false}
        className="mx-auto mb-1"
      />
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
}

ForecastCard.displayName = 'ForecastCard';
