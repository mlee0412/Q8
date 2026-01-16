/**
 * Finance Tool Executor
 * Implements the logic for each finance AI tool
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Type definitions for database records
interface FinanceAccount {
  id: string;
  user_id: string;
  name: string;
  type: string;
  balance_current: string;
  institution_name?: string;
  is_hidden: boolean;
}

interface FinanceTransaction {
  id: string;
  user_id: string;
  amount: number;
  date: string;
  merchant_name?: string;
  category?: string[];
  is_recurring: boolean;
  status: string;
}

interface FinanceRecurring {
  id: string;
  user_id: string;
  name: string;
  amount: string;
  next_due_date: string;
  frequency: string;
  category?: string[];
  is_active: boolean;
  is_income: boolean;
}

interface FinanceSnapshot {
  id: string;
  user_id: string;
  date: string;
  net_worth: string;
  total_assets: string;
  total_liabilities: string;
}

interface FinanceSnapshotPartial {
  date: string;
  net_worth: string;
  total_assets: string;
  total_liabilities: string;
}

interface BillItem {
  name: string;
  amount: number;
  formatted_amount: string;
  due_date: string;
  days_until: number;
  status: 'overdue' | 'due_soon' | 'upcoming';
  frequency: string;
  category: string;
}

/**
 * Execute a finance tool by name
 */
export async function executeFinanceTool(
  toolName: string,
  args: Record<string, unknown>,
  userId: string
): Promise<unknown> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  switch (toolName) {
    case 'get_balance_sheet':
      return await getBalanceSheet(supabase, userId, args);
    case 'get_spending_summary':
      return await getSpendingSummary(supabase, userId, args);
    case 'get_recent_transactions':
      return await getRecentTransactions(supabase, userId, args);
    case 'get_upcoming_bills':
      return await getUpcomingBills(supabase, userId, args);
    case 'can_i_afford':
      return await canIAfford(supabase, userId, args);
    case 'simulate_wealth':
      return await simulateWealth(supabase, userId, args);
    case 'get_net_worth_history':
      return await getNetWorthHistory(supabase, userId, args);
    case 'find_subscriptions':
      return await findSubscriptions(supabase, userId, args);
    case 'compare_spending':
      return await compareSpending(supabase, userId, args);
    case 'get_financial_insights':
      return await getFinancialInsights(supabase, userId, args);
    default:
      throw new Error(`Unknown finance tool: ${toolName}`);
  }
}

/**
 * Get balance sheet summary
 */
async function getBalanceSheet(
  supabase: SupabaseClient,
  userId: string,
  args: Record<string, unknown>
) {
  const includeHidden = args.include_hidden === true;
  const groupBy = (args.group_by as string) || 'type';

  let query = supabase
    .from('finance_accounts')
    .select('*')
    .eq('user_id', userId);

  if (!includeHidden) {
    query = query.eq('is_hidden', false);
  }

  const { data: accounts, error } = await query;

  if (error) throw new Error(`Failed to fetch accounts: ${error.message}`);

  // Calculate totals
  let totalAssets = 0;
  let totalLiabilities = 0;
  let liquidAssets = 0;
  let investments = 0;

  const accountsByGroup: Record<string, Array<{ name: string; balance: number; type: string }>> = {};

  for (const account of accounts || []) {
    const balance = parseFloat(account.balance_current || '0');
    const groupKey = groupBy === 'type' 
      ? account.type 
      : groupBy === 'institution' 
        ? (account.institution_name || 'Manual')
        : 'all';

    if (!accountsByGroup[groupKey]) {
      accountsByGroup[groupKey] = [];
    }
    accountsByGroup[groupKey].push({
      name: account.name,
      balance,
      type: account.type,
    });

    if (['depository', 'investment', 'cash', 'crypto'].includes(account.type)) {
      totalAssets += balance;
      if (['depository', 'cash'].includes(account.type)) {
        liquidAssets += balance;
      }
      if (['investment', 'crypto'].includes(account.type)) {
        investments += balance;
      }
    } else {
      totalLiabilities += Math.abs(balance);
    }
  }

  const netWorth = totalAssets - totalLiabilities;

  return {
    summary: {
      net_worth: netWorth,
      total_assets: totalAssets,
      total_liabilities: totalLiabilities,
      liquid_assets: liquidAssets,
      investments,
    },
    accounts_by_group: accountsByGroup,
    account_count: accounts?.length || 0,
    formatted: {
      net_worth: formatCurrency(netWorth),
      total_assets: formatCurrency(totalAssets),
      total_liabilities: formatCurrency(totalLiabilities),
      liquid_assets: formatCurrency(liquidAssets),
      investments: formatCurrency(investments),
    },
  };
}

