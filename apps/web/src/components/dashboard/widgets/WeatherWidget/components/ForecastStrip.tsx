'use client';

import { cn } from '@/lib/utils';
import { ForecastCard } from './ForecastCard';
import type { ForecastDay, TemperatureUnit } from '../types';

interface ForecastStripProps {
  forecast: ForecastDay[];
  unit: TemperatureUnit;
  convertTemp: (temp: number) => number;
  className?: string;
}

export function ForecastStrip({
  forecast,
  unit,
  convertTemp,
  className,
}: ForecastStripProps) {
  if (!forecast || forecast.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex-1', className)}>
      <p className="text-caption mb-2">5-Day Forecast</p>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {forecast.map((day, index) => (
          <ForecastCard
            key={day.date}
            day={day}
            index={index}
            unit={unit}
            convertTemp={convertTemp}
          />
        ))}
      </div>
    </div>
  );
}

ForecastStrip.displayName = 'ForecastStrip';
