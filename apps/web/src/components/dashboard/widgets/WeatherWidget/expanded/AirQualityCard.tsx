'use client';

import { motion } from 'framer-motion';
import { Wind } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AQI_CONFIG } from '../constants';
import type { AirQuality } from '../types';

interface AirQualityCardProps {
  airQuality: AirQuality;
}

export function AirQualityCard({ airQuality }: AirQualityCardProps) {
  const config = AQI_CONFIG[airQuality.category];
  const aqiPercent = Math.min(100, (airQuality.aqi / 500) * 100);

  const pollutants = [
    { label: 'PM2.5', value: airQuality.pm25, unit: 'μg/m³' },
    { label: 'PM10', value: airQuality.pm10, unit: 'μg/m³' },
    { label: 'O₃', value: airQuality.o3, unit: 'ppb' },
    { label: 'NO₂', value: airQuality.no2, unit: 'ppb' },
    { label: 'CO', value: airQuality.co, unit: 'ppm' },
  ];

  if (airQuality.so2 !== undefined) {
    pollutants.push({ label: 'SO₂', value: airQuality.so2, unit: 'ppb' });
  }

  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wind className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-medium text-white/80">Air Quality</span>
        </div>
        <span className={cn('text-sm font-semibold', config.color)}>
          {config.label}
        </span>
      </div>

      {/* AQI Gauge */}
      <div className="mb-4">
        <div className="flex items-end justify-between mb-2">
          <span className="text-3xl font-bold text-white">{airQuality.aqi}</span>
          <span className="text-xs text-white/50">AQI</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${aqiPercent}%` }}
            transition={{ duration: 0.5 }}
            className={cn('h-full rounded-full', config.bgColor)}
            style={{
              background: `linear-gradient(to right, #22c55e, #eab308, #f97316, #ef4444, #a855f7, #be123c)`,
              backgroundSize: '500% 100%',
              backgroundPosition: `${aqiPercent}% 0`,
            }}
          />
        </div>
        <p className="text-xs text-white/50 mt-2">{config.description}</p>
      </div>

      {/* Pollutants Grid */}
      <div className="grid grid-cols-3 gap-2">
        {pollutants.map((pollutant) => (
          <div
            key={pollutant.label}
            className="text-center p-2 rounded-lg bg-white/5"
          >
            <p className="text-xs text-white/50">{pollutant.label}</p>
            <p className="text-sm font-medium text-white">
              {pollutant.value.toFixed(1)}
            </p>
            <p className="text-xs text-white/30">{pollutant.unit}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

AirQualityCard.displayName = 'AirQualityCard';
