import { NextRequest, NextResponse } from 'next/server';
import type { ContentItem } from '@/types/contenthub';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/auth/api-auth';
import { contentHubActionSchema, validationErrorResponse } from '@/lib/validations';
import { logger } from '@/lib/logger';
import { youtubeCache, cacheKeys, cacheTTL } from '@/lib/cache/youtube-cache';

/**
 * ContentHub API - Unified Content Aggregation
 *
 * Aggregates content from multiple sources:
 * - Spotify (via existing /api/spotify)
 * - YouTube (via YouTube Data API)
 * - Netflix (via Apify scraper - future)
 * - Instagram (via Apify scraper - future)
 * - Podcasts (via Podcast Index API - future)
 */

interface AggregatedContent {
  nowPlaying: ContentItem | null;
  recentlyPlayed: ContentItem[];
  recommendations: ContentItem[];
  trending: ContentItem[];
  shorts: ContentItem[];
  likedVideos: ContentItem[];
  youtubeAuthenticated: boolean;
  sources: {
    spotify: { connected: boolean; error?: string };
    youtube: { connected: boolean; error?: string };
    netflix: { connected: boolean; error?: string };
    instagram: { connected: boolean; error?: string };
    podcast: { connected: boolean; error?: string };
  };
}

/**
 * GET /api/contenthub - Get aggregated content from all sources
 */
export async function GET(request: NextRequest) {
  // Authenticate user
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') ?? 'discover';
  const sources = searchParams.get('sources')?.split(',') ?? ['spotify', 'youtube'];

  try {
    const result: AggregatedContent = {
      nowPlaying: null,
      recentlyPlayed: [],
      recommendations: [],
      trending: [],
      shorts: [],
      likedVideos: [],
      youtubeAuthenticated: false,
      sources: {
        spotify: { connected: false },
        youtube: { connected: false },
        netflix: { connected: false },
        instagram: { connected: false },
        podcast: { connected: false },
      },
    };

    // Fetch from each requested source in parallel
    const fetches: Promise<void>[] = [];

    if (sources.includes('spotify')) {
      fetches.push(fetchSpotifyContent(result));
    }

    if (sources.includes('youtube')) {
      fetches.push(fetchYouTubeContent(result, mode));
      fetches.push(fetchYouTubeShorts(result, mode));
      fetches.push(fetchYouTubeUserContent(result));
    }

    // Future: Add more sources
    // if (sources.includes('netflix')) { fetches.push(fetchNetflixContent(result, mode)); }
    // if (sources.includes('instagram')) { fetches.push(fetchInstagramContent(result, mode)); }

    await Promise.allSettled(fetches);

    // Apply mode filters to all content
    applyModeFilters(result, mode);

    return NextResponse.json(result);
  } catch (error) {
    logger.error('ContentHub aggregation error', { error: error });
    return NextResponse.json(
      { error: 'Failed to aggregate content' },
      { status: 500 }
    );
  }
}

/**
 * Fetch content from Spotify including recommendations
 */
async function fetchSpotifyContent(result: AggregatedContent): Promise<void> {
  try {
    // Use internal API call
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/spotify`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status}`);
    }

    const data = await response.json();
    result.sources.spotify.connected = true;

    let seedTrackId: string | null = null;

    if (data.track) {
      seedTrackId = data.track.id;
      const nowPlaying: ContentItem = {
        id: `spotify-${data.track.id}`,
        source: 'spotify',
        type: 'track',
        title: data.track.title,
        subtitle: data.track.artist,
        thumbnailUrl: data.track.albumArtUrl,
        duration: data.track.durationMs,
        playbackUrl: data.track.spotifyUrl,
        deepLinkUrl: data.track.spotifyUrl,
        sourceMetadata: {
          album: data.track.album,
          isPlaying: data.isPlaying,
          progress: data.progress,
          uri: `spotify:track:${data.track.id}`,
        },
      };

      if (data.isPlaying) {
        result.nowPlaying = nowPlaying;
      } else {
        result.recentlyPlayed.push(nowPlaying);
      }
    }

    // Fetch recommendations based on seed track
    if (seedTrackId) {
      await fetchSpotifyRecommendations(result, seedTrackId, baseUrl);
    }
  } catch (error) {
    result.sources.spotify.error = error instanceof Error ? error.message : 'Connection failed';
  }
}

/**
 * Fetch Spotify recommendations based on seed track
 */
