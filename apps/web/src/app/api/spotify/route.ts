import { NextRequest, NextResponse } from 'next/server';

/**
 * Spotify API Integration
 * Uses Spotify Web API for playback control and now playing info
 */

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

// Environment variables
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN;

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string; width: number; height: number }[];
  };
  duration_ms: number;
  external_urls: { spotify: string };
}

interface SpotifyPlaybackState {
  is_playing: boolean;
  progress_ms: number;
  item: SpotifyTrack | null;
  device: {
    id: string;
    name: string;
    type: string;
    volume_percent: number;
  } | null;
  shuffle_state: boolean;
  repeat_state: 'off' | 'track' | 'context';
}

interface SpotifyDevice {
  id: string;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent: number;
}

// Cache for access token
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get a valid access token using refresh token
 */
async function getAccessToken(): Promise<string | null> {
  // Return cached token if still valid
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token;
  }

  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    console.error('Spotify credentials not configured');
    return null;
  }

  try {
    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: REFRESH_TOKEN,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const data: SpotifyTokenResponse = await response.json();

    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    return data.access_token;
  } catch (error) {
    console.error('Failed to get Spotify access token:', error);
    return null;
  }
}

/**
 * GET /api/spotify - Get current playback state
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const includeDevices = searchParams.get('devices') === 'true';

  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        getMockPlaybackState(),
        { status: 200 }
      );
    }

    // Fetch playback state and optionally available devices
    const [playerResponse, devicesResponse] = await Promise.all([
      fetch(`${SPOTIFY_API_BASE}/me/player`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      includeDevices 
        ? fetch(`${SPOTIFY_API_BASE}/me/player/devices`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          })
        : Promise.resolve(null),
    ]);

    // Parse available devices if requested
    let availableDevices: SpotifyDevice[] = [];
    if (devicesResponse?.ok) {
      const devicesData = await devicesResponse.json();
      availableDevices = devicesData.devices ?? [];
    }

    // No active playback
    if (playerResponse.status === 204) {
      return NextResponse.json({
        isPlaying: false,
        track: null,
        device: null,
        availableDevices,
        noActiveDevice: true,
      });
    }

    if (!playerResponse.ok) {
      throw new Error(`Spotify API error: ${playerResponse.status}`);
    }

    const data: SpotifyPlaybackState = await playerResponse.json();

    return NextResponse.json({
      isPlaying: data.is_playing,
      progress: data.progress_ms,
      shuffleState: data.shuffle_state,
      repeatState: data.repeat_state,
      track: data.item
        ? {
            id: data.item.id,
            title: data.item.name,
            artist: data.item.artists.map((a) => a.name).join(', '),
            album: data.item.album.name,
            albumArtUrl: data.item.album.images[0]?.url || '',
            durationMs: data.item.duration_ms,
            spotifyUrl: data.item.external_urls.spotify,
          }
        : null,
      device: data.device
        ? {
            id: data.device.id,
            name: data.device.name,
            type: data.device.type,
            volume: data.device.volume_percent,
            isActive: true,
          }
        : null,
      availableDevices,
    });
  } catch (error) {
    console.error('Spotify API error:', error);
    return NextResponse.json(getMockPlaybackState(), { status: 200 });
  }
}

/**
 * POST /api/spotify - Control playback
 */
