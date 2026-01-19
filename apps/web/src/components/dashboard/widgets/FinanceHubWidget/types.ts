/**
 * FinanceHubWidget Types
 * Shared type definitions for finance components
 */

export interface FinanceHubWidgetProps {
  className?: string;
}

export interface FinanceCommandCenterProps {
  onClose: () => void;
}

export type FinanceTab = 'ledger' | 'recurring' | 'simulator' | 'insights';

export interface TabConfig {
  id: FinanceTab;
  label: string;
  icon: string;
}

export const FINANCE_TABS: TabConfig[] = [
  { id: 'ledger', label: 'Ledger', icon: '📒' },
  { id: 'recurring', label: 'Recurring', icon: '🔄' },
  { id: 'simulator', label: 'Simulator', icon: '📈' },
  { id: 'insights', label: 'Insights', icon: '💡' },
];
