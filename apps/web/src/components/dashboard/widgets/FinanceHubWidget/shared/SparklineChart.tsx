'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/types/finance';

interface SparklineChartProps {
  data: number[];
  labels?: string[];
  height?: number;
  color?: string;
  gradientId?: string;
  showTooltip?: boolean;
  className?: string;
}

/**
 * SparklineChart Component
 *
 * A minimal inline chart for showing trends.
 * Used in NetWorthCard and other compact displays.
 */
export function SparklineChart({
  data,
  labels,
  height = 40,
  color = '#00D9FF',
  gradientId = 'sparklineGradient',
  showTooltip = true,
  className,
}: SparklineChartProps) {
  // Transform data for Recharts
  const chartData = useMemo(() => {
    return data.map((value, index) => ({
      value,
      label: labels?.[index] || `Day ${index + 1}`,
    }));
  }, [data, labels]);

  // Calculate min/max for better visualization
  const { min, max } = useMemo(() => {
    const values = data.filter((v) => v !== null && v !== undefined);
    if (values.length === 0) return { min: 0, max: 100 };
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const padding = (maxVal - minVal) * 0.1 || 10;
    return { min: minVal - padding, max: maxVal + padding };
  }, [data]);

  if (data.length === 0) {
    return (
      <div 
        className={cn('flex items-center justify-center text-text-muted text-xs', className)}
        style={{ height }}
      >
        No data
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={[min, max]} hide />
          {showTooltip && (
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-surface-3 backdrop-blur-sm border border-border-subtle rounded-lg px-2 py-1 text-xs">
                    <div className="text-text-muted">{data.label}</div>
                    <div className="font-medium">{formatCurrency(data.value)}</div>
                  </div>
                );
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            isAnimationActive={true}
            animationDuration={500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

SparklineChart.displayName = 'SparklineChart';
