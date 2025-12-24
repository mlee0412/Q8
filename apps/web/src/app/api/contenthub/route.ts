import { NextRequest, NextResponse } from 'next/server';
import type { ContentItem } from '@/types/contenthub';

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
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') ?? 'discover';
  const sources = searchParams.get('sources')?.split(',') ?? ['spotify', 'youtube'];

  try {
    const result: AggregatedContent = {
      nowPlaying: null,
      recentlyPlayed: [],
      recommendations: [],
      trending: [],
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
    }

    // Future: Add more sources
    // if (sources.includes('netflix')) { fetches.push(fetchNetflixContent(result, mode)); }
    // if (sources.includes('instagram')) { fetches.push(fetchInstagramContent(result, mode)); }

    await Promise.allSettled(fetches);

    return NextResponse.json(result);
  } catch (error) {
    console.error('ContentHub aggregation error:', error);
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
    console.warn('Failed to fetch Spotify recommendations:', error);
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
 * POST /api/contenthub - Perform actions (play, queue, save)
 */
export async function POST(request: NextRequest) {
  try {
    const { action, item, ...params } = await request.json();

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
    console.error('ContentHub action error:', error);
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