/**
 * Get spending summary by category
 */
async function getSpendingSummary(
  supabase: SupabaseClient,
  userId: string,
  args: Record<string, unknown>
) {
  const period = (args.period as string) || '30d';
  const categoryFilter = args.category as string | undefined;
  const limit = (args.limit as number) || 10;

  const startDate = getStartDate(period);

  let query = supabase
    .from('finance_transactions')
    .select('amount, category, merchant_name')
    .eq('user_id', userId)
    .lt('amount', 0) // Only expenses
    .gte('date', startDate);

  const { data: transactions, error } = await query;

  if (error) throw new Error(`Failed to fetch transactions: ${error.message}`);

  // Group by category
  const categoryTotals: Record<string, { total: number; count: number; merchants: Set<string> }> = {};

  for (const tx of transactions || []) {
    const category = tx.category?.[0] || 'Other';
    
    if (categoryFilter && category !== categoryFilter) continue;

    if (!categoryTotals[category]) {
      categoryTotals[category] = { total: 0, count: 0, merchants: new Set() };
    }
    categoryTotals[category].total += Math.abs(tx.amount);
    categoryTotals[category].count += 1;
    if (tx.merchant_name) {
      categoryTotals[category].merchants.add(tx.merchant_name);
    }
  }

  // Sort and limit
  const sortedCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, limit);

  const totalSpending = sortedCategories.reduce((sum, [, data]) => sum + data.total, 0);

  return {
    period,
    total_spending: totalSpending,
    formatted_total: formatCurrency(totalSpending),
    categories: sortedCategories.map(([name, data]) => ({
      name,
      amount: data.total,
      formatted_amount: formatCurrency(data.total),
      transaction_count: data.count,
      percentage: ((data.total / totalSpending) * 100).toFixed(1) + '%',
      top_merchants: Array.from(data.merchants).slice(0, 3),
    })),
  };
}

/**
 * Get recent transactions
 */
