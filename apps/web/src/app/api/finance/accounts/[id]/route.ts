import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/finance/accounts/[id]
 * Fetch a single finance account
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('finance_accounts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform snake_case to camelCase
    const account = {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      type: data.type,
      subtype: data.subtype,
      institutionName: data.institution_name,
      institutionId: data.institution_id,
      balanceCurrent: parseFloat(data.balance_current || '0'),
      balanceAvailable: data.balance_available ? parseFloat(data.balance_available) : undefined,
      balanceLimit: data.balance_limit ? parseFloat(data.balance_limit) : undefined,
      currency: data.currency,
      plaidItemId: data.plaid_item_id,
      plaidAccountId: data.plaid_account_id,
      snaptradeConnectionId: data.snaptrade_connection_id,
      snaptradeAccountId: data.snaptrade_account_id,
      isManual: data.is_manual,
      isHidden: data.is_hidden,
      lastSyncedAt: data.last_synced_at,
      syncError: data.sync_error,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json(account);
  } catch (error) {
    console.error('Get account error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/finance/accounts/[id]
 * Update a finance account
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Build update object - transform camelCase to snake_case
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.type !== undefined) updates.type = body.type;
    if (body.subtype !== undefined) updates.subtype = body.subtype;
    if (body.institutionName !== undefined) updates.institution_name = body.institutionName;
    if (body.balanceCurrent !== undefined) updates.balance_current = body.balanceCurrent;
    if (body.balanceAvailable !== undefined) updates.balance_available = body.balanceAvailable;
    if (body.balanceLimit !== undefined) updates.balance_limit = body.balanceLimit;
    if (body.currency !== undefined) updates.currency = body.currency;
    if (body.isHidden !== undefined) updates.is_hidden = body.isHidden;
    if (body.syncError !== undefined) updates.sync_error = body.syncError;

    // Always update the updated_at timestamp
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('finance_accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }
      console.error('Supabase update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform back to camelCase for response
    const account = {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      type: data.type,
      subtype: data.subtype,
      institutionName: data.institution_name,
      institutionId: data.institution_id,
      balanceCurrent: parseFloat(data.balance_current || '0'),
      balanceAvailable: data.balance_available ? parseFloat(data.balance_available) : undefined,
      balanceLimit: data.balance_limit ? parseFloat(data.balance_limit) : undefined,
      currency: data.currency,
      plaidItemId: data.plaid_item_id,
      plaidAccountId: data.plaid_account_id,
      snaptradeConnectionId: data.snaptrade_connection_id,
      snaptradeAccountId: data.snaptrade_account_id,
      isManual: data.is_manual,
      isHidden: data.is_hidden,
      lastSyncedAt: data.last_synced_at,
      syncError: data.sync_error,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json(account);
  } catch (error) {
    console.error('Update account error:', error);
    return NextResponse.json(
      { error: 'Failed to update account' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/finance/accounts/[id]
 * Delete a finance account (manual accounts only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // First check if account exists and is manual
    const { data: existing, error: fetchError } = await supabase
      .from('finance_accounts')
      .select('is_manual')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Only allow deletion of manual accounts
    if (!existing.is_manual) {
      return NextResponse.json(
        { error: 'Cannot delete linked accounts. Please unlink from Plaid/SnapTrade instead.' },
        { status: 400 }
      );
    }

    // Delete associated transactions first
    await supabase
      .from('finance_transactions')
      .delete()
      .eq('account_id', id);

    // Delete the account
    const { error: deleteError } = await supabase
      .from('finance_accounts')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Supabase delete error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
