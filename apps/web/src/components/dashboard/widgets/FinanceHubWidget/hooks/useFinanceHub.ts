'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useFinanceHubStore } from '@/lib/stores/financehub';
import type { FinanceAccount, FinanceTransaction } from '@/types/finance';
import { categorizeTransaction } from '@/types/finance';

const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

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
 * This catches duplicates even if they have different IDs
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
 * Process transactions to apply auto-categorization for uncategorized items
 */
function processTransactionsWithCategories(transactions: FinanceTransaction[]): FinanceTransaction[] {
  // First deduplicate, then categorize
  const deduped = deduplicateTransactions(transactions);

  return deduped.map((tx) => {
    // Only auto-categorize if category is empty, "Other", or "Uncategorized"
    const needsCategorization =
      tx.category.length === 0 ||
      tx.category[0] === 'Other' ||
      tx.category[0] === 'Uncategorized';

    if (needsCategorization) {
      const suggestedCategory = categorizeTransaction(tx.merchantName, tx.description);
      if (suggestedCategory !== 'Other') {
        return { ...tx, category: [suggestedCategory] };
      }
    }

    return tx;
  });
}

/**
 * useFinanceHub Hook
 *
 * Handles data fetching, syncing, and API interactions for FinanceHub.
 * Mirrors the pattern used in useContentHub.
 */
