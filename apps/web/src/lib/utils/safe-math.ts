/**
 * Safe Math Evaluation Utility
 *
 * Replaces unsafe `new Function()` calls with mathjs library.
 * Prevents arbitrary code execution from user input.
 */
import { create, all } from 'mathjs';

// Create a mathjs instance with all functions
// Using type assertion since mathjs types mark `all` as potentially undefined
const math = create(all!);

// Store original evaluate before disabling
const safeEval = math.evaluate.bind(math);

// Disable dangerous functions to prevent code injection
math.import(
  {
    import: function () {
      throw new Error('Function import is disabled for security');
    },
    createUnit: function () {
      throw new Error('Function createUnit is disabled for security');
    },
    evaluate: function () {
      throw new Error('Nested evaluate is disabled for security');
    },
    parse: function () {
      throw new Error('Function parse is disabled for security');
    },
    simplify: function () {
      throw new Error('Function simplify is disabled for security');
    },
    derivative: function () {
      throw new Error('Function derivative is disabled for security');
    },
    resolve: function () {
      throw new Error('Function resolve is disabled for security');
    },
    compile: function () {
      throw new Error('Function compile is disabled for security');
    },
    chain: function () {
      throw new Error('Function chain is disabled for security');
    },
  },
  { override: true }
);

/**
 * Safely evaluate a mathematical expression
 *
 * @param expression - The mathematical expression to evaluate (e.g., "sqrt(144)", "2 + 2 * 3")
 * @returns The numeric result of the evaluation
 * @throws Error if the expression is invalid or evaluates to non-number
 *
 * @example
 * safeEvaluate("sqrt(144)") // returns 12
 * safeEvaluate("15% of 200") // returns 30
 * safeEvaluate("(100 + 50) * 2") // returns 300
 */
export function safeEvaluate(expression: string): number {
  if (!expression || typeof expression !== 'string') {
    throw new Error('Expression must be a non-empty string');
  }

  // Normalize common patterns
  let normalizedExpr = expression
    .trim()
    // Handle "X% of Y" pattern
    .replace(/(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:\.\d+)?)/gi, '($1 / 100) * $2')
    // Handle standalone percentage (e.g., "15%" -> 0.15)
    .replace(/(\d+(?:\.\d+)?)\s*%(?!\s*of)/g, '($1 / 100)');

  try {
    const result = safeEval(normalizedExpr);

    // Ensure result is a valid number
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      return result;
    }

    // Handle mathjs BigNumber or other numeric types
    if (
      result !== null &&
      typeof result === 'object' &&
      'toNumber' in result &&
      typeof result.toNumber === 'function'
    ) {
      const numResult = result.toNumber();
      if (!isNaN(numResult) && isFinite(numResult)) {
        return numResult;
      }
    }

    throw new Error('Expression must evaluate to a finite number');
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Invalid expression "${expression}": ${error.message}`);
    }
    throw new Error(`Invalid expression "${expression}"`);
  }
}

/**
 * Safely evaluate a mathematical expression with a fallback value
 *
 * @param expression - The mathematical expression to evaluate
 * @param fallback - The value to return if evaluation fails
 * @returns The numeric result or fallback value
 */
export function safeEvaluateOrDefault(
  expression: string,
  fallback: number
): number {
  try {
    return safeEvaluate(expression);
  } catch {
    return fallback;
  }
}

/**
 * Check if an expression is valid without throwing
 *
 * @param expression - The expression to validate
 * @returns true if the expression can be safely evaluated
 */
export function isValidExpression(expression: string): boolean {
  try {
    safeEvaluate(expression);
    return true;
  } catch {
    return false;
  }
}

/**
 * Evaluate and return a result object (for backwards compatibility)
 *
 * @param expression - The mathematical expression to evaluate
 * @returns Object with expression and result
 */
export function evaluateWithResult(expression: string): {
  expression: string;
  result: number | string;
} {
  try {
    const result = safeEvaluate(expression);
    return { expression, result };
  } catch {
    return { expression, result: 'Could not evaluate expression' };
  }
}
