'use client';

import { motion } from 'framer-motion';
import {
  Thermometer,
  Droplets,
  Wind,
  Eye,
  Gauge,
  Cloud,
  Compass,
  Sunrise,
  Sunset,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatVisibility,
  formatPressure,
  formatWindSpeed,
  getWindDirection,
  getBeaufortScale,
} from '../utils';
import { AirQualityCard } from './AirQualityCard';
import { UVIndexCard } from './UVIndexCard';
import type { WeatherCurrent, TemperatureUnit, AirQuality, UVIndex } from '../types';

interface WeatherDetailsProps {
  current: WeatherCurrent;
  unit: TemperatureUnit;
  airQuality?: AirQuality | null;
  uvIndex?: UVIndex | null;
}

export function WeatherDetails({
  current,
  unit,
  airQuality,
  uvIndex,
}: WeatherDetailsProps) {
  const windDir = getWindDirection(current.windDeg);
  const beaufort = getBeaufortScale(current.windSpeed);

  const convertTemp = (temp: number) =>
    unit === 'celsius' ? Math.round((temp - 32) * (5 / 9)) : Math.round(temp);

  const details = [
    {
      icon: Thermometer,
      label: 'Feels Like',
      value: `${convertTemp(current.feelsLike)}°`,
      color: 'text-orange-400',
    },
    {
      icon: Thermometer,
      label: 'High / Low',
      value: `${convertTemp(current.tempMax)}° / ${convertTemp(current.tempMin)}°`,
      color: 'text-red-400',
    },
    {
      icon: Droplets,
      label: 'Humidity',
      value: `${current.humidity}%`,
      color: 'text-blue-400',
    },
    {
      icon: Gauge,
      label: 'Pressure',
      value: formatPressure(current.pressure, unit),
      color: 'text-purple-400',
    },
    {
      icon: Eye,
      label: 'Visibility',
      value: formatVisibility(current.visibility, unit),
      color: 'text-cyan-400',
    },
    {
      icon: Cloud,
      label: 'Cloud Cover',
      value: `${current.clouds}%`,
      color: 'text-slate-400',
    },
    {
      icon: Wind,
      label: 'Wind Speed',
      value: formatWindSpeed(current.windSpeed, unit),
      color: 'text-teal-400',
    },
    {
      icon: Compass,
      label: 'Wind Direction',
      value: `${windDir.full} (${current.windDeg}°)`,
      color: 'text-green-400',
    },
    {
      icon: Wind,
      label: 'Wind Scale',
      value: beaufort.label,
      description: beaufort.description,
      color: 'text-emerald-400',
    },
    {
      icon: Sunrise,
      label: 'Sunrise',
      value: current.sunrise,
      color: 'text-amber-400',
    },
    {
      icon: Sunset,
      label: 'Sunset',
      value: current.sunset,
      color: 'text-orange-500',
    },
  ];

  if (current.dewPoint !== undefined) {
    details.push({
      icon: Droplets,
      label: 'Dew Point',
      value: `${convertTemp(current.dewPoint)}°`,
      color: 'text-sky-400',
    });
  }

  if (current.windGust) {
    details.push({
      icon: Wind,
      label: 'Wind Gust',
      value: formatWindSpeed(current.windGust, unit),
      color: 'text-rose-400',
    });
  }

  return (
    <div className="space-y-6">
      {/* Main Details Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {details.map((detail, index) => (
          <motion.div
            key={detail.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03 }}
            className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <detail.icon className={cn('h-4 w-4', detail.color)} />
              <span className="text-xs text-white/60">{detail.label}</span>
            </div>
            <p className="text-lg font-semibold text-white">{detail.value}</p>
            {'description' in detail && detail.description && (
              <p className="text-xs text-white/50 mt-1">{detail.description}</p>
            )}
          </motion.div>
        ))}
      </div>

      {/* Air Quality & UV */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {airQuality && <AirQualityCard airQuality={airQuality} />}
        {uvIndex && <UVIndexCard uvIndex={uvIndex} />}
      </div>
    </div>
  );
}

WeatherDetails.displayName = 'WeatherDetails';
