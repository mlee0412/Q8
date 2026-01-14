/**
 * Finance Hub Store
 *
 * Zustand store for managing finance data and UI state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/shallow';
import type {
  FinanceAccount,
  FinanceTransaction,
  RecurringItem,
  FinanceSnapshot,
  FinanceTab,
  DateRange,
  TransactionFilters,
  FinanceAlert,
} from '@/types/finance';
import { calculateNetWorth, getDaysUntilDue } from '@/types/finance';

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Create a content-based key for a transaction
 * Uses absolute value and normalized merchant to catch duplicates
 */
function createTransactionContentKey(tx: FinanceTransaction): string {
  const merchantText = (tx.merchantName || tx.description || 'unknown').toLowerCase();
  const merchantKey = merchantText.replace(/[^a-z]/g, '').substring(0, 12);
  const amountKey = Math.abs(tx.amount).toFixed(2);
  return `${tx.accountId}:${tx.date}:${amountKey}:${merchantKey}`;
}

/**
 * Deduplicate transactions by content (account + date + amount + merchant)
 * This catches duplicates even if they have different IDs (e.g., pending vs posted)
 */
function deduplicateTransactions(
  transactions: FinanceTransaction[]
): FinanceTransaction[] {
  const seen = new Map<string, FinanceTransaction>();

  // Sort by createdAt ascending to keep the oldest one
  const sorted = [...transactions].sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (const tx of sorted) {
    const contentKey = createTransactionContentKey(tx);
    const existing = seen.get(contentKey);
    if (!existing) {
      seen.set(contentKey, tx);
    }
    // If exists, keep the older one (already in map)
  }

  return Array.from(seen.values());
}

/**
 * Deduplicate accounts by ID
 */
function deduplicateAccounts(accounts: FinanceAccount[]): FinanceAccount[] {
  const seen = new Map<string, FinanceAccount>();

  for (const account of accounts) {
    const existing = seen.get(account.id);
    if (!existing) {
      seen.set(account.id, account);
    } else {
      const existingTime = new Date(existing.updatedAt || existing.createdAt).getTime();
      const currentTime = new Date(account.updatedAt || account.createdAt).getTime();
      if (currentTime > existingTime) {
        seen.set(account.id, account);
      }
    }
  }

  return Array.from(seen.values());
}

// ============================================================
// STATE INTERFACE
// ============================================================

interface FinanceHubState {
  // Data
  accounts: FinanceAccount[];
  transactions: FinanceTransaction[];
  recurring: RecurringItem[];
  snapshots: FinanceSnapshot[];
  alerts: FinanceAlert[];

  // Computed values (derived from accounts)
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  liquidAssets: number;
  investments: number;
  dailyBudget: number;
  dailySpent: number;

  // UI State
  isExpanded: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  privacyMode: boolean;
  activeTab: FinanceTab;

  // Filters
  dateRange: DateRange;
  transactionFilters: TransactionFilters;

  // Actions - Data
  setAccounts: (accounts: FinanceAccount[]) => void;
  updateAccount: (id: string, updates: Partial<FinanceAccount>) => void;
  removeAccount: (id: string) => void;
  setTransactions: (transactions: FinanceTransaction[]) => void;
  addTransaction: (tx: FinanceTransaction) => void;
  updateTransaction: (id: string, updates: Partial<FinanceTransaction>) => void;
  deleteTransaction: (id: string) => void;
  setRecurring: (recurring: RecurringItem[]) => void;
  addRecurring: (item: RecurringItem) => void;
  updateRecurring: (id: string, updates: Partial<RecurringItem>) => void;
  deleteRecurring: (id: string) => void;
  setSnapshots: (snapshots: FinanceSnapshot[]) => void;
  addAlert: (alert: FinanceAlert) => void;
  dismissAlert: (id: string) => void;

  // Actions - UI
  togglePrivacy: () => void;
  toggleExpanded: () => void;
  setActiveTab: (tab: FinanceTab) => void;
  setDateRange: (range: DateRange) => void;
  setTransactionFilters: (filters: TransactionFilters) => void;
  setLoading: (loading: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setError: (error: string | null) => void;
  setDailyBudget: (budget: number) => void;

  // Actions - Computed
  recalculateTotals: () => void;
  calculateDailySpent: () => void;

  // Actions - Reset
  reset: () => void;
}

// ============================================================
// INITIAL STATE
// ============================================================

const initialState = {
  // Data
  accounts: [] as FinanceAccount[],
  transactions: [] as FinanceTransaction[],
  recurring: [] as RecurringItem[],
  snapshots: [] as FinanceSnapshot[],
  alerts: [] as FinanceAlert[],

  // Computed
  netWorth: 0,
  totalAssets: 0,
  totalLiabilities: 0,
  liquidAssets: 0,
  investments: 0,
  dailyBudget: 100,
  dailySpent: 0,

  // UI
  isExpanded: false,
  isLoading: false,
  isSyncing: false,
  error: null as string | null,
  privacyMode: false,
  activeTab: 'ledger' as FinanceTab,

  // Filters
  dateRange: { start: '', end: '' } as DateRange,
  transactionFilters: {} as TransactionFilters,
};

// ============================================================
// STORE
// ============================================================

export const useFinanceHubStore = create<FinanceHubState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ========== DATA ACTIONS ==========

