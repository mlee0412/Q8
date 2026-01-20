'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  DollarSign,
  CreditCard,
  PiggyBank,
  BarChart3,
  RefreshCw,
  Send,
  MessageSquare,
  Wrench,
  Bot,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useNetWorth,
  useLiquidAssets,
  useTotalLiabilities,
  useFilteredTransactions,
  useRecurring,
} from '@/lib/stores/financehub';
import { formatCurrency } from '@/types/finance';
import { useAuth } from '@/hooks/useAuth';

interface AIInsightsProps {
  className?: string;
}

interface Insight {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'urgent' | 'success';
  title: string;
  message: string;
  action?: string;
  icon: typeof TrendingUp;
  data?: Record<string, unknown>;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolsUsed?: string[];
}

const SEVERITY_COLORS = {
  info: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
  urgent: 'bg-red-500/10 border-red-500/20 text-red-400',
  success: 'bg-green-500/10 border-green-500/20 text-green-400',
};

const SEVERITY_ICONS = {
  info: Lightbulb,
  warning: AlertTriangle,
  urgent: AlertTriangle,
  success: CheckCircle,
};

const TYPE_ICONS: Record<string, typeof TrendingUp> = {
  spending: TrendingDown,
  spending_alert: TrendingDown,
  savings: PiggyBank,
  debt: CreditCard,
  debt_strategy: CreditCard,
  bills: DollarSign,
  bill_reminder: DollarSign,
  subscriptions: BarChart3,
  subscription_review: BarChart3,
  general: Sparkles,
  goal_progress: TrendingUp,
  budget_warning: AlertTriangle,
  anomaly_detected: AlertTriangle,
};

const SUGGESTED_QUESTIONS = [
  'Can I afford a $500 purchase?',
  'How much am I spending on food?',
  'What bills are coming up?',
  'How can I save more?',
  "What's my cash flow this month?",
  'Show me my recurring expenses',
];

/**
 * AIInsights Component
 *
 * Displays AI-generated financial insights and provides
 * a real AI-powered chat interface for financial questions.
 */
