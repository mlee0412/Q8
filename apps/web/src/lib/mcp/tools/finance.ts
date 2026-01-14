/**
 * Finance MCP Tool Definitions
 * Financial data access and analysis tools for AI agents
 */

import { supabaseAdmin } from '@/lib/supabase/server';
import type { FinanceAccount, FinanceTransaction, RecurringItem } from '@/types/finance';
import { categorizeTransaction, getCategoryIcon } from '@/types/finance';

// ============================================================
// TYPES
// ============================================================

export interface AccountBalanceSummary {
  accounts: Array<{
    id: string;
    name: string;
    type: string;
    institution: string;
    balance: number;
    availableBalance?: number;
    creditLimit?: number;
    currency: string;
    isHidden: boolean;
  }>;
  totals: {
    assets: number;
    liabilities: number;
    netWorth: number;
    liquidAssets: number;
    investments: number;
  };
}

export interface SpendingByCategory {
  period: { start: string; end: string };
  categories: Array<{
    name: string;
    icon: string;
    amount: number;
    transactionCount: number;
    percentOfTotal: number;
    change?: number; // vs previous period
  }>;
  totalSpending: number;
  avgDailySpending: number;
}

export interface CashFlowSummary {
  period: { start: string; end: string };
  income: number;
  expenses: number;
  netFlow: number;
  byDay: Array<{
    date: string;
    income: number;
    expenses: number;
    net: number;
  }>;
  savingsRate: number;
}

export interface UpcomingBill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  category: string;
  isAutoPay: boolean;
  daysUntilDue: number;
}

export interface SpendingAnomaly {
  type: 'unusual_merchant' | 'unusual_amount' | 'unusual_category' | 'unusual_frequency';
  severity: 'low' | 'medium' | 'high';
  description: string;
  transaction?: {
    id: string;
    merchantName: string;
    amount: number;
    date: string;
  };
  details: Record<string, unknown>;
}

export interface TransactionSearchResult {
  transactions: Array<{
    id: string;
    date: string;
    merchantName: string;
    description: string;
    amount: number;
    category: string[];
    accountName: string;
  }>;
  totalCount: number;
  totalAmount: number;
}

export interface NetWorthTrend {
  snapshots: Array<{
    date: string;
    netWorth: number;
    assets: number;
    liabilities: number;
  }>;
  change: {
    absolute: number;
    percentage: number;
    trend: 'up' | 'down' | 'flat';
  };
}

// ============================================================
// TOOL IMPLEMENTATIONS
// ============================================================

/**
 * Get account balances summary with totals
 */
export async function getAccountBalances(userId: string): Promise<AccountBalanceSummary> {
  const { data: accounts, error } = await supabaseAdmin
    .from('finance_accounts')
    .select('*')
    .eq('user_id', userId)
    .order('type', { ascending: true });

  if (error) throw new Error(`Failed to fetch accounts: ${error.message}`);

  const accountList = (accounts || []).map((acc: FinanceAccount) => ({
    id: acc.id,
    name: acc.name,
    type: acc.type,
    institution: acc.institutionName || '',
    balance: acc.balanceCurrent,
    availableBalance: acc.balanceAvailable,
    creditLimit: acc.balanceLimit,
    currency: acc.currency,
    isHidden: acc.isHidden,
  }));

  // Calculate totals
  const assetTypes = ['depository', 'investment', 'cash', 'crypto'];
  const liabilityTypes = ['credit', 'loan'];

  type AccountListItem = typeof accountList[number];

  const assets = accountList
    .filter((a: AccountListItem) => assetTypes.includes(a.type) && !a.isHidden)
    .reduce((sum: number, a: AccountListItem) => sum + a.balance, 0);

  const liabilities = accountList
    .filter((a: AccountListItem) => liabilityTypes.includes(a.type) && !a.isHidden)
    .reduce((sum: number, a: AccountListItem) => sum + Math.abs(a.balance), 0);

  const liquidAssets = accountList
    .filter((a: AccountListItem) => ['depository', 'cash'].includes(a.type) && !a.isHidden)
    .reduce((sum: number, a: AccountListItem) => sum + a.balance, 0);

  const investments = accountList
    .filter((a: AccountListItem) => ['investment', 'crypto'].includes(a.type) && !a.isHidden)
    .reduce((sum: number, a: AccountListItem) => sum + a.balance, 0);

  return {
    accounts: accountList,
    totals: {
      assets,
      liabilities,
      netWorth: assets - liabilities,
      liquidAssets,
      investments,
    },
  };
}

