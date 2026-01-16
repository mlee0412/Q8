import { NextRequest, NextResponse } from 'next/server';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from '@/lib/utils/encryption';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
} from '@/lib/auth/api-auth';

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
const PLAID_SECRET = process.env.PLAID_SECRET;
const PLAID_ENV = (process.env.PLAID_ENV || 'sandbox') as keyof typeof PlaidEnvironments;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Plaid client
const plaidConfiguration = new Configuration({
  basePath: PlaidEnvironments[PLAID_ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
      'PLAID-SECRET': PLAID_SECRET,
    },
  },
});
const plaidClient = new PlaidApi(plaidConfiguration);

/**
 * Create a content-based key to detect duplicate transactions
 * Plaid can send same transaction with different transaction_ids (pending vs posted)
 */
function createContentKey(tx: {
  account_id: string;
  date: string;
  amount: number;
  merchant_name: string | null | undefined;
  name: string;
}): string {
  const merchantText = (tx.merchant_name || tx.name || 'unknown').toLowerCase();
  const merchantKey = merchantText.replace(/[^a-z]/g, '').substring(0, 12);
  const amountKey = Math.abs(tx.amount).toFixed(2);
  return `${tx.account_id}:${tx.date}:${amountKey}:${merchantKey}`;
}

/**
 * POST /api/finance/sync
 * Sync all accounts and transactions for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user from session
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }
    const userId = user.id;

    const body = await request.json();
    const { fullSync = false } = body;

    const results = {
      accountsUpdated: 0,
      transactionsAdded: 0,
      transactionsModified: 0,
      transactionsRemoved: 0,
      errors: [] as string[],
    };

    // Get all linked Plaid accounts for this user
    const { data: plaidAccounts, error: accountsError } = await supabase
      .from('finance_accounts')
      .select('id, plaid_item_id, plaid_access_token_encrypted, plaid_account_id')
      .eq('user_id', userId)
      .not('plaid_item_id', 'is', null);

    if (accountsError) {
      return NextResponse.json(
        { error: 'Failed to fetch accounts' },
        { status: 500 }
      );
    }

    // Group by item_id (each item has one access token)
    const itemMap = new Map<string, { accessToken: string; accountIds: string[] }>();

    for (const account of plaidAccounts || []) {
      if (!account.plaid_item_id || !account.plaid_access_token_encrypted) continue;

      if (!itemMap.has(account.plaid_item_id)) {
        try {
          const accessToken = decrypt(account.plaid_access_token_encrypted);
          itemMap.set(account.plaid_item_id, {
            accessToken,
            accountIds: [account.id],
          });
        } catch (e) {
          results.errors.push(`Failed to decrypt token for item ${account.plaid_item_id}`);
          continue;
        }
      } else {
        itemMap.get(account.plaid_item_id)!.accountIds.push(account.id);
      }
    }

    // Sync each Plaid item
    for (const [itemId, { accessToken, accountIds }] of itemMap) {
      try {
        // Update account balances
        const balanceResponse = await plaidClient.accountsGet({
          access_token: accessToken,
        });

        for (const account of balanceResponse.data.accounts) {
          const { error: updateError } = await supabase
            .from('finance_accounts')
            .update({
              balance_current: account.balances.current,
              balance_available: account.balances.available,
              last_synced_at: new Date().toISOString(),
              sync_error: null,
            })
            .eq('plaid_account_id', account.account_id);

          if (!updateError) results.accountsUpdated++;
        }

        // Sync transactions
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (fullSync ? 90 : 7));
        const endDate = new Date();

        const txResponse = await plaidClient.transactionsGet({
          access_token: accessToken,
          start_date: startDate.toISOString().slice(0, 10),
          end_date: endDate.toISOString().slice(0, 10),
          options: { count: 500, offset: 0 },
        });

        // Get account ID mapping
        const { data: dbAccounts } = await supabase
          .from('finance_accounts')
          .select('id, plaid_account_id')
          .eq('plaid_item_id', itemId);

        const accountIdMap = new Map(
          dbAccounts?.map((a) => [a.plaid_account_id, a.id]) || []
        );

        // Get existing transactions to check for content duplicates
        const dbAccountIds = dbAccounts?.map(a => a.id) || [];
        const { data: existingTransactions } = await supabase
          .from('finance_transactions')
          .select('id, account_id, date, amount, merchant_name, description, plaid_transaction_id')
          .in('account_id', dbAccountIds)
          .gte('date', startDate.toISOString().slice(0, 10));

        // Create content-based map of existing transactions
        const existingByContent = new Map<string, { id: string; plaid_transaction_id: string | null }>();
        for (const tx of existingTransactions || []) {
          const contentKey = `${tx.account_id}:${tx.date}:${Math.abs(parseFloat(tx.amount)).toFixed(2)}:${(tx.merchant_name || tx.description || 'unknown').toLowerCase().replace(/[^a-z]/g, '').substring(0, 12)}`;
          existingByContent.set(contentKey, {
            id: tx.id,
            plaid_transaction_id: tx.plaid_transaction_id,
          });
        }

        // Also track by plaid_transaction_id for direct matches
        const existingByPlaidId = new Map<string, string>();
        for (const tx of existingTransactions || []) {
          if (tx.plaid_transaction_id) {
            existingByPlaidId.set(tx.plaid_transaction_id, tx.id);
          }
        }

        for (const tx of txResponse.data.transactions) {
          const accountId = accountIdMap.get(tx.account_id);
          if (!accountId) continue;

          // Check if this transaction already exists by content
          const contentKey = createContentKey({
            account_id: accountId,
            date: tx.date,
            amount: tx.amount,
            merchant_name: tx.merchant_name,
            name: tx.name,
          });

          const existingByContentMatch = existingByContent.get(contentKey);
          const existingByPlaidIdMatch = existingByPlaidId.get(tx.transaction_id);

          // Skip if we already have this exact content (prevents duplicates from pending/posted)
          if (existingByContentMatch && !existingByPlaidIdMatch) {
            // Content exists but with different plaid_transaction_id
            // Update the existing record with the new plaid_transaction_id and status
            const { error: updateError } = await supabase
              .from('finance_transactions')
              .update({
                plaid_transaction_id: tx.transaction_id,
                status: tx.pending ? 'pending' : 'posted',
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingByContentMatch.id);

            if (!updateError) results.transactionsModified++;
            continue;
          }

          const txData = {
            user_id: userId,
            account_id: accountId,
            amount: -tx.amount,
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
            location: tx.location
              ? {
                  city: tx.location.city,
                  region: tx.location.region,
                  country: tx.location.country,
                }
              : null,
            payment_channel: tx.payment_channel || null,
          };

          const { error: upsertError } = await supabase
            .from('finance_transactions')
            .upsert(txData, { onConflict: 'plaid_transaction_id' });

          if (!upsertError) results.transactionsAdded++;
        }
      } catch (error: unknown) {
        const errorObj = error as { response?: { data?: { error_message?: string } }; message?: string };
        const errorMessage = errorObj.response?.data?.error_message || errorObj.message || 'Unknown error';
        results.errors.push(`Item ${itemId}: ${errorMessage}`);

        // Update account with sync error
        await supabase
          .from('finance_accounts')
          .update({ sync_error: errorMessage })
          .eq('plaid_item_id', itemId);
      }
    }

    // Update daily snapshot
    await updateDailySnapshot(userId);

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error: unknown) {
    console.error('Sync error:', error);
    const errorObj = error as { message?: string };
    return NextResponse.json(
      { error: errorObj.message || 'Sync failed' },
      { status: 500 }
    );
  }
}

/**
 * Update or create daily net worth snapshot
 */
async function updateDailySnapshot(userId: string) {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // Get all account balances
    const { data: accounts } = await supabase
      .from('finance_accounts')
      .select('type, balance_current, is_hidden')
      .eq('user_id', userId);

    if (!accounts) return;

    let totalAssets = 0;
    let totalLiabilities = 0;
    let liquidAssets = 0;
    let investments = 0;
    const breakdown: Record<string, number> = {};

    for (const account of accounts) {
      if (account.is_hidden) continue;

      const balance = parseFloat(account.balance_current || '0');
      breakdown[account.type] = (breakdown[account.type] || 0) + Math.abs(balance);

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

    await supabase.from('finance_snapshots').upsert(
      {
        user_id: userId,
        date: today,
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        net_worth: netWorth,
        liquid_assets: liquidAssets,
        investments,
        breakdown,
      },
      { onConflict: 'user_id,date' }
    );
  } catch (error) {
    console.error('Snapshot update error:', error);
  }
}
