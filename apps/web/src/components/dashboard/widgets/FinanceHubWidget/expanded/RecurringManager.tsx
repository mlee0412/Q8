'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Edit2,
  Trash2,
  Calendar,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Clock,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useFinanceHubStore,
  useFinanceRecurring,
  useFinanceAccounts,
} from '@/lib/stores/financehub';
import { AmountDisplay } from '../shared/AmountDisplay';
import type { RecurringItem, RecurringFrequency } from '@/types/finance';
import { getDaysUntilDue, formatCurrency } from '@/types/finance';

interface RecurringManagerProps {
  className?: string;
}

const FREQUENCY_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

/**
 * RecurringManager Component
 *
 * Manages recurring expenses and income (bills, subscriptions, salary, etc.)
 * Features:
 * - List view with due dates and amounts
 * - Add/Edit/Delete recurring items
 * - Mark as confirmed when paid
 * - Visual indicators for overdue items
 */
export function RecurringManager({ className }: RecurringManagerProps) {
  const recurring = useFinanceRecurring();
  const accounts = useFinanceAccounts();
  const { addRecurring, updateRecurring, deleteRecurring } = useFinanceHubStore();

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringItem | null>(null);

  // Separate bills and income
  const bills = recurring.filter((r) => !r.isIncome && r.isActive);
  const income = recurring.filter((r) => r.isIncome && r.isActive);

  const handleEdit = (item: RecurringItem) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this recurring item?')) {
      deleteRecurring(id);
    }
  };

  const handleConfirmPayment = (item: RecurringItem) => {
    const today = new Date().toISOString().slice(0, 10);
    // Calculate next due date based on frequency
    const nextDue = calculateNextDueDate(item.nextDueDate, item.frequency);
    
    updateRecurring(item.id, {
      lastConfirmedDate: today,
      nextDueDate: nextDue,
    });
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Recurring</h3>
          <p className="text-sm text-white/60">
            Manage your bills, subscriptions, and recurring income
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-neon-primary hover:bg-neon-primary/90"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Bills Section */}
      <div>
        <h4 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Bills & Expenses ({bills.length})
        </h4>
        
        {bills.length === 0 ? (
          <div className="text-center py-8 text-white/50 text-sm">
            No recurring bills. Add your first one!
          </div>
        ) : (
          <div className="space-y-2">
            {bills
              .sort((a, b) => getDaysUntilDue(a.nextDueDate) - getDaysUntilDue(b.nextDueDate))
              .map((item) => (
                <RecurringItemCard
                  key={item.id}
                  item={item}
                  onEdit={() => handleEdit(item)}
                  onDelete={() => handleDelete(item.id)}
                  onConfirm={() => handleConfirmPayment(item)}
                />
              ))}
          </div>
        )}
      </div>

      {/* Income Section */}
      <div>
        <h4 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Recurring Income ({income.length})
        </h4>
        
        {income.length === 0 ? (
          <div className="text-center py-8 text-white/50 text-sm">
            No recurring income. Add salary, dividends, etc.
          </div>
        ) : (
          <div className="space-y-2">
            {income.map((item) => (
              <RecurringItemCard
                key={item.id}
                item={item}
                onEdit={() => handleEdit(item)}
                onDelete={() => handleDelete(item.id)}
                onConfirm={() => handleConfirmPayment(item)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      <RecurringFormModal
        isOpen={showForm}
        onClose={handleFormClose}
        editItem={editingItem}
        accounts={accounts}
        onSave={(item) => {
          if (editingItem) {
            updateRecurring(editingItem.id, item);
          } else {
            addRecurring(item as RecurringItem);
          }
          handleFormClose();
        }}
      />
    </div>
  );
}

/**
 * Individual recurring item card
 */
function RecurringItemCard({
  item,
  onEdit,
  onDelete,
  onConfirm,
}: {
  item: RecurringItem;
  onEdit: () => void;
  onDelete: () => void;
  onConfirm: () => void;
}) {
  const daysUntil = getDaysUntilDue(item.nextDueDate);
  const isOverdue = daysUntil < 0;
  const isDueSoon = daysUntil >= 0 && daysUntil <= 3;

  const getStatusColor = () => {
    if (isOverdue) return 'border-red-500/30 bg-red-500/5';
    if (isDueSoon) return 'border-yellow-500/30 bg-yellow-500/5';
    return 'border-border-subtle bg-surface-3/50';
  };

  const getStatusIcon = () => {
    if (isOverdue) return <AlertTriangle className="h-4 w-4 text-red-400" />;
    if (isDueSoon) return <Clock className="h-4 w-4 text-yellow-400" />;
    return <Calendar className="h-4 w-4 text-white/50" />;
  };

  const getDueText = () => {
    if (isOverdue) return `${Math.abs(daysUntil)} days overdue`;
    if (daysUntil === 0) return 'Due today';
    if (daysUntil === 1) return 'Due tomorrow';
    return `Due in ${daysUntil} days`;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center gap-4 p-4 rounded-xl border transition-all',
        getStatusColor()
      )}
    >
      {/* Status Icon */}
      <div className="flex-shrink-0">{getStatusIcon()}</div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{item.name}</span>
          {item.category[0] && (
            <span className="text-xs text-white/60 bg-surface-3 px-2 py-0.5 rounded">
              {item.category[0]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-white/60 mt-0.5">
          <span className={cn(isOverdue && 'text-red-400', isDueSoon && 'text-yellow-400')}>
            {getDueText()}
          </span>
          <span>•</span>
          <span className="capitalize">{item.frequency}</span>
        </div>
      </div>

      {/* Amount */}
      <div className="flex-shrink-0 text-right">
        <AmountDisplay
          amount={item.isIncome ? item.amount : -item.amount}
          colorize
          size="sm"
          className="font-semibold"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {!item.isIncome && (isDueSoon || isOverdue) && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-green-400 hover:text-green-300 hover:bg-green-500/10"
            onClick={onConfirm}
            title="Mark as paid"
          >
            <CheckCircle className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onEdit}
          title="Edit"
        >
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
          onClick={onDelete}
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}

/**
 * Form modal for adding/editing recurring items
 */
function RecurringFormModal({
  isOpen,
  onClose,
  editItem,
  accounts,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  editItem: RecurringItem | null;
  accounts: { id: string; name: string }[];
  onSave: (item: Partial<RecurringItem>) => void;
}) {
  const [name, setName] = useState(editItem?.name || '');
  const [amount, setAmount] = useState(editItem?.amount.toString() || '');
  const [frequency, setFrequency] = useState<RecurringFrequency>(editItem?.frequency || 'monthly');
  const [category, setCategory] = useState(editItem?.category[0] || '');
  const [nextDueDate, setNextDueDate] = useState(
    editItem?.nextDueDate || new Date().toISOString().slice(0, 10)
  );
  const [accountId, setAccountId] = useState(editItem?.accountId || '');
  const [isIncome, setIsIncome] = useState(editItem?.isIncome || false);
  const [autoConfirm, setAutoConfirm] = useState(editItem?.autoConfirm || false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    onSave({
      id: editItem?.id || `recurring-${Date.now()}`,
      userId: 'current-user',
      name: name.trim(),
      amount: parseFloat(amount),
      frequency,
      category: category ? [category] : [],
      startDate: editItem?.startDate || nextDueDate,
      nextDueDate,
      accountId: accountId || undefined,
      isIncome,
      autoConfirm,
      reminderDays: 3,
      isActive: true,
      missedCount: editItem?.missedCount || 0,
      createdAt: editItem?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  if (!isOpen) return null;

  return (
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
            {editItem ? 'Edit Recurring' : 'Add Recurring'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-danger text-sm">
              {error}
            </div>
          )}

          {/* Type Toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsIncome(false)}
              className={cn(
                'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all',
                !isIncome
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-surface-3 text-white/60 border border-border-subtle'
              )}
            >
              Bill / Expense
            </button>
            <button
              type="button"
              onClick={() => setIsIncome(true)}
              className={cn(
                'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all',
                isIncome
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-surface-3 text-white/60 border border-border-subtle'
              )}
            >
              Income
            </button>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Name</label>
            <Input
              type="text"
              placeholder="e.g., Rent, Netflix, Salary"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-surface-3 border-border-subtle"
              autoFocus
            />
          </div>

          {/* Amount & Frequency */}
          <div className="grid grid-cols-2 gap-4">
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
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                className="w-full h-10 px-3 rounded-md bg-surface-3 border border-border-subtle text-sm focus:outline-none focus:ring-2 focus:ring-neon-primary"
              >
                {FREQUENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Next Due Date & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Next Due</label>
              <Input
                type="date"
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
                className="bg-surface-3 border-border-subtle"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1.5">Category</label>
              <Input
                type="text"
                placeholder="e.g., Rent, Subscription"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-surface-3 border-border-subtle"
              />
            </div>
          </div>

          {/* Account */}
          {accounts.length > 0 && (
            <div>
              <label className="block text-sm text-white/60 mb-1.5">
                Account (optional)
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-surface-3 border border-border-subtle text-sm focus:outline-none focus:ring-2 focus:ring-neon-primary"
              >
                <option value="">No specific account</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Auto-confirm toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoConfirm}
              onChange={(e) => setAutoConfirm(e.target.checked)}
              className="w-4 h-4 rounded border-border-subtle bg-surface-3"
            />
            <span className="text-sm text-white/60">
              Auto-confirm on due date (for automatic payments)
            </span>
          </label>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-neon-primary hover:bg-neon-primary/90">
              {editItem ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

/**
 * Calculate next due date based on frequency
 */
function calculateNextDueDate(currentDue: string, frequency: RecurringFrequency): string {
  const date = new Date(currentDue);
  
  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  
  return date.toISOString().slice(0, 10);
}

RecurringManager.displayName = 'RecurringManager';
