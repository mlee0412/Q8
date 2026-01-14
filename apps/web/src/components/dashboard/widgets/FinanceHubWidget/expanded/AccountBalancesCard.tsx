'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Clock,
  Building2,
  CreditCard,
  Wallet,
  TrendingUp,
  Landmark,
  Bitcoin,
  Banknote,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  useFinanceHubStore,
  useFinanceAccounts,
  useVisibleAccounts,
  usePrivacyMode,
} from '@/lib/stores/financehub';
import { AmountDisplay } from '../shared/AmountDisplay';
import type { FinanceAccount, AccountType } from '@/types/finance';
import { ACCOUNT_TYPE_CONFIG, formatCurrency } from '@/types/finance';

interface AccountBalancesCardProps {
  className?: string;
  onSyncAccount?: (accountId: string) => Promise<void>;
}

interface AccountGroup {
  type: AccountType;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  accounts: FinanceAccount[];
  total: number;
}

// Icons for each account type
const ACCOUNT_ICONS: Record<AccountType, React.ReactNode> = {
  depository: <Landmark className="h-4 w-4" />,
  credit: <CreditCard className="h-4 w-4" />,
  investment: <TrendingUp className="h-4 w-4" />,
  loan: <Banknote className="h-4 w-4" />,
  cash: <Wallet className="h-4 w-4" />,
  crypto: <Bitcoin className="h-4 w-4" />,
};

// Color schemes for account types
const ACCOUNT_COLORS: Record<AccountType, { bg: string; border: string; text: string }> = {
  depository: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
  credit: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
  investment: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400' },
  loan: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
  cash: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  crypto: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400' },
};

/**
 * AccountBalancesCard Component
 *
 * Displays all linked accounts grouped by type with:
 * - Current balance, available balance, credit limit
 * - Credit utilization for credit cards
 * - Sync status indicators
 * - Quick actions (sync, hide/show)
 */
export function AccountBalancesCard({ className, onSyncAccount }: AccountBalancesCardProps) {
  const allAccounts = useFinanceAccounts();
  const privacyMode = usePrivacyMode();
  const { updateAccount } = useFinanceHubStore();

  const [expandedGroups, setExpandedGroups] = useState<Set<AccountType>>(
    new Set(['depository', 'credit', 'investment'])
  );
  const [syncingAccounts, setSyncingAccounts] = useState<Set<string>>(new Set());
  const [showHidden, setShowHidden] = useState(false);

  // Filter accounts based on showHidden toggle
  const displayAccounts = useMemo(() => {
    return showHidden ? allAccounts : allAccounts.filter((a) => !a.isHidden);
  }, [allAccounts, showHidden]);

  // Group accounts by type
  const accountGroups = useMemo<AccountGroup[]>(() => {
    const groups: Partial<Record<AccountType, FinanceAccount[]>> = {};

    displayAccounts.forEach((account) => {
      if (!groups[account.type]) {
        groups[account.type] = [];
      }
      groups[account.type]!.push(account);
    });

    // Order: depository, credit, investment, loan, cash, crypto
    const typeOrder: AccountType[] = ['depository', 'credit', 'investment', 'loan', 'cash', 'crypto'];

    return typeOrder
      .filter((type) => groups[type] && groups[type]!.length > 0)
      .map((type) => {
        const accounts = groups[type]!;
        const config = ACCOUNT_TYPE_CONFIG[type];
        const colors = ACCOUNT_COLORS[type];

        // Calculate total (credit cards show negative as debt)
        const total = accounts.reduce((sum, a) => {
          if (type === 'credit' || type === 'loan') {
            return sum + a.balanceCurrent; // Already negative or positive debt
          }
          return sum + a.balanceCurrent;
        }, 0);

        return {
          type,
          label: config.label + 's',
          icon: ACCOUNT_ICONS[type],
          color: colors.text,
          bgColor: colors.bg,
          borderColor: colors.border,
          accounts,
          total,
        };
      });
  }, [displayAccounts]);

  // Count hidden accounts
  const hiddenCount = allAccounts.filter((a) => a.isHidden).length;

  const toggleGroup = (type: AccountType) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const handleSyncAccount = useCallback(async (accountId: string) => {
    if (syncingAccounts.has(accountId)) return;

    setSyncingAccounts((prev) => new Set([...prev, accountId]));
    try {
      if (onSyncAccount) {
        await onSyncAccount(accountId);
      }
    } finally {
      setSyncingAccounts((prev) => {
        const next = new Set(prev);
        next.delete(accountId);
        return next;
      });
    }
  }, [syncingAccounts, onSyncAccount]);

  const handleToggleHidden = (accountId: string, currentlyHidden: boolean) => {
    updateAccount(accountId, { isHidden: !currentlyHidden });
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Account Balances</h3>
          <p className="text-sm text-white/60">
            {displayAccounts.length} accounts
            {hiddenCount > 0 && !showHidden && ` (${hiddenCount} hidden)`}
          </p>
        </div>
        {hiddenCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHidden(!showHidden)}
            className="text-white/60 hover:text-white"
          >
            {showHidden ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
            {showHidden ? 'Hide' : 'Show'} Hidden
          </Button>
        )}
      </div>

      {/* Account Groups */}
      <div className="space-y-3">
        {accountGroups.map((group) => (
          <AccountGroupSection
            key={group.type}
            group={group}
            isExpanded={expandedGroups.has(group.type)}
            onToggle={() => toggleGroup(group.type)}
            onSyncAccount={handleSyncAccount}
            onToggleHidden={handleToggleHidden}
            syncingAccounts={syncingAccounts}
            privacyMode={privacyMode}
          />
        ))}

        {accountGroups.length === 0 && (
          <div className="text-center py-8 text-white/50 text-sm">
            No accounts linked. Add your first account to get started.
          </div>
        )}
      </div>
    </div>
  );
}

