/**
 * Debug endpoint to check Google OAuth token status
 * GET /api/debug/google-token
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { clientEnv } from '@/lib/env';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();

  // Check for Google tokens in cookies
  const googleAccessToken = cookieStore.get('google_provider_token')?.value;
  const googleRefreshToken = cookieStore.get('google_refresh_token')?.value;

  // Get Supabase session
  const supabase = createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );

  const { data: { session }, error } = await supabase.auth.getSession();

  // Test YouTube API if we have a token
  let youtubeApiTest = null;
  if (googleAccessToken) {
    try {
      const response = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
        {
          headers: { Authorization: `Bearer ${googleAccessToken}` },
        }
      );
      const data = await response.json();
      youtubeApiTest = {
        status: response.status,
        ok: response.ok,
        data: response.ok ? data : null,
        error: !response.ok ? data : null,
      };
    } catch (err) {
      youtubeApiTest = { error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  // Check identities array for linked providers
  const identities = session?.user?.identities || [];
  const linkedProviders = identities.map((i: { provider: string; id: string }) => ({
    provider: i.provider,
    id: i.id?.substring(0, 8) + '...',
  }));
  const hasGoogleIdentity = identities.some(
    (identity: { provider: string }) => identity.provider === 'google'
  );

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    cookies: {
      hasGoogleAccessToken: !!googleAccessToken,
      accessTokenLength: googleAccessToken?.length || 0,
      hasGoogleRefreshToken: !!googleRefreshToken,
      refreshTokenLength: googleRefreshToken?.length || 0,
    },
    supabaseSession: {
      hasSession: !!session,
      userId: session?.user?.id,
      email: session?.user?.email,
      provider: session?.user?.app_metadata?.provider,
      hasProviderToken: !!session?.provider_token,
      hasProviderRefreshToken: !!session?.provider_refresh_token,
      linkedProviders,
      hasGoogleIdentity,
    },
    youtubeApiTest,
    envCheck: {
      hasYouTubeApiKey: !!process.env.YOUTUBE_API_KEY,
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    },
  });
}
