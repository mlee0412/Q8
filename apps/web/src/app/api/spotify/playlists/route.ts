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

interface SpotifyTrack {
  id: string;
  name: string;
  duration_ms: number;
  uri: string;
  external_urls: { spotify: string };
  artists: Array<{ name: string; id: string }>;
  album: {
    name: string;
    images: SpotifyImage[];
  };
}

interface PlaylistTrackItem {
  added_at: string;
  track: SpotifyTrack;
}

/**
 * GET /api/spotify/playlists?id=xxx - Get playlist tracks
 * GET /api/spotify/playlists - Get user's playlists
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const playlistId = searchParams.get('id');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  const accessToken = await getAccessToken();

  if (!accessToken) {
    return NextResponse.json({ error: 'Spotify not configured' }, { status: 500 });
  }

  try {
    if (playlistId) {
      // Get specific playlist's tracks
      const response = await fetch(
        `${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!response.ok) {
        const error = await response.text();
        return NextResponse.json({ error }, { status: response.status });
      }

      const data = await response.json();
      
      // Also get playlist metadata
      const playlistResponse = await fetch(
        `${SPOTIFY_API_BASE}/playlists/${playlistId}?fields=id,name,description,images,owner,tracks(total)`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      
      const playlistData = playlistResponse.ok ? await playlistResponse.json() : null;

      return NextResponse.json({
        playlist: playlistData ? {
          id: playlistData.id,
          name: playlistData.name,
          description: playlistData.description,
          imageUrl: playlistData.images?.[0]?.url,
          owner: playlistData.owner?.display_name,
          totalTracks: playlistData.tracks?.total,
        } : null,
        tracks: data.items
          .filter((item: PlaylistTrackItem) => item.track) // Filter out null tracks
          .map((item: PlaylistTrackItem) => ({
            id: item.track.id,
            name: item.track.name,
            artist: item.track.artists?.map(a => a.name).join(', '),
            album: item.track.album?.name,
            imageUrl: item.track.album?.images?.[0]?.url,
            duration: item.track.duration_ms,
            uri: item.track.uri,
            spotifyUrl: item.track.external_urls?.spotify,
            addedAt: item.added_at,
          })),
        total: data.total,
        hasMore: data.next !== null,
        offset,
        limit,
      });
    } else {
      // Get user's playlists
      const response = await fetch(
        `${SPOTIFY_API_BASE}/me/playlists?limit=${limit}&offset=${offset}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!response.ok) {
        const error = await response.text();
        return NextResponse.json({ error }, { status: response.status });
      }

      const data = await response.json();

      return NextResponse.json({
        playlists: data.items.map((p: {
          id: string;
          name: string;
          description: string;
          images: SpotifyImage[];
          owner: { display_name: string; id: string };
          tracks: { total: number };
          uri: string;
          external_urls: { spotify: string };
          collaborative: boolean;
          public: boolean;
        }) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          imageUrl: p.images?.[0]?.url,
          owner: p.owner?.display_name,
          ownerId: p.owner?.id,
          trackCount: p.tracks?.total,
          uri: p.uri,
          spotifyUrl: p.external_urls?.spotify,
          collaborative: p.collaborative,
          isPublic: p.public,
        })),
        total: data.total,
        hasMore: data.next !== null,
      });
    }
  } catch (error) {
    console.error('Playlist fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/spotify/playlists - Add tracks to a playlist or create a new playlist
 */
export async function POST(request: NextRequest) {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return NextResponse.json({ error: 'Spotify not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { action, playlistId, trackUris, name, description, isPublic } = body;

    switch (action) {
      case 'add': {
        // Add tracks to existing playlist
        if (!playlistId || !trackUris || !Array.isArray(trackUris)) {
          return NextResponse.json(
            { error: 'playlistId and trackUris are required' },
            { status: 400 }
          );
        }

        const response = await fetch(
          `${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ uris: trackUris }),
          }
        );

        if (!response.ok) {
          const error = await response.text();
          return NextResponse.json({ error }, { status: response.status });
        }

        return NextResponse.json({
          success: true,
          message: `Added ${trackUris.length} track(s) to playlist`,
        });
      }

      case 'remove': {
        // Remove tracks from playlist
        if (!playlistId || !trackUris || !Array.isArray(trackUris)) {
          return NextResponse.json(
            { error: 'playlistId and trackUris are required' },
            { status: 400 }
          );
        }

        const response = await fetch(
          `${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tracks: trackUris.map(uri => ({ uri })),
            }),
          }
        );

        if (!response.ok) {
          const error = await response.text();
          return NextResponse.json({ error }, { status: response.status });
        }

        return NextResponse.json({
          success: true,
          message: `Removed ${trackUris.length} track(s) from playlist`,
        });
      }

      case 'create': {
        // Create a new playlist
        if (!name) {
          return NextResponse.json(
            { error: 'name is required to create a playlist' },
            { status: 400 }
          );
        }

        // First get the user's ID
        const userResponse = await fetch(`${SPOTIFY_API_BASE}/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!userResponse.ok) {
          return NextResponse.json(
            { error: 'Failed to get user info' },
            { status: 500 }
          );
        }

        const userData = await userResponse.json();

        // Create the playlist
        const response = await fetch(
          `${SPOTIFY_API_BASE}/users/${userData.id}/playlists`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name,
              description: description || '',
              public: isPublic ?? false,
            }),
          }
        );

        if (!response.ok) {
          const error = await response.text();
          return NextResponse.json({ error }, { status: response.status });
        }

        const newPlaylist = await response.json();

        return NextResponse.json({
          success: true,
          playlist: {
            id: newPlaylist.id,
            name: newPlaylist.name,
            uri: newPlaylist.uri,
            spotifyUrl: newPlaylist.external_urls?.spotify,
          },
        });
      }

      case 'update': {
        // Update playlist details
        if (!playlistId) {
          return NextResponse.json(
            { error: 'playlistId is required' },
            { status: 400 }
          );
        }

        const updateData: { name?: string; description?: string; public?: boolean } = {};
        if (name) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (isPublic !== undefined) updateData.public = isPublic;

        const response = await fetch(
          `${SPOTIFY_API_BASE}/playlists/${playlistId}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
          }
        );

        if (!response.ok) {
          const error = await response.text();
          return NextResponse.json({ error }, { status: response.status });
        }

        return NextResponse.json({
          success: true,
          message: 'Playlist updated',
        });
      }

      default:
        return NextResponse.json(
          { error: 'Unknown action. Use: add, remove, create, or update' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Playlist action error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Action failed' },
      { status: 500 }
    );
  }
}