export async function POST(request: NextRequest) {
  try {
    const { action, ...params } = await request.json();
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Spotify not configured', mock: true },
        { status: 200 }
      );
    }

    let endpoint = '';
    let method = 'PUT';
    let body = null;

    // Build device_id query param if provided
    const deviceQuery = params.device_id ? `device_id=${params.device_id}` : '';

    switch (action) {
      case 'play':
        endpoint = '/me/player/play';
        if (deviceQuery) endpoint += `?${deviceQuery}`;
        if (params.uri) {
          body = JSON.stringify({ uris: [params.uri] });
        } else if (params.context_uri) {
          body = JSON.stringify({ 
            context_uri: params.context_uri,
            offset: params.offset ? { position: params.offset } : undefined,
          });
        }
        break;

      case 'pause':
        endpoint = '/me/player/pause';
        if (deviceQuery) endpoint += `?${deviceQuery}`;
        break;

      case 'next':
        endpoint = '/me/player/next';
        if (deviceQuery) endpoint += `?${deviceQuery}`;
        method = 'POST';
        break;

      case 'previous':
        endpoint = '/me/player/previous';
        if (deviceQuery) endpoint += `?${deviceQuery}`;
        method = 'POST';
        break;

      case 'shuffle':
        endpoint = `/me/player/shuffle?state=${params.state}`;
        if (deviceQuery) endpoint += `&${deviceQuery}`;
        break;

      case 'repeat':
        endpoint = `/me/player/repeat?state=${params.state}`;
        if (deviceQuery) endpoint += `&${deviceQuery}`;
        break;

      case 'volume':
        endpoint = `/me/player/volume?volume_percent=${Math.round(params.volume)}`;
        if (deviceQuery) endpoint += `&${deviceQuery}`;
        break;

      case 'seek':
        endpoint = `/me/player/seek?position_ms=${Math.round(params.position)}`;
        if (deviceQuery) endpoint += `&${deviceQuery}`;
        break;

      case 'transfer':
        // Transfer playback to a specific device
        endpoint = '/me/player';
        body = JSON.stringify({ 
          device_ids: [params.device_id],
          play: params.play ?? true,
        });
        break;

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body,
    });

    if (!response.ok && response.status !== 204) {
      const errorText = await response.text();
      
      // Parse Spotify error for better messages
      let errorMessage = `Spotify API error: ${response.status}`;
      let errorCode = 'UNKNOWN';
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        }
        // Handle specific error cases
        if (errorJson.error?.reason === 'NO_ACTIVE_DEVICE') {
          return NextResponse.json(
            { error: 'No active Spotify device. Open Spotify on a device first.', code: 'NO_ACTIVE_DEVICE' },
            { status: 400 }
          );
        }
        if (errorJson.error?.reason === 'PREMIUM_REQUIRED') {
          return NextResponse.json(
            { error: 'Spotify Premium is required for playback control.', code: 'PREMIUM_REQUIRED' },
            { status: 403 }
          );
        }
        // Handle permission/scope errors (403 with "Permissions missing" or similar)
        if (response.status === 403 || errorMessage.toLowerCase().includes('permission')) {
          return NextResponse.json(
            { 
              error: 'Spotify permissions missing. Please re-authorize at /api/spotify/auth', 
              code: 'PERMISSIONS_MISSING',
              authUrl: '/api/spotify/auth'
            },
            { status: 403 }
          );
        }
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      // Check for 403 status even if parsing failed
      if (response.status === 403) {
        return NextResponse.json(
          { 
            error: 'Spotify permissions missing. Please re-authorize at /api/spotify/auth', 
            code: 'PERMISSIONS_MISSING',
            authUrl: '/api/spotify/auth'
          },
          { status: 403 }
        );
      }
      
      throw new Error(errorMessage);
    }

    return NextResponse.json({ success: true, action });
  } catch (error) {
    console.error('Spotify control error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Control failed' },
      { status: 500 }
    );
  }
}

/**
 * Mock playback state for development without Spotify credentials
 */
function getMockPlaybackState() {
  return {
    isPlaying: true,
    progress: 45000,
    shuffleState: false,
    repeatState: 'off' as const,
    track: {
      id: 'mock-1',
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      album: 'After Hours',
      albumArtUrl: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36',
      durationMs: 200000,
      spotifyUrl: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b',
    },
    device: {
      id: 'mock-device',
      name: 'Mock Device',
      type: 'Computer',
      volume: 50,
      isActive: true,
    },
    availableDevices: [],
    isMock: true,
  };
}
