import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/auth/api-auth';
import { logger } from '@/lib/logger';
import { youtubeCache, cacheKeys, cacheTTL } from '@/lib/cache/youtube-cache';
import type { ContentItem } from '@/types/contenthub';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

interface YouTubeSearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    channelId: string;
    publishedAt: string;
    description: string;
    thumbnails: {
      default?: { url: string; width: number; height: number };
      medium?: { url: string; width: number; height: number };
      high?: { url: string; width: number; height: number };
    };
  };
}

interface YouTubeVideoDetails {
  id: string;
  contentDetails: {
    duration: string;
  };
  statistics: {
    viewCount: string;
    likeCount: string;
  };
}

/**
 * GET /api/youtube/shorts
 * 
 * Fetches YouTube Shorts (videos under 60 seconds in vertical format).
 * Uses the videoDuration=short filter to get short-form content.
 * 
 * Query params:
 * - category: Category to search for (e.g., 'trending', 'music', 'comedy', 'fitness')
 * - limit: Number of results (default 12, max 50)
 * - mode: Content mode filter ('focus', 'break', 'workout', 'sleep', 'discover')
 */
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'trending';
  const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 50);
  const mode = searchParams.get('mode') || 'discover';

  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

  if (!YOUTUBE_API_KEY) {
    return NextResponse.json({
      error: 'YouTube API key not configured',
      shorts: [],
    });
  }

  try {
    // Check cache first - shorts are expensive (100 units for search.list!)
    const cacheKey = cacheKeys.shorts(mode, category, limit);
    const cached = youtubeCache.get<{ shorts: ContentItem[]; category: string; mode: string; count: number }>(cacheKey);

    if (cached) {
      logger.info('YouTube Shorts cache hit', { mode, category, cacheKey });
      return NextResponse.json({ ...cached, cached: true });
    }

    // Map category to search query
    const categoryQueries: Record<string, string> = {
      trending: '#shorts trending',
      music: '#shorts music',
      comedy: '#shorts funny comedy',
      fitness: '#shorts workout fitness',
      dance: '#shorts dance',
      cooking: '#shorts recipe cooking',
      gaming: '#shorts gaming',
      tech: '#shorts tech gadgets',
      beauty: '#shorts beauty makeup',
      pets: '#shorts pets animals cute',
      asmr: '#shorts asmr relaxing',
      educational: '#shorts learn tutorial',
    };

    // Mode-specific adjustments
    const modeQueries: Record<string, string> = {
      focus: '#shorts educational tutorial learn',
      break: '#shorts funny trending viral',
      workout: '#shorts fitness workout exercise gym',
      sleep: '#shorts asmr relaxing calm',
      discover: categoryQueries[category] || '#shorts trending',
    };

    const searchQuery = modeQueries[mode] || categoryQueries[category] || '#shorts trending';

    // Search for Shorts (100 units - cache aggressively!)
    const searchResponse = await fetch(
      `${YOUTUBE_API_BASE}/search?` +
        new URLSearchParams({
          part: 'snippet',
          q: searchQuery,
          type: 'video',
          videoDuration: 'short', // Only videos < 4 minutes
          maxResults: (limit * 2).toString(), // Fetch extra to filter
          order: 'relevance',
          regionCode: 'US',
          key: YOUTUBE_API_KEY,
        }),
      { cache: 'no-store' }
    );

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      logger.error('YouTube Shorts search failed', { status: searchResponse.status, error: errorText });
      return NextResponse.json({
        error: 'Failed to fetch YouTube Shorts',
        shorts: [],
      });
    }

    const searchData = await searchResponse.json();
    const videoIds = searchData.items
      ?.map((item: YouTubeSearchItem) => item.id.videoId)
      .filter(Boolean)
      .join(',');

    if (!videoIds) {
      return NextResponse.json({ shorts: [] });
    }

    // Get video details for duration and stats (1 unit - cheap)
    const detailsResponse = await fetch(
      `${YOUTUBE_API_BASE}/videos?` +
        new URLSearchParams({
          part: 'contentDetails,statistics',
          id: videoIds,
          key: YOUTUBE_API_KEY,
        }),
      { cache: 'no-store' }
    );

    const detailsData = await detailsResponse.json();
    const videoDetails = new Map<string, YouTubeVideoDetails>();

    for (const video of detailsData.items || []) {
      videoDetails.set(video.id, video);
    }

    // Filter to only include actual Shorts (< 60 seconds) and format response
    const shorts: ContentItem[] = [];

    for (const item of searchData.items || []) {
      const videoId = item.id.videoId;
      const details = videoDetails.get(videoId);

      if (!details) continue;

      const duration = parseDuration(details.contentDetails?.duration || '');

      // Only include videos under 60 seconds (true Shorts)
      if (duration > 60000) continue;

      shorts.push({
        id: `youtube-short-${videoId}`,
        source: 'youtube',
        type: 'video', // Will be treated as 'short' in UI based on duration
        title: item.snippet.title,
        subtitle: item.snippet.channelTitle,
        thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || '',
        duration,
        playbackUrl: `https://www.youtube.com/shorts/${videoId}`,
        deepLinkUrl: `https://www.youtube.com/shorts/${videoId}`,
        sourceMetadata: {
          videoId,
          channelId: item.snippet.channelId,
          publishedAt: item.snippet.publishedAt,
          viewCount: parseInt(details.statistics?.viewCount || '0'),
          likeCount: parseInt(details.statistics?.likeCount || '0'),
          isShort: true,
          category,
        },
      });

      if (shorts.length >= limit) break;
    }

    const result = {
      shorts,
      category,
      mode,
      count: shorts.length,
    };

    // Cache for 15 minutes to reduce quota usage
    youtubeCache.set(cacheKey, result, cacheTTL.shorts);
    logger.info('YouTube Shorts cached', { mode, category, count: shorts.length });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('YouTube Shorts fetch error', { error });
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch Shorts',
      shorts: [],
    });
  }
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
