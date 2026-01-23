/**
 * Google Provider Token Helper
 * 
 * Retrieves the Google OAuth provider token from cookies.
 * Tokens are stored during the OAuth callback and used for Google APIs (YouTube, etc.).
 */

import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';

export interface GoogleTokenResult {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  error?: string;
}

/**
 * Get the Google provider token from cookies
 * This token is needed to call Google APIs like YouTube
 */
export async function getGoogleProviderToken(): Promise<GoogleTokenResult> {
  try {
    const cookieStore = await cookies();
    
    // Read tokens from cookies (set during OAuth callback)
    const accessToken = cookieStore.get('google_provider_token')?.value || null;
    const refreshToken = cookieStore.get('google_refresh_token')?.value || null;

    if (!accessToken) {
      logger.debug('No Google provider token in cookies');
      return { 
        accessToken: null, 
        refreshToken: null, 
        expiresAt: null, 
        error: 'No Google provider token - please login with Google' 
      };
    }

    return {
      accessToken,
      refreshToken,
      expiresAt: null, // Cookie handles expiry
    };
  } catch (error) {
    logger.error('Error getting Google provider token', { error });
    return { 
      accessToken: null, 
      refreshToken: null, 
      expiresAt: null, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Refresh the Google access token using the refresh token
 */
export async function refreshGoogleToken(): Promise<GoogleTokenResult> {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('google_refresh_token')?.value;

    if (!refreshToken) {
      return { 
        accessToken: null, 
        refreshToken: null, 
        expiresAt: null, 
        error: 'No refresh token available' 
      };
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return { 
        accessToken: null, 
        refreshToken: null, 
        expiresAt: null, 
        error: 'Google OAuth not configured' 
      };
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('Failed to refresh Google token', { error });
      return { 
        accessToken: null, 
        refreshToken, 
        expiresAt: null, 
        error: 'Token refresh failed' 
      };
    }

    const data = await response.json();
    
    // Note: We can't set cookies here in a utility function
    // The caller should handle storing the new token
    return {
      accessToken: data.access_token,
      refreshToken,
      expiresAt: Date.now() + (data.expires_in * 1000),
    };
  } catch (error) {
    logger.error('Error refreshing Google token', { error });
    return { 
      accessToken: null, 
      refreshToken: null, 
      expiresAt: null, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Check if user has YouTube access via Google OAuth
 */
export async function hasYouTubeAccess(): Promise<boolean> {
  const { accessToken, error } = await getGoogleProviderToken();
  return !!accessToken && !error;
}
