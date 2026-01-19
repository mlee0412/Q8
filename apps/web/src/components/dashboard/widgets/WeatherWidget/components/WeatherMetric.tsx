'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { WeatherMetricProps } from '../types';

export function WeatherMetric({
  icon: Icon,
  label,
  value,
  unit,
  color = 'text-text-secondary',
  className,
}: WeatherMetricProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'card-item text-center p-2 rounded-lg',
        className
      )}
    >
      <Icon className={cn('h-4 w-4 mx-auto mb-1', color)} />
      <p className="text-caption text-text-muted">{label}</p>
      <p className="text-label font-medium">
        {value}
        {unit && <span className="text-text-muted ml-0.5">{unit}</span>}
      </p>
    </motion.div>
  );
}

WeatherMetric.displayName = 'WeatherMetric';
