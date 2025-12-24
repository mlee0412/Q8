import { NextRequest, NextResponse } from 'next/server';

/**
 * Spotify OAuth Authorization Flow
 * 
 * Required scopes for playback control:
 * - user-read-playback-state: Read playback state
 * - user-modify-playback-state: Control playback (play, pause, skip, etc.)
 * - user-read-currently-playing: Read currently playing track
 * - streaming: Web Playback SDK (optional)
 */

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:3000/api/spotify/callback';

// Required scopes for full playback control
const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-read-private',
  'user-read-email',
  'streaming',
].join(' ');

/**
 * GET /api/spotify/auth - Redirect to Spotify authorization
 */
export async function GET(request: NextRequest) {
  if (!CLIENT_ID) {
    return NextResponse.json(
      { error: 'Spotify client ID not configured' },
      { status: 500 }
    );
  }

  const state = Math.random().toString(36).substring(7);
  
  const authUrl = new URL(SPOTIFY_AUTH_URL);
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('show_dialog', 'true'); // Force re-consent to get new scopes

  return NextResponse.redirect(authUrl.toString());
}

/**
 * POST /api/spotify/auth - Exchange code for tokens (called from callback)
 */
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 });
    }

    if (!CLIENT_ID || !CLIENT_SECRET) {
      return NextResponse.json({ error: 'Spotify credentials not configured' }, { status: 500 });
    }

    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Token exchange failed:', error);
      return NextResponse.json({ error: 'Token exchange failed' }, { status: 400 });
    }

    const data = await response.json();

    return NextResponse.json({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      scope: data.scope,
      message: 'Copy the refresh_token to your .env.local file as SPOTIFY_REFRESH_TOKEN',
    });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
