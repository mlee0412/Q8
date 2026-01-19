'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Minimize2,
  Cloud,
  RefreshCw,
  MapPin,
  Thermometer,
  Droplets,
  Wind,
  Eye,
  Gauge,
  Sun,
  Moon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { WeatherIcon } from '../components/WeatherIcon';
import { SunriseSunset } from '../components/SunriseSunset';
import { HourlyForecast } from './HourlyForecast';
import { ExtendedForecast } from './ExtendedForecast';
import { WeatherDetails } from './WeatherDetails';
import { WeatherAlerts } from './WeatherAlerts';
import { AirQualityCard } from './AirQualityCard';
import { UVIndexCard } from './UVIndexCard';
import { WindCompass } from './WindCompass';
import { MoonPhaseCard } from './MoonPhaseCard';
import { WeatherInsights } from './WeatherInsights';
import { WEATHER_TABS, CONDITION_GRADIENTS } from '../constants';
import {
  formatVisibility,
  formatPressure,
  getMoonPhase,
  getMoonIllumination,
} from '../utils';
import type { WeatherCommandCenterProps, WeatherTab } from '../types';

export function WeatherCommandCenter({
  onClose,
  data,
  unit,
  onUnitChange,
  onRefresh,
  isRefreshing,
}: WeatherCommandCenterProps) {
  const [activeTab, setActiveTab] = useState<WeatherTab>('overview');
  const { current, forecast, hourly, alerts, airQuality, uvIndex } = data;

  const gradient = CONDITION_GRADIENTS[current.condition] ?? CONDITION_GRADIENTS.Clouds;
  const moonPhase = getMoonPhase();
  const moonIllumination = getMoonIllumination();

  const hasAlerts = alerts && alerts.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl overflow-hidden"
    >
      {/* Background gradient based on condition */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br pointer-events-none opacity-30',
          gradient
        )}
      />

      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-10 text-white/70 hover:text-white"
        onClick={onClose}
      >
        <Minimize2 className="h-5 w-5" />
      </Button>

      <div className="relative h-full overflow-y-auto scrollbar-thin">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <WeatherIcon condition={current.condition} size="xl" animated />
              <div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-white/60" />
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">
                    {current.cityName}
                  </h1>
                </div>
                <p className="text-white/60 capitalize mt-1">
                  {current.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Temperature display */}
              <div className="text-right">
                <motion.div
                  key={current.temp}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-5xl sm:text-6xl font-bold text-white"
                >
                  {unit === 'celsius'
                    ? Math.round((current.temp - 32) * (5 / 9))
                    : Math.round(current.temp)}
                  °
                </motion.div>
                <p className="text-white/60">
                  Feels like{' '}
                  {unit === 'celsius'
                    ? Math.round((current.feelsLike - 32) * (5 / 9))
                    : Math.round(current.feelsLike)}
                  °
                </p>
              </div>

              {/* Unit toggle */}
              <div className="flex flex-col gap-1">
                <Button
                  variant={unit === 'fahrenheit' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onUnitChange('fahrenheit')}
                  className={cn(
                    'h-8 w-8 p-0',
                    unit === 'fahrenheit'
                      ? 'bg-white/20 text-white'
                      : 'text-white/50 hover:text-white'
                  )}
                >
                  °F
                </Button>
                <Button
                  variant={unit === 'celsius' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onUnitChange('celsius')}
                  className={cn(
                    'h-8 w-8 p-0',
                    unit === 'celsius'
                      ? 'bg-white/20 text-white'
                      : 'text-white/50 hover:text-white'
                  )}
                >
                  °C
                </Button>
              </div>

              {/* Refresh button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="text-white/70 hover:text-white"
              >
                <RefreshCw
                  className={cn('h-5 w-5', isRefreshing && 'animate-spin')}
                />
              </Button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6 border-b border-white/10 pb-2 overflow-x-auto scrollbar-thin">
            {WEATHER_TABS.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-shrink-0',
                  activeTab === tab.id
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'text-white/70 hover:text-white'
                )}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
                {tab.id === 'alerts' && hasAlerts && (
                  <span className="ml-1.5 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </Button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column - Main Info */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <QuickStat
                        icon={Thermometer}
                        label="High / Low"
                        value={`${unit === 'celsius' ? Math.round((current.tempMax - 32) * (5 / 9)) : Math.round(current.tempMax)}° / ${unit === 'celsius' ? Math.round((current.tempMin - 32) * (5 / 9)) : Math.round(current.tempMin)}°`}
                      />
                      <QuickStat
                        icon={Droplets}
                        label="Humidity"
                        value={`${current.humidity}%`}
                      />
                      <QuickStat
                        icon={Wind}
                        label="Wind"
                        value={`${Math.round(current.windSpeed)} mph`}
                      />
                      <QuickStat
                        icon={Eye}
                        label="Visibility"
                        value={formatVisibility(current.visibility, unit)}
                      />
                    </div>

                    {/* Hourly Preview */}
                    {hourly && hourly.length > 0 && (
                      <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-4">
                        <h3 className="text-sm font-medium text-white/80 mb-3">
                          Next 24 Hours
                        </h3>
                        <HourlyForecast
                          hourly={hourly.slice(0, 12)}
                          unit={unit}
                          convertTemp={(t: number) =>
                            unit === 'celsius'
                              ? Math.round((t - 32) * (5 / 9))
                              : Math.round(t)
                          }
                          compact
                        />
                      </div>
                    )}

                    {/* 5-Day Forecast Preview */}
                    {forecast && forecast.length > 0 && (
                      <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-4">
                        <h3 className="text-sm font-medium text-white/80 mb-3">
                          5-Day Forecast
                        </h3>
                        <ExtendedForecast
                          forecast={forecast}
                          unit={unit}
                          convertTemp={(t: number) =>
                            unit === 'celsius'
                              ? Math.round((t - 32) * (5 / 9))
                              : Math.round(t)
                          }
                          compact
                        />
                      </div>
                    )}

                    {/* Weather Insights */}
                    <WeatherInsights current={current} forecast={forecast} />
                  </div>

                  {/* Right Column - Details */}
                  <div className="space-y-4">
                    {/* Sun Position */}
                    <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-4">
                      <h3 className="text-sm font-medium text-white/80 mb-3 flex items-center gap-2">
                        <Sun className="h-4 w-4 text-amber-400" />
                        Sun & Moon
                      </h3>
                      <SunriseSunset
                        sunrise={current.sunrise}
                        sunset={current.sunset}
                      />
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <MoonPhaseCard
                          phase={moonPhase}
                          illumination={moonIllumination}
                        />
                      </div>
                    </div>

                    {/* Wind Compass */}
                    <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-4">
                      <h3 className="text-sm font-medium text-white/80 mb-3 flex items-center gap-2">
                        <Wind className="h-4 w-4 text-teal-400" />
                        Wind
                      </h3>
                      <WindCompass
                        direction={current.windDeg}
                        speed={current.windSpeed}
                        gust={current.windGust}
                        unit={unit}
                      />
                    </div>

                    {/* Air Quality */}
                    {airQuality && (
                      <AirQualityCard airQuality={airQuality} />
                    )}

                    {/* UV Index */}
                    {uvIndex && <UVIndexCard uvIndex={uvIndex} />}

                    {/* Pressure */}
                    <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Gauge className="h-4 w-4 text-purple-400" />
                          <span className="text-sm text-white/80">Pressure</span>
                        </div>
                        <span className="text-lg font-semibold text-white">
                          {formatPressure(current.pressure, unit)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'hourly' && hourly && (
                <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6">
                  <HourlyForecast
                    hourly={hourly}
                    unit={unit}
                    convertTemp={(t: number) =>
                      unit === 'celsius'
                        ? Math.round((t - 32) * (5 / 9))
                        : Math.round(t)
                    }
                  />
                </div>
              )}

              {activeTab === 'daily' && forecast && (
                <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6">
                  <ExtendedForecast
                    forecast={forecast}
                    unit={unit}
                    convertTemp={(t: number) =>
                      unit === 'celsius'
                        ? Math.round((t - 32) * (5 / 9))
                        : Math.round(t)
                    }
                  />
                </div>
              )}

              {activeTab === 'details' && (
                <WeatherDetails
                  current={current}
                  unit={unit}
                  airQuality={airQuality}
                  uvIndex={uvIndex}
                />
              )}

              {activeTab === 'alerts' && (
                <WeatherAlerts alerts={alerts || []} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function QuickStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-white/60" />
        <span className="text-xs text-white/60">{label}</span>
      </div>
      <p className="text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

WeatherCommandCenter.displayName = 'WeatherCommandCenter';
