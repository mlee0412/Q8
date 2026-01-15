'use client';

import { motion } from 'framer-motion';
import { Flame, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePrivacyMode, useDailyBudget, useDailySpent } from '@/lib/stores/financehub';
import { formatCurrency } from '@/types/finance';

interface DailyBurnMeterProps {
  className?: string;
}

/**
 * DailyBurnMeter Component
 *
 * Circular progress meter showing daily spending vs budget.
 * Changes color based on spending level:
 * - Green: Under 70%
 * - Yellow: 70-100%
 * - Red: Over budget
 */
export function DailyBurnMeter({ className }: DailyBurnMeterProps) {
  const privacyMode = usePrivacyMode();
  const dailyBudget = useDailyBudget();
  const dailySpent = useDailySpent();

  const percentUsed = dailyBudget > 0 ? (dailySpent / dailyBudget) * 100 : 0;
  const remaining = Math.max(dailyBudget - dailySpent, 0);
  const isOverBudget = dailySpent > dailyBudget;

  // Determine color based on percentage
  const getColor = () => {
    if (isOverBudget) return { ring: 'stroke-red-500', bg: 'text-red-400', label: 'Over budget' };
    if (percentUsed >= 70) return { ring: 'stroke-yellow-500', bg: 'text-yellow-400', label: 'Caution' };
    return { ring: 'stroke-green-500', bg: 'text-green-400', label: 'On track' };
  };

  const colors = getColor();

  // SVG circle properties
  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const dashOffset = circumference - (Math.min(percentUsed, 100) / 100) * circumference;

  const StatusIcon = isOverBudget ? AlertTriangle : percentUsed >= 70 ? Flame : CheckCircle;

  return (
    <div className={cn('flex items-center gap-4 p-4', className)}>
      {/* Circular Progress */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-border-subtle"
          />
          {/* Progress circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className={colors.ring}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              strokeDasharray: circumference,
            }}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <StatusIcon className={cn('h-4 w-4', colors.bg)} />
          <span
            className={cn(
              'text-xs font-semibold mt-0.5',
              privacyMode && 'blur-sm'
            )}
          >
            {privacyMode ? '••%' : `${Math.round(percentUsed)}%`}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-text-muted mb-1">Daily Spending</div>
        
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              'text-lg font-semibold',
              colors.bg,
              privacyMode && 'blur-sm'
            )}
            data-privacy={privacyMode ? 'blur' : undefined}
          >
            {privacyMode ? '$••' : formatCurrency(dailySpent)}
          </span>
          <span className="text-xs text-text-muted">
            / {privacyMode ? '$•••' : formatCurrency(dailyBudget)}
          </span>
        </div>

        <div className="flex items-center gap-1 mt-1">
          <span className={cn('text-xs', colors.bg)}>
            {colors.label}
          </span>
          {!isOverBudget && !privacyMode && (
            <span className="text-xs text-text-muted">
              • {formatCurrency(remaining)} left
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

DailyBurnMeter.displayName = 'DailyBurnMeter';
