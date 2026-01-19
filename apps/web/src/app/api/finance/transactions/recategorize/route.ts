import { NextRequest, NextResponse } from 'next/server';
import {
  normalizeMerchantName,
  generateMerchantPattern,
  suggestMatchType,
} from '@/lib/finance/categoryMatcher';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
} from '@/lib/auth/api-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

interface RecategorizeRequest {
  transactionId: string;
  newCategory: string;
  createRule?: boolean;
  applyToSimilar?: boolean;
  ruleMatchType?: 'exact' | 'contains' | 'starts_with' | 'regex';
  customPattern?: string;
}

/**
 * Check if category rules table and columns exist
 */
async function checkCategoryRulesSupport(): Promise<boolean> {
  try {
    // Try to query the category_rules table
    const { error } = await supabase
      .from('finance_category_rules')
      .select('id')
      .limit(1);

    return !error;
  } catch {
    return false;
  }
}

/**
 * POST /api/finance/transactions/recategorize
 *
 * Recategorize a transaction with optional rule creation and bulk application
 *
 * - Updates the specified transaction's category
 * - Optionally creates a rule for future transactions (if migration applied)
 * - Optionally applies to all similar existing transactions
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user from session
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }
    const userId = user.id;

    const body: RecategorizeRequest = await request.json();
    const {
      transactionId,
      newCategory,
      createRule = false,
      applyToSimilar = false,
      ruleMatchType,
      customPattern,
    } = body;

    if (!transactionId || !newCategory) {
      return NextResponse.json(
        { error: 'Missing required fields: transactionId, newCategory' },
        { status: 400 }
      );
    }

    // 1. Get the original transaction
    const { data: transaction, error: txError } = await supabase
      .from('finance_transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (txError || !transaction) {
      logger.error('Transaction fetch error', { txError });
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Verify user owns this transaction
    if (transaction.user_id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const merchantName = transaction.merchant_name || '';
    const pattern = customPattern || generateMerchantPattern(merchantName);
    const normalizedPattern = normalizeMerchantName(pattern);
    const matchType = ruleMatchType || suggestMatchType(pattern);

    // Check if category rules feature is available
    const categoryRulesSupported = await checkCategoryRulesSupport();

    let ruleId: string | null = null;
    let affectedCount = 0;

    // 2. Create rule if requested AND supported
    if (createRule && normalizedPattern && categoryRulesSupported) {
      try {
        const { data: existingRule } = await supabase
          .from('finance_category_rules')
          .select('id')
          .eq('user_id', userId)
          .eq('normalized_pattern', normalizedPattern)
          .single();

        if (existingRule) {
          // Update existing rule
          const { data: updatedRule, error: updateError } = await supabase
            .from('finance_category_rules')
            .update({
              category: newCategory,
              match_type: matchType,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingRule.id)
            .select('id')
            .single();

          if (!updateError && updatedRule) {
            ruleId = updatedRule.id;
          }
        } else {
          // Create new rule
          const { data: newRule, error: ruleError } = await supabase
            .from('finance_category_rules')
            .insert({
              user_id: userId,
              merchant_pattern: pattern,
              normalized_pattern: normalizedPattern,
              match_type: matchType,
              category: newCategory,
              source_transaction_id: transactionId,
              priority: 0,
              is_active: true,
              hit_count: 0,
            })
            .select('id')
            .single();

          if (!ruleError && newRule) {
            ruleId = newRule.id;
          }
        }
      } catch (ruleErr) {
        logger.warn('Rule creation skipped', { ruleErr });
        // Continue without rule creation
      }
    }

    // 3. Update the original transaction
    // Try with extended columns first, fall back to basic update
    let updateSuccess = false;

    if (categoryRulesSupported) {
      // Full update with category rule columns
      const { error: updateError } = await supabase
        .from('finance_transactions')
        .update({
          user_category: newCategory,
          category: [newCategory],
          is_category_user_set: true,
          category_rule_id: ruleId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transactionId);

      if (!updateError) {
        updateSuccess = true;
      } else {
        logger.warn('Full update failed, trying basic update', { updateError });
      }
    }

    // Fallback: Basic update without extended columns
    if (!updateSuccess) {
      const { error: basicUpdateError } = await supabase
        .from('finance_transactions')
        .update({
          category: [newCategory],
          updated_at: new Date().toISOString(),
        })
        .eq('id', transactionId);

      if (basicUpdateError) {
        logger.error('Error updating transaction', { basicUpdateError });
        return NextResponse.json(
          { error: `Failed to update transaction: ${basicUpdateError.message}` },
          { status: 500 }
        );
      }
    }

    affectedCount = 1;

    // 4. Apply to similar transactions if requested
    if (applyToSimilar && normalizedPattern) {
      // Find similar transactions by merchant name pattern
      const { data: allTransactions, error: fetchError } = await supabase
        .from('finance_transactions')
        .select('id, merchant_name')
        .eq('user_id', userId)
        .neq('id', transactionId);

      if (!fetchError && allTransactions) {
        const matchingIds: string[] = [];

        for (const tx of allTransactions) {
          const txNormalized = normalizeMerchantName(tx.merchant_name);
          let matches = false;

          switch (matchType) {
            case 'exact':
              matches = txNormalized === normalizedPattern;
              break;
            case 'starts_with':
              matches = txNormalized.startsWith(normalizedPattern);
              break;
            case 'contains':
              matches = txNormalized.includes(normalizedPattern);
              break;
            case 'regex':
              try {
                const regex = new RegExp(normalizedPattern, 'i');
                matches = regex.test(txNormalized);
              } catch {
                matches = false;
              }
              break;
          }

          if (matches) {
            matchingIds.push(tx.id);
          }
        }

        if (matchingIds.length > 0) {
          // Try full update first
          let bulkSuccess = false;

          if (categoryRulesSupported) {
            const { error: bulkError, count } = await supabase
              .from('finance_transactions')
              .update({
                user_category: newCategory,
                category: [newCategory],
                is_category_user_set: true,
                category_rule_id: ruleId,
                updated_at: new Date().toISOString(),
              })
              .in('id', matchingIds);

            if (!bulkError) {
              bulkSuccess = true;
              affectedCount += count || matchingIds.length;
            }
          }

          // Fallback to basic update
          if (!bulkSuccess) {
            const { error: basicBulkError, count } = await supabase
              .from('finance_transactions')
              .update({
                category: [newCategory],
                updated_at: new Date().toISOString(),
              })
              .in('id', matchingIds);

            if (!basicBulkError) {
              affectedCount += count || matchingIds.length;
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      transactionId,
      newCategory,
      ruleId,
      ruleCreated: !!ruleId,
      affectedCount,
      pattern: normalizedPattern,
      matchType,
      categoryRulesSupported,
    });
  } catch (error) {
    logger.error('Recategorize error', { error });
    return NextResponse.json(
      { error: 'Failed to recategorize transaction' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/finance/transactions/recategorize
 *
 * Preview similar transactions that would be affected by a rule
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
    const merchantName = searchParams.get('merchantName');
    const matchType = searchParams.get('matchType') as 'exact' | 'contains' | 'starts_with' | 'regex' | null;

    if (!merchantName) {
      return NextResponse.json(
        { error: 'Missing required param: merchantName' },
        { status: 400 }
      );
    }

    const pattern = generateMerchantPattern(merchantName);
    const normalizedPattern = normalizeMerchantName(pattern);
    const resolvedMatchType = matchType || suggestMatchType(pattern);

    // Fetch all user transactions
    const { data: transactions, error } = await supabase
      .from('finance_transactions')
      .select('id, merchant_name, amount, date, category')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1000);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Find matching transactions
    const matchingTransactions = (transactions || []).filter((tx) => {
      const txNormalized = normalizeMerchantName(tx.merchant_name);

      switch (resolvedMatchType) {
        case 'exact':
          return txNormalized === normalizedPattern;
        case 'starts_with':
          return txNormalized.startsWith(normalizedPattern);
        case 'contains':
          return txNormalized.includes(normalizedPattern);
        case 'regex':
          try {
            const regex = new RegExp(normalizedPattern, 'i');
            return regex.test(txNormalized);
          } catch {
            return false;
          }
        default:
          return false;
      }
    });

    return NextResponse.json({
      pattern: normalizedPattern,
      matchType: resolvedMatchType,
      count: matchingTransactions.length,
      transactions: matchingTransactions.slice(0, 50).map((tx) => ({
        id: tx.id,
        merchantName: tx.merchant_name,
        amount: parseFloat(tx.amount),
        date: tx.date,
        category: tx.category,
      })),
    });
  } catch (error) {
    logger.error('Preview recategorize error', { error });
    return NextResponse.json(
      { error: 'Failed to preview similar transactions' },
      { status: 500 }
    );
  }
}
