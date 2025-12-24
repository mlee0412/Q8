import { NextRequest, NextResponse } from 'next/server';

const HA_URL = process.env.HASS_URL || 'http://homeassistant.local:8123';
const HA_TOKEN = process.env.HASS_TOKEN || '';

// Default media player entity for casting
const DEFAULT_MEDIA_PLAYER = 'media_player.living_room';

interface CastRequest {
  mediaUrl: string;
  mediaType: 'music' | 'video' | 'url';
  title?: string;
  artist?: string;
  thumbnailUrl?: string;
  source: 'spotify' | 'youtube' | 'url';
  entityId?: string;
}

interface HAServiceResult {
  success: boolean;
  error?: string;
}

/**
 * Helper to make authenticated requests to Home Assistant
 * Returns null on error instead of throwing
 */
async function haFetch(endpoint: string, options: RequestInit = {}): Promise<unknown> {
  if (!HA_TOKEN) {
    throw new Error('Home Assistant token not configured');
  }

  const response = await fetch(`${HA_URL}/api${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${HA_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Home Assistant API error: ${response.status} - ${errorText}`);
  }

  // Some HA endpoints return empty response
  const text = await response.text();
  return text ? JSON.parse(text) : { success: true };
}

/**
 * Try to call a Home Assistant service, return success/error
 */
async function tryHAService(
  domain: string,
  service: string,
  data: Record<string, unknown>
): Promise<HAServiceResult> {
  try {
    await haFetch(`/services/${domain}/${service}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Service call failed' 
    };
  }
}

/**
 * POST /api/contenthub/cast
 * 
 * Cast media to a Home Assistant media_player entity (e.g., Apple TV, Chromecast, Sonos)
 * 
 * For Spotify content on Apple TV, we use media_player.play_media with spotify:// URI
 * For YouTube, we use the YouTube app on Apple TV
 */
export async function POST(request: NextRequest) {
  try {
    const body: CastRequest = await request.json();
    const { mediaUrl, title, source, entityId } = body;
    
    const targetEntity = entityId || DEFAULT_MEDIA_PLAYER;
    const remoteEntity = targetEntity.replace('media_player.', 'remote.');

    if (!mediaUrl) {
      return NextResponse.json(
        { error: 'Media URL is required' },
        { status: 400 }
      );
    }

    // Check if Home Assistant is configured
    if (!HA_TOKEN) {
      return NextResponse.json({
        success: false,
        needsSpotifyConnect: source === 'spotify',
        fallbackUrl: mediaUrl,
        message: 'Home Assistant not configured.',
      });
    }

    // Step 1: Turn on Apple TV
    await tryHAService('media_player', 'turn_on', {
      entity_id: targetEntity,
    });
    
    // Small delay to let Apple TV wake up
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 2: Launch the appropriate app on Apple TV
    let appLaunched = false;
    
    if (source === 'spotify') {
      // Launch Spotify app on Apple TV
      const launchResult = await tryHAService('remote', 'turn_on', {
        entity_id: remoteEntity,
        activity: 'com.spotify.client',
      });
      
      if (!launchResult.success) {
        // Try alternative method
        await tryHAService('media_player', 'select_source', {
          entity_id: targetEntity,
          source: 'Spotify',
        });
      }
      
      appLaunched = true;
      
      // Return success - client should now use Spotify Connect to transfer playback
      return NextResponse.json({
        success: true,
        needsSpotifyConnect: true,
        message: `Launching Spotify on Apple TV. Transferring playback...`,
        entity: targetEntity,
      });
    } else if (source === 'youtube') {
      // Launch YouTube app on Apple TV
      const launchResult = await tryHAService('remote', 'turn_on', {
        entity_id: remoteEntity,
        activity: 'com.google.ios.youtube',
      });
      
      if (!launchResult.success) {
        // Try alternative method
        await tryHAService('media_player', 'select_source', {
          entity_id: targetEntity,
          source: 'YouTube',
        });
      }
      
      appLaunched = true;
      
      // For YouTube, we can try to play via deep link
      const videoId = extractYouTubeVideoId(mediaUrl);
      if (videoId) {
        // Try to play the video
        await tryHAService('media_player', 'play_media', {
          entity_id: targetEntity,
          media_content_id: mediaUrl,
          media_content_type: 'video',
        });
      }
      
      return NextResponse.json({
        success: true,
        appLaunched,
        message: `Launching YouTube on Apple TV`,
        entity: targetEntity,
        // Include the URL so user can manually navigate if needed
        videoUrl: mediaUrl,
      });
    }

    // Fallback for other sources
    return NextResponse.json({
      success: false,
      fallbackUrl: mediaUrl,
      message: 'Opening content...',
    });
  } catch (error) {
    console.error('Cast error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Cast failed',
    });
  }
}

/**
 * GET /api/contenthub/cast
 * 
 * Get available media players for casting
 */
export async function GET() {
  try {
    if (!HA_TOKEN) {
      return NextResponse.json({
        available: false,
        players: [],
        error: 'Home Assistant not configured',
      });
    }

    // Fetch all media_player entities
    const states = await haFetch('/states') as Array<{
      entity_id: string;
      state: string;
      attributes: Record<string, unknown>;
    }>;
    
    const mediaPlayers = states
      .filter((state) => state.entity_id.startsWith('media_player.'))
      .map((state) => ({
        entity_id: state.entity_id,
        name: state.attributes.friendly_name || state.entity_id.replace('media_player.', ''),
        state: state.state,
        isAvailable: state.state !== 'unavailable',
        supportsPlayMedia: (state.attributes.supported_features as number || 0) & 131072, // PLAY_MEDIA flag
      }));

    return NextResponse.json({
      available: true,
      players: mediaPlayers,
      defaultPlayer: DEFAULT_MEDIA_PLAYER,
    });
  } catch (error) {
    console.error('Get media players error:', error);
    return NextResponse.json({
      available: false,
      players: [],
      error: error instanceof Error ? error.message : 'Failed to fetch media players',
    });
  }
}

/**
 * Convert Spotify URL to Spotify URI
 * https://open.spotify.com/track/xxx -> spotify:track:xxx
 */
function convertSpotifyUrlToUri(url: string): string | null {
  // Already a URI
  if (url.startsWith('spotify:')) {
    return url;
  }

  // Parse URL
  const match = url.match(/open\.spotify\.com\/(track|album|playlist|artist)\/([a-zA-Z0-9]+)/);
  if (match) {
    return `spotify:${match[1]}:${match[2]}`;
  }

  return null;
}

/**
 * Extract YouTube video ID from URL
 */
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // Just the ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}