      setAccounts: (accounts) => {
        // Deduplicate accounts to prevent duplicate entries
        const dedupedAccounts = deduplicateAccounts(accounts);
        set({ accounts: dedupedAccounts });
        get().recalculateTotals();
      },

      updateAccount: (id, updates) => {
        set((state) => ({
          accounts: state.accounts.map((a) =>
            a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
          ),
        }));
        get().recalculateTotals();
      },

      removeAccount: (id) => {
        set((state) => ({
          accounts: state.accounts.filter((a) => a.id !== id),
          transactions: state.transactions.filter((t) => t.accountId !== id),
        }));
        get().recalculateTotals();
      },

      setTransactions: (transactions) => {
        // Deduplicate transactions to prevent duplicate entries
        const dedupedTransactions = deduplicateTransactions(transactions);
        // Sort by date descending (newest first)
        dedupedTransactions.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        set({ transactions: dedupedTransactions });
        get().calculateDailySpent();
      },

      addTransaction: (tx) => {
        set((state) => {
          // Check if transaction already exists
          const exists = state.transactions.some((t) => t.id === tx.id);
          if (exists) {
            // Update existing transaction instead of adding duplicate
            return {
              transactions: state.transactions.map((t) =>
                t.id === tx.id ? tx : t
              ),
            };
          }
          // Add new transaction and sort by date
          return {
            transactions: [tx, ...state.transactions].sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            ),
          };
        });
        get().calculateDailySpent();
      },

      updateTransaction: (id, updates) => {
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
          ),
        }));
        get().calculateDailySpent();
      },

      deleteTransaction: (id) => {
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        }));
        get().calculateDailySpent();
      },

      setRecurring: (recurring) => set({ recurring }),

      addRecurring: (item) => {
        set((state) => ({
          recurring: [...state.recurring, item],
        }));
      },

      updateRecurring: (id, updates) => {
        set((state) => ({
          recurring: state.recurring.map((r) =>
            r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
          ),
        }));
      },

      deleteRecurring: (id) => {
        set((state) => ({
          recurring: state.recurring.filter((r) => r.id !== id),
        }));
      },

      setSnapshots: (snapshots) => set({ snapshots }),

      addAlert: (alert) => {
        set((state) => ({
          alerts: [alert, ...state.alerts].slice(0, 50), // Keep max 50 alerts
        }));
      },

      dismissAlert: (id) => {
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id ? { ...a, dismissedAt: new Date().toISOString() } : a
          ),
        }));
      },

      // ========== UI ACTIONS ==========

      togglePrivacy: () => set((state) => ({ privacyMode: !state.privacyMode })),

      toggleExpanded: () => set((state) => ({ isExpanded: !state.isExpanded })),

      setActiveTab: (activeTab) => set({ activeTab }),

      setDateRange: (dateRange) => set({ dateRange }),

      setTransactionFilters: (transactionFilters) => set({ transactionFilters }),

      setLoading: (isLoading) => set({ isLoading }),

      setSyncing: (isSyncing) => set({ isSyncing }),

      setError: (error) => set({ error }),

      setDailyBudget: (dailyBudget) => set({ dailyBudget }),

      // ========== COMPUTED ACTIONS ==========

      recalculateTotals: () => {
        const { accounts } = get();
        const totals = calculateNetWorth(accounts);
        set(totals);
      },

      calculateDailySpent: () => {
        const { transactions } = get();
        const today = new Date().toISOString().split('T')[0];

        const dailySpent = transactions
          .filter((t) => t.date === today && t.amount < 0 && t.status !== 'canceled')
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        set({ dailySpent });
      },

      // ========== RESET ==========

      reset: () => set(initialState),
    }),
    {
      name: 'financehub-storage',
      partialize: (state) => ({
        // Persist UI preferences and local data that isn't from API
        privacyMode: state.privacyMode,
        dailyBudget: state.dailyBudget,
        activeTab: state.activeTab,
        transactionFilters: state.transactionFilters,
        // Persist recurring items (manual entries)
        recurring: state.recurring,
        // Persist manual transactions
        transactions: state.transactions.filter((t) => t.isManual),
      }),
      // Custom merge to prevent duplicates when hydrating
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<FinanceHubState>;

        // Merge transactions with deduplication
        const mergedTransactions = deduplicateTransactions([
          ...(currentState.transactions || []),
          ...(persisted.transactions || []),
        ]).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Merge recurring with deduplication by ID
        const recurringMap = new Map<string, RecurringItem>();
        for (const item of currentState.recurring || []) {
          recurringMap.set(item.id, item);
        }
        for (const item of persisted.recurring || []) {
          if (!recurringMap.has(item.id)) {
            recurringMap.set(item.id, item);
          }
        }

        return {
          ...currentState,
          ...persisted,
          transactions: mergedTransactions,
          recurring: Array.from(recurringMap.values()),
        };
      },
    }
  )
);

