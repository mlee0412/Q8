'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ALERT_SEVERITY_CONFIG } from '../constants';
import type { WeatherAlert } from '../types';

interface WeatherAlertsProps {
  alerts: WeatherAlert[];
}

export function WeatherAlerts({ alerts }: WeatherAlertsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!alerts || alerts.length === 0) {
    return (
      <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-green-400" />
          </div>
          <h3 className="text-lg font-medium text-white">No Active Alerts</h3>
          <p className="text-sm text-white/60 max-w-md">
            There are currently no weather alerts for your area. Stay safe and
            check back for updates.
          </p>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-amber-400" />
        <h3 className="text-lg font-medium text-white">
          {alerts.length} Active Alert{alerts.length > 1 ? 's' : ''}
        </h3>
      </div>

      {alerts.map((alert, index) => {
        const config = ALERT_SEVERITY_CONFIG[alert.severity];
        const isExpanded = expandedId === alert.id;

        return (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              'rounded-xl border overflow-hidden',
              config.bgColor,
              config.borderColor
            )}
          >
            <button
              onClick={() => setExpandedId(isExpanded ? null : alert.id)}
              className="w-full p-4 text-left flex items-start justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className={cn('h-5 w-5 mt-0.5', config.color)} />
                <div>
                  <h4 className={cn('font-semibold', config.color)}>
                    {alert.event}
                  </h4>
                  <p className="text-sm text-white/80 mt-1">{alert.headline}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-white/60">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>From: {formatDate(alert.start)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Until: {formatDate(alert.end)}</span>
                    </div>
                  </div>
                </div>
              </div>
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-white/60 flex-shrink-0" />
              ) : (
                <ChevronDown className="h-5 w-5 text-white/60 flex-shrink-0" />
              )}
            </button>

            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 pb-4"
              >
                <div className="pt-3 border-t border-white/10">
                  <p className="text-sm text-white/70 whitespace-pre-wrap">
                    {alert.description}
                  </p>
                  {alert.sender && (
                    <p className="text-xs text-white/50 mt-3">
                      Source: {alert.sender}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

WeatherAlerts.displayName = 'WeatherAlerts';
