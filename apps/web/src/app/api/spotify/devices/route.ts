import { NextRequest, NextResponse } from 'next/server';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';

/**
 * Get access token using refresh token
 */
async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  try {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch {
    return null;
  }
}

interface SpotifyDevice {
  id: string;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent: number;
  supports_volume: boolean;
}

/**
 * GET /api/spotify/devices - Get available Spotify Connect devices
 */
export async function GET() {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json({
        devices: [],
        error: 'Spotify not configured',
      });
    }

    const response = await fetch(`${SPOTIFY_API_BASE}/me/player/devices`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Spotify devices error:', errorText);
      return NextResponse.json({
        devices: [],
        error: 'Failed to fetch devices',
      });
    }

    const data = await response.json();
    const devices: SpotifyDevice[] = data.devices || [];

    return NextResponse.json({
      devices: devices.map((d) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        isActive: d.is_active,
        volume: d.volume_percent,
        supportsVolume: d.supports_volume,
      })),
      activeDevice: devices.find((d) => d.is_active) || null,
    });
  } catch (error) {
    console.error('Get devices error:', error);
    return NextResponse.json({
      devices: [],
      error: error instanceof Error ? error.message : 'Failed to fetch devices',
    });
  }
}

/**
 * POST /api/spotify/devices - Transfer playback to a device
 */
export async function POST(request: NextRequest) {
  try {
    const { deviceId, deviceName, play = true } = await request.json();

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 400 }
      );
    }

    const accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Spotify not configured' },
        { status: 500 }
      );
    }

    // Transfer playback to the specified device
    const response = await fetch(`${SPOTIFY_API_BASE}/me/player`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        device_ids: [deviceId],
        play,
      }),
    });

    if (!response.ok && response.status !== 204) {
      const errorText = await response.text();
      console.error('Transfer playback error:', errorText);
      
      let errorMessage = 'Transfer failed';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch {
        // Use default message
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Playback transferred to ${deviceName || deviceId}`,
      deviceId,
    });
  } catch (error) {
    console.error('Transfer error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Transfer failed' },
      { status: 500 }
    );
  }
}
