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
import { clientEnv } from '@/lib/env';
import { logger } from '@/lib/logger';

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
    logger.error('Auth callback error', { error, errorDescription, route: 'auth/callback' });
    const errorMessage = encodeURIComponent(errorDescription || error);
    return NextResponse.redirect(`${origin}/login?error=${errorMessage}`);
  }

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      clientEnv.NEXT_PUBLIC_SUPABASE_URL,
      clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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

    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    // Check if user has Google identity linked (works even if original signup was email)
    const identities = data.session?.user?.identities || [];
    const hasGoogleIdentity = identities.some(
      (identity: { provider: string }) => identity.provider === 'google'
    );
    const appMetadataProvider = data.session?.user?.app_metadata?.provider;

    // Debug: Log what we received from Supabase
    logger.info('Auth callback - session data', {
      hasSession: !!data.session,
      hasProviderToken: !!data.session?.provider_token,
      hasRefreshToken: !!data.session?.provider_refresh_token,
      appMetadataProvider,
      hasGoogleIdentity,
      identityProviders: identities.map((i: { provider: string }) => i.provider),
      userId: data.session?.user?.id,
    });

    if (!exchangeError && data.session) {
      // Successfully authenticated - redirect to intended destination
      const redirectPath = next === '/' ? '/' : next;
      logger.info('Auth callback success', { redirectPath, route: 'auth/callback' });

      const response = NextResponse.redirect(`${origin}${redirectPath}`);

      // Store Google provider token if present (for YouTube API access)
      // Check: has provider_token AND (app_metadata says google OR has google identity linked)
      // This handles both fresh Google signups AND email users who link/login with Google
      if (data.session.provider_token && (appMetadataProvider === 'google' || hasGoogleIdentity)) {
        logger.info('Google provider token found', {
          tokenLength: data.session.provider_token.length,
          source: appMetadataProvider === 'google' ? 'primary_google' : 'linked_google_identity'
        });

        // Store the Google access token in a secure HTTP-only cookie
        response.cookies.set('google_provider_token', data.session.provider_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60, // 1 hour (Google tokens expire)
          path: '/',
        });

        // Store refresh token if available (for token refresh)
        if (data.session.provider_refresh_token) {
          response.cookies.set('google_refresh_token', data.session.provider_refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: '/',
          });
        }

        logger.info('Stored Google provider tokens', {
          hasAccessToken: true,
          hasRefreshToken: !!data.session.provider_refresh_token
        });
      } else if (data.session.provider_token) {
        // Log when we have a token but didn't store it (for debugging)
        logger.info('Provider token present but not stored as Google', {
          appMetadataProvider,
          hasGoogleIdentity,
          tokenLength: data.session.provider_token.length
        });
      }

      return response;
    }

    logger.error('Auth code exchange error', { error: exchangeError, route: 'auth/callback' });
    const errorMessage = encodeURIComponent(exchangeError?.message || 'Authentication failed');
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
