import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
} from '@/lib/auth/api-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * GET /api/finance/recurring
 * Fetch recurring items with optional filters for the authenticated user
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
    const daysAhead = parseInt(searchParams.get('days') || '30');
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    let query = supabase
      .from('finance_recurring')
      .select('*')
      .eq('user_id', userId)
      .order('next_due_date', { ascending: true });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    // Optionally filter by upcoming due dates
    if (daysAhead > 0) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);
      query = query.lte('next_due_date', futureDate.toISOString().slice(0, 10));
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Supabase error', { error });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform snake_case to camelCase
    const recurring = data.map((item) => ({
      id: item.id,
      userId: item.user_id,
      accountId: item.account_id,
      name: item.name,
      amount: parseFloat(item.amount),
      frequency: item.frequency,
      category: item.category || [],
      startDate: item.start_date,
      nextDueDate: item.next_due_date,
      endDate: item.end_date,
      dayOfMonth: item.day_of_month,
      dayOfWeek: item.day_of_week,
      autoConfirm: item.auto_confirm,
      reminderDays: item.reminder_days,
      isIncome: item.is_income,
      isActive: item.is_active,
      lastConfirmedDate: item.last_confirmed_date,
      missedCount: item.missed_count,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));

    return NextResponse.json(recurring);
  } catch (error) {
    logger.error('Finance recurring error', { error });
    return NextResponse.json(
      { error: 'Failed to fetch recurring items' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/finance/recurring
 * Create a new recurring item for the authenticated user
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
      name,
      amount,
      frequency,
      category,
      startDate,
      nextDueDate,
      endDate,
      dayOfMonth,
      dayOfWeek,
      autoConfirm = false,
      reminderDays = 3,
      isIncome = false,
    } = body;

    if (!name || amount === undefined || !frequency || !startDate || !nextDueDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('finance_recurring')
      .insert({
        user_id: userId,
        account_id: accountId,
        name,
        amount,
        frequency,
        category: category || [],
        start_date: startDate,
        next_due_date: nextDueDate,
        end_date: endDate,
        day_of_month: dayOfMonth,
        day_of_week: dayOfWeek,
        auto_confirm: autoConfirm,
        reminder_days: reminderDays,
        is_income: isIncome,
        is_active: true,
        missed_count: 0,
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
      amount: parseFloat(data.amount),
      frequency: data.frequency,
      category: data.category || [],
      nextDueDate: data.next_due_date,
      isIncome: data.is_income,
      isActive: data.is_active,
      createdAt: data.created_at,
    });
  } catch (error) {
    logger.error('Create recurring error', { error });
    return NextResponse.json(
      { error: 'Failed to create recurring item' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/finance/recurring
 * Update a recurring item (must belong to authenticated user)
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
      return NextResponse.json({ error: 'Recurring ID required' }, { status: 400 });
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('finance_recurring')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Recurring item not found' }, { status: 404 });
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Transform camelCase to snake_case
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.frequency !== undefined) dbUpdates.frequency = updates.frequency;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.nextDueDate !== undefined) dbUpdates.next_due_date = updates.nextDueDate;
    if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;
    if (updates.autoConfirm !== undefined) dbUpdates.auto_confirm = updates.autoConfirm;
    if (updates.reminderDays !== undefined) dbUpdates.reminder_days = updates.reminderDays;
    if (updates.isIncome !== undefined) dbUpdates.is_income = updates.isIncome;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    if (updates.lastConfirmedDate !== undefined) dbUpdates.last_confirmed_date = updates.lastConfirmedDate;
    if (updates.missedCount !== undefined) dbUpdates.missed_count = updates.missedCount;

    const { data, error } = await supabase
      .from('finance_recurring')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Supabase update error', { error });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      name: data.name,
      amount: parseFloat(data.amount),
      frequency: data.frequency,
      nextDueDate: data.next_due_date,
      isActive: data.is_active,
      updatedAt: data.updated_at,
    });
  } catch (error) {
    logger.error('Update recurring error', { error });
    return NextResponse.json(
      { error: 'Failed to update recurring item' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/finance/recurring
 * Delete a recurring item (must belong to authenticated user)
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
      return NextResponse.json({ error: 'Recurring ID required' }, { status: 400 });
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('finance_recurring')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Recurring item not found' }, { status: 404 });
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { error } = await supabase
      .from('finance_recurring')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Supabase delete error', { error });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Delete recurring error', { error });
    return NextResponse.json(
      { error: 'Failed to delete recurring item' },
      { status: 500 }
    );
  }
}
