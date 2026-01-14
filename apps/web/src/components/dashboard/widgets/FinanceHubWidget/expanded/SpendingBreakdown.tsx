'use client';

import { useMemo, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChartIcon,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Store,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useFilteredTransactions, usePrivacyMode } from '@/lib/stores/financehub';
import { formatCurrency, formatCompactCurrency, getCategoryIcon } from '@/types/finance';
import type { FinanceTransaction } from '@/types/finance';

interface SpendingBreakdownProps {
  className?: string;
}

type ChartView = 'pie' | 'bar';
type TimeRange = '7d' | '30d' | '90d' | 'all';
type DrillLevel = 'category' | 'merchant' | 'transactions';

interface CategoryData {
  name: string;
  value: number;
  icon: string;
  transactionCount: number;
  previousValue?: number;
}

interface MerchantData {
  name: string;
  value: number;
  transactionCount: number;
  transactions: FinanceTransaction[];
}

// Recharts requires index signature for data objects
type RechartsData = { name: string; value: number; [key: string]: unknown };

const COLORS = [
  '#00D9FF', // neon primary
  '#FF6B6B', // red
  '#4ECDC4', // teal
  '#FFE66D', // yellow
  '#95E1D3', // mint
  '#F38181', // coral
  '#AA96DA', // purple
  '#FCBAD3', // pink
  '#A8D8EA', // light blue
  '#FFB347', // orange
];

/**
 * SpendingBreakdown Component
 *
 * Visualizes spending by category with drill-down:
 * - Pie chart and bar chart views
 * - Time range filters
 * - Drill-down: Category → Merchants → Transactions
 * - Period comparison (vs previous period)
 * - Privacy mode support
 */
