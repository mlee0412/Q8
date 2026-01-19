import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/auth/api-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * GET /api/finance/accounts/[id]
 * Fetch a single finance account (must belong to authenticated user)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user from session
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

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
      logger.error('Supabase error', { error });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Verify ownership
    if (data.user_id !== user.id) {
      return forbiddenResponse('You do not have access to this account');
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
    logger.error('Get account error', { error });
    return NextResponse.json(
      { error: 'Failed to fetch account' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/finance/accounts/[id]
 * Update a finance account (must belong to authenticated user)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user from session
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const { id } = await params;

    // First verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('finance_accounts')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (existing.user_id !== user.id) {
      return forbiddenResponse('You do not have access to this account');
    }

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
      logger.error('Supabase update error', { error });
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
    logger.error('Update account error', { error });
    return NextResponse.json(
      { error: 'Failed to update account' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/finance/accounts/[id]
 * Delete a finance account (manual accounts only, must belong to authenticated user)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user from session
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const { id } = await params;

    // First check if account exists and verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('finance_accounts')
      .select('user_id, is_manual')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Verify ownership
    if (existing.user_id !== user.id) {
      return forbiddenResponse('You do not have access to this account');
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
      logger.error('Supabase delete error', { error: deleteError });
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    logger.error('Delete account error', { error });
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
