'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from 'recharts';
import { TrendingUp, TrendingDown, Calendar, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  useFilteredTransactions,
  usePrivacyMode,
} from '@/lib/stores/financehub';
import { formatCurrency, formatCompactCurrency } from '@/types/finance';

interface CashFlowChartProps {
  className?: string;
}

type TimeRange = '7D' | '30D' | '90D' | '6M' | '1Y' | 'ALL';

interface CashFlowDataPoint {
  period: string;
  income: number;
  expenses: number;
  net: number;
}

/**
 * CashFlowChart Component
 *
 * Visualizes cash flow over time with:
 * - Stacked bar chart: Income (green) vs Expenses (red)
 * - Line overlay: Net cash flow
 * - Selectable time ranges: 7D, 30D, 90D, 6M, 1Y, ALL
 * - Daily/Weekly/Monthly aggregation based on range
 * - Click to drill down into specific periods
 */
export function CashFlowChart({ className }: CashFlowChartProps) {
  const transactions = useFilteredTransactions();
  const privacyMode = usePrivacyMode();

  const [timeRange, setTimeRange] = useState<TimeRange>('30D');
  const [showRangeSelector, setShowRangeSelector] = useState(false);

  // Get date range based on selected period
  const dateRange = useMemo(() => {
    const now = new Date();
    const start = new Date();

    switch (timeRange) {
      case '7D':
        start.setDate(now.getDate() - 7);
        break;
      case '30D':
        start.setDate(now.getDate() - 30);
        break;
      case '90D':
        start.setDate(now.getDate() - 90);
        break;
      case '6M':
        start.setMonth(now.getMonth() - 6);
        break;
      case '1Y':
        start.setFullYear(now.getFullYear() - 1);
        break;
      case 'ALL':
        start.setFullYear(2000); // Far enough back to include all
        break;
    }

    return { start, end: now };
  }, [timeRange]);

  // Determine aggregation level based on time range
  const aggregationLevel = useMemo(() => {
    switch (timeRange) {
      case '7D':
        return 'daily';
      case '30D':
        return 'daily';
      case '90D':
        return 'weekly';
      case '6M':
        return 'weekly';
      case '1Y':
        return 'monthly';
      case 'ALL':
        return 'monthly';
      default:
        return 'daily';
    }
  }, [timeRange]);

  // Aggregate transactions by period
  const chartData = useMemo(() => {
    // Filter transactions by date range
    const filtered = transactions.filter((tx) => {
      const txDate = new Date(tx.date);
      return txDate >= dateRange.start && txDate <= dateRange.end;
    });

    // Group by period
    const groupedData = new Map<string, { income: number; expenses: number }>();

    filtered.forEach((tx) => {
      const txDate = new Date(tx.date);
      let periodKey: string;

      if (aggregationLevel === 'daily') {
        periodKey = txDate.toISOString().split('T')[0]!;
      } else if (aggregationLevel === 'weekly') {
        // Get start of week (Sunday)
        const startOfWeek = new Date(txDate);
        startOfWeek.setDate(txDate.getDate() - txDate.getDay());
        periodKey = startOfWeek.toISOString().split('T')[0]!;
      } else {
        // Monthly
        periodKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
      }

      const existing = groupedData.get(periodKey) || { income: 0, expenses: 0 };

      if (tx.amount > 0) {
        existing.income += tx.amount;
      } else {
        existing.expenses += Math.abs(tx.amount);
      }

      groupedData.set(periodKey, existing);
    });

    // Convert to array and sort by date
    const dataArray: CashFlowDataPoint[] = Array.from(groupedData.entries())
      .map(([period, data]) => ({
        period,
        income: Math.round(data.income * 100) / 100,
        expenses: Math.round(data.expenses * 100) / 100,
        net: Math.round((data.income - data.expenses) * 100) / 100,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    return dataArray;
  }, [transactions, dateRange, aggregationLevel]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalIncome = chartData.reduce((sum, d) => sum + d.income, 0);
    const totalExpenses = chartData.reduce((sum, d) => sum + d.expenses, 0);
    const netFlow = totalIncome - totalExpenses;
    const avgDailyNet = chartData.length > 0 ? netFlow / chartData.length : 0;

    return { totalIncome, totalExpenses, netFlow, avgDailyNet };
  }, [chartData]);

  // Format period label for display
  const formatPeriodLabel = (period: string) => {
    if (aggregationLevel === 'monthly') {
      const [year, month] = period.split('-');
      const date = new Date(parseInt(year!), parseInt(month!) - 1);
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }

    const date = new Date(period);
    if (aggregationLevel === 'weekly') {
      return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const timeRangeOptions: TimeRange[] = ['7D', '30D', '90D', '6M', '1Y', 'ALL'];

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{
      name: string;
      value: number;
      color: string;
    }>;
    label?: string;
  }) => {
    if (!active || !payload) return null;

    return (
      <div className="bg-glass-bg/95 backdrop-blur-xl border border-glass-border rounded-lg p-3 shadow-lg">
        <div className="text-xs text-white/60 mb-2">
          {label && formatPeriodLabel(label)}
        </div>
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-4 text-sm">
            <span
              className="flex items-center gap-2"
              style={{ color: entry.color }}
            >
              {entry.name}
            </span>
            <span className="font-medium text-white">
              {privacyMode ? '••••••' : formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Cash Flow</h3>
          <p className="text-sm text-white/60">
            Income vs expenses over time
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRangeSelector(!showRangeSelector)}
            className="border border-glass-border"
          >
            <Calendar className="h-4 w-4 mr-1" />
            {timeRange}
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>

          {showRangeSelector && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 top-full mt-1 z-10 bg-glass-bg/95 backdrop-blur-xl border border-glass-border rounded-lg shadow-lg p-1"
            >
              {timeRangeOptions.map((range) => (
                <button
                  key={range}
                  onClick={() => {
                    setTimeRange(range);
                    setShowRangeSelector(false);
                  }}
                  className={cn(
                    'w-full px-3 py-1.5 text-sm rounded-md text-left transition-colors',
                    timeRange === range
                      ? 'bg-neon-primary/20 text-neon-primary'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  )}
                >
                  {range}
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-1 text-xs text-green-400 mb-1">
            <TrendingUp className="h-3 w-3" />
            Income
          </div>
          <div className="text-lg font-semibold text-green-400">
            {privacyMode ? '••••••' : formatCompactCurrency(summaryStats.totalIncome)}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-1 text-xs text-red-400 mb-1">
            <TrendingDown className="h-3 w-3" />
            Expenses
          </div>
          <div className="text-lg font-semibold text-red-400">
            {privacyMode ? '••••••' : formatCompactCurrency(summaryStats.totalExpenses)}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-glass-bg border border-glass-border">
          <div className="text-xs text-white/60 mb-1">Net Flow</div>
          <div
            className={cn(
              'text-lg font-semibold',
              summaryStats.netFlow >= 0 ? 'text-green-400' : 'text-red-400'
            )}
          >
            {privacyMode
              ? '••••••'
              : `${summaryStats.netFlow >= 0 ? '+' : ''}${formatCompactCurrency(summaryStats.netFlow)}`}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-glass-bg border border-glass-border">
          <div className="text-xs text-white/60 mb-1">
            Avg {aggregationLevel === 'daily' ? 'Daily' : aggregationLevel === 'weekly' ? 'Weekly' : 'Monthly'}
          </div>
          <div
            className={cn(
              'text-lg font-semibold',
              summaryStats.avgDailyNet >= 0 ? 'text-green-400' : 'text-red-400'
            )}
          >
            {privacyMode
              ? '••••••'
              : `${summaryStats.avgDailyNet >= 0 ? '+' : ''}${formatCompactCurrency(summaryStats.avgDailyNet)}`}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-white/50">
            No data for selected period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis
                dataKey="period"
                tickFormatter={formatPeriodLabel}
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(value) => (privacyMode ? '••' : formatCompactCurrency(value))}
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '10px' }}
                formatter={(value) => (
                  <span className="text-white/70 text-xs">{value}</span>
                )}
              />
              <Bar
                dataKey="income"
                name="Income"
                fill="#22c55e"
                radius={[4, 4, 0, 0]}
                opacity={0.8}
              />
              <Bar
                dataKey="expenses"
                name="Expenses"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
                opacity={0.8}
              />
              <Line
                type="monotone"
                dataKey="net"
                name="Net"
                stroke="#a855f7"
                strokeWidth={2}
                dot={{ fill: '#a855f7', strokeWidth: 0, r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Aggregation Indicator */}
      <div className="text-center text-xs text-white/40">
        Aggregated {aggregationLevel}
      </div>
    </div>
  );
}

CashFlowChart.displayName = 'CashFlowChart';
