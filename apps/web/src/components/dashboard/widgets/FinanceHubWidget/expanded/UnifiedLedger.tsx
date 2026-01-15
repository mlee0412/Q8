'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useFinanceHubStore,
  useFilteredTransactions,
  useFinanceAccounts,
  usePrivacyMode,
} from '@/lib/stores/financehub';
import { AmountDisplay } from '../shared/AmountDisplay';
import { AddTransactionForm } from './AddTransactionForm';
import { TransactionCategoryModal } from './TransactionCategoryModal';
import type { FinanceTransaction, TransactionFilters } from '@/types/finance';
import { getCategoryIcon, formatCurrency } from '@/types/finance';

interface UnifiedLedgerProps {
  className?: string;
}

const PAGE_SIZE = 20;

/**
 * UnifiedLedger Component
 *
 * Searchable, filterable transaction list showing all transactions
 * from Plaid + Manual sources in a unified view.
 *
 * Features:
 * - Search by merchant, description, category
 * - Filter by account, category, date range
 * - Sort by date, amount
 * - Edit/Delete manual transactions
 * - Privacy mode support
 */
export function UnifiedLedger({ className }: UnifiedLedgerProps) {
  const transactions = useFilteredTransactions();
  const accounts = useFinanceAccounts();
  const privacyMode = usePrivacyMode();
  const { setTransactionFilters, deleteTransaction } = useFinanceHubStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingTransaction, setEditingTransaction] = useState<FinanceTransaction | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [categoryTransaction, setCategoryTransaction] = useState<FinanceTransaction | null>(null);

  // TODO: Replace with actual user ID from auth
  const userId = 'demo-user';

  // Filter state
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Get unique categories from transactions
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    transactions.forEach((t) => t.category.forEach((c) => cats.add(c)));
    return Array.from(cats).sort();
  }, [transactions]);

  // Apply local search and sort
  const displayedTransactions = useMemo(() => {
    let filtered = transactions;

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.merchantName?.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.category.some((c) => c.toLowerCase().includes(query))
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sortField === 'date') {
        const comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        return sortDirection === 'asc' ? comparison : -comparison;
      } else {
        const comparison = Math.abs(a.amount) - Math.abs(b.amount);
        return sortDirection === 'asc' ? comparison : -comparison;
      }
    });

    return filtered;
  }, [transactions, searchQuery, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(displayedTransactions.length / PAGE_SIZE);
  const paginatedTransactions = displayedTransactions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Apply filters to store
  const applyFilters = () => {
    const filters: TransactionFilters = {};
    if (selectedAccounts.length > 0) filters.accountIds = selectedAccounts;
    if (selectedCategories.length > 0) filters.categories = selectedCategories;
    if (dateFrom) filters.dateRange = { start: dateFrom, end: dateTo || dateFrom };
    if (dateTo && !dateFrom) filters.dateRange = { start: dateTo, end: dateTo };
    setTransactionFilters(filters);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSelectedAccounts([]);
    setSelectedCategories([]);
    setDateFrom('');
    setDateTo('');
    setTransactionFilters({});
    setCurrentPage(1);
  };

  const handleSort = (field: 'date' | 'amount') => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this transaction?')) {
      deleteTransaction(id);
    }
  };

  const getAccountName = (accountId: string) => {
    return accounts.find((a) => a.id === accountId)?.name || 'Unknown';
  };

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const income = displayedTransactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = displayedTransactions
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return { income, expenses, net: income - expenses };
  }, [displayedTransactions]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Transactions</h3>
          <p className="text-sm text-white/60">
            {displayedTransactions.length} transactions
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          className="bg-neon-primary hover:bg-neon-primary/90"
        >
          Add Transaction
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <div className="text-xs text-green-400 mb-1">Income</div>
          <AmountDisplay amount={summaryStats.income} size="lg" className="text-green-400" />
        </div>
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="text-xs text-red-400 mb-1">Expenses</div>
          <AmountDisplay amount={-summaryStats.expenses} size="lg" className="text-red-400" />
        </div>
        <div className="p-4 rounded-xl bg-surface-3 border border-border-subtle">
          <div className="text-xs text-white/60 mb-1">Net</div>
          <AmountDisplay amount={summaryStats.net} size="lg" colorize />
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
            <Input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-surface-3 border-border-subtle"
            />
          </div>
          <Button
            variant="ghost"
            onClick={() => setShowFilters(!showFilters)}
            className={cn('border border-border-subtle text-white', showFilters && 'bg-neon-primary/20 border-neon-primary/30')}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filters
            {(selectedAccounts.length > 0 || selectedCategories.length > 0 || dateFrom) && (
              <span className="ml-1 h-5 w-5 rounded-full bg-neon-primary text-white text-xs flex items-center justify-center">
                !
              </span>
            )}
          </Button>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="p-4 rounded-xl bg-surface-3/50 border border-border-subtle space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              {/* Accounts */}
              <div>
                <label className="block text-sm text-white/60 mb-2">Accounts</label>
                <div className="flex flex-wrap gap-1">
                  {accounts.map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() =>
                        setSelectedAccounts((prev) =>
                          prev.includes(acc.id)
                            ? prev.filter((id) => id !== acc.id)
                            : [...prev, acc.id]
                        )
                      }
                      className={cn(
                        'px-2 py-1 text-xs rounded-md transition-all',
                        selectedAccounts.includes(acc.id)
                          ? 'bg-neon-primary/20 text-neon-primary border border-neon-primary/30'
                          : 'bg-surface-3 text-white/60 border border-border-subtle'
                      )}
                    >
                      {acc.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div>
                <label className="block text-sm text-white/60 mb-2">Categories</label>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                  {allCategories.slice(0, 10).map((cat) => (
                    <button
                      key={cat}
                      onClick={() =>
                        setSelectedCategories((prev) =>
                          prev.includes(cat)
                            ? prev.filter((c) => c !== cat)
                            : [...prev, cat]
                        )
                      }
                      className={cn(
                        'px-2 py-1 text-xs rounded-md transition-all',
                        selectedCategories.includes(cat)
                          ? 'bg-neon-primary/20 text-neon-primary border border-neon-primary/30'
                          : 'bg-surface-3 text-white/60 border border-border-subtle'
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/60 mb-1">From</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-surface-3 border-border-subtle"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1">To</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-surface-3 border-border-subtle"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={applyFilters} className="bg-neon-primary hover:bg-neon-primary/90">
                Apply Filters
              </Button>
              <Button variant="ghost" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs text-white/50 font-medium border-b border-border-subtle">
        <button
          className="col-span-2 flex items-center gap-1 hover:text-foreground"
          onClick={() => handleSort('date')}
        >
          Date
          {sortField === 'date' &&
            (sortDirection === 'desc' ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronUp className="h-3 w-3" />
            ))}
        </button>
        <div className="col-span-4">Description</div>
        <div className="col-span-2">Category</div>
        <div className="col-span-2">Account</div>
        <button
          className="col-span-2 flex items-center justify-end gap-1 hover:text-foreground"
          onClick={() => handleSort('amount')}
        >
          Amount
          {sortField === 'amount' &&
            (sortDirection === 'desc' ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronUp className="h-3 w-3" />
            ))}
        </button>
      </div>

      {/* Transaction List */}
      <div className="space-y-1">
        {paginatedTransactions.length === 0 ? (
          <div className="text-center py-12 text-white/50">
            No transactions found
          </div>
        ) : (
          paginatedTransactions.map((tx, index) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.02 }}
              className="group grid grid-cols-12 gap-4 px-4 py-3 rounded-lg hover:bg-surface-3/50 transition-colors"
            >
              {/* Date */}
              <div className="col-span-2 text-sm text-white/80">
                {new Date(tx.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </div>

              {/* Description */}
              <div className="col-span-4 flex items-center gap-2 min-w-0">
                {tx.amount > 0 ? (
                  <ArrowDownRight className="h-4 w-4 text-green-400 flex-shrink-0" />
                ) : (
                  <ArrowUpRight className="h-4 w-4 text-red-400 flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {tx.merchantName || 'Unknown'}
                  </div>
                  {tx.description && (
                    <div className="text-xs text-white/60 truncate">
                      {tx.description}
                    </div>
                  )}
                </div>
                {tx.isManual && (
                  <span className="text-[10px] text-text-muted bg-surface-3 px-1.5 py-0.5 rounded flex-shrink-0">
                    Manual
                  </span>
                )}
              </div>

              {/* Category */}
              <button
                onClick={() => setCategoryTransaction(tx)}
                className="col-span-2 flex items-center gap-1 hover:bg-white/10 rounded-md px-1 py-0.5 -mx-1 transition-colors group/cat"
                title="Click to change category"
              >
                <span className="text-sm">{getCategoryIcon(tx.category[0] || 'Other')}</span>
                <span className="text-xs text-white/70 truncate group-hover/cat:text-white">
                  {tx.category[0] || 'Other'}
                </span>
                <Edit2 className="h-3 w-3 text-white/0 group-hover/cat:text-white/50 transition-colors" />
              </button>

              {/* Account */}
              <div className="col-span-2 text-xs text-white/60 truncate">
                {getAccountName(tx.accountId)}
              </div>

              {/* Amount & Actions */}
              <div className="col-span-2 flex items-center justify-end gap-2">
                <AmountDisplay
                  amount={tx.amount}
                  colorize
                  size="sm"
                  className="font-medium"
                />

                {/* Action buttons (visible on hover) */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  {tx.isManual && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setEditingTransaction(tx)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-400 hover:text-red-300"
                        onClick={() => handleDelete(tx.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle">
          <span className="text-sm text-white/50">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Add/Edit Transaction Modal */}
      <AddTransactionForm
        isOpen={showAddForm || !!editingTransaction}
        onClose={() => {
          setShowAddForm(false);
          setEditingTransaction(null);
        }}
        editTransaction={editingTransaction}
      />

      {/* Category Change Modal */}
      <TransactionCategoryModal
        isOpen={!!categoryTransaction}
        onClose={() => setCategoryTransaction(null)}
        transaction={categoryTransaction}
        userId={userId}
      />
    </div>
  );
}

UnifiedLedger.displayName = 'UnifiedLedger';
