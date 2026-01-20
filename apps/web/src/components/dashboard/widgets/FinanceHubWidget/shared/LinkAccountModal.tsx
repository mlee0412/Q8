'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlaidLink, PlaidLinkOnSuccess, PlaidLinkOptions } from 'react-plaid-link';
import {
  X,
  Building2,
  TrendingUp,
  Wallet,
  CreditCard,
  Loader2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFinanceHub } from '../hooks/useFinanceHub';
import type { AccountType } from '@/types/finance';

interface LinkAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  onSuccess?: () => void;
}

type LinkStep = 'select' | 'plaid' | 'snaptrade' | 'manual' | 'success' | 'error';

const ACCOUNT_TYPES: { type: AccountType; label: string; icon: typeof Building2 }[] = [
  { type: 'depository', label: 'Bank Account', icon: Building2 },
  { type: 'credit', label: 'Credit Card', icon: CreditCard },
  { type: 'investment', label: 'Investment', icon: TrendingUp },
  { type: 'cash', label: 'Cash / Wallet', icon: Wallet },
];

/**
 * LinkAccountModal Component
 *
 * Multi-step modal for linking financial accounts:
 * 1. Select link method (Plaid, SnapTrade, Manual)
 * 2. Complete linking flow
 * 3. Show success/error state
 */
