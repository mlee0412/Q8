import { NextRequest, NextResponse } from 'next/server';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';

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

    if (!response.ok) return null;
    const data = await response.json();
    return data.access_token;
  } catch {
    return null;
  }
}

interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: SpotifyImage[];
  owner: { display_name: string };
  tracks: { total: number };
  external_urls: { spotify: string };
  uri: string;
}

interface SpotifyTrack {
  id: string;
  name: string;
  duration_ms: number;
  uri: string;
  external_urls: { spotify: string };
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: SpotifyImage[];
  };
}

interface RecentlyPlayedItem {
  track: SpotifyTrack;
  played_at: string;
}

/**
 * GET /api/spotify/library
 * 
 * Fetches user's Spotify library data:
 * - playlists: User's own playlists
 * - recentlyPlayed: Recently played tracks
 * - featuredPlaylists: Spotify's featured/trending playlists
 * - topTracks: User's top tracks
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'all';
  const limit = parseInt(searchParams.get('limit') || '20');

  const accessToken = await getAccessToken();

  if (!accessToken) {
    return NextResponse.json({
      error: 'Spotify not configured',
      playlists: [],
      recentlyPlayed: [],
      featuredPlaylists: [],
      topTracks: [],
    });
  }

  const results: {
    playlists: unknown[];
    recentlyPlayed: unknown[];
    featuredPlaylists: unknown[];
    topTracks: unknown[];
  } = {
    playlists: [],
    recentlyPlayed: [],
    featuredPlaylists: [],
    topTracks: [],
  };

  try {
    const fetches: Promise<void>[] = [];

    // User's playlists
    if (type === 'all' || type === 'playlists') {
      fetches.push(
        fetch(`${SPOTIFY_API_BASE}/me/playlists?limit=${limit}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
          .then(res => res.json())
          .then(data => {
            if (data.items) {
              results.playlists = data.items.map((p: SpotifyPlaylist) => ({
                id: p.id,
                name: p.name,
                description: p.description,
                imageUrl: p.images?.[0]?.url || '',
                owner: p.owner?.display_name,
                trackCount: p.tracks?.total || 0,
                spotifyUrl: p.external_urls?.spotify,
                uri: p.uri,
              }));
            }
          })
          .catch(err => console.warn('Failed to fetch playlists:', err))
      );
    }

    // Recently played
    if (type === 'all' || type === 'recentlyPlayed') {
      fetches.push(
        fetch(`${SPOTIFY_API_BASE}/me/player/recently-played?limit=${limit}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
          .then(res => res.json())
          .then(data => {
            if (data.items) {
              results.recentlyPlayed = data.items.map((item: RecentlyPlayedItem) => ({
                id: item.track.id,
                name: item.track.name,
                artist: item.track.artists?.map(a => a.name).join(', '),
                album: item.track.album?.name,
                imageUrl: item.track.album?.images?.[0]?.url || '',
                duration: item.track.duration_ms,
                spotifyUrl: item.track.external_urls?.spotify,
                uri: item.track.uri,
                playedAt: item.played_at,
              }));
            }
          })
          .catch(err => console.warn('Failed to fetch recently played:', err))
      );
    }

    // Featured/Trending playlists
    if (type === 'all' || type === 'featured') {
      fetches.push(
        fetch(`${SPOTIFY_API_BASE}/browse/featured-playlists?limit=${limit}&country=US`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
          .then(res => res.json())
          .then(data => {
            if (data.playlists?.items) {
              results.featuredPlaylists = data.playlists.items.map((p: SpotifyPlaylist) => ({
                id: p.id,
                name: p.name,
                description: p.description,
                imageUrl: p.images?.[0]?.url || '',
                owner: p.owner?.display_name,
                trackCount: p.tracks?.total || 0,
                spotifyUrl: p.external_urls?.spotify,
                uri: p.uri,
              }));
            }
          })
          .catch(err => console.warn('Failed to fetch featured playlists:', err))
      );
    }

    // User's top tracks
    if (type === 'all' || type === 'topTracks') {
      fetches.push(
        fetch(`${SPOTIFY_API_BASE}/me/top/tracks?limit=${limit}&time_range=short_term`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
          .then(res => res.json())
          .then(data => {
            if (data.items) {
              results.topTracks = data.items.map((track: SpotifyTrack) => ({
                id: track.id,
                name: track.name,
                artist: track.artists?.map(a => a.name).join(', '),
                album: track.album?.name,
                imageUrl: track.album?.images?.[0]?.url || '',
                duration: track.duration_ms,
                spotifyUrl: track.external_urls?.spotify,
                uri: track.uri,
              }));
            }
          })
          .catch(err => console.warn('Failed to fetch top tracks:', err))
      );
    }

    await Promise.all(fetches);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Library fetch error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch library',
      ...results,
    });
  }
}
