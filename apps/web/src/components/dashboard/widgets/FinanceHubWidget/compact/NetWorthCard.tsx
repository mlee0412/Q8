'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePrivacyMode, useNetWorth, useFinanceSnapshots } from '@/lib/stores/financehub';
import { formatCurrency, formatCompactCurrency } from '@/types/finance';

interface NetWorthCardProps {
  className?: string;
}

/**
 * NetWorthCard Component
 *
 * Displays the user's net worth with:
 * - Animated counter (odometer effect)
 * - Trend indicator (up/down/flat)
 * - Mini sparkline of recent history
 * - Privacy blur support
 */
export function NetWorthCard({ className }: NetWorthCardProps) {
  const privacyMode = usePrivacyMode();
  const netWorth = useNetWorth();
  const snapshots = useFinanceSnapshots();
  
  // Animated counter state
  const [displayValue, setDisplayValue] = useState(netWorth);
  const displayValueRef = useRef(displayValue);
  displayValueRef.current = displayValue;
  
  // Calculate trend from snapshots
  const lastSnapshot = snapshots[snapshots.length - 1];
  const previousSnapshot = snapshots[snapshots.length - 2];
  const trend = lastSnapshot && previousSnapshot 
    ? lastSnapshot.netWorth - previousSnapshot.netWorth 
    : 0;
  const trendPercent = previousSnapshot?.netWorth 
    ? ((trend / previousSnapshot.netWorth) * 100).toFixed(1)
    : '0.0';

  // Animate counter on value change
  useEffect(() => {
    const currentDisplayValue = displayValueRef.current;
    const duration = 1000; // 1 second animation
    const steps = 30;
    const stepDuration = duration / steps;
    const increment = (netWorth - currentDisplayValue) / steps;
    
    if (Math.abs(netWorth - currentDisplayValue) < 1) {
      setDisplayValue(netWorth);
      return;
    }

    let step = 0;
    const timer = setInterval(() => {
      step++;
      if (step >= steps) {
        setDisplayValue(netWorth);
        clearInterval(timer);
      } else {
        setDisplayValue((prev) => prev + increment);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [netWorth]);

  // Generate sparkline data from snapshots
  const sparklineData = snapshots.slice(-14).map((s) => s.netWorth);
  const sparklineMax = Math.max(...sparklineData, 1);
  const sparklineMin = Math.min(...sparklineData, 0);
  const sparklineRange = sparklineMax - sparklineMin || 1;

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-text-muted';

  return (
    <div className={cn('p-4', className)}>
      {/* Label */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-text-muted uppercase tracking-wider">
          Net Worth
        </span>
        {snapshots.length > 1 && (
          <div className={cn('flex items-center gap-1 text-xs', trendColor)}>
            <TrendIcon className="h-3 w-3" />
            <span>{trend >= 0 ? '+' : ''}{trendPercent}%</span>
          </div>
        )}
      </div>

      {/* Main Value */}
      <motion.div
        className="relative"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <span
          className={cn(
            'text-3xl font-bold tracking-tight',
            netWorth >= 0 ? 'text-foreground' : 'text-red-400',
            privacyMode && 'blur-md select-none hover:blur-sm transition-all cursor-pointer'
          )}
          data-privacy={privacyMode ? 'blur' : undefined}
        >
          {privacyMode ? '$•••,•••' : formatCurrency(displayValue)}
        </span>
      </motion.div>

      {/* Sparkline */}
      {sparklineData.length > 1 && !privacyMode && (
        <div className="mt-3 h-8 flex items-end gap-0.5">
          {sparklineData.map((value, i) => {
            const height = ((value - sparklineMin) / sparklineRange) * 100;
            const isLast = i === sparklineData.length - 1;
            return (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(height, 5)}%` }}
                transition={{ delay: i * 0.02, duration: 0.3 }}
                className={cn(
                  'flex-1 rounded-t-sm',
                  isLast ? 'bg-neon-primary' : 'bg-border-subtle'
                )}
              />
            );
          })}
        </div>
      )}

      {/* Placeholder sparkline when in privacy mode */}
      {sparklineData.length > 1 && privacyMode && (
        <div className="mt-3 h-8 flex items-end gap-0.5 blur-sm">
          {Array.from({ length: 14 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm bg-border-subtle"
              style={{ height: `${30 + Math.random() * 50}%` }}
            />
          ))}
        </div>
      )}

      {/* Sub-stats */}
      <div className="mt-3 flex items-center gap-4 text-xs text-text-muted">
        <span
          className={cn(privacyMode && 'blur-sm')}
          data-privacy={privacyMode ? 'blur' : undefined}
        >
          {privacyMode ? '••••' : formatCompactCurrency(netWorth)} total
        </span>
        {snapshots.length > 0 && (
          <span className="text-text-muted/50">
            {snapshots.length} day history
          </span>
        )}
      </div>
    </div>
  );
}

NetWorthCard.displayName = 'NetWorthCard';
