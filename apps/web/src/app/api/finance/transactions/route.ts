import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
} from '@/lib/auth/api-auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/finance/transactions
 * Fetch transactions with optional filters for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user from session
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }
    const userId = user.id;

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('finance_transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (accountId) {
      query = query.eq('account_id', accountId);
    }
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform snake_case to camelCase
    const transformedTransactions = data.map((tx) => ({
      id: tx.id,
      userId: tx.user_id,
      accountId: tx.account_id,
      amount: parseFloat(tx.amount),
      date: tx.date,
      datetime: tx.datetime,
      merchantName: tx.merchant_name,
      description: tx.description,
      category: tx.category || [],
      categoryId: tx.category_id,
      plaidTransactionId: tx.plaid_transaction_id,
      isManual: tx.is_manual,
      isRecurring: tx.is_recurring,
      recurringId: tx.recurring_id,
      status: tx.status,
      isTransfer: tx.is_transfer,
      transferPairId: tx.transfer_pair_id,
      logoUrl: tx.logo_url,
      website: tx.website,
      location: tx.location,
      paymentChannel: tx.payment_channel,
      createdAt: tx.created_at,
      updatedAt: tx.updated_at,
    }));

    // Deduplicate transactions by unique key (server-side safety)
    // Key: account_id + date + abs(amount) + normalized_merchant
    const seen = new Map<string, typeof transformedTransactions[0]>();
    for (const tx of transformedTransactions) {
      // Normalize merchant for comparison - keep only letters, first 12 chars
      const merchantText = (tx.merchantName || tx.description || 'unknown').toLowerCase();
      const merchantKey = merchantText
        .replace(/[^a-z]/g, '') // Keep only letters
        .substring(0, 12);
      // Use absolute value to catch sign variations
      const amountKey = Math.abs(tx.amount).toFixed(2);
      const uniqueKey = `${tx.accountId}:${tx.date}:${amountKey}:${merchantKey}`;

      const existing = seen.get(uniqueKey);
      if (!existing) {
        seen.set(uniqueKey, tx);
      } else {
        // Keep the one with earlier createdAt (original)
        const existingTime = new Date(existing.createdAt).getTime();
        const currentTime = new Date(tx.createdAt).getTime();
        if (currentTime < existingTime) {
          seen.set(uniqueKey, tx);
        }
      }
    }

    const transactions = Array.from(seen.values());

    return NextResponse.json({
      transactions,
      total: transactions.length,
      originalCount: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Finance transactions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/finance/transactions
 * Create a new manual transaction for the authenticated user
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
    const {
      accountId,
      amount,
      date,
      merchantName,
      description,
      category,
      status = 'posted',
      isRecurring = false,
      recurringId,
    } = body;

    if (!accountId || amount === undefined || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: accountId, amount, date' },
        { status: 400 }
      );
    }

    // Verify user owns the account
    const { data: account, error: accountError } = await supabase
      .from('finance_accounts')
      .select('user_id')
      .eq('id', accountId)
      .single();

    if (accountError || !account || account.user_id !== userId) {
      return NextResponse.json(
        { error: 'Account not found or access denied' },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from('finance_transactions')
      .insert({
        user_id: userId,
        account_id: accountId,
        amount,
        date,
        merchant_name: merchantName,
        description,
        category: category || [],
        status,
        is_manual: true,
        is_recurring: isRecurring,
        recurring_id: recurringId,
        is_transfer: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      userId: data.user_id,
      accountId: data.account_id,
      amount: parseFloat(data.amount),
      date: data.date,
      merchantName: data.merchant_name,
      description: data.description,
      category: data.category || [],
      status: data.status,
      isManual: data.is_manual,
      isRecurring: data.is_recurring,
      isTransfer: data.is_transfer,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/finance/transactions
 * Update a transaction (must belong to authenticated user)
 */
export async function PUT(request: NextRequest) {
  try {
    // Authenticate user from session
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 });
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('finance_transactions')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Transform camelCase to snake_case for update
    const dbUpdates: Record<string, unknown> = {};
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.merchantName !== undefined) dbUpdates.merchant_name = updates.merchantName;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.isRecurring !== undefined) dbUpdates.is_recurring = updates.isRecurring;

    const { data, error } = await supabase
      .from('finance_transactions')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      userId: data.user_id,
      accountId: data.account_id,
      amount: parseFloat(data.amount),
      date: data.date,
      merchantName: data.merchant_name,
      description: data.description,
      category: data.category || [],
      status: data.status,
      isManual: data.is_manual,
      isRecurring: data.is_recurring,
      updatedAt: data.updated_at,
    });
  } catch (error) {
    console.error('Update transaction error:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/finance/transactions
 * Delete a transaction (must belong to authenticated user)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user from session
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 });
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('finance_transactions')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { error } = await supabase
      .from('finance_transactions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete transaction error:', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}
