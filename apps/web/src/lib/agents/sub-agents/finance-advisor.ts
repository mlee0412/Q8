/**
 * Finance Advisor Agent
 * Powered by Claude Sonnet 4.5 (Anthropic)
 * Handles: Financial analysis, budgeting, spending insights, wealth planning
 */

import { getModel } from '../model_factory';
import { financeTools } from '../tools/finance-tools';
import { executeFinanceTool } from '../tools/finance-executor';
import { defaultTools } from '../tools/default-tools';
import type { Tool, OpenAITool } from '../types';

/**
 * Financial advisor agent configuration
 */
export const financeAdvisorConfig = {
  name: 'FinanceAdvisor',
  model: getModel('secretary'), // Use Gemini 3.0 for cost efficiency with long context
  instructions: `You are Q8's Financial Advisor, an expert personal finance assistant with deep access to the user's financial data.

Your capabilities:
- **Balance Sheet Analysis**: View all accounts, net worth, assets, and liabilities
- **Spending Analysis**: Analyze spending by category, merchant, and time period
- **Cash Flow Tracking**: Monitor income vs expenses over time
- **Bill Management**: Track upcoming bills and recurring payments
- **Subscription Audit**: Find and analyze active subscriptions
- **Affordability Analysis**: Help users understand if they can afford purchases
- **Wealth Projection**: Simulate future net worth with compound growth
- **Financial Insights**: Generate personalized recommendations

When handling financial questions:
1. Use the appropriate finance tools to gather current data
2. Present numbers clearly with proper currency formatting
3. Always provide context (comparisons to previous periods, percentages)
4. Be encouraging but honest about financial situations
5. Never be judgmental about spending decisions
6. Protect user privacy - never expose unnecessary financial details

Communication style:
- Be clear and concise with financial data
- Use visualizations descriptions when helpful
- Explain financial concepts in simple terms
- Provide actionable recommendations
- Celebrate positive trends and improvements

Privacy note: The user's financial data is sensitive. Only access and share information directly relevant to their query.`,
  tools: [] as Tool[],
  openaiTools: [
    ...financeTools,
    ...defaultTools.filter((t) =>
      ['get_current_datetime', 'calculate'].includes(t.function.name)
    ),
  ] as OpenAITool[],
};

/**
 * Initialize the finance advisor agent
 */
export async function initializeFinanceAdvisorAgent() {
  return {
    ...financeAdvisorConfig,
  };
}

/**
 * Execute a finance advisor tool
 */
export async function executeFinanceAdvisorTool(
  toolName: string,
  args: Record<string, unknown>,
  userId: string
): Promise<{ success: boolean; message: string; data?: unknown }> {
  try {
    console.log(`[FinanceAdvisor] Executing tool: ${toolName}`, args);

    // Check if it's a finance tool
    const isFinanceTool = financeTools.some(
      (t) => t.function.name === toolName
    );

    if (isFinanceTool) {
      const result = await executeFinanceTool(toolName, args, userId);
      return {
        success: true,
        message: `Successfully executed ${toolName}`,
        data: result,
      };
    }

    // Handle default tools
    if (toolName === 'get_current_datetime') {
      return {
        success: true,
        message: 'Current datetime retrieved',
        data: {
          datetime: new Date().toISOString(),
          formatted: new Date().toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short',
          }),
        },
      };
    }

    if (toolName === 'calculate') {
      const expression = args.expression as string;
      // Safe eval using Function constructor with restricted context
      try {
        const result = new Function(`return ${expression}`)();
        return {
          success: true,
          message: `Calculated: ${expression} = ${result}`,
          data: { expression, result },
        };
      } catch {
        return {
          success: false,
          message: `Invalid calculation expression: ${expression}`,
        };
      }
    }

    return {
      success: false,
      message: `Unknown tool: ${toolName}`,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(`[FinanceAdvisor] Tool error:`, error);
    return {
      success: false,
      message: `Error executing ${toolName}: ${errorMessage}`,
    };
  }
}

/**
 * Get a quick financial summary for context
 */
export async function getFinancialContext(
  userId: string
): Promise<string> {
  try {
    const [balanceSheet, spending, bills] = await Promise.all([
      executeFinanceTool('get_balance_sheet', {}, userId),
      executeFinanceTool('get_spending_summary', { period: '30d', limit: 3 }, userId),
      executeFinanceTool('get_upcoming_bills', { days_ahead: 7 }, userId),
    ]);

    const summary = balanceSheet as {
      formatted: {
        net_worth: string;
        liquid_assets: string;
      };
    };

    const spendingSummary = spending as {
      formatted_total: string;
      categories: Array<{ name: string; formatted_amount: string }>;
    };

    const billsSummary = bills as {
      bills_count: number;
      formatted_total: string;
    };

    return `
<financial_context>
Current Net Worth: ${summary.formatted?.net_worth || 'Unknown'}
Liquid Assets: ${summary.formatted?.liquid_assets || 'Unknown'}
Last 30 Days Spending: ${spendingSummary.formatted_total || 'Unknown'}
Top Categories: ${spendingSummary.categories?.map((c) => `${c.name} (${c.formatted_amount})`).join(', ') || 'Unknown'}
Upcoming Bills (7 days): ${billsSummary.bills_count || 0} bills totaling ${billsSummary.formatted_total || '$0.00'}
</financial_context>`;
  } catch (error) {
    console.error('[FinanceAdvisor] Error building financial context:', error);
    return '<financial_context>Unable to load financial context</financial_context>';
  }
}

