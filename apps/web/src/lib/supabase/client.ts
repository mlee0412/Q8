import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Supabase client for browser-side authentication and data operations
 *
 * Uses @supabase/ssr for proper cookie-based session handling
 * that works seamlessly with server-side auth callbacks.
 *
 * Features:
 * - Cookie-based session storage (syncs with server)
 * - Auto token refresh
 * - OAuth redirect handling
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