// ============================================================
// SELECTOR HOOKS
// ============================================================

export const useNetWorth = () => useFinanceHubStore((s) => s.netWorth);
export const useTotalAssets = () => useFinanceHubStore((s) => s.totalAssets);
export const useTotalLiabilities = () => useFinanceHubStore((s) => s.totalLiabilities);
export const useLiquidAssets = () => useFinanceHubStore((s) => s.liquidAssets);
export const useInvestments = () => useFinanceHubStore((s) => s.investments);

export const usePrivacyMode = () => useFinanceHubStore((s) => s.privacyMode);
export const useFinanceExpanded = () => useFinanceHubStore((s) => s.isExpanded);
export const useFinanceLoading = () => useFinanceHubStore((s) => s.isLoading);
export const useFinanceSyncing = () => useFinanceHubStore((s) => s.isSyncing);
export const useFinanceError = () => useFinanceHubStore((s) => s.error);

export const useFinanceAccounts = () => useFinanceHubStore((s) => s.accounts);
export const useFinanceTransactions = () => useFinanceHubStore((s) => s.transactions);
export const useFinanceRecurring = () => useFinanceHubStore((s) => s.recurring);
export const useFinanceSnapshots = () => useFinanceHubStore((s) => s.snapshots);
export const useFinanceAlerts = () => useFinanceHubStore((s) => s.alerts);

export const useDailyBudget = () => useFinanceHubStore((s) => s.dailyBudget);
export const useDailySpent = () => useFinanceHubStore((s) => s.dailySpent);

// Derived selectors - use useShallow to prevent infinite loops
export const useVisibleAccounts = () =>
  useFinanceHubStore(
    useShallow((s) => s.accounts.filter((a) => !a.isHidden))
  );

export const useActiveAlerts = () =>
  useFinanceHubStore(
    useShallow((s) => s.alerts.filter((a) => !a.dismissedAt))
  );

// For useUpcomingBills, we need to get raw data and compute in component
export const useUpcomingBillsRaw = () =>
  useFinanceHubStore((s) => s.recurring);

// Helper function to compute upcoming bills (call this in useMemo in components)
export const computeUpcomingBills = (recurring: RecurringItem[], daysAhead: number = 7) =>
  recurring
    .filter((r) => r.isActive && !r.isIncome)
    .map((r) => ({
      ...r,
      daysUntilDue: getDaysUntilDue(r.nextDueDate),
    }))
    .filter((r) => r.daysUntilDue <= daysAhead && r.daysUntilDue >= 0)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

export const useFilteredTransactions = () =>
  useFinanceHubStore(
    useShallow((s) => {
      let filtered = s.transactions;
      const filters = s.transactionFilters;

      if (filters.accountIds?.length) {
        filtered = filtered.filter((t) => filters.accountIds!.includes(t.accountId));
      }
      if (filters.categories?.length) {
        filtered = filtered.filter((t) =>
          t.category.some((c) => filters.categories!.includes(c))
        );
      }
      if (filters.status?.length) {
        filtered = filtered.filter((t) => filters.status!.includes(t.status));
      }
      if (filters.minAmount !== undefined) {
        filtered = filtered.filter((t) => Math.abs(t.amount) >= filters.minAmount!);
      }
      if (filters.maxAmount !== undefined) {
        filtered = filtered.filter((t) => Math.abs(t.amount) <= filters.maxAmount!);
      }
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        filtered = filtered.filter(
          (t) =>
            t.merchantName?.toLowerCase().includes(query) ||
            t.description?.toLowerCase().includes(query) ||
            t.category.some((c) => c.toLowerCase().includes(query))
        );
      }
      if (filters.dateRange?.start) {
        filtered = filtered.filter((t) => t.date >= filters.dateRange!.start);
      }
      if (filters.dateRange?.end) {
        filtered = filtered.filter((t) => t.date <= filters.dateRange!.end);
      }
      if (filters.isRecurring !== undefined) {
        filtered = filtered.filter((t) => t.isRecurring === filters.isRecurring);
      }

      return filtered;
    })
  );

// Recurring selector
export const useRecurring = () =>
  useFinanceHubStore((state) => state.recurring);

// Actions hook
export const useFinanceHubActions = () =>
  useFinanceHubStore((state) => ({
    setAccounts: state.setAccounts,
    updateAccount: state.updateAccount,
    removeAccount: state.removeAccount,
    setTransactions: state.setTransactions,
    addTransaction: state.addTransaction,
    updateTransaction: state.updateTransaction,
    deleteTransaction: state.deleteTransaction,
    setRecurring: state.setRecurring,
    addRecurring: state.addRecurring,
    updateRecurring: state.updateRecurring,
    deleteRecurring: state.deleteRecurring,
    togglePrivacy: state.togglePrivacy,
    toggleExpanded: state.toggleExpanded,
    setActiveTab: state.setActiveTab,
    setLoading: state.setLoading,
    setSyncing: state.setSyncing,
    setError: state.setError,
    setDailyBudget: state.setDailyBudget,
  }));
