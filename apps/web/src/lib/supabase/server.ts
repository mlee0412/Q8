/**
 * Supabase Server Client
 * For server-side operations with service role key
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Supabase admin client for server-side operations
 * Uses service role key - BYPASSES ALL ROW-LEVEL SECURITY (RLS)
 *
 * @warning ADMIN CLIENT - Bypasses RLS! Only use for:
 * - Database migrations and schema changes
 * - Batch administrative operations
 * - System-level operations (not user-scoped data)
 * - Background jobs that need full database access
 *
 * @danger NEVER use this client with user-supplied userId parameters!
 * For user-scoped data, use createServerClient() with user's access token
 * or getAuthenticatedUser() from '@/lib/auth/api-auth'
 *
 * @example
 * // WRONG - Security vulnerability!
 * const userId = request.query.userId;
 * supabaseAdmin.from('notes').select('*').eq('user_id', userId);
 *
 * // CORRECT - Use authenticated client
 * const user = await getAuthenticatedUser(request);
 * const client = createServerClient(accessToken);
 * client.from('notes').select('*'); // RLS filters automatically
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Create a Supabase client for a specific user context
 * Useful when you need RLS to apply
 */
export function createServerClient(accessToken?: string) {
  return createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}
