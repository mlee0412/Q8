'use client';

import { motion } from 'framer-motion';
import { Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WEATHER_ICONS, CONDITION_COLORS } from '../constants';
import type { WeatherIconProps } from '../types';

const SIZE_CLASSES = {
  sm: 'h-5 w-5',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

export function WeatherIcon({
  condition,
  size = 'md',
  animated = true,
  className,
}: WeatherIconProps) {
  const Icon = WEATHER_ICONS[condition] ?? Cloud;
  const colorClass = CONDITION_COLORS[condition] ?? 'text-slate-400';

  const getAnimation = () => {
    if (!animated) return {};

    switch (condition) {
      case 'Clear':
        return {
          rotate: [0, 5, -5, 0],
          scale: [1, 1.05, 1],
        };
      case 'Clouds':
        return {
          x: [-2, 2, -2],
          opacity: [0.8, 1, 0.8],
        };
      case 'Rain':
      case 'Drizzle':
        return {
          y: [0, 2, 0],
        };
      case 'Snow':
        return {
          rotate: [0, 10, -10, 0],
          y: [0, 1, 0],
        };
      case 'Thunderstorm':
        return {
          scale: [1, 1.1, 1],
          opacity: [1, 0.7, 1],
        };
      case 'Wind':
        return {
          x: [-3, 3, -3],
        };
      default:
        return {
          scale: [1, 1.02, 1],
        };
    }
  };

  return (
    <motion.div
      animate={getAnimation()}
      transition={{
        duration: condition === 'Thunderstorm' ? 0.5 : 4,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className={cn('flex items-center justify-center', className)}
    >
      <Icon className={cn(SIZE_CLASSES[size], colorClass)} />
    </motion.div>
  );
}

WeatherIcon.displayName = 'WeatherIcon';
