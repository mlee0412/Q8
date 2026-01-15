'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  TrendingDown,
  AlertTriangle,
  Target,
  Calculator,
  ChevronDown,
  ChevronRight,
  Zap,
  Snowflake,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useFinanceAccounts,
  usePrivacyMode,
} from '@/lib/stores/financehub';
import { formatCurrency, formatCompactCurrency } from '@/types/finance';

interface DebtManagementPanelProps {
  className?: string;
}

interface DebtAccount {
  id: string;
  name: string;
  type: 'credit' | 'loan';
  balance: number;
  limit?: number;
  apr?: number;
  minimumPayment?: number;
}

interface PayoffPlan {
  method: 'snowball' | 'avalanche';
  monthsToPayoff: number;
  totalInterest: number;
  monthlyPayment: number;
  order: DebtAccount[];
}

/**
 * DebtManagementPanel Component
 *
 * Comprehensive debt management and payoff planning:
 * - Credit utilization overview (total + per-card)
 * - Warning thresholds: 30%, 50%, 70%
 * - Debt snowball vs avalanche calculator
 * - Monthly payment input
 * - Timeline visualization
 * - Payoff recommendations
 */
export function DebtManagementPanel({ className }: DebtManagementPanelProps) {
  const accounts = useFinanceAccounts();
  const privacyMode = usePrivacyMode();

  const [monthlyBudget, setMonthlyBudget] = useState<string>('500');
  const [selectedMethod, setSelectedMethod] = useState<'snowball' | 'avalanche'>('avalanche');
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);

  // Get debt accounts (credit cards and loans)
  const debtAccounts = useMemo((): DebtAccount[] => {
    return accounts
      .filter((acc) => acc.type === 'credit' || acc.type === 'loan')
      .map((acc) => ({
        id: acc.id,
        name: acc.name,
        type: acc.type as 'credit' | 'loan',
        balance: Math.abs(acc.balanceCurrent),
        limit: acc.type === 'credit' ? (acc.balanceLimit || 0) : undefined,
        apr: acc.apr || 0.199, // Default 19.9% APR if not specified
        minimumPayment: acc.type === 'credit'
          ? Math.max(25, Math.abs(acc.balanceCurrent) * 0.02)
          : Math.abs(acc.balanceCurrent) * 0.01,
      }))
      .filter((acc) => acc.balance > 0);
  }, [accounts]);

  // Calculate total debt and utilization
  const debtSummary = useMemo(() => {
    const totalDebt = debtAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const totalCreditLimit = debtAccounts
      .filter((acc) => acc.type === 'credit')
      .reduce((sum, acc) => sum + (acc.limit || 0), 0);
    const totalCreditBalance = debtAccounts
      .filter((acc) => acc.type === 'credit')
      .reduce((sum, acc) => sum + acc.balance, 0);
    const creditUtilization = totalCreditLimit > 0
      ? (totalCreditBalance / totalCreditLimit) * 100
      : 0;
    const totalMinimumPayment = debtAccounts.reduce(
      (sum, acc) => sum + (acc.minimumPayment || 0),
      0
    );

    return {
      totalDebt,
      totalCreditLimit,
      totalCreditBalance,
      creditUtilization,
      totalMinimumPayment,
    };
  }, [debtAccounts]);

  // Calculate payoff plan
  const payoffPlan = useMemo((): PayoffPlan | null => {
    const budget = parseFloat(monthlyBudget) || 0;
    if (budget < debtSummary.totalMinimumPayment || debtAccounts.length === 0) {
      return null;
    }

    // Sort accounts by method
    const sortedAccounts = [...debtAccounts].sort((a, b) => {
      if (selectedMethod === 'snowball') {
        // Smallest balance first
        return a.balance - b.balance;
      } else {
        // Highest APR first
        return (b.apr || 0) - (a.apr || 0);
      }
    });

    // Simulate payoff
    let remainingAccounts = sortedAccounts.map((acc) => ({
      ...acc,
      remaining: acc.balance,
    }));
    let months = 0;
    let totalInterest = 0;
    const maxMonths = 360; // 30 years max

    while (remainingAccounts.length > 0 && months < maxMonths) {
      months++;
      let availableBudget = budget;

      // Apply interest to all accounts
      remainingAccounts.forEach((acc) => {
        const monthlyRate = (acc.apr || 0) / 12;
        const interest = acc.remaining * monthlyRate;
        totalInterest += interest;
        acc.remaining += interest;
      });

      // Pay minimums first
      remainingAccounts.forEach((acc) => {
        const minPayment = Math.min(acc.minimumPayment || 0, acc.remaining);
        acc.remaining -= minPayment;
        availableBudget -= minPayment;
      });

      // Put extra towards priority debt
      for (const acc of remainingAccounts) {
        if (availableBudget <= 0) break;
        const extraPayment = Math.min(availableBudget, acc.remaining);
        acc.remaining -= extraPayment;
        availableBudget -= extraPayment;
      }

      // Remove paid-off accounts
      remainingAccounts = remainingAccounts.filter((acc) => acc.remaining > 0.01);
    }

    return {
      method: selectedMethod,
      monthsToPayoff: months,
      totalInterest: Math.round(totalInterest * 100) / 100,
      monthlyPayment: budget,
      order: sortedAccounts,
    };
  }, [debtAccounts, monthlyBudget, selectedMethod, debtSummary.totalMinimumPayment]);

  // Get utilization color
  const getUtilizationColor = (utilization: number) => {
    if (utilization <= 30) return 'text-green-400';
    if (utilization <= 50) return 'text-yellow-400';
    if (utilization <= 70) return 'text-orange-400';
    return 'text-red-400';
  };

  const getUtilizationBgColor = (utilization: number) => {
    if (utilization <= 30) return 'bg-green-500';
    if (utilization <= 50) return 'bg-yellow-500';
    if (utilization <= 70) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const formatMonths = (months: number) => {
    if (months >= 12) {
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      if (remainingMonths === 0) {
        return `${years} year${years > 1 ? 's' : ''}`;
      }
      return `${years}y ${remainingMonths}mo`;
    }
    return `${months} month${months > 1 ? 's' : ''}`;
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-neon-primary" />
          Debt Management
        </h3>
        <p className="text-sm text-white/60">
          Track utilization and plan your payoff strategy
        </p>
      </div>

      {/* Overall Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-surface-3 border border-border-subtle">
          <div className="text-xs text-white/60 mb-1">Total Debt</div>
          <div className="text-xl font-semibold text-red-400">
            {privacyMode ? '••••••' : formatCurrency(debtSummary.totalDebt)}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-3 border border-border-subtle">
          <div className="text-xs text-white/60 mb-1">Credit Utilization</div>
          <div className={cn('text-xl font-semibold', getUtilizationColor(debtSummary.creditUtilization))}>
            {privacyMode ? '••%' : `${debtSummary.creditUtilization.toFixed(1)}%`}
          </div>
          {/* Utilization Bar */}
          <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', getUtilizationBgColor(debtSummary.creditUtilization))}
              style={{ width: `${Math.min(100, debtSummary.creditUtilization)}%` }}
            />
          </div>
          {/* Threshold Markers */}
          <div className="relative mt-1 flex justify-between text-[10px] text-white/40">
            <span>0%</span>
            <span className="absolute left-[30%] -translate-x-1/2 text-green-400">30%</span>
            <span className="absolute left-[70%] -translate-x-1/2 text-orange-400">70%</span>
            <span>100%</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-3 border border-border-subtle">
          <div className="text-xs text-white/60 mb-1">Min Monthly Payment</div>
          <div className="text-xl font-semibold text-white">
            {privacyMode ? '••••••' : formatCurrency(debtSummary.totalMinimumPayment)}
          </div>
        </div>
      </div>

      {/* Warning Banner */}
      {debtSummary.creditUtilization > 30 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'flex items-center gap-3 p-3 rounded-xl',
            debtSummary.creditUtilization > 70
              ? 'bg-red-500/20 border border-red-500/30'
              : debtSummary.creditUtilization > 50
              ? 'bg-orange-500/20 border border-orange-500/30'
              : 'bg-yellow-500/20 border border-yellow-500/30'
          )}
        >
          <AlertTriangle
            className={cn(
              'h-5 w-5',
              debtSummary.creditUtilization > 70
                ? 'text-red-400'
                : debtSummary.creditUtilization > 50
                ? 'text-orange-400'
                : 'text-yellow-400'
            )}
          />
          <div className="flex-1">
            <div className="text-sm font-medium text-white">
              {debtSummary.creditUtilization > 70
                ? 'High credit utilization'
                : debtSummary.creditUtilization > 50
                ? 'Moderate credit utilization'
                : 'Credit utilization above optimal'}
            </div>
            <div className="text-xs text-white/60">
              {debtSummary.creditUtilization > 70
                ? 'This may significantly impact your credit score. Consider paying down balances.'
                : debtSummary.creditUtilization > 50
                ? 'Try to keep utilization below 30% for best credit score impact.'
                : 'Keeping utilization below 30% is recommended for optimal credit health.'}
            </div>
          </div>
        </motion.div>
      )}

      {/* Account List */}
      {debtAccounts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-white/80">Debt Accounts</h4>
          {debtAccounts.map((account) => {
            const utilization = account.limit
              ? (account.balance / account.limit) * 100
              : 0;
            const isExpanded = expandedAccount === account.id;

            return (
              <motion.div
                key={account.id}
                className="rounded-xl bg-white/5 border border-white/10 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedAccount(isExpanded ? null : account.id)}
                  className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {account.type === 'credit' ? (
                      <CreditCard className="h-4 w-4 text-white/60" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-white/60" />
                    )}
                    <div className="text-left">
                      <div className="text-sm font-medium text-white">
                        {account.name}
                      </div>
                      <div className="text-xs text-white/60">
                        {account.apr ? `${(account.apr * 100).toFixed(1)}% APR` : 'N/A APR'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium text-white">
                        {privacyMode ? '••••••' : formatCurrency(account.balance)}
                      </div>
                      {account.limit && (
                        <div className="text-xs text-white/60">
                          {privacyMode ? '••%' : `${utilization.toFixed(0)}%`} used
                        </div>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-white/40" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-white/40" />
                    )}
                  </div>
                </button>

                {isExpanded && account.limit && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-3 pb-3 space-y-2"
                  >
                    <div className="flex justify-between text-xs">
                      <span className="text-white/60">Credit Limit</span>
                      <span className="text-white">
                        {privacyMode ? '••••••' : formatCurrency(account.limit)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-white/60">Available</span>
                      <span className="text-green-400">
                        {privacyMode
                          ? '••••••'
                          : formatCurrency(account.limit - account.balance)}
                      </span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full', getUtilizationBgColor(utilization))}
                        style={{ width: `${Math.min(100, utilization)}%` }}
                      />
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Payoff Calculator */}
      {debtAccounts.length > 0 && (
        <div className="space-y-4 p-4 rounded-xl bg-surface-3/50 border border-border-subtle">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-neon-primary" />
            <h4 className="text-sm font-medium text-white">Payoff Calculator</h4>
          </div>

          {/* Method Selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedMethod('avalanche')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-all',
                selectedMethod === 'avalanche'
                  ? 'bg-neon-primary/20 text-neon-primary border border-neon-primary/30'
                  : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
              )}
            >
              <Zap className="h-4 w-4" />
              Avalanche
            </button>
            <button
              onClick={() => setSelectedMethod('snowball')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-all',
                selectedMethod === 'snowball'
                  ? 'bg-neon-primary/20 text-neon-primary border border-neon-primary/30'
                  : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
              )}
            >
              <Snowflake className="h-4 w-4" />
              Snowball
            </button>
          </div>

          <div className="text-xs text-white/50">
            {selectedMethod === 'avalanche'
              ? 'Pay highest interest first - saves most money'
              : 'Pay smallest balance first - quick wins for motivation'}
          </div>

          {/* Monthly Budget Input */}
          <div>
            <label className="text-xs text-white/60 mb-1 block">Monthly Payment Budget</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">$</span>
              <Input
                type="number"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                className="pl-7 bg-white/5 border-white/10 text-white"
                min={debtSummary.totalMinimumPayment}
              />
            </div>
            {parseFloat(monthlyBudget) < debtSummary.totalMinimumPayment && (
              <div className="text-xs text-red-400 mt-1">
                Minimum required: {formatCurrency(debtSummary.totalMinimumPayment)}
              </div>
            )}
          </div>

          {/* Payoff Results */}
          {payoffPlan && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 pt-3 border-t border-white/10"
            >
              <div className="flex items-center gap-2 text-neon-primary">
                <Target className="h-4 w-4" />
                <span className="text-sm font-medium">Payoff Timeline</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-white/5">
                  <div className="text-xs text-white/60">Time to Debt-Free</div>
                  <div className="text-lg font-semibold text-white">
                    {formatMonths(payoffPlan.monthsToPayoff)}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <div className="text-xs text-white/60">Total Interest</div>
                  <div className="text-lg font-semibold text-red-400">
                    {privacyMode ? '••••••' : formatCurrency(payoffPlan.totalInterest)}
                  </div>
                </div>
              </div>

              {/* Payoff Order */}
              <div className="space-y-1">
                <div className="text-xs text-white/60 mb-2">Recommended payoff order:</div>
                {payoffPlan.order.map((acc, index) => (
                  <div
                    key={acc.id}
                    className="flex items-center gap-2 text-xs text-white/70"
                  >
                    <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px]">
                      {index + 1}
                    </span>
                    <span className="flex-1">{acc.name}</span>
                    <span className="text-white/50">
                      {privacyMode ? '••••' : formatCompactCurrency(acc.balance)}
                    </span>
                    <span className="text-white/40">
                      {((acc.apr || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Empty State */}
      {debtAccounts.length === 0 && (
        <div className="text-center py-8 text-white/50">
          <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <div>No debt accounts found</div>
          <div className="text-sm mt-1">Link credit cards or loans to track them here</div>
        </div>
      )}
    </div>
  );
}

DebtManagementPanel.displayName = 'DebtManagementPanel';
