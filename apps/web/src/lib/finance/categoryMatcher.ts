/**
 * Category Matcher - Fuzzy matching for transaction categorization
 *
 * Provides intelligent merchant name matching with user-defined rules
 * that override the default MERCHANT_CATEGORY_MAP.
 */

import type { FinanceTransaction } from '@/types/finance';
import { categorizeTransaction as defaultCategorize } from '@/types/finance';

// ============================================================
// TYPES
// ============================================================

export interface CategoryRule {
  id: string;
  userId: string;
  merchantPattern: string;
  normalizedPattern: string;
  matchType: 'exact' | 'contains' | 'starts_with' | 'regex';
  category: string;
  sourceTransactionId?: string;
  hitCount: number;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryRuleCreateInput {
  merchantPattern: string;
  matchType?: CategoryRule['matchType'];
  category: string;
  applyToExisting?: boolean;
}

export interface CategorizationResult {
  category: string;
  ruleId?: string;
  isUserSet: boolean;
  confidence: number; // 0-1, how confident we are in this match
}

export interface SimilarMerchant {
  name: string;
  normalizedName: string;
  count: number;
  similarity: number;
}

// ============================================================
// NORMALIZATION
// ============================================================

/**
 * Common suffixes to remove from merchant names
 */
const MERCHANT_SUFFIXES = [
  /\s*#\d+$/i,           // Store number: #123, #4567
  /\s*\d{4,}$/,          // Long numbers at end
  /\s*-\s*\d+$/,         // Dash followed by number
  /\s+store$/i,          // "STORE"
  /\s+location$/i,       // "LOCATION"
  /\s+branch$/i,         // "BRANCH"
  /\s+\d{5}(-\d{4})?$/,  // ZIP codes
  /\s+(inc|llc|ltd|corp|co)\.*$/i,  // Business suffixes
  /\s+\*+.*$/,           // Asterisk and everything after
  /\s+\d{2}\/\d{2}$/,    // Date patterns MM/DD
  /\s+[A-Z]{2}\s*$/,     // State codes at end
];

/**
 * Normalize merchant name for matching
 *
 * - Lowercase
 * - Remove special characters (except spaces and alphanumeric)
 * - Collapse multiple spaces
 * - Remove common suffixes (store numbers, locations, etc.)
 * - Trim whitespace
 *
 * Examples:
 * - "STARBUCKS #12345" → "starbucks"
 * - "MCDONALD'S F1234" → "mcdonalds"
 * - "Amazon.com*AB1CD2EF" → "amazon.com"
 * - "TRADER JOE'S #789 - SEATTLE WA" → "trader joes"
 */
export function normalizeMerchantName(merchantName: string | undefined | null): string {
  if (!merchantName) return '';

  let normalized = merchantName
    .toLowerCase()
    .trim();

  // Remove common suffixes
  for (const suffix of MERCHANT_SUFFIXES) {
    normalized = normalized.replace(suffix, '');
  }

  // Remove special characters except spaces and alphanumeric
  normalized = normalized
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized;
}

/**
 * Generate a pattern from a merchant name that will match similar merchants
 *
 * This extracts the "core" merchant identity, stripping location-specific info
 */
export function generateMerchantPattern(merchantName: string): string {
  return normalizeMerchantName(merchantName);
}

// ============================================================
// SIMILARITY MATCHING
// ============================================================

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // Early exit for empty strings
  if (m === 0) return n;
  if (n === 0) return m;

  // Create matrix with proper initialization
  const matrix: number[][] = [];
  for (let i = 0; i <= m; i++) {
    matrix[i] = new Array(n + 1).fill(0) as number[];
  }

  // Initialize first column and row
  for (let i = 0; i <= m; i++) {
    matrix[i]![0] = i;
  }
  for (let j = 0; j <= n; j++) {
    matrix[0]![j] = j;
  }

  // Fill in the rest
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      const deletion = (matrix[i - 1]?.[j] ?? 0) + 1;
      const insertion = (matrix[i]?.[j - 1] ?? 0) + 1;
      const substitution = (matrix[i - 1]?.[j - 1] ?? 0) + cost;
      matrix[i]![j] = Math.min(deletion, insertion, substitution);
    }
  }

  return matrix[m]?.[n] ?? 0;
}

/**
 * Calculate similarity score between two strings (0-1)
 * 1 = identical, 0 = completely different
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const normalized1 = normalizeMerchantName(str1);
  const normalized2 = normalizeMerchantName(str2);

  if (normalized1 === normalized2) return 1;
  if (normalized1.length === 0 || normalized2.length === 0) return 0;

  // Check if one contains the other (high similarity)
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    const ratio = Math.min(normalized1.length, normalized2.length) /
                  Math.max(normalized1.length, normalized2.length);
    return 0.8 + (ratio * 0.2); // 0.8 - 1.0 range
  }

  // Use Levenshtein distance for general similarity
  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);
  return Math.max(0, 1 - distance / maxLength);
}

/**
 * Find similar merchants from a list of transactions
 *
 * @param merchantName The merchant to find similar ones for
 * @param transactions List of transactions to search
 * @param threshold Minimum similarity score (0-1), default 0.7
 * @returns Array of similar merchants with their similarity scores
 */
