'use client';

import { useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Maximize2,
  Minimize2,
  RefreshCw,
  Plus,
  Wallet,
  X,
  Link,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useFinanceHubStore } from '@/lib/stores/financehub';
import { NetWorthCard } from './compact/NetWorthCard';
import { DailyBurnMeter } from './compact/DailyBurnMeter';
import { AlertCarousel } from './compact/AlertCarousel';
import { PrivacyToggle } from './shared/PrivacyToggle';
import { LinkAccountModal } from './shared/LinkAccountModal';
import { FinanceSettings } from './shared/FinanceSettings';
import { UnifiedLedger } from './expanded/UnifiedLedger';
import { RecurringManager } from './expanded/RecurringManager';
import { WealthSimulator } from './expanded/WealthSimulator';
import { SpendingBreakdown } from './expanded/SpendingBreakdown';
import { AIInsights } from './expanded/AIInsights';
import { useFinanceHub } from './hooks/useFinanceHub';

interface FinanceHubWidgetProps {
  className?: string;
}

/**
 * FinanceHubWidget - Unified Finance Dashboard
 *
 * "Your money, unified. Your future, simulated."
 *
 * Aggregates financial data from multiple sources:
 * - Plaid (Banking, Credit Cards, Loans)
 * - SnapTrade (Investments, Brokerages)
 * - Manual entries (Cash, Private loans)
 *
 * Features:
 * - Net Worth tracking with history
 * - Daily spending meter
 * - Upcoming bills alerts
 * - Privacy mode (blur sensitive data)
 * - Expandable Command Center
 */