export function LinkAccountModal({
  isOpen,
  onClose,
  userId,
  onSuccess,
}: LinkAccountModalProps) {
  const [step, setStep] = useState<LinkStep>('select');
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Manual account form state
  const [manualName, setManualName] = useState('');
  const [manualType, setManualType] = useState<AccountType>('depository');
  const [manualBalance, setManualBalance] = useState('');
  const [manualInstitution, setManualInstitution] = useState('');

  const {
    createPlaidLinkToken,
    exchangePlaidToken,
    createSnapTradeConnection,
    addManualAccount,
  } = useFinanceHub();

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep('select');
        setLinkToken(null);
        setErrorMessage(null);
        setManualName('');
        setManualType('depository');
        setManualBalance('');
        setManualInstitution('');
      }, 200);
    }
  }, [isOpen]);

  // Initialize Plaid Link
  const handlePlaidSelect = useCallback(async () => {
    if (!userId) {
      setErrorMessage('Please sign in to link accounts');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const token = await createPlaidLinkToken(userId);
      if (token) {
        setLinkToken(token);
        setStep('plaid');
      } else {
        setErrorMessage('Plaid is not configured. Please add API keys or use manual entry.');
      }
    } catch (err) {
      setErrorMessage('Failed to initialize Plaid Link');
    } finally {
      setIsLoading(false);
    }
  }, [userId, createPlaidLinkToken]);

  // Handle Plaid Link success
  const onPlaidSuccess: PlaidLinkOnSuccess = useCallback(
    async (publicToken, metadata) => {
      if (!userId) {
        setStep('error');
        setErrorMessage('User session expired');
        return;
      }

      setIsLoading(true);
      try {
        const success = await exchangePlaidToken(publicToken, userId, metadata);
        if (success) {
          setStep('success');
          onSuccess?.();
        } else {
          setStep('error');
          setErrorMessage('Failed to link account');
        }
      } catch (err) {
        setStep('error');
        setErrorMessage('Failed to link account');
      } finally {
        setIsLoading(false);
      }
    },
    [userId, exchangePlaidToken, onSuccess]
  );

  // Plaid Link configuration
  const plaidConfig: PlaidLinkOptions = {
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: (err) => {
      if (err) {
        logger.error('Plaid Link error', { error: err, displayMessage: err.display_message });
        setErrorMessage(err.display_message || 'Connection was interrupted');
      }
      setStep('select');
    },
  };

  const { open: openPlaidLink, ready: plaidReady } = usePlaidLink(plaidConfig);

  // Open Plaid Link when ready
  useEffect(() => {
    if (step === 'plaid' && plaidReady && linkToken) {
      openPlaidLink();
    }
  }, [step, plaidReady, linkToken, openPlaidLink]);

  // Handle SnapTrade connection
  const handleSnapTradeSelect = useCallback(async () => {
    if (!userId) {
      setErrorMessage('Please sign in to link accounts');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const redirectUrl = await createSnapTradeConnection(userId);
      if (redirectUrl) {
        // Open SnapTrade in a new window
        window.open(redirectUrl, '_blank', 'width=600,height=700');
        setStep('snaptrade');
      } else {
        setErrorMessage('SnapTrade is not configured. Please add API keys or use manual entry.');
      }
    } catch (err) {
      setErrorMessage('Failed to connect to SnapTrade');
    } finally {
      setIsLoading(false);
    }
  }, [userId, createSnapTradeConnection]);

  // Handle manual account submission
  const handleManualSubmit = useCallback(async () => {
    if (!userId) {
      setErrorMessage('Please sign in to add accounts');
      return;
    }

    if (!manualName.trim()) {
      setErrorMessage('Please enter an account name');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await addManualAccount(userId, {
        name: manualName.trim(),
        type: manualType,
        balanceCurrent: parseFloat(manualBalance) || 0,
        institutionName: manualInstitution.trim() || undefined,
        isManual: true,
      });

      if (result) {
        setStep('success');
        onSuccess?.();
      } else {
        setErrorMessage('Failed to add account');
      }
    } catch (err) {
      setErrorMessage('Failed to add account');
    } finally {
      setIsLoading(false);
    }
  }, [userId, manualName, manualType, manualBalance, manualInstitution, addManualAccount, onSuccess]);

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
          className="relative w-full max-w-md mx-4 bg-surface-3 backdrop-blur-xl border border-border-subtle rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
            <h2 className="text-lg font-semibold">
              {step === 'select' && 'Link Account'}
              {step === 'plaid' && 'Connecting...'}
              {step === 'snaptrade' && 'Connecting Brokerage'}
              {step === 'manual' && 'Add Manual Account'}
              {step === 'success' && 'Account Linked!'}
              {step === 'error' && 'Connection Failed'}
            </h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-6">
            {/* Error message */}
            {errorMessage && step !== 'error' && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-danger text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {errorMessage}
              </div>
            )}

            {/* Step: Select link method */}
            {step === 'select' && (
              <div className="space-y-3">
                <p className="text-sm text-text-muted mb-4">
                  Choose how you would like to add your account
                </p>

                {/* Plaid - Banks & Credit Cards */}
                <button
                  onClick={handlePlaidSelect}
                  disabled={isLoading}
                  className="w-full p-4 rounded-xl bg-surface-3 border border-border-subtle hover:border-neon-primary/50 transition-all text-left flex items-center gap-4"
                >
                  <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Bank & Credit Cards</div>
                    <div className="text-xs text-text-muted">
                      Connect via Plaid (11,000+ institutions)
                    </div>
                  </div>
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                </button>

                {/* SnapTrade - Investments */}
                <button
                  onClick={handleSnapTradeSelect}
                  disabled={isLoading}
                  className="w-full p-4 rounded-xl bg-surface-3 border border-border-subtle hover:border-neon-primary/50 transition-all text-left flex items-center gap-4"
                >
                  <div className="h-12 w-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Investment Accounts</div>
                    <div className="text-xs text-text-muted">
                      Connect brokerages via SnapTrade
                    </div>
                  </div>
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                </button>

                {/* Manual Entry */}
                <button
                  onClick={() => setStep('manual')}
                  className="w-full p-4 rounded-xl bg-surface-3 border border-border-subtle hover:border-neon-primary/50 transition-all text-left flex items-center gap-4"
                >
                  <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Wallet className="h-6 w-6 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Manual Entry</div>
                    <div className="text-xs text-text-muted">
                      Add cash, crypto, or other accounts manually
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* Step: Plaid connecting */}
            {step === 'plaid' && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-neon-primary" />
                <p className="text-text-muted">
                  Opening secure connection...
                </p>
              </div>
            )}

            {/* Step: SnapTrade connecting */}
            {step === 'snaptrade' && (
              <div className="text-center py-8">
                <ExternalLink className="h-8 w-8 mx-auto mb-4 text-green-400" />
                <p className="font-medium mb-2">Complete connection in the new window</p>
                <p className="text-sm text-text-muted mb-4">
                  After connecting, close that window and click below to refresh.
                </p>
                <Button onClick={() => { onSuccess?.(); onClose(); }}>
                  Done - Refresh Accounts
                </Button>
              </div>
            )}

            {/* Step: Manual entry form */}
            {step === 'manual' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-text-muted mb-1.5">
                    Account Name
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., Cash Wallet, Bitcoin"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="bg-surface-3 border-border-subtle"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm text-text-muted mb-1.5">
                    Account Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {ACCOUNT_TYPES.map(({ type, label, icon: Icon }) => (
                      <button
                        key={type}
                        onClick={() => setManualType(type)}
                        className={cn(
                          'p-3 rounded-lg border text-left flex items-center gap-2 transition-all',
                          manualType === type
                            ? 'bg-neon-primary/20 border-neon-primary/50 text-neon-primary'
                            : 'bg-surface-3 border-border-subtle hover:border-neon-primary/30'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-sm">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-text-muted mb-1.5">
                      Current Balance
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={manualBalance}
                      onChange={(e) => setManualBalance(e.target.value)}
                      className="bg-surface-3 border-border-subtle"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-1.5">
                      Institution (optional)
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g., Coinbase"
                      value={manualInstitution}
                      onChange={(e) => setManualInstitution(e.target.value)}
                      className="bg-surface-3 border-border-subtle"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setStep('select')}
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1 bg-neon-primary hover:bg-neon-primary/90"
                    onClick={handleManualSubmit}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Add Account'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Step: Success */}
            {step === 'success' && (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-400" />
                <p className="font-medium mb-2">Account linked successfully!</p>
                <p className="text-sm text-text-muted mb-4">
                  Your account data will sync automatically.
                </p>
                <Button onClick={onClose}>Done</Button>
              </div>
            )}

            {/* Step: Error */}
            {step === 'error' && (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-danger" />
                <p className="font-medium mb-2">Connection Failed</p>
                <p className="text-sm text-text-muted mb-4">
                  {errorMessage || 'Something went wrong. Please try again.'}
                </p>
                <div className="flex gap-3 justify-center">
                  <Button variant="ghost" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button onClick={() => setStep('select')}>Try Again</Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

LinkAccountModal.displayName = 'LinkAccountModal';