export function SpendingBreakdown({ className }: SpendingBreakdownProps) {
  const transactions = useFilteredTransactions();
  const privacyMode = usePrivacyMode();

  const [chartView, setChartView] = useState<ChartView>('pie');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [drillLevel, setDrillLevel] = useState<DrillLevel>('category');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMerchant, setSelectedMerchant] = useState<string | null>(null);

  // Calculate date ranges
  const dateRanges = useMemo(() => {
    const now = new Date();
    let currentStart: Date;
    let previousStart: Date;
    let previousEnd: Date;

    switch (timeRange) {
      case '7d':
        currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousEnd = new Date(currentStart.getTime() - 1);
        previousStart = new Date(previousEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousEnd = new Date(currentStart.getTime() - 1);
        previousStart = new Date(previousEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        currentStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        previousEnd = new Date(currentStart.getTime() - 1);
        previousStart = new Date(previousEnd.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        currentStart = new Date(0);
        previousStart = new Date(0);
        previousEnd = new Date(0);
    }

    return {
      current: { start: currentStart, end: now },
      previous: { start: previousStart, end: previousEnd },
    };
  }, [timeRange]);

  // Filter transactions by time range and only expenses
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const txDate = new Date(tx.date);
      return txDate >= dateRanges.current.start && txDate <= dateRanges.current.end && tx.amount < 0;
    });
  }, [transactions, dateRanges]);

  // Previous period transactions for comparison
  const previousTransactions = useMemo(() => {
    if (timeRange === 'all') return [];
    return transactions.filter((tx) => {
      const txDate = new Date(tx.date);
      return txDate >= dateRanges.previous.start && txDate <= dateRanges.previous.end && tx.amount < 0;
    });
  }, [transactions, dateRanges, timeRange]);

  // Group by category with comparison
  const categoryData = useMemo(() => {
    const categoryMap = new Map<string, { value: number; count: number }>();
    const prevCategoryMap = new Map<string, number>();

    // Current period
    for (const tx of filteredTransactions) {
      const category = tx.category[0] || 'Other';
      const current = categoryMap.get(category) || { value: 0, count: 0 };
      categoryMap.set(category, {
        value: current.value + Math.abs(tx.amount),
        count: current.count + 1,
      });
    }

    // Previous period
    for (const tx of previousTransactions) {
      const category = tx.category[0] || 'Other';
      const current = prevCategoryMap.get(category) || 0;
      prevCategoryMap.set(category, current + Math.abs(tx.amount));
    }

    // Convert to array and sort by amount
    const data: CategoryData[] = Array.from(categoryMap.entries())
      .map(([name, { value, count }]) => ({
        name,
        value,
        icon: getCategoryIcon(name),
        transactionCount: count,
        previousValue: prevCategoryMap.get(name),
      }))
      .sort((a, b) => b.value - a.value);

    return data;
  }, [filteredTransactions, previousTransactions]);

  // Group merchants within selected category
  const merchantData = useMemo(() => {
    if (!selectedCategory) return [];

    const categoryTx = filteredTransactions.filter(
      (tx) => (tx.category[0] || 'Other') === selectedCategory
    );

    const merchantMap = new Map<string, { value: number; transactions: FinanceTransaction[] }>();

    for (const tx of categoryTx) {
      const merchant = tx.merchantName || 'Unknown';
      const current = merchantMap.get(merchant) || { value: 0, transactions: [] };
      merchantMap.set(merchant, {
        value: current.value + Math.abs(tx.amount),
        transactions: [...current.transactions, tx],
      });
    }

    const data: MerchantData[] = Array.from(merchantMap.entries())
      .map(([name, { value, transactions }]) => ({
        name,
        value,
        transactionCount: transactions.length,
        transactions,
      }))
      .sort((a, b) => b.value - a.value);

    return data;
  }, [filteredTransactions, selectedCategory]);

  // Get transactions for selected merchant
  const merchantTransactions = useMemo(() => {
    if (!selectedMerchant) return [];
    const merchant = merchantData.find((m) => m.name === selectedMerchant);
    return merchant?.transactions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    ) || [];
  }, [merchantData, selectedMerchant]);

  // Calculate totals
  const totalSpending = categoryData.reduce((sum, cat) => sum + cat.value, 0);
  const previousTotalSpending = categoryData.reduce(
    (sum, cat) => sum + (cat.previousValue || 0),
    0
  );
  const spendingChange = previousTotalSpending > 0
    ? ((totalSpending - previousTotalSpending) / previousTotalSpending) * 100
    : 0;

  // Navigation handlers
  const handleCategoryClick = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setDrillLevel('merchant');
    setSelectedMerchant(null);
  };

  const handleMerchantClick = (merchantName: string) => {
    setSelectedMerchant(merchantName);
    setDrillLevel('transactions');
  };

  const handleBack = () => {
    if (drillLevel === 'transactions') {
      setSelectedMerchant(null);
      setDrillLevel('merchant');
    } else if (drillLevel === 'merchant') {
      setSelectedCategory(null);
      setDrillLevel('category');
    }
  };

  // Custom tooltip for pie chart
  const CustomTooltip = ({ active, payload }: {
    active?: boolean;
    payload?: Array<{ payload: CategoryData | MerchantData }>;
  }) => {
    if (!active || !payload?.[0]) return null;
    const data = payload[0].payload;
    const percentage = ((data.value / totalSpending) * 100).toFixed(1);

    return (
      <div className="bg-glass-bg backdrop-blur-sm border border-glass-border rounded-lg px-3 py-2">
        <div className="flex items-center gap-2 mb-1">
          {'icon' in data && <span>{data.icon}</span>}
          <span className="font-medium text-white">{data.name}</span>
        </div>
        <div className="text-sm">
          <span className="text-white">
            {privacyMode ? '••••••' : formatCurrency(data.value)}
          </span>
          <span className="text-white/50 ml-2">({percentage}%)</span>
        </div>
        <div className="text-xs text-white/50">
          {data.transactionCount} transaction{data.transactionCount !== 1 ? 's' : ''}
        </div>
      </div>
    );
  };

  // Get breadcrumb trail
  const getBreadcrumb = () => {
    const parts = ['All Categories'];
    if (selectedCategory) parts.push(selectedCategory);
    if (selectedMerchant) parts.push(selectedMerchant);
    return parts;
  };

  // Get current data based on drill level
  const currentData = drillLevel === 'category' ? categoryData : merchantData;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Spending Breakdown</h3>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-white/60">
              {privacyMode ? '••••••' : formatCurrency(totalSpending)} total
            </span>
            {timeRange !== 'all' && spendingChange !== 0 && (
              <span
                className={cn(
                  'flex items-center gap-0.5 text-xs',
                  spendingChange > 0 ? 'text-red-400' : 'text-green-400'
                )}
              >
                {spendingChange > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(spendingChange).toFixed(1)}% vs prev
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Time range selector */}
          <div className="flex bg-glass-bg rounded-lg p-1">
            {(['7d', '30d', '90d', 'all'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => {
                  setTimeRange(range);
                  setDrillLevel('category');
                  setSelectedCategory(null);
                  setSelectedMerchant(null);
                }}
                className={cn(
                  'px-2 py-1 text-xs rounded-md transition-all',
                  timeRange === range
                    ? 'bg-neon-primary/20 text-neon-primary'
                    : 'text-white/60 hover:text-white'
                )}
              >
                {range === 'all' ? 'All' : range}
              </button>
            ))}
          </div>

          {/* Chart type selector */}
          {drillLevel === 'category' && (
            <div className="flex bg-glass-bg rounded-lg p-1">
              <button
                onClick={() => setChartView('pie')}
                className={cn(
                  'p-1.5 rounded-md transition-all',
                  chartView === 'pie'
                    ? 'bg-neon-primary/20 text-neon-primary'
                    : 'text-white/60 hover:text-white'
                )}
              >
                <PieChartIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setChartView('bar')}
                className={cn(
                  'p-1.5 rounded-md transition-all',
                  chartView === 'bar'
                    ? 'bg-neon-primary/20 text-neon-primary'
                    : 'text-white/60 hover:text-white'
                )}
              >
                <BarChart3 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Breadcrumb */}
      {drillLevel !== 'category' && (
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={handleBack}
            className="p-1 rounded-md hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-white/60" />
          </button>
          {getBreadcrumb().map((part, index) => (
            <span key={index} className="flex items-center">
              {index > 0 && <ChevronRight className="h-3 w-3 text-white/30 mx-1" />}
              <span
                className={cn(
                  'text-white/60',
                  index === getBreadcrumb().length - 1 && 'text-white font-medium'
                )}
              >
                {part}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Content based on drill level */}
      <AnimatePresence mode="wait">
        {drillLevel === 'transactions' ? (
          // Transactions list
          <motion.div
            key="transactions"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-2"
          >
            <div className="text-sm text-white/60 mb-3">
              {merchantTransactions.length} transactions at {selectedMerchant}
            </div>
            {merchantTransactions.map((tx, index) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
              >
                <div className="flex items-center gap-3">
                  <ArrowUpRight className="h-4 w-4 text-red-400" />
                  <div>
                    <div className="text-sm text-white">
                      {new Date(tx.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                    {tx.description && (
                      <div className="text-xs text-white/50 truncate max-w-[200px]">
                        {tx.description}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-sm font-medium text-red-400">
                  {privacyMode ? '••••••' : formatCurrency(Math.abs(tx.amount))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : currentData.length > 0 ? (
          <motion.div
            key={drillLevel}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {/* Chart (only for category level or if not too many merchants) */}
            {(drillLevel === 'category' || merchantData.length <= 8) && (
              <div className="rounded-xl bg-glass-bg/30 border border-glass-border p-4">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartView === 'pie' ? (
                      <PieChart>
                        <Pie
                          data={currentData.slice(0, 10) as unknown as RechartsData[]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          onClick={(data: { name?: string }) => {
                            if (data.name) {
                              if (drillLevel === 'category') {
                                handleCategoryClick(data.name);
                              } else {
                                handleMerchantClick(data.name);
                              }
                            }
                          }}
                          className="cursor-pointer"
                        >
                          {currentData.slice(0, 10).map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                          content={({ payload }) => (
                            <div className="flex flex-wrap justify-center gap-3 mt-4">
                              {payload?.slice(0, 6).map((entry, index) => (
                                <div
                                  key={`legend-${index}`}
                                  className="flex items-center gap-1.5 text-xs"
                                >
                                  <div
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: entry.color }}
                                  />
                                  <span className="text-white/60">{entry.value}</span>
                                </div>
                              ))}
                              {payload && payload.length > 6 && (
                                <span className="text-xs text-white/50">
                                  +{payload.length - 6} more
                                </span>
                              )}
                            </div>
                          )}
                        />
                      </PieChart>
                    ) : (
                      <BarChart
                        data={currentData.slice(0, 8) as unknown as RechartsData[]}
                        layout="vertical"
                        margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.1)"
                        />
                        <XAxis
                          type="number"
                          stroke="rgba(255,255,255,0.5)"
                          tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                          tickFormatter={(value) =>
                            privacyMode ? '••' : formatCompactCurrency(value)
                          }
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          stroke="rgba(255,255,255,0.5)"
                          tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                          width={70}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                          dataKey="value"
                          radius={[0, 4, 4, 0]}
                          onClick={(data: { name?: string }) => {
                            if (data.name) {
                              if (drillLevel === 'category') {
                                handleCategoryClick(data.name);
                              } else {
                                handleMerchantClick(data.name);
                              }
                            }
                          }}
                          className="cursor-pointer"
                        >
                          {currentData.slice(0, 8).map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* List view */}
            <div className="space-y-2 mt-4">
              <h4 className="text-sm font-medium text-white/70">
                {drillLevel === 'category' ? 'Top Categories' : 'Merchants'}
              </h4>
              <div className="grid gap-2">
                {(drillLevel === 'category'
                  ? categoryData.slice(0, 8)
                  : merchantData
                ).map((item, index) => {
                  const percentage = (item.value / totalSpending) * 100;
                  const prevValue = 'previousValue' in item ? item.previousValue : undefined;
                  const change =
                    prevValue !== undefined && prevValue > 0
                      ? ((item.value - prevValue) / prevValue) * 100
                      : undefined;

                  return (
                    <motion.button
                      key={item.name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => {
                        if (drillLevel === 'category') {
                          handleCategoryClick(item.name);
                        } else {
                          handleMerchantClick(item.name);
                        }
                      }}
                      className="flex items-center gap-3 p-3 rounded-lg bg-glass-bg/50 border border-glass-border hover:bg-white/10 transition-colors text-left group"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: `${COLORS[index % COLORS.length]}20`,
                        }}
                      >
                        {'icon' in item ? (
                          <span>{item.icon}</span>
                        ) : (
                          <Store className="h-4 w-4 text-white/60" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate text-white">
                            {item.name}
                          </span>
                          <div className="flex items-center gap-2">
                            {change !== undefined && (
                              <span
                                className={cn(
                                  'text-xs flex items-center',
                                  change > 0 ? 'text-red-400' : 'text-green-400'
                                )}
                              >
                                {change > 0 ? (
                                  <ArrowUpRight className="h-3 w-3" />
                                ) : (
                                  <ArrowDownRight className="h-3 w-3" />
                                )}
                                {Math.abs(change).toFixed(0)}%
                              </span>
                            )}
                            <span className="text-sm text-white">
                              {privacyMode
                                ? '••••••'
                                : formatCurrency(item.value)}
                            </span>
                          </div>
                        </div>
                        <div className="mt-1 h-1.5 bg-glass-bg rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="h-full rounded-full"
                            style={{
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-white/50">
                            {item.transactionCount} txn
                            {item.transactionCount !== 1 ? 's' : ''}
                          </span>
                          <span className="text-xs text-white/50">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-white/30 group-hover:text-white/60 transition-colors" />
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="text-center py-16 rounded-xl bg-glass-bg/30 border border-glass-border">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-white/30" />
            <p className="text-white/50">No spending data for this period</p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

SpendingBreakdown.displayName = 'SpendingBreakdown';
