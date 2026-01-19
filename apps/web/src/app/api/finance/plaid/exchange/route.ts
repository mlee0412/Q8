import { NextRequest, NextResponse } from 'next/server';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { encrypt } from '@/lib/utils/encryption';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/auth/api-auth';
import { plaidExchangeSchema, validationErrorResponse } from '@/lib/validations';
import { integrations } from '@/lib/env';
import { supabaseAdmin as supabase } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
/**
 * Type guard for Plaid API errors with response data
 */
interface PlaidApiError {
  response?: {
    data?: {
      error_code?: string;
      error_message?: string;
      error_type?: string;
    };
  };
  message?: string;
}
function isPlaidApiError(error: unknown): error is PlaidApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('response' in error || 'message' in error)
  );
}
// Initialize Plaid client
const configuration = new Configuration({
  basePath: PlaidEnvironments[integrations.plaid.env as keyof typeof PlaidEnvironments],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': integrations.plaid.clientId ?? '',
      'PLAID-SECRET': integrations.plaid.secret ?? '',
    },
  },
});
const plaidClient = new PlaidApi(configuration);
/**
 * POST /api/finance/plaid/exchange
 * Exchange public token for access token and save accounts
 */
export async function POST(request: NextRequest) {
  // Authenticate user
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return unauthorizedResponse();
  }
  try {
    if (!integrations.plaid.isConfigured) {
      return NextResponse.json(
        { error: 'Plaid not configured' },
        { status: 400 }
      );
    }
    const body = await request.json();
    // Validate input
    const parseResult = plaidExchangeSchema.safeParse(body);
    if (!parseResult.success) {
      return validationErrorResponse(parseResult.error);
    }
    const { publicToken, institutionId, institutionName } = parseResult.data;
    const userId = user.id; // Use authenticated user
    const metadata = { institution: { name: institutionName, institution_id: institutionId } };
    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });
    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;
    // Encrypt the access token before storing
    const encryptedAccessToken = encrypt(accessToken);
    // Get account details
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });
    const accounts = accountsResponse.data.accounts;
    const institution = metadata?.institution;
    // Get existing accounts from this institution for this user to detect re-links
    const resolvedInstitutionName = institution?.name || 'Unknown Institution';
    const { data: existingAccounts } = await supabase
      .from('finance_accounts')
      .select('id, name, type, plaid_item_id, plaid_account_id')
      .eq('user_id', userId)
      .eq('institution_name', resolvedInstitutionName)
      .not('plaid_account_id', 'is', null);
    // Build a map of existing accounts by name+type for matching
    const existingMap = new Map(
      (existingAccounts || []).map((a) => [`${a.name}:${a.type}`, a])
    );
    // Track old item_ids that should be cleaned up (stale connections)
    const oldItemIds = new Set(
      (existingAccounts || [])
        .map((a) => a.plaid_item_id)
        .filter((id): id is string => id !== null && id !== itemId)
    );
    // Save accounts to database
    const savedAccounts = [];
    
    for (const account of accounts) {
      const accountType = mapPlaidAccountType(account.type);
      const matchKey = `${account.name}:${accountType}`;
      const existingAccount = existingMap.get(matchKey);
      const accountData = {
        user_id: userId,
        name: account.name,
        type: accountType,
        subtype: account.subtype || null,
        institution_name: resolvedInstitutionName,
        institution_id: institution?.institution_id || null,
        balance_current: account.balances.current || 0,
        balance_available: account.balances.available,
        balance_limit: account.balances.limit,
        currency: account.balances.iso_currency_code || 'USD',
        plaid_access_token_encrypted: encryptedAccessToken,
        plaid_item_id: itemId,
        plaid_account_id: account.account_id,
        is_manual: false,
        is_hidden: false,
        last_synced_at: new Date().toISOString(),
        sync_error: null, // Clear any previous sync errors
      };
      let data, error;
      if (existingAccount) {
        // Update existing account with new Plaid credentials (re-link scenario)
        const result = await supabase
          .from('finance_accounts')
          .update(accountData)
          .eq('id', existingAccount.id)
          .select()
          .single();
        data = result.data;
        error = result.error;
        logger.info('Updated existing account', { accountName: account.name, accountId: existingAccount.id });
      } else {
        // Insert new account
        const result = await supabase
          .from('finance_accounts')
          .insert(accountData)
          .select()
          .single();
        data = result.data;
        error = result.error;
        logger.info('Created new account', { accountName: account.name });
      }
      if (error) {
        logger.error('Error saving account', { error });
        continue;
      }
      savedAccounts.push({
        id: data.id,
        name: data.name,
        type: data.type,
        subtype: data.subtype,
        institutionName: data.institution_name,
        balanceCurrent: parseFloat(data.balance_current || '0'),
        balanceAvailable: data.balance_available ? parseFloat(data.balance_available) : undefined,
        currency: data.currency,
      });
    }
    // Clean up any stale accounts from old Plaid items for this institution
    if (oldItemIds.size > 0) {
      
      // Don't delete - just mark as disconnected by clearing Plaid fields
      // This preserves transaction history
      for (const oldItemId of oldItemIds) {
        await supabase
          .from('finance_accounts')
          .update({
            plaid_access_token_encrypted: null,
            plaid_item_id: null,
            sync_error: 'Replaced by new connection',
          })
          .eq('plaid_item_id', oldItemId)
          .eq('user_id', userId);
      }
    }
    // Trigger initial transaction sync
    await syncTransactions(accessToken, userId, itemId);
    return NextResponse.json({
      success: true,
      itemId,
      accounts: savedAccounts,
      accountsLinked: savedAccounts.length,
    });
  } catch (error) {
    const plaidError = isPlaidApiError(error) ? error : null;
    logger.error('Plaid exchange error', { error: plaidError?.response?.data || plaidError?.message || error });
    if (plaidError?.response?.data?.error_code) {
      return NextResponse.json(
        {
          error: plaidError.response.data.error_message,
          errorCode: plaidError.response.data.error_code,
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to exchange token' },
      { status: 500 }
    );
  }
}
/**
 * Map Plaid account types to our schema
 */
function mapPlaidAccountType(plaidType: string): string {
  const typeMap: Record<string, string> = {
    depository: 'depository',
    credit: 'credit',
    investment: 'investment',
    loan: 'loan',
    brokerage: 'investment',
    other: 'cash',
  };
  return typeMap[plaidType] || 'cash';
}
/**
 * Sync transactions for a linked account
 */
async function syncTransactions(accessToken: string, userId: string, itemId: string) {
  try {
    // Get transactions for the last 30 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();
    const response = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: startDate.toISOString().slice(0, 10),
      end_date: endDate.toISOString().slice(0, 10),
      options: {
        count: 500,
        offset: 0,
      },
    });
    const transactions = response.data.transactions;
    // Get account mapping
    const { data: accounts } = await supabase
      .from('finance_accounts')
      .select('id, plaid_account_id')
      .eq('plaid_item_id', itemId);
    const accountMap = new Map(
      accounts?.map((a) => [a.plaid_account_id, a.id]) || []
    );
    // Save transactions
    for (const tx of transactions) {
      const accountId = accountMap.get(tx.account_id);
      if (!accountId) continue;
      const txData = {
        user_id: userId,
        account_id: accountId,
        amount: -tx.amount, // Plaid uses positive for debits, we use negative
        date: tx.date,
        datetime: tx.datetime || null,
        merchant_name: tx.merchant_name || tx.name,
        description: tx.name,
        category: tx.category || [],
        category_id: tx.category_id || null,
        plaid_transaction_id: tx.transaction_id,
        is_manual: false,
        is_recurring: false,
        status: tx.pending ? 'pending' : 'posted',
        is_transfer: tx.category?.includes('Transfer') || false,
        logo_url: tx.logo_url || null,
        website: tx.website || null,
        location: tx.location ? {
          city: tx.location.city,
          region: tx.location.region,
          country: tx.location.country,
          lat: tx.location.lat,
          lon: tx.location.lon,
        } : null,
        payment_channel: tx.payment_channel || null,
      };
      await supabase
        .from('finance_transactions')
        .upsert(txData, {
          onConflict: 'plaid_transaction_id',
        });
    }
    logger.info('Synced transactions', { transactionCount: transactions.length, itemId });
  } catch (error) {
    logger.error('Transaction sync error', { error });
  }
}
