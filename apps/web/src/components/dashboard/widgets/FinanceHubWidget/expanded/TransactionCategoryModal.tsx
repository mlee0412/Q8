'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Check,
  Search,
  Loader2,
  AlertCircle,
  Tag,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFinanceHubStore } from '@/lib/stores/financehub';
import type { FinanceTransaction, CategoryRuleMatchType } from '@/types/finance';
import { getAllCategories, getCategoryIcon, formatCurrency } from '@/types/finance';
import {
  normalizeMerchantName,
  generateMerchantPattern,
  suggestMatchType,
} from '@/lib/finance/categoryMatcher';

interface TransactionCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: FinanceTransaction | null;
  userId: string;
}

interface SimilarTransaction {
  id: string;
  merchantName: string;
  amount: number;
  date: string;
  category: string[];
}

interface PreviewResult {
  pattern: string;
  matchType: CategoryRuleMatchType;
  count: number;
  transactions: SimilarTransaction[];
}

/**
 * TransactionCategoryModal
 *
 * Modal for recategorizing transactions with fuzzy matching:
 * - Select new category from list
 * - Preview similar transactions that would be affected
 * - Option to create rule for future matching
 * - Apply to all similar transactions
 */
export function TransactionCategoryModal({
  isOpen,
  onClose,
  transaction,
  userId,
}: TransactionCategoryModalProps) {
  const { updateTransaction, transactions } = useFinanceHubStore();

  // State
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [createRule, setCreateRule] = useState(true);
  const [applyToSimilar, setApplyToSimilar] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [matchType, setMatchType] = useState<CategoryRuleMatchType>('contains');

  // All categories
  const allCategories = useMemo(() => getAllCategories(), []);

  // Filtered categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return allCategories;
    const query = searchQuery.toLowerCase();
    return allCategories.filter((cat) => cat.toLowerCase().includes(query));
  }, [allCategories, searchQuery]);

  // Reset state when modal opens with new transaction
  useEffect(() => {
    if (isOpen && transaction) {
      setSelectedCategory(transaction.category[0] || '');
      setSearchQuery('');
      setCreateRule(true);
      setApplyToSimilar(true);
      setError(null);
      setPreview(null);

      // Set suggested match type
      if (transaction.merchantName) {
        setMatchType(suggestMatchType(transaction.merchantName));
      }
    }
  }, [isOpen, transaction]);

  // Fetch preview when category changes
  const fetchPreview = useCallback(async () => {
    if (!transaction?.merchantName || !selectedCategory) {
      setPreview(null);
      return;
    }

    setIsPreviewLoading(true);
    try {
      const params = new URLSearchParams({
        userId,
        merchantName: transaction.merchantName,
        matchType,
      });

      const response = await fetch(`/api/finance/transactions/recategorize?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPreview(data);
      }
    } catch (err) {
      console.error('Preview error:', err);
    } finally {
      setIsPreviewLoading(false);
    }
  }, [transaction, selectedCategory, userId, matchType]);

  // Debounced preview fetch
  useEffect(() => {
    if (applyToSimilar && transaction?.merchantName) {
      const timeout = setTimeout(fetchPreview, 300);
      return () => clearTimeout(timeout);
    }
  }, [fetchPreview, applyToSimilar, transaction?.merchantName]);

  // Handle save
  const handleSave = async () => {
    if (!transaction || !selectedCategory) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/finance/transactions/recategorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          transactionId: transaction.id,
          newCategory: selectedCategory,
          createRule,
          applyToSimilar,
          ruleMatchType: matchType,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to recategorize');
      }

      const result = await response.json();

      // Update local state for affected transactions
      if (result.affectedCount > 0) {
        // Update the main transaction
        updateTransaction(transaction.id, {
          category: [selectedCategory],
        });

        // If applied to similar, update those too
        if (applyToSimilar && preview?.transactions) {
          preview.transactions.forEach((tx) => {
            updateTransaction(tx.id, {
              category: [selectedCategory],
            });
          });
        }
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !transaction) return null;

  const merchantPattern = transaction.merchantName
    ? generateMerchantPattern(transaction.merchantName)
    : '';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-lg bg-glass-bg/95 backdrop-blur-xl border border-glass-border rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-glass-border">
            <div className="flex items-center gap-3">
              <Tag className="h-5 w-5 text-neon-primary" />
              <h2 className="text-lg font-semibold text-white">Change Category</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-6 space-y-5">
            {/* Transaction Info */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">
                    {transaction.merchantName || 'Unknown Merchant'}
                  </div>
                  <div className="text-xs text-white/60 mt-1">
                    {new Date(transaction.date).toLocaleDateString()} &middot;{' '}
                    {formatCurrency(Math.abs(transaction.amount))}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-white/50">Current</div>
                  <div className="flex items-center gap-1 text-sm">
                    <span>{getCategoryIcon(transaction.category[0] || 'Other')}</span>
                    <span className="text-white/80">{transaction.category[0] || 'Other'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Select Category</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  type="text"
                  placeholder="Search categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white/5 border-white/10 text-white"
                />
              </div>

              {/* Category Grid */}
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                {filteredCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all',
                      selectedCategory === cat
                        ? 'bg-neon-primary/20 text-neon-primary border border-neon-primary/30'
                        : 'bg-white/5 text-white/70 border border-transparent hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <span>{getCategoryIcon(cat)}</span>
                    <span className="truncate">{cat}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Rule Options */}
            {selectedCategory && selectedCategory !== transaction.category[0] && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                  <input
                    type="checkbox"
                    id="createRule"
                    checked={createRule}
                    onChange={(e) => setCreateRule(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-white/5 text-neon-primary focus:ring-neon-primary"
                  />
                  <label htmlFor="createRule" className="flex-1 text-sm">
                    <div className="text-white">Remember for future</div>
                    <div className="text-xs text-white/60">
                      Auto-categorize similar &ldquo;{merchantPattern}&rdquo; transactions
                    </div>
                  </label>
                  <Wand2 className="h-4 w-4 text-neon-primary" />
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                  <input
                    type="checkbox"
                    id="applyToSimilar"
                    checked={applyToSimilar}
                    onChange={(e) => setApplyToSimilar(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-white/5 text-neon-primary focus:ring-neon-primary"
                  />
                  <label htmlFor="applyToSimilar" className="flex-1 text-sm">
                    <div className="text-white">Apply to similar transactions</div>
                    <div className="text-xs text-white/60">
                      Update all matching &ldquo;{merchantPattern}&rdquo; transactions
                    </div>
                  </label>
                </div>

                {/* Match Type Selector (shown when applying to similar) */}
                {applyToSimilar && (
                  <div className="flex gap-2">
                    {(['contains', 'exact', 'starts_with'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setMatchType(type)}
                        className={cn(
                          'flex-1 px-3 py-1.5 text-xs rounded-lg transition-all',
                          matchType === type
                            ? 'bg-neon-primary/20 text-neon-primary border border-neon-primary/30'
                            : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                        )}
                      >
                        {type === 'contains' && 'Contains'}
                        {type === 'exact' && 'Exact'}
                        {type === 'starts_with' && 'Starts With'}
                      </button>
                    ))}
                  </div>
                )}

                {/* Preview Similar */}
                {applyToSimilar && (
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                    {isPreviewLoading ? (
                      <div className="flex items-center gap-2 text-white/60 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Finding similar transactions...
                      </div>
                    ) : preview ? (
                      <div>
                        <div className="text-sm text-white mb-2">
                          <span className="font-medium text-neon-primary">{preview.count}</span>{' '}
                          matching transactions found
                        </div>
                        {preview.transactions.length > 0 && (
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {preview.transactions.slice(0, 5).map((tx) => (
                              <div
                                key={tx.id}
                                className="flex items-center justify-between text-xs text-white/60 py-1"
                              >
                                <span className="truncate flex-1">
                                  {tx.merchantName}
                                </span>
                                <span className="ml-2">
                                  {formatCurrency(Math.abs(tx.amount))}
                                </span>
                              </div>
                            ))}
                            {preview.count > 5 && (
                              <div className="text-xs text-white/40 pt-1">
                                +{preview.count - 5} more
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-white/60">
                        No similar transactions found
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/20 text-red-400 text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-glass-border">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                isLoading ||
                !selectedCategory ||
                selectedCategory === transaction.category[0]
              }
              className="bg-neon-primary hover:bg-neon-primary/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Save {applyToSimilar && preview?.count ? `(${preview.count + 1})` : ''}
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

TransactionCategoryModal.displayName = 'TransactionCategoryModal';