export function useFinanceHub() {
  const {
    accounts,
    transactions,
    recurring,
    snapshots,
    isLoading,
    isSyncing,
    error,
    setAccounts,
    setTransactions,
    setRecurring,
    setSnapshots,
    setLoading,
    setSyncing,
    setError,
    recalculateTotals,
  } = useFinanceHubStore();

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<number>(0);

  /**
   * Fetch all finance data for the current user
   */
  const fetchFinanceData = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);

    try {
      // Fetch accounts, transactions, recurring, and snapshots in parallel
      const [accountsRes, transactionsRes, recurringRes] = await Promise.all([
        fetch(`/api/finance/accounts?userId=${userId}`),
        fetch(`/api/finance/transactions?userId=${userId}&limit=100`),
        fetch(`/api/finance/recurring?userId=${userId}`),
      ]);

      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        setAccounts(Array.isArray(accountsData) ? accountsData : []);
      }

      if (transactionsRes.ok) {
        const txData = await transactionsRes.json();
        const rawTransactions = txData.transactions || [];
        // Apply auto-categorization to uncategorized transactions
        const processedTransactions = processTransactionsWithCategories(rawTransactions);
        setTransactions(processedTransactions);
      }

      if (recurringRes.ok) {
        const recurringData = await recurringRes.json();
        setRecurring(Array.isArray(recurringData) ? recurringData : []);
      }

      // Fetch snapshots for the last 30 days
      const snapshotsRes = await fetch(`/api/finance/snapshots?userId=${userId}&days=30`);
      if (snapshotsRes.ok) {
        const snapshotsData = await snapshotsRes.json();
        setSnapshots(Array.isArray(snapshotsData) ? snapshotsData : []);
      }

      recalculateTotals();
    } catch (err) {
      console.error('Failed to fetch finance data:', err);
      setError('Failed to load finance data');
    } finally {
      setLoading(false);
    }
  }, [setAccounts, setTransactions, setRecurring, setSnapshots, setLoading, setError, recalculateTotals]);

  /**
   * Sync all linked accounts with Plaid/SnapTrade
   */
  const syncAccounts = useCallback(async (userId: string, fullSync = false) => {
    // Prevent rapid re-syncing
    const now = Date.now();
    if (now - lastSyncRef.current < 30000 && !fullSync) {
      console.log('Sync skipped - too soon since last sync');
      return;
    }

    setSyncing(true);
    setError(null);
    lastSyncRef.current = now;

    try {
      const response = await fetch('/api/finance/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, fullSync }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Sync failed');
      }

      const result = await response.json();
      console.log('Sync complete:', result);

      // Refetch data after sync
      await fetchFinanceData(userId);
    } catch (err) {
      console.error('Sync error:', err);
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }, [fetchFinanceData, setSyncing, setError]);

  /**
   * Create a Plaid Link token
   */
  const createPlaidLinkToken = useCallback(async (userId: string): Promise<string | null> => {
    try {
      const response = await fetch('/api/finance/plaid/link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create link token');
      }

      const data = await response.json();
      
      if (!data.linkToken) {
        console.warn('Plaid not configured:', data.message);
        return null;
      }

      return data.linkToken;
    } catch (err) {
      console.error('Create link token error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create link token');
      return null;
    }
  }, [setError]);

  /**
   * Exchange Plaid public token after Link success
   */
  const exchangePlaidToken = useCallback(async (
    publicToken: string,
    userId: string,
    metadata: any
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/finance/plaid/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicToken, userId, metadata }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to link account');
      }

      const result = await response.json();
      console.log('Account linked:', result);

      // Refetch data after linking
      await fetchFinanceData(userId);
      return true;
    } catch (err) {
      console.error('Exchange token error:', err);
      setError(err instanceof Error ? err.message : 'Failed to link account');
      return false;
    }
  }, [fetchFinanceData, setError]);

  /**
   * Create a SnapTrade connection URL
   */
  const createSnapTradeConnection = useCallback(async (
    userId: string,
    broker?: string
  ): Promise<string | null> => {
    try {
      const response = await fetch('/api/finance/snaptrade/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, broker }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create connection');
      }

      const data = await response.json();

      if (!data.redirectUrl) {
        console.warn('SnapTrade not configured:', data.message);
        return null;
      }

      return data.redirectUrl;
    } catch (err) {
      console.error('SnapTrade connect error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to SnapTrade');
      return null;
    }
  }, [setError]);

  /**
   * Add a manual account
   */
  const addManualAccount = useCallback(async (
    userId: string,
    accountData: Partial<FinanceAccount>
  ): Promise<FinanceAccount | null> => {
    try {
      const response = await fetch('/api/finance/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...accountData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add account');
      }

      const newAccount = await response.json();
      
      // Update local state
      setAccounts([...accounts, newAccount]);
      recalculateTotals();
      
      return newAccount;
    } catch (err) {
      console.error('Add account error:', err);
      setError(err instanceof Error ? err.message : 'Failed to add account');
      return null;
    }
  }, [accounts, setAccounts, recalculateTotals, setError]);

  /**
   * Set up periodic sync
   */
  const startPeriodicSync = useCallback((userId: string) => {
    // Clear existing timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    // Set up new periodic sync
    const doSync = async () => {
      await syncAccounts(userId, false);
      syncTimeoutRef.current = setTimeout(doSync, SYNC_INTERVAL);
    };

    syncTimeoutRef.current = setTimeout(doSync, SYNC_INTERVAL);
  }, [syncAccounts]);

  /**
   * Stop periodic sync
   */
  const stopPeriodicSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }
  }, []);

  /**
   * Clean up duplicate transactions and refresh data
   */
  const cleanupAndRefresh = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);

    try {
      // Clear localStorage cache to remove any stale duplicate data
      if (typeof window !== 'undefined') {
        localStorage.removeItem('financehub-storage');
        console.log('Cleared financehub localStorage cache');
      }

      // Clean up duplicates in the database
      const cleanupResponse = await fetch('/api/finance/transactions/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, dryRun: false }),
      });

      if (!cleanupResponse.ok) {
        const errorData = await cleanupResponse.json();
        throw new Error(errorData.error || 'Cleanup failed');
      }

      const cleanupResult = await cleanupResponse.json();
      console.log('Cleanup result:', cleanupResult);

      // Fetch fresh data from API
      await fetchFinanceData(userId);

      return cleanupResult;
    } catch (err) {
      console.error('Cleanup error:', err);
      setError(err instanceof Error ? err.message : 'Cleanup failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchFinanceData, setLoading, setError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPeriodicSync();
    };
  }, [stopPeriodicSync]);

  return {
    // Data
    accounts,
    transactions,
    recurring,
    snapshots,

    // Status
    isLoading,
    isSyncing,
    error,

    // Actions
    fetchFinanceData,
    syncAccounts,
    createPlaidLinkToken,
    exchangePlaidToken,
    createSnapTradeConnection,
    addManualAccount,
    startPeriodicSync,
    stopPeriodicSync,
    cleanupAndRefresh,
  };
}

export default useFinanceHub;
