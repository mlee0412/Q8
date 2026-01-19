import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
} from '@/lib/auth/api-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * GET /api/finance/snapshots
 * Fetch net worth snapshots for the authenticated user
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
    const days = parseInt(searchParams.get('days') || '30');

    // Calculate start date
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('finance_snapshots')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().slice(0, 10))
      .order('date', { ascending: true });

    if (error) {
      logger.error('Supabase error', { error });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform snake_case to camelCase
    const snapshots = data.map((s) => ({
      id: s.id,
      userId: s.user_id,
      date: s.date,
      totalAssets: parseFloat(s.total_assets),
      totalLiabilities: parseFloat(s.total_liabilities),
      netWorth: parseFloat(s.net_worth),
      liquidAssets: parseFloat(s.liquid_assets),
      investments: parseFloat(s.investments || '0'),
      breakdown: s.breakdown,
      createdAt: s.created_at,
    }));

    return NextResponse.json(snapshots);
  } catch (error) {
    logger.error('Snapshots error', { error });
    return NextResponse.json(
      { error: 'Failed to fetch snapshots' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/finance/snapshots
 * Create or update a daily snapshot for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user from session
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }
    const userId = user.id;

    const today = new Date().toISOString().slice(0, 10);

    // Get all account balances for this user
    const { data: accounts, error: accountsError } = await supabase
      .from('finance_accounts')
      .select('type, balance_current, is_hidden')
      .eq('user_id', userId);

    if (accountsError) {
      return NextResponse.json({ error: accountsError.message }, { status: 500 });
    }

    // Calculate totals
    let totalAssets = 0;
    let totalLiabilities = 0;
    let liquidAssets = 0;
    let investments = 0;
    const breakdown: Record<string, number> = {};

    for (const account of accounts || []) {
      if (account.is_hidden) continue;

      const balance = parseFloat(account.balance_current || '0');
      const absBalance = Math.abs(balance);
      breakdown[account.type] = (breakdown[account.type] || 0) + absBalance;

      if (['depository', 'investment', 'cash', 'crypto'].includes(account.type)) {
        totalAssets += balance;
        if (['depository', 'cash'].includes(account.type)) {
          liquidAssets += balance;
        }
        if (['investment', 'crypto'].includes(account.type)) {
          investments += balance;
        }
      } else {
        totalLiabilities += absBalance;
      }
    }

    const netWorth = totalAssets - totalLiabilities;

    // Upsert snapshot
    const { data, error } = await supabase
      .from('finance_snapshots')
      .upsert(
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
      )
      .select()
      .single();

    if (error) {
      logger.error('Supabase upsert error', { error });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      date: data.date,
      netWorth: parseFloat(data.net_worth),
      totalAssets: parseFloat(data.total_assets),
      totalLiabilities: parseFloat(data.total_liabilities),
      liquidAssets: parseFloat(data.liquid_assets),
      investments: parseFloat(data.investments || '0'),
    });
  } catch (error) {
    logger.error('Create snapshot error', { error });
    return NextResponse.json(
      { error: 'Failed to create snapshot' },
      { status: 500 }
    );
  }
}