/**
 * Get spending breakdown by category
 */
export async function getSpendingByCategory(
  userId: string,
  days: number = 30
): Promise<SpendingByCategory> {
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const prevStartDate = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000);

  // Current period
  const { data: transactions, error } = await supabaseAdmin
    .from('finance_transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate.toISOString())
    .lt('amount', 0)
    .order('date', { ascending: false });

  if (error) throw new Error(`Failed to fetch transactions: ${error.message}`);

  // Previous period for comparison
  const { data: prevTransactions } = await supabaseAdmin
    .from('finance_transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('date', prevStartDate.toISOString())
    .lt('date', startDate.toISOString())
    .lt('amount', 0);

  // Group by category
  const categoryMap = new Map<string, { amount: number; count: number }>();
  const prevCategoryMap = new Map<string, number>();

  for (const tx of transactions || []) {
    const category = tx.category?.[0] || categorizeTransaction(tx.merchant_name, tx.description);
    const current = categoryMap.get(category) || { amount: 0, count: 0 };
    categoryMap.set(category, {
      amount: current.amount + Math.abs(tx.amount),
      count: current.count + 1,
    });
  }

  for (const tx of prevTransactions || []) {
    const category = tx.category?.[0] || categorizeTransaction(tx.merchant_name, tx.description);
    const current = prevCategoryMap.get(category) || 0;
    prevCategoryMap.set(category, current + Math.abs(tx.amount));
  }

  const totalSpending = Array.from(categoryMap.values()).reduce((sum, c) => sum + c.amount, 0);

  const categories = Array.from(categoryMap.entries())
    .map(([name, { amount, count }]) => {
      const prevAmount = prevCategoryMap.get(name) || 0;
      return {
        name,
        icon: getCategoryIcon(name),
        amount,
        transactionCount: count,
        percentOfTotal: totalSpending > 0 ? (amount / totalSpending) * 100 : 0,
        change: prevAmount > 0 ? ((amount - prevAmount) / prevAmount) * 100 : undefined,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return {
    period: { start: startDate.toISOString(), end: now.toISOString() },
    categories,
    totalSpending,
    avgDailySpending: totalSpending / days,
  };
}

/**
 * Get cash flow summary
 */
export async function getCashFlow(
  userId: string,
  days: number = 30
): Promise<CashFlowSummary> {
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const { data: transactions, error } = await supabaseAdmin
    .from('finance_transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate.toISOString())
    .order('date', { ascending: true });

  if (error) throw new Error(`Failed to fetch transactions: ${error.message}`);

  // Group by day
  const dailyData = new Map<string, { income: number; expenses: number }>();

  for (const tx of transactions || []) {
    const dateKey = tx.date.split('T')[0];
    const current = dailyData.get(dateKey) || { income: 0, expenses: 0 };

    if (tx.amount > 0) {
      current.income += tx.amount;
    } else {
      current.expenses += Math.abs(tx.amount);
    }

    dailyData.set(dateKey, current);
  }

  const income = Array.from(dailyData.values()).reduce((sum, d) => sum + d.income, 0);
  const expenses = Array.from(dailyData.values()).reduce((sum, d) => sum + d.expenses, 0);
  const netFlow = income - expenses;

  const byDay = Array.from(dailyData.entries())
    .map(([date, data]) => ({
      date,
      income: data.income,
      expenses: data.expenses,
      net: data.income - data.expenses,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    period: { start: startDate.toISOString(), end: now.toISOString() },
    income,
    expenses,
    netFlow,
    byDay,
    savingsRate: income > 0 ? (netFlow / income) * 100 : 0,
  };
}

/**
 * Get upcoming bills from recurring transactions
 */
export async function getUpcomingBills(
  userId: string,
  daysAhead: number = 30
): Promise<UpcomingBill[]> {
  const now = new Date();
  const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const { data: recurring, error } = await supabaseAdmin
    .from('finance_recurring')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .lt('amount', 0);

  if (error) throw new Error(`Failed to fetch recurring: ${error.message}`);

  const bills: UpcomingBill[] = [];

  for (const rec of recurring || []) {
    // Calculate next due date based on frequency
    let nextDue = new Date(rec.next_date || rec.start_date);

    // If next due is in the past, calculate the next occurrence
    while (nextDue < now) {
      switch (rec.frequency) {
        case 'daily':
          nextDue.setDate(nextDue.getDate() + 1);
          break;
        case 'weekly':
          nextDue.setDate(nextDue.getDate() + 7);
          break;
        case 'biweekly':
          nextDue.setDate(nextDue.getDate() + 14);
          break;
        case 'monthly':
          nextDue.setMonth(nextDue.getMonth() + 1);
          break;
        case 'yearly':
          nextDue.setFullYear(nextDue.getFullYear() + 1);
          break;
      }
    }

    if (nextDue <= futureDate) {
      const daysUntilDue = Math.ceil((nextDue.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

      bills.push({
        id: rec.id,
        name: rec.description || rec.merchant_name || 'Unknown',
        amount: Math.abs(rec.amount),
        dueDate: nextDue.toISOString(),
        category: rec.category?.[0] || 'Bills',
        isAutoPay: rec.is_auto_pay || false,
        daysUntilDue,
      });
    }
  }

  return bills.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

/**
 * Get recurring transactions
 */
export async function getRecurringTransactions(
  userId: string
): Promise<RecurringItem[]> {
  const { data, error } = await supabaseAdmin
    .from('finance_recurring')
    .select('*')
    .eq('user_id', userId)
    .order('amount', { ascending: true });

  if (error) throw new Error(`Failed to fetch recurring: ${error.message}`);

  return data || [];
}

/**
 * Search transactions with filters
 */
export async function searchTransactions(
  userId: string,
  options: {
    query?: string;
    category?: string;
    minAmount?: number;
    maxAmount?: number;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<TransactionSearchResult> {
  let queryBuilder = supabaseAdmin
    .from('finance_transactions')
    .select('*, finance_accounts!inner(name)')
    .eq('user_id', userId);

  if (options.query) {
    queryBuilder = queryBuilder.or(
      `merchant_name.ilike.%${options.query}%,description.ilike.%${options.query}%`
    );
  }

  if (options.category) {
    queryBuilder = queryBuilder.contains('category', [options.category]);
  }

  if (options.minAmount !== undefined) {
    queryBuilder = queryBuilder.gte('amount', options.minAmount);
  }

  if (options.maxAmount !== undefined) {
    queryBuilder = queryBuilder.lte('amount', options.maxAmount);
  }

  if (options.startDate) {
    queryBuilder = queryBuilder.gte('date', options.startDate);
  }

  if (options.endDate) {
    queryBuilder = queryBuilder.lte('date', options.endDate);
  }

  queryBuilder = queryBuilder
    .order('date', { ascending: false })
    .limit(options.limit || 50);

  const { data, error } = await queryBuilder;

  if (error) throw new Error(`Failed to search transactions: ${error.message}`);

  const transactions = (data || []).map((tx: FinanceTransaction & { finance_accounts: { name: string } }) => ({
    id: tx.id,
    date: tx.date,
    merchantName: tx.merchantName || 'Unknown',
    description: tx.description || '',
    amount: tx.amount,
    category: tx.category,
    accountName: tx.finance_accounts?.name || 'Unknown',
  }));

  type TransactionListItem = typeof transactions[number];
  const totalAmount = transactions.reduce((sum: number, tx: TransactionListItem) => sum + Math.abs(tx.amount), 0);

  return {
    transactions,
    totalCount: transactions.length,
    totalAmount,
  };
}

/**
 * Get net worth trend over time
 */
export async function getNetWorthTrend(
  userId: string,
  days: number = 90
): Promise<NetWorthTrend> {
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const { data: snapshots, error } = await supabaseAdmin
    .from('finance_snapshots')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate.toISOString())
    .order('date', { ascending: true });

  if (error) throw new Error(`Failed to fetch snapshots: ${error.message}`);

  const snapshotData = (snapshots || []).map((s: { date: string; net_worth: number; total_assets: number; total_liabilities: number }) => ({
    date: s.date,
    netWorth: s.net_worth,
    assets: s.total_assets,
    liabilities: s.total_liabilities,
  }));

  // Calculate change
  let change: { absolute: number; percentage: number; trend: 'up' | 'down' | 'flat' } = {
    absolute: 0,
    percentage: 0,
    trend: 'flat',
  };

  if (snapshotData.length >= 2) {
    const first = snapshotData[0]!;
    const last = snapshotData[snapshotData.length - 1]!;
    const absolute = last.netWorth - first.netWorth;
    const percentage = first.netWorth !== 0 ? (absolute / Math.abs(first.netWorth)) * 100 : 0;

    change = {
      absolute,
      percentage,
      trend: absolute > 0 ? 'up' : absolute < 0 ? 'down' : 'flat',
    };
  }

  return { snapshots: snapshotData, change };
}

/**
 * Analyze spending for anomalies
 */
export async function analyzeSpendingAnomalies(
  userId: string,
  days: number = 30
): Promise<SpendingAnomaly[]> {
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const prevStartDate = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000);

  // Get current and historical transactions
  const [currentResult, historicalResult] = await Promise.all([
    supabaseAdmin
      .from('finance_transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString())
      .lt('amount', 0),
    supabaseAdmin
      .from('finance_transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', prevStartDate.toISOString())
      .lt('date', startDate.toISOString())
      .lt('amount', 0),
  ]);

  if (currentResult.error) throw new Error(`Failed: ${currentResult.error.message}`);

  const current = currentResult.data || [];
  const historical = historicalResult.data || [];
  const anomalies: SpendingAnomaly[] = [];

  // Calculate historical averages by merchant
  const merchantAvg = new Map<string, { sum: number; count: number }>();
  for (const tx of historical) {
    const merchant = tx.merchant_name || 'Unknown';
    const data = merchantAvg.get(merchant) || { sum: 0, count: 0 };
    merchantAvg.set(merchant, {
      sum: data.sum + Math.abs(tx.amount),
      count: data.count + 1,
    });
  }

  // Check for unusual amounts
  for (const tx of current) {
    const merchant = tx.merchant_name || 'Unknown';
    const historicalData = merchantAvg.get(merchant);

    if (historicalData && historicalData.count >= 3) {
      const avgAmount = historicalData.sum / historicalData.count;
      const currentAmount = Math.abs(tx.amount);

      if (currentAmount > avgAmount * 2) {
        anomalies.push({
          type: 'unusual_amount',
          severity: currentAmount > avgAmount * 3 ? 'high' : 'medium',
          description: `Unusually high transaction at ${merchant}: ${currentAmount.toFixed(2)} vs average ${avgAmount.toFixed(2)}`,
          transaction: {
            id: tx.id,
            merchantName: merchant,
            amount: currentAmount,
            date: tx.date,
          },
          details: {
            historicalAverage: avgAmount,
            percentageIncrease: ((currentAmount - avgAmount) / avgAmount) * 100,
          },
        });
      }
    }
  }

  // Check for new merchants with high amounts
  type TxRecord = { merchant_name?: string; amount: number; id: string; date: string; category?: string[] };
  const historicalMerchants = new Set(historical.map((tx: TxRecord) => tx.merchant_name));
  for (const tx of current) {
    const merchant = tx.merchant_name;
    const amount = Math.abs(tx.amount);

    if (merchant && !historicalMerchants.has(merchant) && amount > 100) {
      anomalies.push({
        type: 'unusual_merchant',
        severity: amount > 500 ? 'high' : amount > 200 ? 'medium' : 'low',
        description: `New merchant with significant purchase: ${merchant} ($${amount.toFixed(2)})`,
        transaction: {
          id: tx.id,
          merchantName: merchant,
          amount,
          date: tx.date,
        },
        details: { isFirstPurchase: true },
      });
    }
  }

  // Check for unusual category spending
  const historicalCategorySpend = new Map<string, number>();
  for (const tx of historical) {
    const category = tx.category?.[0] || 'Other';
    historicalCategorySpend.set(category, (historicalCategorySpend.get(category) || 0) + Math.abs(tx.amount));
  }

  const currentCategorySpend = new Map<string, number>();
  for (const tx of current) {
    const category = tx.category?.[0] || 'Other';
    currentCategorySpend.set(category, (currentCategorySpend.get(category) || 0) + Math.abs(tx.amount));
  }

  for (const [category, currentSpend] of currentCategorySpend) {
    const historicalSpend = historicalCategorySpend.get(category) || 0;

    if (historicalSpend > 0 && currentSpend > historicalSpend * 1.5) {
      anomalies.push({
        type: 'unusual_category',
        severity: currentSpend > historicalSpend * 2 ? 'high' : 'medium',
        description: `Unusual spending in ${category}: $${currentSpend.toFixed(2)} vs typical $${historicalSpend.toFixed(2)}`,
        details: {
          category,
          currentSpend,
          historicalSpend,
          percentageIncrease: ((currentSpend - historicalSpend) / historicalSpend) * 100,
        },
      });
    }
  }

  return anomalies.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

// ============================================================
// TOOL DEFINITIONS (for OpenAI Agents SDK)
// ============================================================

export const financeToolDefinitions = [
  {
    type: 'function' as const,
    function: {
      name: 'get_account_balances',
      description: 'Get all account balances with totals for net worth, assets, and liabilities',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_spending_by_category',
      description: 'Get spending breakdown by category for a given time period',
      parameters: {
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: 'Number of days to analyze (default: 30)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_cash_flow',
      description: 'Get cash flow summary showing income vs expenses over time',
      parameters: {
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: 'Number of days to analyze (default: 30)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_upcoming_bills',
      description: 'Get list of upcoming bills and recurring payments',
      parameters: {
        type: 'object',
        properties: {
          daysAhead: {
            type: 'number',
            description: 'Number of days ahead to look (default: 30)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_recurring_transactions',
      description: 'Get all recurring transactions (subscriptions, bills, income)',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_transactions',
      description: 'Search transactions by merchant, category, amount, or date range',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search text to match merchant name or description',
          },
          category: {
            type: 'string',
            description: 'Category to filter by',
          },
          minAmount: {
            type: 'number',
            description: 'Minimum transaction amount',
          },
          maxAmount: {
            type: 'number',
            description: 'Maximum transaction amount',
          },
          startDate: {
            type: 'string',
            description: 'Start date (ISO format)',
          },
          endDate: {
            type: 'string',
            description: 'End date (ISO format)',
          },
          limit: {
            type: 'number',
            description: 'Maximum results to return (default: 50)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_net_worth_trend',
      description: 'Get net worth trend over time with change calculations',
      parameters: {
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: 'Number of days of history (default: 90)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'analyze_spending_anomalies',
      description: 'Detect unusual spending patterns and anomalies',
      parameters: {
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: 'Number of days to analyze (default: 30)',
          },
        },
        required: [],
      },
    },
  },
];

/**
 * Execute a finance tool by name
 */
export async function executeFinanceTool(
  userId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    case 'get_account_balances':
      return getAccountBalances(userId);
    case 'get_spending_by_category':
      return getSpendingByCategory(userId, (args.days as number) || 30);
    case 'get_cash_flow':
      return getCashFlow(userId, (args.days as number) || 30);
    case 'get_upcoming_bills':
      return getUpcomingBills(userId, (args.daysAhead as number) || 30);
    case 'get_recurring_transactions':
      return getRecurringTransactions(userId);
    case 'search_transactions':
      return searchTransactions(userId, args as {
        query?: string;
        category?: string;
        minAmount?: number;
        maxAmount?: number;
        startDate?: string;
        endDate?: string;
        limit?: number;
      });
    case 'get_net_worth_trend':
      return getNetWorthTrend(userId, (args.days as number) || 90);
    case 'analyze_spending_anomalies':
      return analyzeSpendingAnomalies(userId, (args.days as number) || 30);
    default:
      throw new Error(`Unknown finance tool: ${toolName}`);
  }
}