export function FinanceHubWidget({ className }: FinanceHubWidgetProps) {
  const {
    isExpanded,
    isLoading,
    isSyncing,
    error,
    accounts,
    toggleExpanded,
    setError,
    setSyncing,
    setAccounts,
    setTransactions,
    setRecurring,
    setSnapshots,
  } = useFinanceHubStore();

  const {
    syncAccounts,
    fetchFinanceData,
    cleanupAndRefresh,
  } = useFinanceHub();

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // TODO: Replace with actual user ID from auth
  const userId = 'demo-user';

  // Fetch finance data on mount - cleanup duplicates and fetch fresh data
  useEffect(() => {
    cleanupAndRefresh(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle sync - use fullSync=true to bypass throttling for manual refresh
  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      await syncAccounts(userId, true);
      setError(null);
      setLastSyncTime(new Date());
    } catch (err) {
      setError('Sync failed');
    } finally {
      setSyncing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Auto-sync twice daily at 6 AM and 6 PM
  useEffect(() => {
    const checkScheduledSync = () => {
      const now = new Date();
      const hour = now.getHours();

      // Sync at 6 AM or 6 PM (with 5 minute window)
      if ((hour === 6 || hour === 18) && now.getMinutes() < 5) {
        if (!lastSyncTime || now.getTime() - lastSyncTime.getTime() > 60 * 60 * 1000) {
          handleSync();
        }
      }
    };

    // Check every minute for scheduled sync
    const intervalId = setInterval(checkScheduledSync, 60 * 1000);

    // Initial check
    checkScheduledSync();

    return () => clearInterval(intervalId);
  }, [handleSync, lastSyncTime]);

  // Handle link account
  const handleLinkAccount = useCallback(() => {
    setShowLinkModal(true);
    // TODO: Implement Plaid Link in Phase 3
  }, []);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timeout);
    }
  }, [error, setError]);

  return (
    <>
      {/* Compact Widget View */}
      <motion.div
        layout
        className={cn(
          'relative overflow-hidden rounded-2xl',
          'bg-glass-bg backdrop-blur-glass border border-glass-border',
          'shadow-glass transition-all duration-300',
          className
        )}
      >
        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-0 left-0 right-0 z-50 bg-red-500/90 text-white text-xs px-3 py-1.5 flex items-center justify-between"
            >
              <span>{error}</span>
              <button onClick={() => setError(null)}>
                <X className="h-3 w-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading overlay */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-black/50 flex items-center justify-center"
            >
              <div className="h-8 w-8 border-2 border-neon-primary border-t-transparent rounded-full animate-spin" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-glass-border">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-neon-primary" />
            <span className="text-sm font-medium">FinanceHub</span>
            {accounts.length > 0 && (
              <span className="text-xs text-muted-foreground">
                ({accounts.length} accounts)
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Privacy toggle */}
            <PrivacyToggle size="sm" />

            {/* Sync button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleSync}
              disabled={isSyncing}
              title="Sync accounts"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isSyncing && 'animate-spin')} />
            </Button>

            {/* Link account button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleLinkAccount}
              title="Link account"
            >
              <Link className="h-3.5 w-3.5" />
            </Button>

            {/* Settings button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowSettings(true)}
              title="Finance settings"
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>

            {/* Expand toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={toggleExpanded}
              title="Expand"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Net Worth Card */}
        <NetWorthCard />

        {/* Divider */}
        <div className="border-t border-glass-border" />

        {/* Daily Burn Meter */}
        <DailyBurnMeter />

        {/* Divider */}
        <div className="border-t border-glass-border" />

        {/* Alert Carousel */}
        <AlertCarousel />
      </motion.div>

      {/* Expanded FinanceCommandCenter - Portal to body */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isExpanded && (
              <FinanceCommandCenter onClose={toggleExpanded} />
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* Link Account Modal */}
      <LinkAccountModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        userId={userId}
        onSuccess={() => {
          setShowLinkModal(false);
          handleSync();
        }}
      />

      {/* Finance Settings Modal */}
      <FinanceSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        userId={userId}
        onSyncAll={handleSync}
        lastSyncTime={lastSyncTime}
        isSyncing={isSyncing}
      />
    </>
  );
}

/**
 * FinanceCommandCenter - Expanded fullscreen overlay
 */
interface FinanceCommandCenterProps {
  onClose: () => void;
}

function FinanceCommandCenter({ onClose }: FinanceCommandCenterProps) {
  const { activeTab, setActiveTab, netWorth, totalAssets, totalLiabilities } = useFinanceHubStore();

  const tabIcons = {
    ledger: '📒',
    recurring: '🔄',
    simulator: '📈',
    insights: '💡',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl"
    >
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-10 text-white/70 hover:text-white"
        onClick={onClose}
      >
        <Minimize2 className="h-5 w-5" />
      </Button>

      <div className="h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Wallet className="h-8 w-8 text-neon-primary" />
              <div>
                <h1 className="text-2xl font-bold text-white">Finance Command Center</h1>
                <p className="text-sm text-white/60">
                  Your money, unified. Your future, simulated.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Quick Stats */}
              <div className="hidden md:flex items-center gap-6 text-sm">
                <div>
                  <span className="text-white/60">Net Worth: </span>
                  <span className="font-semibold text-white">
                    ${netWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-white/60">Assets: </span>
                  <span className="font-semibold text-green-400">
                    ${totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-white/60">Liabilities: </span>
                  <span className="font-semibold text-red-400">
                    ${totalLiabilities.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              <PrivacyToggle size="lg" />
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6 border-b border-white/10 pb-2">
            {(['ledger', 'recurring', 'simulator', 'insights'] as const).map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  activeTab === tab
                    ? 'bg-neon-primary/20 text-neon-primary border border-neon-primary/30'
                    : 'text-white/70 hover:text-white'
                )}
              >
                <span className="mr-1.5">{tabIcons[tab]}</span>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="rounded-2xl bg-glass-bg/50 backdrop-blur-sm border border-glass-border p-6 min-h-[60vh]">
            {activeTab === 'ledger' && <UnifiedLedger />}
            {activeTab === 'recurring' && <RecurringManager />}
            {activeTab === 'simulator' && (
              <div className="grid lg:grid-cols-2 gap-6">
                <WealthSimulator />
                <SpendingBreakdown />
              </div>
            )}
            {activeTab === 'insights' && <AIInsights />}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

FinanceHubWidget.displayName = 'FinanceHubWidget';
export default FinanceHubWidget;
