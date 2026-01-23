/**
 * ContentHubWidget Types
 * Shared type definitions for content hub components
 */

import type { ContentItem } from '@/types/contenthub';

export interface ContentHubWidgetProps {
  className?: string;
}

export interface CastMessage {
  type: 'loading' | 'success' | 'error';
  text: string;
  fallbackUrl?: string;
}

export interface PlaylistSelection {
  id: string;
  name: string;
}

export interface MediaCommandCenterProps {
  onClose: () => void;
  nowPlaying: ContentItem | null;
  isPlaying: boolean;
  progress: number;
  queue: ContentItem[];
  recommendations: ContentItem[];
  trending: ContentItem[];
  spotifyPlaylists: ContentItem[];
  spotifyRecentlyPlayed: ContentItem[];
  spotifyTopTracks: ContentItem[];
  featuredPlaylists: ContentItem[];
  youtubeTrending: ContentItem[];
  youtubeMusic: ContentItem[];
  // YouTube user data (from Google OAuth)
  youtubeLikedVideos: ContentItem[];
  youtubeFromSubscriptions: ContentItem[];
  youtubeAuthenticated: boolean;
  selectedPlaylist: PlaylistSelection | null;
  playlistTracks: ContentItem[];
  playlistLoading: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (position: number) => void;
  onPlay: (item: ContentItem) => void;
  onRemove: (itemId: string) => void;
  onAIDiscover: () => void;
  onOpenPlaylist: (playlistId: string, playlistName: string) => void;
  onClosePlaylist: () => void;
  onAddToPlaylist: (playlistId: string) => void;
  onCreatePlaylist: (name: string) => Promise<{ success: boolean; playlist?: unknown; error?: string }>;
  onSmartHome: () => void;
  onVoice: () => void;
  onDeviceSelect?: () => void;
  currentDeviceName?: string | null;
  aiDiscoverLoading?: boolean;
}

export interface QueueItemProps {
  item: ContentItem;
  index: number;
  onPlay: () => void;
  onRemove?: () => void;
  showRemove?: boolean;
}

export interface ContentCardProps {
  item: ContentItem;
  onClick: () => void;
}

export interface PlaylistCardProps {
  item: ContentItem;
  onClick: () => void;
}

export interface ContentSectionProps {
  title: string;
  items: ContentItem[];
  onPlay: (item: ContentItem) => void;
  showAll?: boolean;
  onToggleShowAll?: () => void;
  maxItems?: number;
}

export type ContentTabType = 'discover' | 'spotify' | 'youtube';

// Re-export ContentItem for convenience
export type { ContentItem } from '@/types/contenthub';
