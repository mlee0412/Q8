import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
} from '@/lib/auth/api-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * GET /api/finance/accounts
 * Fetch all finance accounts for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user from session
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }
    const userId = user.id;

    const { data, error } = await supabase
      .from('finance_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Supabase error', { error });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform snake_case to camelCase for frontend
    const accounts = data.map((acc) => ({
      id: acc.id,
      userId: acc.user_id,
      name: acc.name,
      type: acc.type,
      subtype: acc.subtype,
      institutionName: acc.institution_name,
      institutionId: acc.institution_id,
      balanceCurrent: parseFloat(acc.balance_current || '0'),
      balanceAvailable: acc.balance_available ? parseFloat(acc.balance_available) : undefined,
      balanceLimit: acc.balance_limit ? parseFloat(acc.balance_limit) : undefined,
      currency: acc.currency,
      plaidItemId: acc.plaid_item_id,
      plaidAccountId: acc.plaid_account_id,
      snaptradeConnectionId: acc.snaptrade_connection_id,
      snaptradeAccountId: acc.snaptrade_account_id,
      isManual: acc.is_manual,
      isHidden: acc.is_hidden,
      lastSyncedAt: acc.last_synced_at,
      syncError: acc.sync_error,
      createdAt: acc.created_at,
      updatedAt: acc.updated_at,
    }));

    return NextResponse.json(accounts);
  } catch (error) {
    logger.error('Finance accounts error', { error });
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/finance/accounts
 * Create a new manual account for the authenticated user
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
      name,
      type,
      subtype,
      institutionName,
      balanceCurrent,
      balanceLimit,
      currency = 'USD',
    } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('finance_accounts')
      .insert({
        user_id: userId,
        name,
        type,
        subtype,
        institution_name: institutionName,
        balance_current: balanceCurrent || 0,
        balance_limit: balanceLimit,
        currency,
        is_manual: true,
        is_hidden: false,
      })
      .select()
      .single();

    if (error) {
      logger.error('Supabase insert error', { error });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      userId: data.user_id,
      name: data.name,
      type: data.type,
      subtype: data.subtype,
      institutionName: data.institution_name,
      balanceCurrent: parseFloat(data.balance_current || '0'),
      balanceLimit: data.balance_limit ? parseFloat(data.balance_limit) : undefined,
      currency: data.currency,
      isManual: data.is_manual,
      isHidden: data.is_hidden,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  } catch (error) {
    logger.error('Create account error', { error });
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
