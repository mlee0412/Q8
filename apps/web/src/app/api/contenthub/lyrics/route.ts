import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const LRCLIB_API = 'https://lrclib.net/api';

interface LRCLibResponse {
  id: number;
  name: string;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title');
    const artist = searchParams.get('artist');
    const album = searchParams.get('album');
    const duration = searchParams.get('duration');

    if (!title || !artist) {
      return NextResponse.json(
        { error: 'Title and artist are required' },
        { status: 400 }
      );
    }

    // Try to get synced lyrics first
    const params = new URLSearchParams({
      track_name: title,
      artist_name: artist,
    });

    if (album) params.append('album_name', album);
    if (duration) params.append('duration', duration);

    const response = await fetch(`${LRCLIB_API}/get?${params.toString()}`, {
      headers: {
        'User-Agent': 'Q8 ContentHub/1.0',
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (response.ok) {
      const data: LRCLibResponse = await response.json();
      
      if (data.instrumental) {
        return NextResponse.json({
          instrumental: true,
          message: 'This is an instrumental track',
        });
      }

      return NextResponse.json({
        trackName: data.trackName,
        artistName: data.artistName,
        albumName: data.albumName,
        duration: data.duration,
        plainLyrics: data.plainLyrics,
        syncedLyrics: data.syncedLyrics,
      });
    }

    // If exact match fails, try search
    const searchResponse = await fetch(
      `${LRCLIB_API}/search?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`,
      {
        headers: {
          'User-Agent': 'Q8 ContentHub/1.0',
        },
        next: { revalidate: 3600 },
      }
    );

    if (searchResponse.ok) {
      const searchResults: LRCLibResponse[] = await searchResponse.json();
      
      const bestMatch = searchResults[0];
      if (bestMatch) {
        if (bestMatch.instrumental) {
          return NextResponse.json({
            instrumental: true,
            message: 'This is an instrumental track',
          });
        }

        return NextResponse.json({
          trackName: bestMatch.trackName,
          artistName: bestMatch.artistName,
          albumName: bestMatch.albumName,
          duration: bestMatch.duration,
          plainLyrics: bestMatch.plainLyrics,
          syncedLyrics: bestMatch.syncedLyrics,
        });
      }
    }

    // No lyrics found
    return NextResponse.json(
      { error: 'Lyrics not found' },
      { status: 404 }
    );
  } catch (error) {
    logger.error('Lyrics API error', { error });
    return NextResponse.json(
      { error: 'Failed to fetch lyrics' },
      { status: 500 }
    );
  }
}
