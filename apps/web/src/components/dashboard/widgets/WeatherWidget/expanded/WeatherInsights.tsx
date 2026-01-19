'use client';

import { motion } from 'framer-motion';
import { Lightbulb, Shirt, Umbrella, Sun, Thermometer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getWeatherInsight, getOutfitRecommendation } from '../utils';
import type { WeatherCurrent, ForecastDay } from '../types';

interface WeatherInsightsProps {
  current: WeatherCurrent;
  forecast: ForecastDay[] | null;
}

export function WeatherInsights({ current, forecast }: WeatherInsightsProps) {
  const insights = getWeatherInsight(
    current.condition,
    current.temp,
    current.feelsLike,
    current.humidity,
    current.windSpeed
  );

  const outfit = getOutfitRecommendation(
    current.temp,
    current.condition,
    current.windSpeed
  );

  const getActivitySuggestion = () => {
    const temp = current.temp;
    const condition = current.condition.toLowerCase();

    if (condition.includes('rain') || condition.includes('storm')) {
      return {
        icon: Umbrella,
        title: 'Indoor Day',
        description: 'Great day for indoor activities, reading, or catching up on projects.',
      };
    }

    if (condition.includes('snow')) {
      return {
        icon: Thermometer,
        title: 'Winter Activities',
        description: 'Perfect for building snowmen, skiing, or enjoying hot cocoa indoors.',
      };
    }

    if (temp >= 60 && temp <= 80 && condition === 'clear') {
      return {
        icon: Sun,
        title: 'Perfect Outdoor Weather',
        description: 'Ideal conditions for hiking, biking, picnics, or outdoor sports.',
      };
    }

    if (temp > 85) {
      return {
        icon: Sun,
        title: 'Stay Cool',
        description: 'Best for water activities, swimming, or air-conditioned spaces.',
      };
    }

    if (temp < 40) {
      return {
        icon: Thermometer,
        title: 'Bundle Up',
        description: 'Good for brisk walks, winter sports, or cozy indoor activities.',
      };
    }

    return {
      icon: Sun,
      title: 'Flexible Day',
      description: 'Weather is moderate. Suitable for most activities with proper preparation.',
    };
  };

  const activity = getActivitySuggestion();

  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-medium text-white/80">Weather Insights</h3>
      </div>

      <div className="space-y-4">
        {/* Weather Tips */}
        {insights.length > 0 && (
          <div className="space-y-2">
            {insights.slice(0, 3).map((insight, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-2 p-2 rounded-lg bg-white/5"
              >
                <span className="text-amber-400 mt-0.5">💡</span>
                <p className="text-sm text-white/80">{insight}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Outfit Recommendation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20"
        >
          <div className="flex items-center gap-2 mb-2">
            <Shirt className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-medium text-white/80">
              What to Wear
            </span>
          </div>
          <p className="text-sm text-white/70">{outfit}</p>
        </motion.div>

        {/* Activity Suggestion */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-3 rounded-lg bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border border-teal-500/20"
        >
          <div className="flex items-center gap-2 mb-2">
            <activity.icon className="h-4 w-4 text-teal-400" />
            <span className="text-sm font-medium text-white/80">
              {activity.title}
            </span>
          </div>
          <p className="text-sm text-white/70">{activity.description}</p>
        </motion.div>

        {/* Tomorrow Preview */}
        {forecast && forecast.length > 1 && forecast[1] && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-3 rounded-lg bg-white/5"
          >
            <p className="text-xs text-white/50 mb-1">Tomorrow&apos;s Outlook</p>
            <p className="text-sm text-white/80">
              Expect {forecast[1].description} with temperatures between{' '}
              {Math.round(forecast[1].tempMin)}° and {Math.round(forecast[1].tempMax)}°F.
              {forecast[1].precipitation > 0.3 &&
                ` ${Math.round(forecast[1].precipitation * 100)}% chance of precipitation.`}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

WeatherInsights.displayName = 'WeatherInsights';
