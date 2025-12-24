import { NextRequest, NextResponse } from 'next/server';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

/**
 * GET /api/youtube/library
 * 
 * Fetches YouTube data:
 * - trending: Trending videos (no auth required)
 * - music: Trending music videos
 * - playlists: Popular playlists (curated)
 * 
 * Note: User's own playlists/history would require OAuth which isn't set up.
 * For now, we provide curated trending content.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'all';
  const limit = parseInt(searchParams.get('limit') || '12');

  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

  if (!YOUTUBE_API_KEY) {
    return NextResponse.json({
      error: 'YouTube API key not configured',
      trending: [],
      music: [],
      playlists: [],
    });
  }

  const results: {
    trending: unknown[];
    music: unknown[];
    gaming: unknown[];
    playlists: unknown[];
  } = {
    trending: [],
    music: [],
    gaming: [],
    playlists: [],
  };

  try {
    const fetches: Promise<void>[] = [];

    // Trending videos (general)
    if (type === 'all' || type === 'trending') {
      fetches.push(
        fetch(
          `${YOUTUBE_API_BASE}/videos?` +
            new URLSearchParams({
              part: 'snippet,contentDetails,statistics',
              chart: 'mostPopular',
              regionCode: 'US',
              maxResults: limit.toString(),
              key: YOUTUBE_API_KEY,
            })
        )
          .then(res => res.json())
          .then(data => {
            if (data.items) {
              results.trending = data.items.map((item: YouTubeVideo) => ({
                id: item.id,
                title: item.snippet.title,
                channel: item.snippet.channelTitle,
                thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
                duration: parseDuration(item.contentDetails?.duration || ''),
                viewCount: parseInt(item.statistics?.viewCount || '0'),
                publishedAt: item.snippet.publishedAt,
                url: `https://www.youtube.com/watch?v=${item.id}`,
              }));
            }
          })
          .catch(err => console.warn('Failed to fetch trending:', err))
      );
    }

    // Trending music videos
    if (type === 'all' || type === 'music') {
      fetches.push(
        fetch(
          `${YOUTUBE_API_BASE}/videos?` +
            new URLSearchParams({
              part: 'snippet,contentDetails,statistics',
              chart: 'mostPopular',
              regionCode: 'US',
              videoCategoryId: '10', // Music category
              maxResults: limit.toString(),
              key: YOUTUBE_API_KEY,
            })
        )
          .then(res => res.json())
          .then(data => {
            if (data.items) {
              results.music = data.items.map((item: YouTubeVideo) => ({
                id: item.id,
                title: item.snippet.title,
                channel: item.snippet.channelTitle,
                thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
                duration: parseDuration(item.contentDetails?.duration || ''),
                viewCount: parseInt(item.statistics?.viewCount || '0'),
                publishedAt: item.snippet.publishedAt,
                url: `https://www.youtube.com/watch?v=${item.id}`,
              }));
            }
          })
          .catch(err => console.warn('Failed to fetch music:', err))
      );
    }

    // Trending gaming videos
    if (type === 'all' || type === 'gaming') {
      fetches.push(
        fetch(
          `${YOUTUBE_API_BASE}/videos?` +
            new URLSearchParams({
              part: 'snippet,contentDetails,statistics',
              chart: 'mostPopular',
              regionCode: 'US',
              videoCategoryId: '20', // Gaming category
              maxResults: limit.toString(),
              key: YOUTUBE_API_KEY,
            })
        )
          .then(res => res.json())
          .then(data => {
            if (data.items) {
              results.gaming = data.items.map((item: YouTubeVideo) => ({
                id: item.id,
                title: item.snippet.title,
                channel: item.snippet.channelTitle,
                thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
                duration: parseDuration(item.contentDetails?.duration || ''),
                viewCount: parseInt(item.statistics?.viewCount || '0'),
                publishedAt: item.snippet.publishedAt,
                url: `https://www.youtube.com/watch?v=${item.id}`,
              }));
            }
          })
          .catch(err => console.warn('Failed to fetch gaming:', err))
      );
    }

    // Search for popular playlists
    if (type === 'all' || type === 'playlists') {
      fetches.push(
        fetch(
          `${YOUTUBE_API_BASE}/search?` +
            new URLSearchParams({
              part: 'snippet',
              type: 'playlist',
              q: 'top hits 2024 playlist',
              maxResults: limit.toString(),
              key: YOUTUBE_API_KEY,
            })
        )
          .then(res => res.json())
          .then(data => {
            if (data.items) {
              results.playlists = data.items.map((item: YouTubePlaylistSearchResult) => ({
                id: item.id.playlistId,
                title: item.snippet.title,
                channel: item.snippet.channelTitle,
                thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
                publishedAt: item.snippet.publishedAt,
                url: `https://www.youtube.com/playlist?list=${item.id.playlistId}`,
              }));
            }
          })
          .catch(err => console.warn('Failed to fetch playlists:', err))
      );
    }

    await Promise.all(fetches);

    return NextResponse.json(results);
  } catch (error) {
    console.error('YouTube library fetch error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch YouTube data',
      ...results,
    });
  }
}

interface YouTubeVideo {
  id: string;
  snippet: {
    title: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: {
      default?: { url: string };
      high?: { url: string };
    };
  };
  contentDetails?: {
    duration: string;
  };
  statistics?: {
    viewCount: string;
  };
}

interface YouTubePlaylistSearchResult {
  id: { playlistId: string };
  snippet: {
    title: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: {
      default?: { url: string };
      high?: { url: string };
    };
  };
}

/**
 * Parse ISO 8601 duration to milliseconds
 */
function parseDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] ?? '0', 10);
  const minutes = parseInt(match[2] ?? '0', 10);
  const seconds = parseInt(match[3] ?? '0', 10);

  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}