interface AccountGroupSectionProps {
  group: AccountGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onSyncAccount: (accountId: string) => void;
  onToggleHidden: (accountId: string, currentlyHidden: boolean) => void;
  syncingAccounts: Set<string>;
  privacyMode: boolean;
}

function AccountGroupSection({
  group,
  isExpanded,
  onToggle,
  onSyncAccount,
  onToggleHidden,
  syncingAccounts,
  privacyMode,
}: AccountGroupSectionProps) {
  return (
    <div
      className={cn(
        'rounded-xl border backdrop-blur-md transition-colors',
        group.bgColor,
        group.borderColor
      )}
    >
      {/* Group Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', group.bgColor, group.color)}>
            {group.icon}
          </div>
          <div className="text-left">
            <div className="font-medium text-white">{group.label}</div>
            <div className="text-sm text-white/60">{group.accounts.length} account{group.accounts.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <AmountDisplay
            amount={group.total}
            size="lg"
            colorize={group.type === 'credit' || group.type === 'loan'}
            className="font-semibold"
          />
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-white/60" />
          ) : (
            <ChevronRight className="h-5 w-5 text-white/60" />
          )}
        </div>
      </button>

      {/* Expanded Account List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              {group.accounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  accountType={group.type}
                  onSync={() => onSyncAccount(account.id)}
                  onToggleHidden={() => onToggleHidden(account.id, account.isHidden)}
                  isSyncing={syncingAccounts.has(account.id)}
                  privacyMode={privacyMode}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface AccountCardProps {
  account: FinanceAccount;
  accountType: AccountType;
  onSync: () => void;
  onToggleHidden: () => void;
  isSyncing: boolean;
  privacyMode: boolean;
}

function AccountCard({
  account,
  accountType,
  onSync,
  onToggleHidden,
  isSyncing,
  privacyMode,
}: AccountCardProps) {
  // Calculate credit utilization for credit cards
  const creditUtilization = useMemo(() => {
    if (accountType !== 'credit' || !account.balanceLimit) return null;
    const used = Math.abs(account.balanceCurrent);
    const limit = account.balanceLimit;
    return {
      percentage: Math.round((used / limit) * 100),
      used,
      limit,
    };
  }, [account, accountType]);

  // Determine utilization color
  const utilizationColor = useMemo(() => {
    if (!creditUtilization) return '';
    const pct = creditUtilization.percentage;
    if (pct >= 70) return 'bg-red-500';
    if (pct >= 30) return 'bg-yellow-500';
    return 'bg-green-500';
  }, [creditUtilization]);

  // Format last synced time
  const lastSyncedText = useMemo(() => {
    if (!account.lastSyncedAt) return 'Never synced';
    const date = new Date(account.lastSyncedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }, [account.lastSyncedAt]);

  return (
    <div
      className={cn(
        'p-3 rounded-lg bg-white/5 border border-white/10',
        account.isHidden && 'opacity-50'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Account Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white truncate">{account.name}</span>
            {account.isManual && (
              <span className="px-1.5 py-0.5 text-[10px] rounded bg-white/10 text-white/60">
                Manual
              </span>
            )}
            {account.isHidden && (
              <span className="px-1.5 py-0.5 text-[10px] rounded bg-white/10 text-white/60">
                Hidden
              </span>
            )}
          </div>

          {account.institutionName && (
            <div className="flex items-center gap-1 mt-1 text-sm text-white/60">
              <Building2 className="h-3 w-3" />
              <span className="truncate">{account.institutionName}</span>
            </div>
          )}

          {/* Sync Status */}
          <div className="flex items-center gap-2 mt-2 text-xs">
            {account.syncError ? (
              <span className="flex items-center gap-1 text-red-400">
                <AlertCircle className="h-3 w-3" />
                Sync error
              </span>
            ) : account.isManual ? (
              <span className="flex items-center gap-1 text-white/40">
                <CheckCircle className="h-3 w-3" />
                Manual entry
              </span>
            ) : (
              <span className="flex items-center gap-1 text-white/40">
                <Clock className="h-3 w-3" />
                {lastSyncedText}
              </span>
            )}
          </div>
        </div>

        {/* Balance Info */}
        <div className="text-right">
          <AmountDisplay
            amount={account.balanceCurrent}
            size="md"
            colorize={accountType === 'credit' || accountType === 'loan'}
            className="font-semibold"
          />

          {account.balanceAvailable !== undefined && account.balanceAvailable !== account.balanceCurrent && (
            <div className="text-xs text-white/50 mt-0.5">
              Available: {privacyMode ? '••••' : formatCurrency(account.balanceAvailable, account.currency)}
            </div>
          )}

          {/* Credit Utilization Bar */}
          {creditUtilization && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-white/50 mb-1">
                <span>{privacyMode ? '••%' : `${creditUtilization.percentage}%`} used</span>
                <span>
                  {privacyMode ? '••••' : formatCurrency(creditUtilization.limit, account.currency)} limit
                </span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', utilizationColor)}
                  style={{ width: privacyMode ? '50%' : `${Math.min(creditUtilization.percentage, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
        {!account.isManual && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSync}
            disabled={isSyncing}
            className="text-xs text-white/60 hover:text-white h-7 px-2"
          >
            <RefreshCw className={cn('h-3 w-3 mr-1', isSyncing && 'animate-spin')} />
            {isSyncing ? 'Syncing...' : 'Sync'}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleHidden}
          className="text-xs text-white/60 hover:text-white h-7 px-2"
        >
          {account.isHidden ? (
            <>
              <Eye className="h-3 w-3 mr-1" />
              Show
            </>
          ) : (
            <>
              <EyeOff className="h-3 w-3 mr-1" />
              Hide
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

AccountBalancesCard.displayName = 'AccountBalancesCard';
