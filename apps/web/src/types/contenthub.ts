/**
 * ContentHub Widget Types
 *
 * Unified type definitions for multi-source content aggregation
 */

export type ContentSource =
  | 'spotify'
  | 'youtube'
  | 'netflix'
  | 'primevideo'
  | 'disney'
  | 'instagram'
  | 'facebook'
  | 'podcast';

export type ContentType =
  | 'track'
  | 'video'
  | 'short'
  | 'movie'
  | 'tvshow'
  | 'reel'
  | 'podcast_episode';

export type ContentMode = 'focus' | 'break' | 'discover' | 'workout' | 'sleep';

export interface ContentItem {
  id: string;
  source: ContentSource;
  type: ContentType;

  // Universal metadata
  title: string;
  subtitle: string;
  thumbnailUrl: string;
  duration: number; // Milliseconds

  // Playback options
  playbackUrl?: string; // Direct playback (Spotify, YouTube, Instagram)
  deepLinkUrl?: string; // Native app redirect (Netflix, etc.)
  embedHtml?: string; // oEmbed HTML (Facebook)

  // Source-specific metadata
  sourceMetadata: Record<string, unknown>;

  // User context
  progress?: number;
  addedAt?: Date;
  lastPlayedAt?: Date;
}

export interface ContentQueue {
  nowPlaying: ContentItem | null;
  upNext: ContentItem[];
  history: ContentItem[];
  savedForLater: ContentItem[];
}

export interface ContentPreferences {
  activeMode: ContentMode;
  excludedSources: ContentSource[];
  preferredCategories: string[];
}

// Spotify-specific types (for backward compatibility)
export interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumArtUrl: string;
  durationMs: number;
  spotifyUrl: string;
}

export interface SpotifyState {
  isPlaying: boolean;
  progress: number;
  shuffleState: boolean;
  repeatState: 'off' | 'track' | 'context';
  track: SpotifyTrack | null;
  device: {
    id: string;
    name: string;
    type: string;
    volume: number;
  } | null;
  isMock?: boolean;
}

// YouTube-specific types
export interface YouTubeVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  duration: number;
  publishedAt: string;
}

// Netflix-specific types (from Apify)
export interface NetflixTitle {
  netflixId: string;
  title: string;
  synopsis: string;
  rating: number;
  releaseYear: number;
  runtime: number;
  coverUrl: string;
  imdbId: string;
  genres: string[];
  availability: string[];
}

// Instagram-specific types (from Apify)
export interface InstagramReel {
  id: string;
  shortCode: string;
  caption: string;
  timestamp: string;
  ownerUsername: string;
  ownerFullName: string;
  thumbnailUrl: string;
  videoUrl: string;
  viewCount: number;
  likeCount: number;
  duration: number;
  hashtags: string[];
}

// API Response types
export interface ContentFeedResponse {
  feed: ContentItem[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface ContentSearchResponse {
  results: ContentItem[];
  query: string;
  totalResults: number;
}

// Mode filter configurations
export interface ModeFilter {
  excludeTypes?: ContentType[];
  minDuration?: number;
  maxDuration?: number;
  preferCategories?: string[];
  excludeSources?: ContentSource[];
  preferSources?: ContentSource[];
  bpmRange?: [number, number];
  maxVolume?: number;
  autoFade?: boolean;
}

export interface ModeConfig {
  name: string;
  icon: string;
  description: string;
  filter: ModeFilter;
}

export const PRESET_MODES: Record<ContentMode, ModeConfig> = {
  focus: {
    name: 'Focus Mode',
    icon: 'Brain',
    description: 'Long-form instrumental and educational content',
    filter: {
      excludeTypes: ['reel'],
      minDuration: 180000, // 3+ minutes
      preferCategories: ['instrumental', 'ambient', 'tutorial', 'documentary'],
      excludeSources: ['instagram', 'facebook'],
    },
  },
  break: {
    name: 'Break Mode',
    icon: 'Coffee',
    description: 'Quick entertainment and trending content',
    filter: {
      maxDuration: 600000, // < 10 minutes
      preferCategories: ['comedy', 'music', 'trending', 'viral'],
    },
  },
  workout: {
    name: 'Workout Mode',
    icon: 'Dumbbell',
    description: 'High-energy music and fitness videos',
    filter: {
      preferCategories: ['workout', 'high-energy', 'electronic', 'hip-hop'],
      bpmRange: [120, 160],
      preferSources: ['spotify', 'youtube'],
    },
  },
  sleep: {
    name: 'Sleep Mode',
    icon: 'Moon',
    description: 'Calming ambient and meditation content',
    filter: {
      preferCategories: ['ambient', 'nature', 'asmr', 'meditation', 'sleep'],
      maxVolume: 50,
      autoFade: true,
    },
  },
  discover: {
    name: 'Discover Mode',
    icon: 'Compass',
    description: 'Explore new content across all sources',
    filter: {},
  },
};

// Helper function to normalize content from different sources
export function normalizeToContentItem(
  source: ContentSource,
  data: SpotifyTrack | YouTubeVideo | NetflixTitle | InstagramReel
): ContentItem {
  switch (source) {
    case 'spotify': {
      const track = data as SpotifyTrack;
      return {
        id: `spotify-${track.id}`,
        source: 'spotify',
        type: 'track',
        title: track.title,
        subtitle: track.artist,
        thumbnailUrl: track.albumArtUrl,
        duration: track.durationMs,
        playbackUrl: track.spotifyUrl,
        sourceMetadata: {
          spotifyId: track.id,
          album: track.album,
        },
      };
    }
    case 'youtube': {
      const video = data as YouTubeVideo;
      return {
        id: `youtube-${video.videoId}`,
        source: 'youtube',
        type: 'video',
        title: video.title,
        subtitle: video.channelTitle,
        thumbnailUrl: video.thumbnailUrl,
        duration: video.duration,
        playbackUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
        sourceMetadata: {
          videoId: video.videoId,
          publishedAt: video.publishedAt,
        },
      };
    }
    case 'netflix': {
      const title = data as NetflixTitle;
      return {
        id: `netflix-${title.netflixId}`,
        source: 'netflix',
        type: title.runtime > 60 ? 'movie' : 'tvshow',
        title: title.title,
        subtitle: `${title.releaseYear} • ${title.genres?.slice(0, 2).join(', ') ?? ''}`,
        thumbnailUrl: title.coverUrl,
        duration: title.runtime * 60 * 1000,
        deepLinkUrl: `https://www.netflix.com/title/${title.netflixId}`,
        sourceMetadata: {
          netflixId: title.netflixId,
          imdbId: title.imdbId,
          rating: title.rating,
          synopsis: title.synopsis,
        },
      };
    }
    case 'instagram': {
      const reel = data as InstagramReel;
      return {
        id: `instagram-${reel.id}`,
        source: 'instagram',
        type: 'reel',
        title: reel.caption?.slice(0, 100) ?? 'Instagram Reel',
        subtitle: `@${reel.ownerUsername}`,
        thumbnailUrl: reel.thumbnailUrl,
        duration: (reel.duration ?? 30) * 1000,
        playbackUrl: reel.videoUrl,
        deepLinkUrl: `https://www.instagram.com/reel/${reel.shortCode}`,
        sourceMetadata: {
          shortCode: reel.shortCode,
          viewCount: reel.viewCount,
          likeCount: reel.likeCount,
          hashtags: reel.hashtags,
        },
      };
    }
    default:
      throw new Error(`Unknown source: ${source}`);
  }
}
