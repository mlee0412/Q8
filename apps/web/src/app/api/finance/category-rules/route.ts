import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeMerchantName } from '@/lib/finance/categoryMatcher';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
} from '@/lib/auth/api-auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/finance/category-rules
 * Fetch all category rules for the authenticated user
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
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let query = supabase
      .from('finance_category_rules')
      .select('*')
      .eq('user_id', userId)
      .order('priority', { ascending: false })
      .order('hit_count', { ascending: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform snake_case to camelCase
    const rules = data.map((rule) => ({
      id: rule.id,
      userId: rule.user_id,
      merchantPattern: rule.merchant_pattern,
      normalizedPattern: rule.normalized_pattern,
      matchType: rule.match_type,
      category: rule.category,
      sourceTransactionId: rule.source_transaction_id,
      hitCount: rule.hit_count,
      isActive: rule.is_active,
      priority: rule.priority,
      createdAt: rule.created_at,
      updatedAt: rule.updated_at,
    }));

    return NextResponse.json({ rules });
  } catch (error) {
    console.error('Fetch category rules error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category rules' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/finance/category-rules
 * Create a new category rule for the authenticated user
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
      merchantPattern,
      matchType = 'contains',
      category,
      sourceTransactionId,
      priority = 0,
    } = body;

    if (!merchantPattern || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: merchantPattern, category' },
        { status: 400 }
      );
    }

    const normalizedPattern = normalizeMerchantName(merchantPattern);

    if (!normalizedPattern) {
      return NextResponse.json(
        { error: 'Invalid merchant pattern' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('finance_category_rules')
      .insert({
        user_id: userId,
        merchant_pattern: merchantPattern,
        normalized_pattern: normalizedPattern,
        match_type: matchType,
        category,
        source_transaction_id: sourceTransactionId || null,
        priority,
        is_active: true,
        hit_count: 0,
      })
      .select()
      .single();

    if (error) {
      // Handle duplicate rule
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A rule with this pattern already exists' },
          { status: 409 }
        );
      }
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      userId: data.user_id,
      merchantPattern: data.merchant_pattern,
      normalizedPattern: data.normalized_pattern,
      matchType: data.match_type,
      category: data.category,
      sourceTransactionId: data.source_transaction_id,
      hitCount: data.hit_count,
      isActive: data.is_active,
      priority: data.priority,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  } catch (error) {
    console.error('Create category rule error:', error);
    return NextResponse.json(
      { error: 'Failed to create category rule' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/finance/category-rules
 * Update an existing category rule (must belong to authenticated user)
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
      return NextResponse.json({ error: 'Rule ID required' }, { status: 400 });
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('finance_category_rules')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Transform camelCase to snake_case for update
    const dbUpdates: Record<string, unknown> = {};

    if (updates.merchantPattern !== undefined) {
      dbUpdates.merchant_pattern = updates.merchantPattern;
      dbUpdates.normalized_pattern = normalizeMerchantName(updates.merchantPattern);
    }
    if (updates.matchType !== undefined) dbUpdates.match_type = updates.matchType;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;

    const { data, error } = await supabase
      .from('finance_category_rules')
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
      merchantPattern: data.merchant_pattern,
      normalizedPattern: data.normalized_pattern,
      matchType: data.match_type,
      category: data.category,
      sourceTransactionId: data.source_transaction_id,
      hitCount: data.hit_count,
      isActive: data.is_active,
      priority: data.priority,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  } catch (error) {
    console.error('Update category rule error:', error);
    return NextResponse.json(
      { error: 'Failed to update category rule' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/finance/category-rules
 * Delete a category rule (must belong to authenticated user)
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
      return NextResponse.json({ error: 'Rule ID required' }, { status: 400 });
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('finance_category_rules')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { error } = await supabase
      .from('finance_category_rules')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete category rule error:', error);
    return NextResponse.json(
      { error: 'Failed to delete category rule' },
      { status: 500 }
    );
  }
}
