import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/auth/api-auth';
import { getGoogleProviderToken, refreshGoogleToken } from '@/lib/auth/google-token';
import { logger } from '@/lib/logger';
import { youtubeCache, cacheKeys, cacheTTL } from '@/lib/cache/youtube-cache';
import type { ContentItem } from '@/types/contenthub';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

interface YouTubePlaylistItem {
  snippet: {
    title: string;
    channelTitle: string;
    channelId: string;
    publishedAt: string;
    resourceId: { videoId: string };
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
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

interface YouTubeSubscription {
  snippet: {
    title: string;
    resourceId: { channelId: string };
    thumbnails: {
      default?: { url: string };
      high?: { url: string };
    };
  };
}

/**
 * GET /api/youtube/history
 * 
 * Fetches user's personalized YouTube data using their Google OAuth token.
 * Requires user to have authenticated with Google and granted youtube.readonly scope.
 * 
 * Query params:
 * - type: 'liked' | 'subscriptions' | 'all' (default: 'all')
 * - limit: Number of results (default 20, max 50)
 */
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'all';
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

  // Get Google provider token for YouTube API access
  let { accessToken, error: tokenError } = await getGoogleProviderToken();

  // Try to refresh the token if access token is missing
  if (!accessToken) {
    logger.info('No access token, attempting refresh');
    const refreshResult = await refreshGoogleToken();
    if (refreshResult.accessToken) {
      accessToken = refreshResult.accessToken;
      tokenError = undefined;

      // Store the new access token in cookies
      const cookieStore = await cookies();
      cookieStore.set('google_provider_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60, // 1 hour
        path: '/',
      });
      logger.info('Successfully refreshed Google token');
    } else {
      logger.warn('Token refresh failed', { error: refreshResult.error });
    }
  }

  // Fallback to API key for non-authenticated features
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

  const results: {
    likedVideos: ContentItem[];
    subscriptions: Array<{ id: string; name: string; thumbnailUrl: string }>;
    recentFromSubscriptions: ContentItem[];
    authenticated: boolean;
    error?: string;
  } = {
    likedVideos: [],
    subscriptions: [],
    recentFromSubscriptions: [],
    authenticated: !!accessToken,
  };

  if (!accessToken) {
    // Return with flag indicating user needs to authenticate with Google
    results.error = tokenError || 'YouTube authentication required. Please re-login with Google.';
    
    // Still try to return some trending content as fallback
    if (YOUTUBE_API_KEY) {
      try {
        const trendingShorts = await fetchTrendingShorts(YOUTUBE_API_KEY, limit);
        results.recentFromSubscriptions = trendingShorts;
      } catch (err) {
        logger.warn('Failed to fetch fallback trending', { err });
      }
    }
    
    return NextResponse.json(results);
  }

