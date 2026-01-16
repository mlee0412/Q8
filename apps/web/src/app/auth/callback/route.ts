/**
 * Auth Callback Route
 *
 * Handles:
 * - OAuth redirects (Google, GitHub)
 * - Magic link authentication
 * - Email verification after signup
 *
 * Works for both localhost:3000 and production (q8-web.vercel.app)
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Determine the correct origin for redirects
  // This ensures it works for both localhost and production
  const origin = getOrigin(request);

  // Handle OAuth/magic link errors
  if (error) {
    console.error('[Auth Callback] Error:', error, errorDescription);
    const errorMessage = encodeURIComponent(errorDescription || error);
    return NextResponse.redirect(`${origin}/login?error=${errorMessage}`);
  }

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set(name, value, options);
            } catch {
              // The `set` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.delete(name);
            } catch {
              // Ignore - might be called after response started
            }
          },
        },
      }
    );

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      // Successfully authenticated - redirect to intended destination
      // Default to dashboard (/) if no specific redirect
      const redirectPath = next === '/' ? '/' : next;
      console.log('[Auth Callback] Success, redirecting to:', redirectPath);
      return NextResponse.redirect(`${origin}${redirectPath}`);
    }

    console.error('[Auth Callback] Code exchange error:', exchangeError);
    const errorMessage = encodeURIComponent(exchangeError.message);
    return NextResponse.redirect(`${origin}/login?error=${errorMessage}`);
  }

  // No code provided - redirect to login
  return NextResponse.redirect(`${origin}/login`);
}

/**
 * Get the correct origin URL for redirects
 * Handles localhost, Vercel preview, and production deployments
 */
function getOrigin(request: NextRequest): string {
  // Check for forwarded host (common in reverse proxy setups like Vercel)
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  // Check for Vercel URL environment variable
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Fallback to request URL origin
  const url = new URL(request.url);
  return url.origin;
}