async function fetchSpotifyRecommendations(
  result: AggregatedContent, 
  seedTrackId: string,
  baseUrl: string
): Promise<void> {
  try {
    const response = await fetch(
      `${baseUrl}/api/spotify/recommendations?seed_tracks=${seedTrackId}&limit=12`,
      { cache: 'no-store' }
    );

    if (!response.ok) return;

    const data = await response.json();

    if (data.tracks && Array.isArray(data.tracks)) {
      for (const track of data.tracks) {
        const item: ContentItem = {
          id: `spotify-${track.id}`,
          source: 'spotify',
          type: 'track',
          title: track.name || 'Unknown Track',
          subtitle: track.artists?.map((a: { name: string }) => a.name).join(', ') || 'Unknown Artist',
          thumbnailUrl: track.album?.images?.[0]?.url || '',
          duration: track.duration_ms || 0,
          playbackUrl: track.external_urls?.spotify || '',
          deepLinkUrl: track.external_urls?.spotify || '',
          sourceMetadata: {
            album: track.album?.name,
            uri: track.uri,
          },
        };
        result.recommendations.push(item);
      }
    }
  } catch (error) {
    logger.warn('Failed to fetch Spotify recommendations', { error: error });
  }
}

/**
 * Fetch content from YouTube
 */
async function fetchYouTubeContent(
  result: AggregatedContent,
  mode: string
): Promise<void> {
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

  if (!YOUTUBE_API_KEY) {
    result.sources.youtube.error = 'API key not configured';
    return;
  }

  try {
    // Map mode to YouTube category
    const categoryMap: Record<string, string> = {
      focus: '10', // Music
      break: '24', // Entertainment
      workout: '17', // Sports
      sleep: '10', // Music (ambient)
      discover: '0', // All
    };

    const categoryId = categoryMap[mode] ?? '0';

    // Fetch trending videos
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?` +
        new URLSearchParams({
          part: 'snippet,contentDetails',
          chart: 'mostPopular',
          regionCode: 'US',
          maxResults: '10',
          videoCategoryId: categoryId,
          key: YOUTUBE_API_KEY,
        }),
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();
    result.sources.youtube.connected = true;

    if (data.items) {
      for (const item of data.items) {
        const contentItem: ContentItem = {
          id: `youtube-${item.id}`,
          source: 'youtube',
          type: 'video',
          title: item.snippet.title,
          subtitle: item.snippet.channelTitle,
          thumbnailUrl:
            item.snippet.thumbnails.high?.url ??
            item.snippet.thumbnails.default?.url,
          duration: parseDuration(item.contentDetails.duration),
          playbackUrl: `https://www.youtube.com/watch?v=${item.id}`,
          deepLinkUrl: `https://www.youtube.com/watch?v=${item.id}`,
          sourceMetadata: {
            channelId: item.snippet.channelId,
            publishedAt: item.snippet.publishedAt,
            categoryId: item.snippet.categoryId,
          },
        };
        result.trending.push(contentItem);
      }
    }
  } catch (error) {
    result.sources.youtube.error = error instanceof Error ? error.message : 'Connection failed';
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

/**
 * Fetch YouTube Shorts
 * OPTIMIZED: Added caching to reduce quota usage (search.list = 100 units!)
 */
async function fetchYouTubeShorts(
  result: AggregatedContent,
  mode: string
): Promise<void> {
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
  if (!YOUTUBE_API_KEY) return;

  // Check cache first - shorts are expensive!
  const cacheKey = cacheKeys.shorts(mode, 'contenthub', 12);
  const cached = youtubeCache.get<ContentItem[]>(cacheKey);
  if (cached) {
    result.shorts = cached;
    logger.info('ContentHub shorts cache hit', { mode });
    return;
  }

  try {
    // Mode-specific search queries for shorts
    const modeQueries: Record<string, string> = {
      focus: '#shorts educational tutorial',
      break: '#shorts funny trending viral',
      workout: '#shorts fitness workout gym',
      sleep: '#shorts asmr relaxing calm',
      discover: '#shorts trending',
    };

    const searchQuery = modeQueries[mode] || '#shorts trending';

    const searchResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?` +
        new URLSearchParams({
          part: 'snippet',
          q: searchQuery,
          type: 'video',
          videoDuration: 'short',
          maxResults: '20',
          order: 'relevance',
          regionCode: 'US',
          key: YOUTUBE_API_KEY,
        }),
      { cache: 'no-store' }
    );

    if (!searchResponse.ok) return;

    const searchData = await searchResponse.json();
    const videoIds = searchData.items
      ?.map((item: { id: { videoId: string } }) => item.id.videoId)
      .filter(Boolean)
      .join(',');

    if (!videoIds) return;

    // Get video details (cheap - 1 unit)
    const detailsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?` +
        new URLSearchParams({
          part: 'contentDetails,statistics',
          id: videoIds,
          key: YOUTUBE_API_KEY,
        }),
      { cache: 'no-store' }
    );

    const detailsData = await detailsResponse.json();
    const videoDetails = new Map<string, { duration: string; viewCount: string }>();

    for (const video of detailsData.items || []) {
      videoDetails.set(video.id, {
        duration: video.contentDetails?.duration || '',
        viewCount: video.statistics?.viewCount || '0',
      });
    }

    for (const item of searchData.items || []) {
      const videoId = item.id.videoId;
      const details = videoDetails.get(videoId);
      const duration = details ? parseDuration(details.duration) : 0;

      // Only include actual shorts (< 60 seconds)
      if (duration > 60000) continue;

      result.shorts.push({
        id: `youtube-short-${videoId}`,
        source: 'youtube',
        type: 'short',
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
          viewCount: parseInt(details?.viewCount || '0'),
          isShort: true,
        },
      });

      if (result.shorts.length >= 12) break;
    }

    // Cache the results for 15 minutes
    youtubeCache.set(cacheKey, result.shorts, cacheTTL.shorts);
    logger.info('ContentHub shorts cached', { mode, count: result.shorts.length });
  } catch (error) {
    logger.warn('Failed to fetch YouTube Shorts', { error });
  }
}