async function getRecentTransactions(
  supabase: SupabaseClient,
  userId: string,
  args: Record<string, unknown>
) {
  const limit = (args.limit as number) || 10;
  const merchant = args.merchant as string | undefined;
  const category = args.category as string | undefined;
  const minAmount = args.min_amount as number | undefined;
  const maxAmount = args.max_amount as number | undefined;
  const txType = (args.type as string) || 'all';

  let query = supabase
    .from('finance_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limit);

  if (txType === 'expense') {
    query = query.lt('amount', 0);
  } else if (txType === 'income') {
    query = query.gt('amount', 0);
  }

  if (merchant) {
    query = query.ilike('merchant_name', `%${merchant}%`);
  }

  if (category) {
    query = query.contains('category', [category]);
  }

  const { data: transactions, error } = await query;

  if (error) throw new Error(`Failed to fetch transactions: ${error.message}`);

  // Filter by amount if specified
  let filtered: FinanceTransaction[] = transactions || [];
  if (minAmount !== undefined) {
    filtered = filtered.filter((tx: FinanceTransaction) => Math.abs(tx.amount) >= minAmount);
  }
  if (maxAmount !== undefined) {
    filtered = filtered.filter((tx: FinanceTransaction) => Math.abs(tx.amount) <= maxAmount);
  }

  return {
    count: filtered.length,
    transactions: filtered.map((tx: FinanceTransaction) => ({
      date: tx.date,
      merchant: tx.merchant_name || 'Unknown',
      amount: tx.amount,
      formatted_amount: formatCurrency(tx.amount),
      category: tx.category?.[0] || 'Other',
      is_recurring: tx.is_recurring,
      status: tx.status,
    })),
  };
}

/**
 * Get upcoming bills
 */
async function getUpcomingBills(
  supabase: SupabaseClient,
  userId: string,
  args: Record<string, unknown>
) {
  const daysAhead = (args.days_ahead as number) || 30;
  const includePaid = args.include_paid === true;

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  let query = supabase
    .from('finance_recurring')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('is_income', false)
    .lte('next_due_date', futureDate.toISOString().slice(0, 10))
    .order('next_due_date', { ascending: true });

  const { data: bills, error } = await query;

  if (error) throw new Error(`Failed to fetch bills: ${error.message}`);

  const today = new Date().toISOString().slice(0, 10);
  let totalDue = 0;

  const upcomingBills: BillItem[] = (bills || []).map((bill: FinanceRecurring) => {
    const daysUntil = Math.ceil(
      (new Date(bill.next_due_date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
    );
    const isOverdue = daysUntil < 0;
    
    if (!isOverdue) {
      totalDue += parseFloat(bill.amount);
    }

    return {
      name: bill.name,
      amount: parseFloat(bill.amount),
      formatted_amount: formatCurrency(parseFloat(bill.amount)),
      due_date: bill.next_due_date,
      days_until: daysUntil,
      status: isOverdue ? 'overdue' : daysUntil <= 3 ? 'due_soon' : 'upcoming',
      frequency: bill.frequency,
      category: bill.category?.[0] || 'Bills',
    };
  });

  return {
    total_due: totalDue,
    formatted_total: formatCurrency(totalDue),
    bills_count: upcomingBills.length,
    overdue_count: upcomingBills.filter((b: BillItem) => b.status === 'overdue').length,
    bills: upcomingBills,
  };
}

/**
 * Analyze if user can afford a purchase
 */
async function canIAfford(
  supabase: SupabaseClient,
  userId: string,
  args: Record<string, unknown>
) {
  const amount = args.amount as number;
  const description = (args.description as string) || 'purchase';
  const useCredit = args.use_credit === true;
  const timeline = (args.timeline as string) || 'now';

  // Get balance sheet
  const balanceSheet = await getBalanceSheet(supabase, userId, {});
  const { liquid_assets, total_liabilities } = balanceSheet.summary;

  // Get upcoming bills for next 30 days
  const upcomingBills = await getUpcomingBills(supabase, userId, { days_ahead: 30 });
  const billsTotal = upcomingBills.total_due;

  // Get average monthly spending
  const spendingSummary = await getSpendingSummary(supabase, userId, { period: '30d' });
  const monthlySpending = spendingSummary.total_spending;

  // Calculate available funds
  const safetyBuffer = monthlySpending * 0.5; // Keep 2 weeks of expenses as buffer
  const availableNow = liquid_assets - billsTotal - safetyBuffer;

  // Analysis
  let canAfford = false;
  let recommendation = '';
  const reasons: string[] = [];

  if (timeline === 'now') {
    if (availableNow >= amount) {
      canAfford = true;
      recommendation = `Yes, you can afford this ${description}.`;
      reasons.push(`You have ${formatCurrency(availableNow)} available after accounting for upcoming bills and a safety buffer.`);
    } else if (useCredit && total_liabilities < liquid_assets * 0.3) {
      canAfford = true;
      recommendation = `You can use credit for this ${description}, but consider paying it off quickly.`;
      reasons.push(`Your current debt is low relative to assets.`);
      reasons.push(`Available cash: ${formatCurrency(availableNow)}, shortfall: ${formatCurrency(amount - availableNow)}`);
    } else {
      canAfford = false;
      recommendation = `This ${description} may strain your finances.`;
      reasons.push(`Available after bills and buffer: ${formatCurrency(availableNow)}`);
      reasons.push(`You would need ${formatCurrency(amount - availableNow)} more.`);
    }
  } else if (timeline === 'save_up') {
    const monthlySavings = liquid_assets * 0.1; // Assume 10% savings rate
    const monthsNeeded = Math.ceil((amount - Math.max(0, availableNow)) / monthlySavings);
    canAfford = true;
    recommendation = `You could save up for this ${description} in about ${monthsNeeded} months.`;
    reasons.push(`Estimated monthly savings: ${formatCurrency(monthlySavings)}`);
  }

  return {
    amount,
    description,
    can_afford: canAfford,
    recommendation,
    reasons,
    financial_context: {
      liquid_assets: formatCurrency(liquid_assets),
      upcoming_bills: formatCurrency(billsTotal),
      available_after_bills: formatCurrency(availableNow),
      monthly_spending: formatCurrency(monthlySpending),
    },
  };
}

/**
 * Run wealth simulation
 */
async function simulateWealth(
  supabase: SupabaseClient,
  userId: string,
  args: Record<string, unknown>
) {
  const years = (args.years as number) || 10;
  const expectedReturn = (args.expected_return as number) || 7;
  const inflationRate = (args.inflation_rate as number) || 2.5;
  const majorExpenses = (args.major_expenses as Array<{ description: string; amount: number; year: number }>) || [];
  const goalAmount = args.goal_amount as number | undefined;

  // Get current net worth
  const balanceSheet = await getBalanceSheet(supabase, userId, {});
  const currentNetWorth = balanceSheet.summary.net_worth;

  // Estimate monthly contribution from recent savings
  const monthlyContribution = (args.monthly_contribution as number) || 1000;

  // Run simulation
  const monthlyReturn = expectedReturn / 100 / 12;
  const realReturn = (expectedReturn - inflationRate) / 100 / 12;

  const projections: Array<{ year: number; nominal: number; real: number }> = [];
  let nominalBalance = currentNetWorth;
  let realBalance = currentNetWorth;

  for (let year = 0; year <= years; year++) {
    // Apply major expenses
    for (const expense of majorExpenses) {
      if (expense.year === year) {
        nominalBalance -= expense.amount;
        realBalance -= expense.amount;
      }
    }

    projections.push({
      year: new Date().getFullYear() + year,
      nominal: Math.max(0, nominalBalance),
      real: Math.max(0, realBalance),
    });

    // Grow for next year (12 months)
    for (let month = 0; month < 12; month++) {
      nominalBalance = nominalBalance * (1 + monthlyReturn) + monthlyContribution;
      realBalance = realBalance * (1 + realReturn) + monthlyContribution;
    }
  }

  const lastProjection = projections[projections.length - 1];
  const finalNominal = lastProjection?.nominal ?? 0;
  const finalReal = lastProjection?.real ?? 0;
  const totalContributed = monthlyContribution * 12 * years;
  const investmentGrowth = finalNominal - currentNetWorth - totalContributed;

  // Calculate time to goal if specified
  let yearsToGoal: number | null = null;
  if (goalAmount && goalAmount > currentNetWorth) {
    let balance = currentNetWorth;
    for (let month = 0; month < years * 12; month++) {
      balance = balance * (1 + monthlyReturn) + monthlyContribution;
      if (balance >= goalAmount) {
        yearsToGoal = Math.ceil(month / 12);
        break;
      }
    }
  }

  return {
    current_net_worth: formatCurrency(currentNetWorth),
    projection_years: years,
    assumptions: {
      monthly_contribution: formatCurrency(monthlyContribution),
      expected_return: `${expectedReturn}%`,
      inflation_rate: `${inflationRate}%`,
      major_expenses: majorExpenses.map((e) => ({
        ...e,
        formatted_amount: formatCurrency(e.amount),
      })),
    },
    results: {
      final_nominal: formatCurrency(finalNominal),
      final_real: formatCurrency(finalReal),
      total_contributed: formatCurrency(totalContributed),
      investment_growth: formatCurrency(investmentGrowth),
      growth_percentage: ((investmentGrowth / (currentNetWorth + totalContributed)) * 100).toFixed(1) + '%',
    },
    goal: goalAmount
      ? {
          target: formatCurrency(goalAmount),
          years_to_reach: yearsToGoal,
          achievable: yearsToGoal !== null && yearsToGoal <= years,
        }
      : null,
    yearly_projections: projections.map((p) => ({
      year: p.year,
      nominal: formatCurrency(p.nominal),
      real: formatCurrency(p.real),
    })),
  };
}

/**
 * Get net worth history
 */
async function getNetWorthHistory(
  supabase: SupabaseClient,
  userId: string,
  args: Record<string, unknown>
) {
  const period = (args.period as string) || '30d';
  const startDate = getStartDate(period);

  const { data: snapshots, error } = await supabase
    .from('finance_snapshots')
    .select('date, net_worth, total_assets, total_liabilities')
    .eq('user_id', userId)
    .gte('date', startDate)
    .order('date', { ascending: true });

  if (error) throw new Error(`Failed to fetch history: ${error.message}`);

  if (!snapshots || snapshots.length === 0) {
    return {
      period,
      data_points: 0,
      message: 'No historical data available for this period.',
    };
  }

  const typedSnapshots = snapshots as FinanceSnapshotPartial[];
  const first = typedSnapshots[0]!;
  const last = typedSnapshots[typedSnapshots.length - 1]!;
  const change = parseFloat(last.net_worth) - parseFloat(first.net_worth);
  const changePercent = (change / parseFloat(first.net_worth)) * 100;

  return {
    period,
    data_points: typedSnapshots.length,
    summary: {
      start_net_worth: formatCurrency(parseFloat(first.net_worth)),
      end_net_worth: formatCurrency(parseFloat(last.net_worth)),
      change: formatCurrency(change),
      change_percent: changePercent.toFixed(1) + '%',
      trend: change > 0 ? 'increasing' : change < 0 ? 'decreasing' : 'stable',
    },
    history: typedSnapshots.map((s) => ({
      date: s.date,
      net_worth: formatCurrency(parseFloat(s.net_worth)),
    })),
  };
}

/**
 * Find subscriptions from transactions
 */
async function findSubscriptions(
  supabase: SupabaseClient,
  userId: string,
  args: Record<string, unknown>
) {
  // Get last 90 days of transactions
  const startDate = getStartDate('90d');

  const { data: transactions, error } = await supabase
    .from('finance_transactions')
    .select('merchant_name, amount, date, category')
    .eq('user_id', userId)
    .lt('amount', 0)
    .gte('date', startDate)
    .order('date', { ascending: true });

  if (error) throw new Error(`Failed to fetch transactions: ${error.message}`);

  // Group by merchant and amount to find recurring patterns
  const merchantGroups: Record<string, { amounts: number[]; dates: string[]; category: string }> = {};

  for (const tx of transactions || []) {
    if (!tx.merchant_name) continue;
    const key = tx.merchant_name.toLowerCase();
    
    if (!merchantGroups[key]) {
      merchantGroups[key] = { amounts: [], dates: [], category: tx.category?.[0] || 'Other' };
    }
    merchantGroups[key].amounts.push(Math.abs(tx.amount));
    merchantGroups[key].dates.push(tx.date);
  }

  // Identify subscriptions (2+ transactions with similar amounts)
  const subscriptions: Array<{
    merchant: string;
    amount: number;
    frequency: string;
    category: string;
    annual_cost: number;
  }> = [];

  for (const [merchant, data] of Object.entries(merchantGroups)) {
    if (data.amounts.length >= 2) {
      // Check if amounts are consistent (within 10%)
      const avgAmount = data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length;
      const isConsistent = data.amounts.every((a) => Math.abs(a - avgAmount) / avgAmount < 0.1);

      if (isConsistent) {
        // Estimate frequency based on date gaps
        const dayGaps: number[] = [];
        for (let i = 1; i < data.dates.length; i++) {
          const currDate = data.dates[i];
          const prevDate = data.dates[i - 1];
          if (!currDate || !prevDate) continue;
          const gap = Math.abs(
            new Date(currDate).getTime() - new Date(prevDate).getTime()
          ) / (1000 * 60 * 60 * 24);
          dayGaps.push(gap);
        }
        const avgGap = dayGaps.length > 0 ? dayGaps.reduce((a, b) => a + b, 0) / dayGaps.length : 30;

        let frequency = 'monthly';
        let annualMultiplier = 12;
        if (avgGap < 10) {
          frequency = 'weekly';
          annualMultiplier = 52;
        } else if (avgGap > 80) {
          frequency = 'quarterly';
          annualMultiplier = 4;
        } else if (avgGap > 300) {
          frequency = 'yearly';
          annualMultiplier = 1;
        }

        subscriptions.push({
          merchant: merchant.charAt(0).toUpperCase() + merchant.slice(1),
          amount: avgAmount,
          frequency,
          category: data.category,
          annual_cost: avgAmount * annualMultiplier,
        });
      }
    }
  }

  // Sort by annual cost
  subscriptions.sort((a, b) => b.annual_cost - a.annual_cost);

  const totalAnnual = subscriptions.reduce((sum, s) => sum + s.annual_cost, 0);

  return {
    subscription_count: subscriptions.length,
    total_annual_cost: formatCurrency(totalAnnual),
    total_monthly_cost: formatCurrency(totalAnnual / 12),
    subscriptions: subscriptions.map((s) => ({
      ...s,
      formatted_amount: formatCurrency(s.amount),
      formatted_annual: formatCurrency(s.annual_cost),
    })),
  };
}

/**
 * Compare spending between periods
 */
async function compareSpending(
  supabase: SupabaseClient,
  userId: string,
  args: Record<string, unknown>
) {
  const period1 = args.period1 as string;
  const period2 = args.period2 as string;
  const category = args.category as string | undefined;

  const { start: start1, end: end1 } = getPeriodDates(period1);
  const { start: start2, end: end2 } = getPeriodDates(period2);

  // Fetch transactions for both periods
  const fetchPeriod = async (start: string, end: string) => {
    let query = supabase
      .from('finance_transactions')
      .select('amount, category')
      .eq('user_id', userId)
      .lt('amount', 0)
      .gte('date', start)
      .lte('date', end);

    if (category) {
      query = query.contains('category', [category]);
    }

    const { data } = await query;
    return data || [];
  };

  const [txs1, txs2] = await Promise.all([
    fetchPeriod(start1, end1),
    fetchPeriod(start2, end2),
  ]);

  const total1 = txs1.reduce((sum: number, tx: { amount: number }) => sum + Math.abs(tx.amount), 0);
  const total2 = txs2.reduce((sum: number, tx: { amount: number }) => sum + Math.abs(tx.amount), 0);
  const difference = total2 - total1;
  const percentChange = total1 > 0 ? ((difference / total1) * 100) : 0;

  return {
    period1: {
      label: period1,
      total: formatCurrency(total1),
      transaction_count: txs1.length,
    },
    period2: {
      label: period2,
      total: formatCurrency(total2),
      transaction_count: txs2.length,
    },
    comparison: {
      difference: formatCurrency(difference),
      percent_change: percentChange.toFixed(1) + '%',
      trend: difference > 0 ? 'increased' : difference < 0 ? 'decreased' : 'unchanged',
      insight: difference > 0
        ? `Spending increased by ${formatCurrency(difference)} (${percentChange.toFixed(1)}%)`
        : difference < 0
          ? `Spending decreased by ${formatCurrency(Math.abs(difference))} (${Math.abs(percentChange).toFixed(1)}%)`
          : 'Spending remained the same',
    },
    category_filter: category || 'all categories',
  };
}

/**
 * Get AI-generated financial insights
 */
async function getFinancialInsights(
  supabase: SupabaseClient,
  userId: string,
  args: Record<string, unknown>
) {
  const focus = (args.focus as string) || 'all';

  // Gather data for insights
  const [balanceSheet, spending, bills, subscriptions] = await Promise.all([
    getBalanceSheet(supabase, userId, {}),
    getSpendingSummary(supabase, userId, { period: '30d' }),
    getUpcomingBills(supabase, userId, { days_ahead: 14 }),
    findSubscriptions(supabase, userId, {}),
  ]);

  const insights: Array<{ type: string; severity: string; message: string; action?: string }> = [];

  // Spending insights
  if (focus === 'all' || focus === 'spending') {
    const topCategory = spending.categories[0];
    if (topCategory && parseFloat(topCategory.percentage) > 40) {
      insights.push({
        type: 'spending',
        severity: 'warning',
        message: `${topCategory.name} accounts for ${topCategory.percentage} of your spending.`,
        action: 'Consider setting a budget for this category.',
      });
    }
  }

  // Savings insights
  if (focus === 'all' || focus === 'savings') {
    const savingsRate = (balanceSheet.summary.liquid_assets / balanceSheet.summary.total_assets) * 100;
    if (savingsRate < 20) {
      insights.push({
        type: 'savings',
        severity: 'info',
        message: `Your liquid savings are ${savingsRate.toFixed(0)}% of total assets.`,
        action: 'Consider building up an emergency fund of 3-6 months expenses.',
      });
    }
  }

  // Debt insights
  if (focus === 'all' || focus === 'debt') {
    const debtRatio = balanceSheet.summary.total_liabilities / balanceSheet.summary.total_assets;
    if (debtRatio > 0.3) {
      insights.push({
        type: 'debt',
        severity: 'warning',
        message: `Your debt-to-asset ratio is ${(debtRatio * 100).toFixed(0)}%.`,
        action: 'Focus on paying down high-interest debt.',
      });
    }
  }

  // Bill insights
  if (bills.overdue_count > 0) {
    insights.push({
      type: 'bills',
      severity: 'urgent',
      message: `You have ${bills.overdue_count} overdue bill(s).`,
      action: 'Pay these immediately to avoid late fees.',
    });
  }

  // Subscription insights
  if (subscriptions.subscription_count > 5) {
    insights.push({
      type: 'subscriptions',
      severity: 'info',
      message: `You have ${subscriptions.subscription_count} active subscriptions costing ${subscriptions.total_monthly_cost}/month.`,
      action: 'Review these to see if any can be cancelled.',
    });
  }

  return {
    focus,
    insight_count: insights.length,
    insights,
    summary: {
      net_worth: balanceSheet.formatted.net_worth,
      monthly_spending: spending.formatted_total,
      upcoming_bills: bills.formatted_total,
      subscription_cost: subscriptions.total_monthly_cost,
    },
  };
}

// Helper functions
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getStartDate(period: string): string {
  const now = new Date();
  switch (period) {
    case '7d':
      now.setDate(now.getDate() - 7);
      break;
    case '30d':
      now.setDate(now.getDate() - 30);
      break;
    case '90d':
      now.setDate(now.getDate() - 90);
      break;
    case 'ytd':
      now.setMonth(0, 1);
      break;
    case '1y':
      now.setFullYear(now.getFullYear() - 1);
      break;
    default:
      now.setFullYear(2000);
  }
  return now.toISOString().slice(0, 10);
}

function getPeriodDates(period: string): { start: string; end: string } {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  
  switch (period) {
    case 'this_week': {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      return { start: weekStart.toISOString().slice(0, 10), end: today };
    }
    case 'last_week': {
      const lastWeekEnd = new Date(now);
      lastWeekEnd.setDate(now.getDate() - now.getDay() - 1);
      const lastWeekStart = new Date(lastWeekEnd);
      lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
      return { start: lastWeekStart.toISOString().slice(0, 10), end: lastWeekEnd.toISOString().slice(0, 10) };
    }
    case 'this_month': {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: monthStart.toISOString().slice(0, 10), end: today };
    }
    case 'last_month': {
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { start: lastMonthStart.toISOString().slice(0, 10), end: lastMonthEnd.toISOString().slice(0, 10) };
    }
    case 'this_quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
      return { start: quarterStart.toISOString().slice(0, 10), end: today };
    }
    case 'last_quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      const lastQuarterEnd = new Date(now.getFullYear(), quarter * 3, 0);
      const lastQuarterStart = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
      return { start: lastQuarterStart.toISOString().slice(0, 10), end: lastQuarterEnd.toISOString().slice(0, 10) };
    }
    default:
      return { start: today, end: today };
  }
}

export default executeFinanceTool;
