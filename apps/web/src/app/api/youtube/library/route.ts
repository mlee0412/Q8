import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/auth/api-auth';
import { logger } from '@/lib/logger';
import { youtubeCache, cacheKeys, cacheTTL } from '@/lib/cache/youtube-cache';

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
  // Authenticate user
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return unauthorizedResponse();
  }

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

    // Trending videos (general) - 1 unit per call, cached 30 min
    if (type === 'all' || type === 'trending') {
      const cacheKey = cacheKeys.trending('US', limit);
      const cached = youtubeCache.get<unknown[]>(cacheKey);

      if (cached) {
        results.trending = cached;
      } else {
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
                youtubeCache.set(cacheKey, results.trending, cacheTTL.trending);
              }
            })
            .catch(err => logger.warn('Failed to fetch trending', { err: err }))
        );
      }
    }

    // Trending music videos - 1 unit per call, cached 30 min
    if (type === 'all' || type === 'music') {
      const cacheKey = cacheKeys.trendingMusic('US', limit);
      const cached = youtubeCache.get<unknown[]>(cacheKey);

      if (cached) {
        results.music = cached;
      } else {
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
                youtubeCache.set(cacheKey, results.music, cacheTTL.trending);
              }
            })
            .catch(err => logger.warn('Failed to fetch music', { err: err }))
        );
      }
    }

    // Trending gaming videos - 1 unit per call, cached 30 min
    if (type === 'all' || type === 'gaming') {
      const cacheKey = cacheKeys.trendingGaming('US', limit);
      const cached = youtubeCache.get<unknown[]>(cacheKey);

      if (cached) {
        results.gaming = cached;
      } else {
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
                youtubeCache.set(cacheKey, results.gaming, cacheTTL.trending);
              }
            })
            .catch(err => logger.warn('Failed to fetch gaming', { err: err }))
        );
      }
    }

    // Playlists - DISABLED to save quota (search.list costs 100 units!)
    // Instead, return curated playlist IDs that don't require API calls
    if (type === 'all' || type === 'playlists') {
      // Return static curated playlists to avoid expensive search.list calls
      results.playlists = getCuratedPlaylists();
    }

    await Promise.all(fetches);

    return NextResponse.json(results);
  } catch (error) {
    logger.error('YouTube library fetch error', { error: error });
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

/**
 * Returns curated playlists to avoid expensive search.list API calls (100 units each!)
 * These are popular, well-known playlists that don't require API lookups.
 */
function getCuratedPlaylists() {
  return [
    {
      id: 'RDCLAK5uy_kmPRjHDECIcuVwnKsx2Ng7fyNgFKWNJFs',
      title: 'Today\'s Top Hits',
      channel: 'YouTube Music',
      thumbnailUrl: 'https://i.ytimg.com/vi/kTJczUoc26U/hqdefault.jpg',
      url: 'https://www.youtube.com/playlist?list=RDCLAK5uy_kmPRjHDECIcuVwnKsx2Ng7fyNgFKWNJFs',
    },
    {
      id: 'PLDcnymzs18LU4Kexrs91TVdfnplU3I5zs',
      title: 'Pop Music Playlist',
      channel: 'YouTube Music',
      thumbnailUrl: 'https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg',
      url: 'https://www.youtube.com/playlist?list=PLDcnymzs18LU4Kexrs91TVdfnplU3I5zs',
    },
    {
      id: 'RDCLAK5uy_n9Fbdw7e6ap-98fLY_MwYkhPCN86Cy3ak',
      title: 'Chill Hits',
      channel: 'YouTube Music',
      thumbnailUrl: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg',
      url: 'https://www.youtube.com/playlist?list=RDCLAK5uy_n9Fbdw7e6ap-98fLY_MwYkhPCN86Cy3ak',
    },
    {
      id: 'PLgzTt0k8mXzEpH7-dOCHqRZOsakqXmzmG',
      title: 'Workout Mix',
      channel: 'YouTube Music',
      thumbnailUrl: 'https://i.ytimg.com/vi/ZbZSe6N_BXs/hqdefault.jpg',
      url: 'https://www.youtube.com/playlist?list=PLgzTt0k8mXzEpH7-dOCHqRZOsakqXmzmG',
    },
    {
      id: 'RDCLAK5uy_lBNUteBRencHzKelu5iDQmXG3QaHMNohU',
      title: 'Hip Hop & R&B Mix',
      channel: 'YouTube Music',
      thumbnailUrl: 'https://i.ytimg.com/vi/RgKAFK5djSk/hqdefault.jpg',
      url: 'https://www.youtube.com/playlist?list=RDCLAK5uy_lBNUteBRencHzKelu5iDQmXG3QaHMNohU',
    },
    {
      id: 'RDCLAK5uy_lf8okgl2ygD075nhnJVjlfhwp8NsUgEbs',
      title: 'Electronic & Dance',
      channel: 'YouTube Music',
      thumbnailUrl: 'https://i.ytimg.com/vi/gCYcHz2k5x0/hqdefault.jpg',
      url: 'https://www.youtube.com/playlist?list=RDCLAK5uy_lf8okgl2ygD075nhnJVjlfhwp8NsUgEbs',
    },
  ];
}