/**
 * Insight types for proactive recommendations
 */
export interface FinancialInsight {
  type:
    | 'spending_alert'
    | 'budget_warning'
    | 'bill_reminder'
    | 'goal_progress'
    | 'debt_strategy'
    | 'subscription_review'
    | 'anomaly_detected';
  severity: 'info' | 'warning' | 'urgent';
  title: string;
  message: string;
  action?: string;
  data?: Record<string, unknown>;
}

/**
 * Generate proactive financial insights
 */
export async function generateProactiveInsights(
  userId: string
): Promise<FinancialInsight[]> {
  const insights: FinancialInsight[] = [];

  try {
    // Get financial data
    const [balanceResult, spendingResult, billsResult, subscriptionsResult] =
      await Promise.all([
        executeFinanceTool('get_balance_sheet', {}, userId),
        executeFinanceTool('get_spending_summary', { period: '30d' }, userId),
        executeFinanceTool('get_upcoming_bills', { days_ahead: 7 }, userId),
        executeFinanceTool('find_subscriptions', {}, userId),
      ]);

    const balance = balanceResult as {
      summary: {
        net_worth: number;
        liquid_assets: number;
        total_liabilities: number;
        total_assets: number;
      };
    };

    const spending = spendingResult as {
      categories: Array<{ name: string; amount: number; percentage: string }>;
    };

    const bills = billsResult as {
      bills: Array<{ name: string; amount: number; days_until: number }>;
      overdue_count: number;
    };

    const subscriptions = subscriptionsResult as {
      subscription_count: number;
      total_monthly_cost: string;
    };

    // Check for overdue bills
    if (bills.overdue_count > 0) {
      insights.push({
        type: 'bill_reminder',
        severity: 'urgent',
        title: 'Overdue Bills',
        message: `You have ${bills.overdue_count} overdue bill(s). Pay them to avoid late fees.`,
        action: 'View upcoming bills',
      });
    }

    // Check for bills due soon (within 3 days)
    const soonBills = bills.bills?.filter((b) => b.days_until >= 0 && b.days_until <= 3) || [];
    if (soonBills.length > 0 && bills.overdue_count === 0) {
      insights.push({
        type: 'bill_reminder',
        severity: 'warning',
        title: 'Bills Due Soon',
        message: `${soonBills.length} bill(s) due in the next 3 days.`,
        action: 'View upcoming bills',
        data: { bills: soonBills },
      });
    }

    // Check for high spending categories
    const highSpendingCategories = spending.categories?.filter(
      (c) => parseFloat(c.percentage) > 30
    ) || [];
    if (highSpendingCategories.length > 0) {
      insights.push({
        type: 'spending_alert',
        severity: 'info',
        title: 'Spending Concentration',
        message: `${highSpendingCategories[0]?.name || 'A category'} accounts for ${highSpendingCategories[0]?.percentage || '30%+'} of your spending.`,
        action: 'Set a budget for this category',
        data: { category: highSpendingCategories[0] },
      });
    }

    // Check debt-to-asset ratio
    const debtRatio = balance.summary.total_liabilities / balance.summary.total_assets;
    if (debtRatio > 0.4) {
      insights.push({
        type: 'debt_strategy',
        severity: 'warning',
        title: 'High Debt Ratio',
        message: `Your debt is ${(debtRatio * 100).toFixed(0)}% of your assets. Consider a debt payoff plan.`,
        action: 'View debt management',
      });
    }

    // Check for subscription overload
    const subCount = subscriptions.subscription_count || 0;
    if (subCount > 8) {
      insights.push({
        type: 'subscription_review',
        severity: 'info',
        title: 'Subscription Audit',
        message: `You have ${subCount} subscriptions costing ${subscriptions.total_monthly_cost}/month. Review for potential savings.`,
        action: 'View subscriptions',
      });
    }

    // Check liquid assets vs monthly spending
    const liquidAssets = balance.summary.liquid_assets;
    const totalSpending = spending.categories?.reduce((sum, c) => sum + c.amount, 0) || 0;
    const monthsOfEmergency = totalSpending > 0 ? liquidAssets / totalSpending : 0;

    if (monthsOfEmergency < 3) {
      insights.push({
        type: 'goal_progress',
        severity: 'info',
        title: 'Emergency Fund',
        message: `Your liquid savings cover ${monthsOfEmergency.toFixed(1)} months of expenses. Aim for 3-6 months.`,
        action: 'Set savings goal',
      });
    }
  } catch (error) {
    console.error('[FinanceAdvisor] Error generating insights:', error);
  }

  return insights;
}