export function AIInsights({ className }: AIInsightsProps) {
  const { userId } = useAuth();

  const netWorth = useNetWorth();
  const liquidAssets = useLiquidAssets();
  const totalLiabilities = useTotalLiabilities();
  const transactions = useFilteredTransactions();
  const recurring = useRecurring();

  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'insights' | 'chat'>('insights');
  const [aiError, setAiError] = useState<string | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, isSending]);

  // Generate insights from both local data and AI API
  const generateInsights = useCallback(async () => {
    setIsLoading(true);
    const newInsights: Insight[] = [];

    // --- LOCAL INSIGHTS (instant, always available) ---

    // Calculate spending by category for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTransactions = transactions.filter(
      (tx) => new Date(tx.date) >= thirtyDaysAgo && tx.amount < 0
    );

    const totalSpending = recentTransactions.reduce(
      (sum, tx) => sum + Math.abs(tx.amount),
      0
    );

    // Group by category
    const categorySpending: Record<string, number> = {};
    for (const tx of recentTransactions) {
      const category = tx.category[0] || 'Other';
      categorySpending[category] = (categorySpending[category] || 0) + Math.abs(tx.amount);
    }

    // Sort categories by spending
    const sortedCategories = Object.entries(categorySpending).sort((a, b) => b[1] - a[1]);
    const topCategory = sortedCategories[0];

    // Insight: Top spending category
    if (topCategory && totalSpending > 0) {
      const percentage = ((topCategory[1] / totalSpending) * 100).toFixed(0);
      if (parseInt(percentage) > 35) {
        newInsights.push({
          id: 'local-top-category',
          type: 'spending',
          severity: 'warning',
          title: 'High Category Spending',
          message: `${topCategory[0]} accounts for ${percentage}% of your monthly spending (${formatCurrency(topCategory[1])}).`,
          action: 'Consider setting a budget for this category.',
          icon: TrendingDown,
        });
      }
    }

    // Insight: Savings rate
    const savingsRate = liquidAssets > 0 ? (liquidAssets / (liquidAssets + totalSpending)) * 100 : 0;
    if (savingsRate < 20 && liquidAssets > 0) {
      newInsights.push({
        id: 'local-savings-rate',
        type: 'savings',
        severity: 'info',
        title: 'Build Your Savings',
        message: `Your liquid savings represent ${savingsRate.toFixed(0)}% of your monthly capacity.`,
        action: 'Aim for 3-6 months of expenses in an emergency fund.',
        icon: PiggyBank,
      });
    } else if (savingsRate >= 30) {
      newInsights.push({
        id: 'local-savings-healthy',
        type: 'savings',
        severity: 'success',
        title: 'Healthy Savings',
        message: `Great job! You have a solid savings buffer of ${formatCurrency(liquidAssets)}.`,
        icon: CheckCircle,
      });
    }

    // Insight: Debt ratio
    if (totalLiabilities > 0) {
      const debtRatio = totalLiabilities / (netWorth + totalLiabilities);
      if (debtRatio > 0.3) {
        newInsights.push({
          id: 'local-debt-ratio',
          type: 'debt',
          severity: 'warning',
          title: 'Debt Awareness',
          message: `Your debt-to-asset ratio is ${(debtRatio * 100).toFixed(0)}% (${formatCurrency(totalLiabilities)} in liabilities).`,
          action: 'Focus on paying down high-interest debt first.',
          icon: CreditCard,
        });
      }
    }

    // Insight: Upcoming bills
    const upcomingBills = recurring.filter((r) => {
      if (r.isIncome || !r.isActive) return false;
      const dueDate = new Date(r.nextDueDate);
      const today = new Date();
      const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil <= 7 && daysUntil >= 0;
    });

    if (upcomingBills.length > 0) {
      const totalDue = upcomingBills.reduce((sum, b) => sum + b.amount, 0);
      newInsights.push({
        id: 'local-upcoming-bills',
        type: 'bills',
        severity: upcomingBills.length > 3 ? 'warning' : 'info',
        title: 'Upcoming Bills',
        message: `You have ${upcomingBills.length} bill(s) due in the next 7 days totaling ${formatCurrency(totalDue)}.`,
        action: 'Make sure you have sufficient funds available.',
        icon: DollarSign,
      });
    }

    // Insight: Recurring subscriptions
    const subscriptions = recurring.filter((r) => !r.isIncome && r.isActive && r.frequency === 'monthly');
    if (subscriptions.length > 5) {
      const monthlyCost = subscriptions.reduce((sum, s) => sum + s.amount, 0);
      newInsights.push({
        id: 'local-subscriptions',
        type: 'subscriptions',
        severity: 'info',
        title: 'Subscription Review',
        message: `You have ${subscriptions.length} active subscriptions costing ${formatCurrency(monthlyCost)}/month.`,
        action: 'Review these to see if any can be cancelled.',
        icon: BarChart3,
      });
    }

    // --- AI-POWERED INSIGHTS (from API) ---
    if (userId) {
      try {
        const response = await fetch(`/api/finance/ai/insights?userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          interface RawAPIInsight {
            type: string;
            severity: 'info' | 'warning' | 'urgent';
            title: string;
            message: string;
            action?: string;
            data?: Record<string, unknown>;
          }
          const apiInsights: Insight[] = (data.insights || []).map((insight: RawAPIInsight, idx: number) => ({
            ...insight,
            id: `api-${insight.type}-${idx}`,
            icon: TYPE_ICONS[insight.type] || Sparkles,
          }));

          // Merge with local insights, avoiding duplicates by type
          const localTypes = new Set(newInsights.map(i => i.type));
          for (const apiInsight of apiInsights) {
            if (!localTypes.has(apiInsight.type)) {
              newInsights.push(apiInsight);
            }
          }
        }
      } catch (err) {
        logger.warn('Could not fetch AI insights', { error: err, userId });
        // Continue with local insights only
      }
    }

    // Sort by severity (urgent first)
    const severityOrder: Record<string, number> = { urgent: 0, warning: 1, info: 2, success: 3 };
    newInsights.sort((a, b) => (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99));

    setInsights(newInsights);
    setIsLoading(false);
  }, [transactions, recurring, netWorth, liquidAssets, totalLiabilities, userId]);

  // Generate insights on mount
  useEffect(() => {
    generateInsights();
  }, [generateInsights]);

  // Handle chat message send - REAL AI
  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || isSending || !userId) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsSending(true);
    setAiError(null);

    try {
      // Build conversation history for context
      const conversationHistory = chatMessages.slice(-8).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch('/api/finance/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          message: userMessage.content,
          conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.response || 'I apologize, I could not generate a response.',
        timestamp: new Date(),
        toolsUsed: data.toolsUsed || [],
      };

      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      logger.error('Chat error', { error: err, userId, messageContent: userMessage.content });
      setAiError('Failed to get AI response. Using local fallback.');

      // Fallback to local response
      const fallbackResponse = generateLocalResponse(userMessage.content, {
        netWorth,
        liquidAssets,
        totalLiabilities,
        monthlySpending: transactions
          .filter((tx) => tx.amount < 0 && new Date(tx.date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
          .reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
      });

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: fallbackResponse,
        timestamp: new Date(),
      };

      setChatMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }, [inputMessage, isSending, userId, chatMessages, netWorth, liquidAssets, totalLiabilities, transactions]);

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
    inputRef.current?.focus();
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-neon-primary" />
            AI Financial Advisor
          </h3>
          <p className="text-sm text-white/60">
            Personalized insights and advice powered by AI
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-surface-3 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('insights')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-all',
              activeTab === 'insights'
                ? 'bg-neon-primary/20 text-neon-primary'
                : 'text-white/60 hover:text-white'
            )}
          >
            Insights
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-all flex items-center gap-1',
              activeTab === 'chat'
                ? 'bg-neon-primary/20 text-neon-primary'
                : 'text-white/60 hover:text-white'
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Chat
          </button>
        </div>
      </div>

      {/* Insights Tab */}
      {activeTab === 'insights' && (
        <div className="space-y-4">
          {/* Refresh button */}
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={generateInsights}
              disabled={isLoading}
              className="text-white/60"
            >
              <RefreshCw className={cn('h-4 w-4 mr-1', isLoading && 'animate-spin')} />
              Refresh
            </Button>
          </div>

          {/* Insights list */}
          <div className="grid gap-3">
            <AnimatePresence mode="popLayout">
              {insights.map((insight, index) => {
                const SeverityIcon = SEVERITY_ICONS[insight.severity as keyof typeof SEVERITY_ICONS] || Lightbulb;
                const TypeIcon = insight.icon || TYPE_ICONS[insight.type] || Sparkles;

                return (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'p-4 rounded-xl border',
                      SEVERITY_COLORS[insight.severity as keyof typeof SEVERITY_COLORS] || SEVERITY_COLORS.info
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-white/5">
                        <TypeIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{insight.title}</span>
                          <SeverityIcon className="h-4 w-4" />
                          {insight.id.startsWith('api-') && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-neon-primary/20 text-neon-primary">
                              AI
                            </span>
                          )}
                        </div>
                        <p className="text-sm opacity-90">{insight.message}</p>
                        {insight.action && (
                          <p className="text-xs mt-2 opacity-70">
                            💡 {insight.action}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {insights.length === 0 && !isLoading && (
              <div className="text-center py-12 text-white/50">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No insights available yet.</p>
                <p className="text-sm">Add more transactions to get personalized advice.</p>
              </div>
            )}

            {isLoading && (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 mx-auto mb-2 text-neon-primary animate-spin" />
                <p className="text-sm text-white/60">Analyzing your finances...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <div className="flex flex-col h-[60vh]">
          {/* AI Error banner */}
          {aiError && (
            <div className="mb-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
              {aiError}
            </div>
          )}

          {/* Chat messages */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto space-y-4 p-4 rounded-xl bg-surface-3/30 border border-border-subtle mb-4"
          >
            {chatMessages.length === 0 && (
              <div className="text-center py-8 text-white/50">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-4">Ask me anything about your finances!</p>
                <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto">
                  {SUGGESTED_QUESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="text-xs px-3 py-1.5 rounded-full bg-surface-3 border border-border-subtle hover:border-neon-primary/50 hover:bg-neon-primary/10 transition-all"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chatMessages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'max-w-[85%]',
                  msg.role === 'user' ? 'ml-auto' : 'mr-auto'
                )}
              >
                <div
                  className={cn(
                    'p-3 rounded-2xl',
                    msg.role === 'user'
                      ? 'bg-neon-primary/20 text-white rounded-br-sm'
                      : 'bg-surface-3 border border-border-subtle rounded-bl-sm'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1 text-xs opacity-60">
                    {msg.role === 'user' ? (
                      <>
                        <User className="h-3 w-3" />
                        You
                      </>
                    ) : (
                      <>
                        <Bot className="h-3 w-3" />
                        Financial Advisor
                      </>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                  {/* Show tools used */}
                  {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/10">
                      <div className="flex items-center gap-1 text-xs text-white/40">
                        <Wrench className="h-3 w-3" />
                        <span>Used: {msg.toolsUsed.join(', ')}</span>
                      </div>
                    </div>
                  )}

                  <span className="text-xs opacity-50 mt-1 block">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </motion.div>
            ))}

            {isSending && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-text-muted"
              >
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-neon-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-neon-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-neon-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm">Analyzing your finances...</span>
              </motion.div>
            )}
          </div>

          {/* Suggested follow-ups after conversation starts */}
          {chatMessages.length > 0 && chatMessages.length < 6 && !isSending && (
            <div className="flex flex-wrap gap-2 mb-3">
              {SUGGESTED_QUESTIONS.slice(0, 3)
                .filter((q) => !chatMessages.some((m) => m.content.includes(q)))
                .map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="text-xs px-2 py-1 rounded-full bg-surface-3/50 border border-border-subtle hover:border-neon-primary/50 transition-all text-white/60 hover:text-white"
                  >
                    {suggestion}
                  </button>
                ))}
            </div>
          )}

          {/* Chat input */}
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder={userId ? "Ask about your finances..." : "Please sign in to use AI chat"}
              className="flex-1 bg-surface-3 border-border-subtle"
              disabled={isSending || !userId}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isSending || !userId}
              className="bg-neon-primary hover:bg-neon-primary/90"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {!userId && (
            <p className="text-xs text-white/40 mt-2 text-center">
              Sign in to chat with your AI Financial Advisor
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Generate a local fallback response when AI API is unavailable
 */
function generateLocalResponse(
  question: string,
  context: {
    netWorth: number;
    liquidAssets: number;
    totalLiabilities: number;
    monthlySpending: number;
  }
): string {
  const q = question.toLowerCase();

  if (q.includes('afford') || q.includes('buy') || q.includes('purchase')) {
    const match = question.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    const amount = match && match[1] ? parseFloat(match[1].replace(',', '')) : 0;

    if (amount > 0) {
      const safeAmount = context.liquidAssets * 0.3;
      if (amount <= safeAmount) {
        return `Based on your current finances, you can comfortably afford a ${formatCurrency(amount)} purchase. You have ${formatCurrency(context.liquidAssets)} in liquid assets, and this purchase would use about ${((amount / context.liquidAssets) * 100).toFixed(1)}% of your available funds.`;
      } else if (amount <= context.liquidAssets) {
        return `A ${formatCurrency(amount)} purchase is possible but would use ${((amount / context.liquidAssets) * 100).toFixed(1)}% of your liquid assets. Consider whether this is a priority and if you have an emergency fund in place.`;
      } else {
        return `A ${formatCurrency(amount)} purchase exceeds your current liquid assets of ${formatCurrency(context.liquidAssets)}. You might want to save up or consider financing options carefully.`;
      }
    }
  }

  if (q.includes('spend') || q.includes('spending')) {
    return `Over the last 30 days, you have spent approximately ${formatCurrency(context.monthlySpending)}. To better understand where your money is going, check the Spending Breakdown tab.`;
  }

  if (q.includes('bill') || q.includes('due')) {
    return `To see your upcoming bills, check the Recurring tab in the main view. It shows all your scheduled payments with due dates and amounts.`;
  }

  if (q.includes('save') || q.includes('saving')) {
    const suggestedSavings = context.monthlySpending * 0.2;
    return `To save more, aim to set aside at least 20% of your income each month. Based on your spending of ${formatCurrency(context.monthlySpending)}, try to save around ${formatCurrency(suggestedSavings)} monthly. Consider automating transfers to a savings account right after payday.`;
  }

  if (q.includes('net worth') || q.includes('worth')) {
    return `Your current net worth is ${formatCurrency(context.netWorth)}. This includes ${formatCurrency(context.liquidAssets)} in liquid assets minus ${formatCurrency(context.totalLiabilities)} in liabilities. Track this over time to see your financial progress.`;
  }

  if (q.includes('debt') || q.includes('owe')) {
    if (context.totalLiabilities > 0) {
      return `You currently have ${formatCurrency(context.totalLiabilities)} in total liabilities. Focus on paying off high-interest debt first (like credit cards) before tackling lower-interest debt. Consider the avalanche or snowball method for debt repayment.`;
    }
    return `Great news! You currently have no recorded liabilities. Keep it up by avoiding high-interest debt and only borrowing when necessary.`;
  }

  if (q.includes('cash flow') || q.includes('cashflow')) {
    return `Your cash flow analysis shows ${formatCurrency(context.monthlySpending)} in expenses this month. Check the Cash Flow chart for a detailed breakdown of income vs. expenses over time.`;
  }

  if (q.includes('recurring') || q.includes('subscription')) {
    return `To see all your recurring expenses and subscriptions, check the Recurring tab. You can manage and track your regular payments there.`;
  }

  return `I understand you are asking about "${question}". Your current financial snapshot shows:\n\n• Net Worth: ${formatCurrency(context.netWorth)}\n• Liquid Assets: ${formatCurrency(context.liquidAssets)}\n• Monthly Spending: ${formatCurrency(context.monthlySpending)}\n\nFor more detailed analysis, try asking specific questions like "Can I afford $X?" or "How much am I spending on food?"`;
}

AIInsights.displayName = 'AIInsights';