export function findSimilarMerchants(
  merchantName: string,
  transactions: FinanceTransaction[],
  threshold = 0.7
): SimilarMerchant[] {
  const normalizedTarget = normalizeMerchantName(merchantName);
  if (!normalizedTarget) return [];

  // Group transactions by normalized merchant name
  const merchantCounts = new Map<string, { original: string; count: number }>();

  for (const tx of transactions) {
    if (!tx.merchantName) continue;

    const normalized = normalizeMerchantName(tx.merchantName);
    if (!normalized) continue;

    const existing = merchantCounts.get(normalized);
    if (existing) {
      existing.count++;
    } else {
      merchantCounts.set(normalized, { original: tx.merchantName, count: 1 });
    }
  }

  // Find similar merchants
  const similar: SimilarMerchant[] = [];

  for (const [normalized, { original, count }] of merchantCounts) {
    const similarity = calculateSimilarity(normalizedTarget, normalized);

    if (similarity >= threshold) {
      similar.push({
        name: original,
        normalizedName: normalized,
        count,
        similarity,
      });
    }
  }

  // Sort by similarity (descending) then by count (descending)
  similar.sort((a, b) => {
    if (b.similarity !== a.similarity) return b.similarity - a.similarity;
    return b.count - a.count;
  });

  return similar;
}

// ============================================================
// RULE MATCHING
// ============================================================

/**
 * Check if a merchant name matches a rule pattern
 */
function matchesRule(
  normalizedMerchant: string,
  rule: CategoryRule
): boolean {
  if (!rule.isActive) return false;

  switch (rule.matchType) {
    case 'exact':
      return normalizedMerchant === rule.normalizedPattern;

    case 'starts_with':
      return normalizedMerchant.startsWith(rule.normalizedPattern);

    case 'contains':
      return normalizedMerchant.includes(rule.normalizedPattern);

    case 'regex':
      try {
        const regex = new RegExp(rule.normalizedPattern, 'i');
        return regex.test(normalizedMerchant);
      } catch {
        // Invalid regex, skip this rule
        return false;
      }

    default:
      return false;
  }
}

/**
 * Categorize a transaction using user rules first, then default map
 *
 * Priority order:
 * 1. User rules (sorted by priority)
 * 2. Default MERCHANT_CATEGORY_MAP
 *
 * @param merchantName The merchant name from the transaction
 * @param description Optional description for fallback matching
 * @param userRules Array of user-defined category rules
 * @returns Categorization result with category and metadata
 */
export function categorizeWithUserRules(
  merchantName: string | undefined,
  description: string | undefined,
  userRules: CategoryRule[]
): CategorizationResult {
  const normalizedMerchant = normalizeMerchantName(merchantName);

  // 1. Try user rules first (sorted by priority descending)
  const sortedRules = [...userRules]
    .filter((r) => r.isActive)
    .sort((a, b) => b.priority - a.priority);

  for (const rule of sortedRules) {
    if (matchesRule(normalizedMerchant, rule)) {
      return {
        category: rule.category,
        ruleId: rule.id,
        isUserSet: true,
        confidence: 1.0, // User rules are always high confidence
      };
    }
  }

  // 2. Fall back to default categorization
  const defaultCategory = defaultCategorize(merchantName, description);

  return {
    category: defaultCategory,
    ruleId: undefined,
    isUserSet: false,
    confidence: defaultCategory === 'Other' ? 0.2 : 0.7,
  };
}

/**
 * Find transactions that would match a given pattern
 *
 * Useful for previewing which transactions a rule would affect
 */
export function findMatchingTransactions(
  pattern: string,
  matchType: CategoryRule['matchType'],
  transactions: FinanceTransaction[]
): FinanceTransaction[] {
  const normalizedPattern = normalizeMerchantName(pattern);
  if (!normalizedPattern) return [];

  const mockRule: CategoryRule = {
    id: 'preview',
    userId: '',
    merchantPattern: pattern,
    normalizedPattern,
    matchType,
    category: '',
    hitCount: 0,
    isActive: true,
    priority: 0,
    createdAt: '',
    updatedAt: '',
  };

  return transactions.filter((tx) => {
    const normalizedMerchant = normalizeMerchantName(tx.merchantName);
    return matchesRule(normalizedMerchant, mockRule);
  });
}

/**
 * Suggest a match type based on the pattern
 *
 * - Short patterns (< 5 chars) → contains
 * - Patterns with special chars → regex
 * - Otherwise → contains (safest default)
 */
export function suggestMatchType(pattern: string): CategoryRule['matchType'] {
  const normalized = normalizeMerchantName(pattern);

  // If pattern has regex special characters, suggest regex
  if (/[.*+?^${}()|[\]\\]/.test(pattern)) {
    return 'regex';
  }

  // Short patterns are more likely to cause false positives with 'contains'
  if (normalized.length < 4) {
    return 'exact';
  }

  // Default to 'contains' for most cases
  return 'contains';
}

// ============================================================
// BULK OPERATIONS
// ============================================================

/**
 * Recategorize all transactions that match a pattern
 *
 * Returns the count of transactions that would be affected
 */
export function countAffectedTransactions(
  pattern: string,
  matchType: CategoryRule['matchType'],
  transactions: FinanceTransaction[]
): number {
  return findMatchingTransactions(pattern, matchType, transactions).length;
}

/**
 * Get unique merchants from transactions grouped by normalized name
 */
export function getUniqueMerchants(
  transactions: FinanceTransaction[]
): Map<string, { original: string; count: number; categories: Set<string> }> {
  const merchants = new Map<string, { original: string; count: number; categories: Set<string> }>();

  for (const tx of transactions) {
    if (!tx.merchantName) continue;

    const normalized = normalizeMerchantName(tx.merchantName);
    if (!normalized) continue;

    const existing = merchants.get(normalized);
    if (existing) {
      existing.count++;
      tx.category.forEach((cat) => existing.categories.add(cat));
    } else {
      merchants.set(normalized, {
        original: tx.merchantName,
        count: 1,
        categories: new Set(tx.category),
      });
    }
  }

  return merchants;
}
