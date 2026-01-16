/**
 * Safe JSON Parsing Utilities
 * Provides type-safe JSON parsing with error handling
 */

import { z, ZodSchema } from 'zod';

/**
 * Result type for parse operations
 */
export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: Error; raw?: string };

/**
 * Safely parse JSON string with type inference
 *
 * @param text - The JSON string to parse
 * @param fallback - Optional fallback value if parsing fails
 * @returns Parsed value or fallback
 *
 * @example
 * const data = safeJsonParse<User>(jsonString);
 * if (data) {
 *   console.log(data.name);
 * }
 */
export function safeJsonParse<T = unknown>(
  text: string | null | undefined,
  fallback?: T
): T | undefined {
  if (text === null || text === undefined) {
    return fallback;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

/**
 * Parse JSON with detailed result including error information
 *
 * @param text - The JSON string to parse
 * @returns ParseResult with success status and data or error
 *
 * @example
 * const result = safeJsonParseResult<Config>(configString);
 * if (result.success) {
 *   applyConfig(result.data);
 * } else {
 *   console.error('Parse failed:', result.error.message);
 * }
 */
export function safeJsonParseResult<T = unknown>(
  text: string | null | undefined
): ParseResult<T> {
  if (text === null || text === undefined) {
    return {
      success: false,
      error: new Error('Input is null or undefined'),
    };
  }

  try {
    const data = JSON.parse(text) as T;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      raw: text,
    };
  }
}

/**
 * Parse JSON with Zod schema validation
 *
 * @param text - The JSON string to parse
 * @param schema - Zod schema to validate against
 * @returns Validated data or undefined if parsing/validation fails
 *
 * @example
 * const userSchema = z.object({ name: z.string(), age: z.number() });
 * const user = safeJsonParseWithSchema(jsonString, userSchema);
 * // user is now fully typed and validated
 */
export function safeJsonParseWithSchema<T>(
  text: string | null | undefined,
  schema: ZodSchema<T>
): T | undefined {
  if (text === null || text === undefined) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(text);
    const result = schema.safeParse(parsed);
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Parse JSON with Zod schema validation and detailed result
 *
 * @param text - The JSON string to parse
 * @param schema - Zod schema to validate against
 * @returns ParseResult with success status, validated data, or error
 *
 * @example
 * const result = safeJsonParseWithSchemaResult(jsonString, userSchema);
 * if (result.success) {
 *   saveUser(result.data);
 * } else {
 *   logError('Validation failed:', result.error);
 * }
 */
export function safeJsonParseWithSchemaResult<T>(
  text: string | null | undefined,
  schema: ZodSchema<T>
): ParseResult<T> {
  if (text === null || text === undefined) {
    return {
      success: false,
      error: new Error('Input is null or undefined'),
    };
  }

  try {
    const parsed = JSON.parse(text);
    const result = schema.safeParse(parsed);

    if (result.success) {
      return { success: true, data: result.data };
    }

    return {
      success: false,
      error: new Error(result.error.message),
      raw: text,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      raw: text,
    };
  }
}

/**
 * Safely stringify an object to JSON
 *
 * @param value - The value to stringify
 * @param replacer - Optional replacer function
 * @param space - Optional spacing for pretty printing
 * @returns JSON string or undefined if stringify fails
 *
 * @example
 * const json = safeJsonStringify({ circular: ref });
 * if (json) {
 *   sendToServer(json);
 * }
 */
export function safeJsonStringify(
  value: unknown,
  replacer?: (key: string, value: unknown) => unknown,
  space?: string | number
): string | undefined {
  try {
    return JSON.stringify(value, replacer, space);
  } catch {
    return undefined;
  }
}

/**
 * Parse JSON from a possibly truncated or malformed string
 * Attempts to recover partial data
 *
 * @param text - The potentially truncated JSON string
 * @returns Parsed value or undefined
 *
 * @example
 * // Handle streaming JSON that might be incomplete
 * const partial = safeJsonParseTruncated(incompleteJson);
 */
export function safeJsonParseTruncated<T = unknown>(
  text: string | null | undefined
): T | undefined {
  if (text === null || text === undefined) {
    return undefined;
  }

  // Try normal parse first
  try {
    return JSON.parse(text) as T;
  } catch {
    // Attempt to fix common truncation issues
  }

  // Try to close unclosed braces/brackets
  let fixed = text.trim();

  // Count open/close braces and brackets
  let braceCount = 0;
  let bracketCount = 0;
  let inString = false;
  let escapeNext = false;

  for (const char of fixed) {
    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
      if (char === '[') bracketCount++;
      if (char === ']') bracketCount--;
    }
  }

  // If in string, close it
  if (inString) {
    fixed += '"';
  }

  // Close unclosed brackets/braces
  while (bracketCount > 0) {
    fixed += ']';
    bracketCount--;
  }
  while (braceCount > 0) {
    fixed += '}';
    braceCount--;
  }

  // Try parsing the fixed string
  try {
    return JSON.parse(fixed) as T;
  } catch {
    return undefined;
  }
}