  try {
    const fetches: Promise<void>[] = [];

    // Fetch liked videos
    if (type === 'all' || type === 'liked') {
      fetches.push(
        fetchLikedVideos(accessToken, limit, YOUTUBE_API_KEY)
          .then(videos => { results.likedVideos = videos; })
          .catch(err => {
            logger.warn('Failed to fetch liked videos', { err });
            results.likedVideos = [];
          })
      );
    }

    // Fetch subscriptions
    if (type === 'all' || type === 'subscriptions') {
      fetches.push(
        fetchSubscriptions(accessToken, limit)
          .then(subs => { results.subscriptions = subs; })
          .catch(err => {
            logger.warn('Failed to fetch subscriptions', { err });
            results.subscriptions = [];
          })
      );
    }

    await Promise.all(fetches);

    // Fetch recent videos from subscribed channels
    if (results.subscriptions.length > 0 && YOUTUBE_API_KEY) {
      try {
        const channelIds = results.subscriptions.slice(0, 5).map(s => s.id);
        results.recentFromSubscriptions = await fetchRecentFromChannels(
          channelIds,
          YOUTUBE_API_KEY,
          Math.min(limit, 10)
        );
      } catch (err) {
        logger.warn('Failed to fetch recent from subscriptions', { err });
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    logger.error('YouTube history fetch error', { error });
    return NextResponse.json({
      ...results,
      error: error instanceof Error ? error.message : 'Failed to fetch YouTube history',
    });
  }
}

/**
 * Fetch user's liked videos
 */
async function fetchLikedVideos(
  accessToken: string,
  limit: number,
  apiKey?: string
): Promise<ContentItem[]> {
  // Get the user's liked videos playlist
  const response = await fetch(
    `${YOUTUBE_API_BASE}/videos?` +
      new URLSearchParams({
        part: 'snippet,contentDetails,statistics',
        myRating: 'like',
        maxResults: limit.toString(),
      }),
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('Failed to fetch liked videos', { status: response.status, error: errorText });
    throw new Error(`YouTube API error: ${response.status}`);
  }

  const data = await response.json();

  return (data.items || []).map((item: YouTubeVideoDetails & { snippet: YouTubePlaylistItem['snippet'] }) => ({
    id: `youtube-liked-${item.id}`,
    source: 'youtube' as const,
    type: 'video' as const,
    title: item.snippet?.title || 'Unknown',
    subtitle: item.snippet?.channelTitle || 'Unknown Channel',
    thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || '',
    duration: parseDuration(item.contentDetails?.duration || ''),
    playbackUrl: `https://www.youtube.com/watch?v=${item.id}`,
    deepLinkUrl: `https://www.youtube.com/watch?v=${item.id}`,
    sourceMetadata: {
      videoId: item.id,
      channelId: item.snippet?.channelId,
      viewCount: parseInt(item.statistics?.viewCount || '0'),
      likeCount: parseInt(item.statistics?.likeCount || '0'),
      isLiked: true,
    },
  }));
}

/**
 * Fetch user's subscriptions
 */
async function fetchSubscriptions(
  accessToken: string,
  limit: number
): Promise<Array<{ id: string; name: string; thumbnailUrl: string }>> {
  const response = await fetch(
    `${YOUTUBE_API_BASE}/subscriptions?` +
      new URLSearchParams({
        part: 'snippet',
        mine: 'true',
        maxResults: limit.toString(),
        order: 'relevance',
      }),
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    throw new Error(`YouTube API error: ${response.status}`);
  }

  const data = await response.json();

  return (data.items || []).map((item: YouTubeSubscription) => ({
    id: item.snippet.resourceId.channelId,
    name: item.snippet.title,
    thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || '',
  }));
}

/**
 * Fetch recent videos from specific channels
 * OPTIMIZED: Reduced from 3 channels to 1 to save quota (search.list = 100 units per channel!)
 * Also added caching to reduce repeated calls
 */
async function fetchRecentFromChannels(
  channelIds: string[],
  apiKey: string,
  limit: number
): Promise<ContentItem[]> {
  // Only fetch from 1 channel to save quota (100 units per search.list call!)
  const channelId = channelIds[0];
  if (!channelId) return [];

  // Check cache first
  const cacheKey = cacheKeys.channelVideos(channelId, limit);
  const cached = youtubeCache.get<ContentItem[]>(cacheKey);
  if (cached) {
    logger.info('Channel videos cache hit', { channelId });
    return cached;
  }

  const results: ContentItem[] = [];

  try {
    const searchResponse = await fetch(
      `${YOUTUBE_API_BASE}/search?` +
        new URLSearchParams({
          part: 'snippet',
          channelId,
          type: 'video',
          order: 'date',
          maxResults: limit.toString(),
          key: apiKey,
        }),
      { cache: 'no-store' }
    );

    if (!searchResponse.ok) return [];

    const searchData = await searchResponse.json();

    for (const item of searchData.items || []) {
      if (results.length >= limit) break;

      results.push({
        id: `youtube-sub-${item.id.videoId}`,
        source: 'youtube',
        type: 'video',
        title: item.snippet.title,
        subtitle: item.snippet.channelTitle,
        thumbnailUrl: item.snippet.thumbnails?.high?.url || '',
        duration: 0,
        playbackUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        deepLinkUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        sourceMetadata: {
          videoId: item.id.videoId,
          channelId: item.snippet.channelId,
          publishedAt: item.snippet.publishedAt,
          fromSubscription: true,
        },
      });
    }

    // Cache for 15 minutes
    youtubeCache.set(cacheKey, results, cacheTTL.channelVideos);
  } catch (err) {
    logger.warn('Failed to fetch from channel', { channelId, err });
  }

  return results;
}

/**
 * Fallback: fetch trending shorts when user is not authenticated
 * OPTIMIZED: Added caching to reduce quota usage (search.list = 100 units!)
 */
async function fetchTrendingShorts(apiKey: string, limit: number): Promise<ContentItem[]> {
  // Check cache first
  const cacheKey = cacheKeys.shorts('fallback', 'trending', limit);
  const cached = youtubeCache.get<ContentItem[]>(cacheKey);
  if (cached) {
    logger.info('Trending shorts cache hit');
    return cached;
  }

  const response = await fetch(
    `${YOUTUBE_API_BASE}/search?` +
      new URLSearchParams({
        part: 'snippet',
        q: '#shorts trending',
        type: 'video',
        videoDuration: 'short',
        maxResults: limit.toString(),
        order: 'relevance',
        regionCode: 'US',
        key: apiKey,
      }),
    { cache: 'no-store' }
  );

  if (!response.ok) return [];

  const data = await response.json();

  const results = (data.items || []).slice(0, limit).map((item: { id: { videoId: string }; snippet: YouTubePlaylistItem['snippet'] }) => ({
    id: `youtube-trending-${item.id.videoId}`,
    source: 'youtube' as const,
    type: 'video' as const,
    title: item.snippet.title,
    subtitle: item.snippet.channelTitle,
    thumbnailUrl: item.snippet.thumbnails?.high?.url || '',
    duration: 0,
    playbackUrl: `https://www.youtube.com/shorts/${item.id.videoId}`,
    deepLinkUrl: `https://www.youtube.com/shorts/${item.id.videoId}`,
    sourceMetadata: {
      videoId: item.id.videoId,
      isShort: true,
      isTrending: true,
    },
  }));

  // Cache for 15 minutes
  youtubeCache.set(cacheKey, results, cacheTTL.shorts);
  logger.info('Trending shorts cached', { count: results.length });

  return results;
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
