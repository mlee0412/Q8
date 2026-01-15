'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Calendar, DollarSign, Tag, Building2, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFinanceHubStore, useFinanceAccounts } from '@/lib/stores/financehub';
import type { FinanceTransaction, TransactionStatus } from '@/types/finance';
import { categorizeTransaction } from '@/types/finance';

interface AddTransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (transaction: FinanceTransaction) => void;
  editTransaction?: FinanceTransaction | null;
}

const COMMON_CATEGORIES = [
  'Groceries',
  'Restaurants',
  'Coffee Shops',
  'Shopping',
  'Gas & Fuel',
  'Rideshare',
  'Streaming',
  'Bills & Utilities',
  'Healthcare',
  'Pharmacy',
  'Fitness',
  'Entertainment',
  'Travel',
  'Transfer',
  'Salary',
  'Other',
];

/**
 * AddTransactionForm Component
 *
 * Modal form for adding or editing manual transactions.
 * Supports:
 * - Expense/Income toggle
 * - Account selection
 * - Category selection with common presets
 * - Recurring transaction flag
 */
export function AddTransactionForm({
  isOpen,
  onClose,
  onSuccess,
  editTransaction,
}: AddTransactionFormProps) {
  const accounts = useFinanceAccounts();
  const { addTransaction, updateTransaction } = useFinanceHubStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [isExpense, setIsExpense] = useState(editTransaction ? editTransaction.amount < 0 : true);
  const [amount, setAmount] = useState(
    editTransaction ? Math.abs(editTransaction.amount).toString() : ''
  );
  const [merchantName, setMerchantName] = useState(editTransaction?.merchantName || '');
  const [description, setDescription] = useState(editTransaction?.description || '');
  const [category, setCategory] = useState(editTransaction?.category[0] || '');
  const [categoryManuallySet, setCategoryManuallySet] = useState(!!editTransaction?.category[0]);

  // Auto-categorize when merchant name changes (only if category wasn't manually set)
  const handleMerchantChange = useCallback((value: string) => {
    setMerchantName(value);
    if (!categoryManuallySet && value.trim()) {
      const suggestedCategory = categorizeTransaction(value);
      if (suggestedCategory !== 'Other') {
        setCategory(suggestedCategory);
      }
    }
  }, [categoryManuallySet]);

  // Track when user manually selects a category
  const handleCategorySelect = useCallback((cat: string) => {
    setCategory(cat);
    setCategoryManuallySet(true);
  }, []);
  const [date, setDate] = useState(
    editTransaction?.date || new Date().toISOString().slice(0, 10)
  );
  const [accountId, setAccountId] = useState(editTransaction?.accountId || accounts[0]?.id || '');
  const [isRecurring, setIsRecurring] = useState(editTransaction?.isRecurring || false);
  const [status, setStatus] = useState<TransactionStatus>(editTransaction?.status || 'posted');

  const resetForm = useCallback(() => {
    setIsExpense(true);
    setAmount('');
    setMerchantName('');
    setDescription('');
    setCategory('');
    setCategoryManuallySet(false);
    setDate(new Date().toISOString().slice(0, 10));
    setAccountId(accounts[0]?.id || '');
    setIsRecurring(false);
    setStatus('posted');
    setError(null);
  }, [accounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!merchantName.trim()) {
      setError('Please enter a merchant or description');
      return;
    }
    if (!accountId) {
      setError('Please select an account');
      return;
    }

    setIsSubmitting(true);

    try {
      const transactionData: FinanceTransaction = {
        id: editTransaction?.id || `manual-${Date.now()}`,
        userId: 'current-user', // Will be replaced by actual user ID from auth
        accountId,
        amount: isExpense ? -Math.abs(parseFloat(amount)) : Math.abs(parseFloat(amount)),
        date,
        merchantName: merchantName.trim(),
        description: description.trim() || undefined,
        category: category ? [category] : ['Other'],
        status,
        isManual: true,
        isRecurring,
        isTransfer: false,
        createdAt: editTransaction?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editTransaction) {
        updateTransaction(editTransaction.id, transactionData);
      } else {
        addTransaction(transactionData);
      }

      // TODO: Sync to API in Phase 3
      // await fetch('/api/finance/transactions', {
      //   method: editTransaction ? 'PUT' : 'POST',
      //   body: JSON.stringify(transactionData),
      // });

      onSuccess?.(transactionData);
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md mx-4 bg-[#1a1a2e]/95 backdrop-blur-xl border border-border-subtle rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
            <h2 className="text-lg font-semibold">
              {editTransaction ? 'Edit Transaction' : 'Add Transaction'}
            </h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Expense/Income Toggle */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsExpense(true)}
                className={cn(
                  'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all',
                  isExpense
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-surface-3 text-white/60 border border-border-subtle hover:border-red-500/30'
                )}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setIsExpense(false)}
                className={cn(
                  'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all',
                  !isExpense
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-surface-3 text-white/60 border border-border-subtle hover:border-green-500/30'
                )}
              >
                Income
              </button>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Amount</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-9 bg-surface-3 border-border-subtle"
                  autoFocus
                />
              </div>
            </div>

            {/* Merchant/Description */}
            <div>
              <label className="block text-sm text-white/60 mb-1.5">
                {isExpense ? 'Merchant' : 'Source'}
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                <Input
                  type="text"
                  placeholder={isExpense ? 'e.g., Starbucks, Amazon' : 'e.g., Paycheck, Freelance'}
                  value={merchantName}
                  onChange={(e) => handleMerchantChange(e.target.value)}
                  className="pl-9 bg-surface-3 border-border-subtle"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Category</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {COMMON_CATEGORIES.slice(0, 8).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategorySelect(cat)}
                    className={cn(
                      'px-2 py-1 text-xs rounded-md transition-all',
                      category === cat
                        ? 'bg-neon-primary/20 text-neon-primary border border-neon-primary/30'
                        : 'bg-surface-3 text-white/60 border border-border-subtle hover:border-neon-primary/30'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                <Input
                  type="text"
                  placeholder="Or type custom category..."
                  value={category}
                  onChange={(e) => handleCategorySelect(e.target.value)}
                  className="pl-9 bg-surface-3 border-border-subtle"
                />
              </div>
            </div>

            {/* Date & Account Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Date */}
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="pl-9 bg-surface-3 border-border-subtle"
                  />
                </div>
              </div>

              {/* Account */}
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Account</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-surface-3 border border-border-subtle text-sm focus:outline-none focus:ring-2 focus:ring-neon-primary"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                  {accounts.length === 0 && (
                    <option value="">No accounts</option>
                  )}
                </select>
              </div>
            </div>

            {/* Status & Recurring Row */}
            <div className="flex items-center gap-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-white/60">Status:</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TransactionStatus)}
                  className="h-8 px-2 rounded-md bg-surface-3 border border-border-subtle text-sm focus:outline-none focus:ring-2 focus:ring-neon-primary"
                >
                  <option value="posted">Posted</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              {/* Recurring toggle */}
              <button
                type="button"
                onClick={() => setIsRecurring(!isRecurring)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all',
                  isRecurring
                    ? 'bg-neon-primary/20 text-neon-primary border border-neon-primary/30'
                    : 'bg-surface-3 text-white/60 border border-border-subtle hover:border-neon-primary/30'
                )}
              >
                <Repeat className="h-3.5 w-3.5" />
                Recurring
              </button>
            </div>

            {/* Description (optional) */}
            <div>
              <label className="block text-sm text-white/60 mb-1.5">
                Notes (optional)
              </label>
              <Input
                type="text"
                placeholder="Add a note..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-surface-3 border-border-subtle"
              />
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-neon-primary hover:bg-neon-primary/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    {editTransaction ? 'Update' : 'Add'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

AddTransactionForm.displayName = 'AddTransactionForm';