/**
 * Fetch user's YouTube content (liked videos, etc.) using Google OAuth token
 */
async function fetchYouTubeUserContent(result: AggregatedContent): Promise<void> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/youtube/history?type=all&limit=10`, {
      cache: 'no-store',
    });

    if (!response.ok) return;

    const data = await response.json();

    result.youtubeAuthenticated = data.authenticated || false;

    if (data.likedVideos && Array.isArray(data.likedVideos)) {
      result.likedVideos = data.likedVideos;
    }

    // Add recent from subscriptions to recommendations
    if (data.recentFromSubscriptions && Array.isArray(data.recentFromSubscriptions)) {
      result.recommendations.push(...data.recentFromSubscriptions);
    }
  } catch (error) {
    logger.warn('Failed to fetch YouTube user content', { error });
  }
}

/**
 * Apply mode-based filters to content
 */
function applyModeFilters(result: AggregatedContent, mode: string): void {
  const modeConfigs: Record<string, {
    minDuration?: number;
    maxDuration?: number;
    excludeTypes?: string[];
    preferTypes?: string[];
  }> = {
    focus: {
      minDuration: 180000, // 3+ minutes
      excludeTypes: ['short', 'reel'],
    },
    break: {
      maxDuration: 600000, // < 10 minutes
      preferTypes: ['short', 'reel'],
    },
    workout: {
      preferTypes: ['track', 'short'],
    },
    sleep: {
      excludeTypes: ['short', 'reel'],
    },
    discover: {
      // No filters
    },
  };

  const config = modeConfigs[mode];
  if (!config) return;

  // Filter recommendations
  if (config.minDuration || config.maxDuration || config.excludeTypes) {
    result.recommendations = result.recommendations.filter((item) => {
      if (config.minDuration && item.duration < config.minDuration) return false;
      if (config.maxDuration && item.duration > config.maxDuration) return false;
      if (config.excludeTypes?.includes(item.type)) return false;
      return true;
    });

    result.trending = result.trending.filter((item) => {
      if (config.minDuration && item.duration < config.minDuration) return false;
      if (config.maxDuration && item.duration > config.maxDuration) return false;
      if (config.excludeTypes?.includes(item.type)) return false;
      return true;
    });
  }

  // For break/workout modes, prioritize shorts
  if (config.preferTypes?.includes('short')) {
    // Move some shorts to recommendations for visibility
    const shortsToPromote = result.shorts.slice(0, 4);
    result.recommendations = [...shortsToPromote, ...result.recommendations];
  }

  // For focus/sleep modes, clear shorts from main view
  if (config.excludeTypes?.includes('short')) {
    result.shorts = [];
  }
}

/**
 * POST /api/contenthub - Perform actions (play, queue, save)
 */
export async function POST(request: NextRequest) {
  // Authenticate user
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();

    // Validate input
    const parseResult = contentHubActionSchema.safeParse(body);
    if (!parseResult.success) {
      return validationErrorResponse(parseResult.error);
    }

    const { action, item } = parseResult.data;

    switch (action) {
      case 'play':
        return handlePlay(item);

      case 'queue':
        return handleQueue(item);

      case 'save':
        return handleSave(item);

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    logger.error('ContentHub action error', { error: error });
    return NextResponse.json(
      { error: 'Action failed' },
      { status: 500 }
    );
  }
}

async function handlePlay(item: ContentItem) {
  // Route to appropriate source's playback API
  switch (item.source) {
    case 'spotify':
      // Trigger Spotify playback
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
      await fetch(`${baseUrl}/api/spotify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'play',
          uri: item.sourceMetadata?.uri,
        }),
      });
      return NextResponse.json({ success: true });

    case 'youtube':
      // YouTube plays in embedded player - just return success
      return NextResponse.json({ success: true, playbackUrl: item.playbackUrl });

    default:
      return NextResponse.json({ success: true, deepLinkUrl: item.deepLinkUrl });
  }
}

async function handleQueue(item: ContentItem) {
  // Queue management is handled client-side via Zustand store
  // This endpoint can be used for server-side queue persistence
  return NextResponse.json({ success: true, queued: item.id });
}

async function handleSave(item: ContentItem) {
  // Save for later - can be persisted to Supabase
  // For now, just return success (client handles via Zustand)
  return NextResponse.json({ success: true, saved: item.id });
}
