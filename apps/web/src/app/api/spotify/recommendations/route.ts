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
      console.error('Token refresh failed:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
}

/**
 * GET /api/spotify/recommendations
 * 
 * Fetches personalized recommendations from Spotify based on seed tracks, artists, or genres.
 * 
 * Query params:
 * - seed_tracks: Comma-separated track IDs (up to 5)
 * - seed_artists: Comma-separated artist IDs (up to 5)
 * - seed_genres: Comma-separated genres (up to 5)
 * - limit: Number of recommendations (default 20, max 100)
 * - target_energy: Target energy level (0.0-1.0)
 * - target_valence: Target mood/positivity (0.0-1.0)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const seedTracks = searchParams.get('seed_tracks') || '';
  const seedArtists = searchParams.get('seed_artists') || '';
  const seedGenres = searchParams.get('seed_genres') || '';
  const limit = searchParams.get('limit') || '20';
  const targetEnergy = searchParams.get('target_energy');
  const targetValence = searchParams.get('target_valence');

  // Need at least one seed
  if (!seedTracks && !seedArtists && !seedGenres) {
    return NextResponse.json(
      { error: 'At least one seed (tracks, artists, or genres) is required' },
      { status: 400 }
    );
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { error: 'Spotify not configured', tracks: [] },
      { status: 200 }
    );
  }

  try {
    // Build query params
    const params = new URLSearchParams({ limit });
    
    if (seedTracks) params.set('seed_tracks', seedTracks);
    if (seedArtists) params.set('seed_artists', seedArtists);
    if (seedGenres) params.set('seed_genres', seedGenres);
    if (targetEnergy) params.set('target_energy', targetEnergy);
    if (targetValence) params.set('target_valence', targetValence);

    const response = await fetch(
      `${SPOTIFY_API_BASE}/recommendations?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Spotify recommendations error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch recommendations', tracks: [] },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      tracks: data.tracks || [],
      seeds: data.seeds || [],
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations', tracks: [] },
      { status: 500 }
    );
  }
}

/**
 * GET available genre seeds
 */
export async function POST(request: NextRequest) {
  const { action } = await request.json();
  
  if (action === 'get_genres') {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ genres: [] });
    }

    try {
      const response = await fetch(
        `${SPOTIFY_API_BASE}/recommendations/available-genre-seeds`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        return NextResponse.json({ genres: [] });
      }

      const data = await response.json();
      return NextResponse.json({ genres: data.genres || [] });
    } catch (error) {
      console.error('Genre fetch error:', error);
      return NextResponse.json({ genres: [] });
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
