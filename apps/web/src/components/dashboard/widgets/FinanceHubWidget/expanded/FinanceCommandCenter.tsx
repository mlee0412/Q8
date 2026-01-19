'use client';

import { motion } from 'framer-motion';
import { Minimize2, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useFinanceHubStore } from '@/lib/stores/financehub';
import { PrivacyToggle } from '../shared/PrivacyToggle';
import { UnifiedLedger } from './UnifiedLedger';
import { RecurringManager } from './RecurringManager';
import { WealthSimulator } from './WealthSimulator';
import { SpendingBreakdown } from './SpendingBreakdown';
import { AIInsights } from './AIInsights';
import { FINANCE_TABS } from '../types';
import type { FinanceCommandCenterProps } from '../types';

/**
 * FinanceCommandCenter - Expanded fullscreen overlay
 */
export function FinanceCommandCenter({ onClose }: FinanceCommandCenterProps) {
  const { activeTab, setActiveTab, netWorth, totalAssets, totalLiabilities } = useFinanceHubStore();

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
          <div className="flex gap-2 mb-6 border-b border-border-subtle pb-2">
            {FINANCE_TABS.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  activeTab === tab.id
                    ? 'bg-neon-primary/20 text-neon-primary border border-neon-primary/30'
                    : 'text-white/70 hover:text-white'
                )}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="rounded-2xl bg-surface-3/50 backdrop-blur-sm border border-border-subtle p-6 min-h-[60vh]">
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
