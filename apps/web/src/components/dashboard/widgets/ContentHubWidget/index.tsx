'use client';

import { useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Maximize2,
  Minimize2,
  Search,
  Sparkles,
  X,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useContentHubStore } from '@/lib/stores/contenthub';
import { useContentHub, useSpotifyControls, useSpotifySync } from '@/hooks/useContentHub';
import { NowPlayingCard } from './NowPlayingCard';
import { UpNextQueue } from './UpNextQueue';
import { QuickActions } from './QuickActions';
import type { ContentItem } from '@/types/contenthub';

interface ContentHubWidgetProps {
  className?: string;
}

/**
 * ContentHubWidget - Unified Media Hub
 *
 * Aggregates content from multiple sources (Spotify, YouTube, Netflix, etc.)
 * with a compact "card stack" view and expandable MediaCommandCenter overlay.
 *
 * Features:
 * - Now Playing with dynamic color theming
 * - Up Next queue with drag-and-drop
 * - Mode switching (Focus, Break, Workout, Sleep, Discover)
 * - Quick actions (AI Discover, Smart Home, Voice)
 */
export function ContentHubWidget({ className }: ContentHubWidgetProps) {
  const {
    nowPlaying,
    isPlaying,
    progress,
    queue,
    isExpanded,
    isLoading,
    error,
    shuffleState,
    repeatState,
    play,
    removeFromQueue,
    toggleExpanded,
    setError,
  } = useContentHubStore();

  // Data fetching and API controls
  const { 
    search, 
    castToDevice, 
    fetchRecommendations, 
    fetchSpotifyLibrary, 
    fetchYouTubeLibrary,
    fetchPlaylistTracks,
    addToPlaylist,
    createPlaylist,
  } = useContentHub();
  const spotifyControls = useSpotifyControls();
  
  // Sync Spotify state (polls every 5s)
  useSpotifySync();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<ContentItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [controlLoading, setControlLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<ContentItem[]>([]);
  const [trending, setTrending] = useState<ContentItem[]>([]);
  const [castLoading, setCastLoading] = useState(false);
  
  // Library data states
  const [spotifyPlaylists, setSpotifyPlaylists] = useState<ContentItem[]>([]);
  const [spotifyRecentlyPlayed, setSpotifyRecentlyPlayed] = useState<ContentItem[]>([]);
  const [spotifyTopTracks, setSpotifyTopTracks] = useState<ContentItem[]>([]);
  const [featuredPlaylists, setFeaturedPlaylists] = useState<ContentItem[]>([]);
  const [youtubeTrending, setYoutubeTrending] = useState<ContentItem[]>([]);
  const [youtubeMusic, setYoutubeMusic] = useState<ContentItem[]>([]);
  
  // Playlist detail state
  const [selectedPlaylist, setSelectedPlaylist] = useState<{ id: string; name: string } | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<ContentItem[]>([]);
  const [playlistLoading, setPlaylistLoading] = useState(false);

  // Fetch recommendations on mount and mode change
  useEffect(() => {
    const loadRecommendations = async () => {
      const data = await fetchRecommendations();
      setRecommendations(data.recommendations);
      setTrending(data.trending);
    };
    loadRecommendations();
  }, [fetchRecommendations]);

  // Fetch user library data on mount
  useEffect(() => {
    const loadLibraryData = async () => {
      // Fetch Spotify library
      const spotifyData = await fetchSpotifyLibrary();
      if (spotifyData) {
        // Convert to ContentItem format
        if (spotifyData.playlists) {
          setSpotifyPlaylists(spotifyData.playlists.map((p: { id: string; name: string; imageUrl: string; owner: string; uri: string; spotifyUrl: string }) => ({
            id: `spotify-playlist-${p.id}`,
            source: 'spotify',
            type: 'playlist',
            title: p.name,
            subtitle: p.owner,
            thumbnailUrl: p.imageUrl,
            playbackUrl: p.spotifyUrl,
            deepLinkUrl: p.spotifyUrl,
            sourceMetadata: { uri: p.uri },
          })));
        }
        if (spotifyData.recentlyPlayed) {
          setSpotifyRecentlyPlayed(spotifyData.recentlyPlayed.map((t: { id: string; name: string; artist: string; imageUrl: string; duration: number; uri: string; spotifyUrl: string }) => ({
            id: `spotify-${t.id}`,
            source: 'spotify',
            type: 'track',
            title: t.name,
            subtitle: t.artist,
            thumbnailUrl: t.imageUrl,
            duration: t.duration,
            playbackUrl: t.spotifyUrl,
            deepLinkUrl: t.spotifyUrl,
            sourceMetadata: { uri: t.uri },
          })));
        }
        if (spotifyData.topTracks) {
          setSpotifyTopTracks(spotifyData.topTracks.map((t: { id: string; name: string; artist: string; imageUrl: string; duration: number; uri: string; spotifyUrl: string }) => ({
            id: `spotify-${t.id}`,
            source: 'spotify',
            type: 'track',
            title: t.name,
            subtitle: t.artist,
            thumbnailUrl: t.imageUrl,
            duration: t.duration,
            playbackUrl: t.spotifyUrl,
            deepLinkUrl: t.spotifyUrl,
            sourceMetadata: { uri: t.uri },
          })));
        }
        if (spotifyData.featuredPlaylists) {
          setFeaturedPlaylists(spotifyData.featuredPlaylists.map((p: { id: string; name: string; imageUrl: string; owner: string; uri: string; spotifyUrl: string }) => ({
            id: `spotify-featured-${p.id}`,
            source: 'spotify',
            type: 'playlist',
            title: p.name,
            subtitle: p.owner,
            thumbnailUrl: p.imageUrl,
            playbackUrl: p.spotifyUrl,
            deepLinkUrl: p.spotifyUrl,
            sourceMetadata: { uri: p.uri },
          })));
        }
      }

      // Fetch YouTube library
      const youtubeData = await fetchYouTubeLibrary();
      if (youtubeData) {
        if (youtubeData.trending) {
          setYoutubeTrending(youtubeData.trending.map((v: { id: string; title: string; channel: string; thumbnailUrl: string; duration: number; url: string }) => ({
            id: `youtube-${v.id}`,
            source: 'youtube',
            type: 'video',
            title: v.title,
            subtitle: v.channel,
            thumbnailUrl: v.thumbnailUrl,
            duration: v.duration,
            playbackUrl: v.url,
            deepLinkUrl: v.url,
          })));
        }
        if (youtubeData.music) {
          setYoutubeMusic(youtubeData.music.map((v: { id: string; title: string; channel: string; thumbnailUrl: string; duration: number; url: string }) => ({
            id: `youtube-music-${v.id}`,
            source: 'youtube',
            type: 'video',
            title: v.title,
            subtitle: v.channel,
            thumbnailUrl: v.thumbnailUrl,
            duration: v.duration,
            playbackUrl: v.url,
            deepLinkUrl: v.url,
          })));
        }
      }
    };
    loadLibraryData();
  }, [fetchSpotifyLibrary, fetchYouTubeLibrary]);

  // Client-side progress interpolation
  useEffect(() => {
    if (!isPlaying || !nowPlaying) return;
    
    const interval = setInterval(() => {
      useContentHubStore.setState((state) => ({
        progress: Math.min(state.progress + 1000, nowPlaying.duration || state.progress + 1000)
      }));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isPlaying, nowPlaying]);

  // Playback control handlers - use Spotify API when source is Spotify
  const handlePlayPause = useCallback(async () => {
    if (nowPlaying?.source === 'spotify') {
      setControlLoading(true);
      // Optimistic update
      useContentHubStore.setState({ isPlaying: !isPlaying });
      try {
        if (isPlaying) {
          await spotifyControls.pause();
        } else {
          await spotifyControls.play();
        }
      } catch {
        // Rollback on failure
        useContentHubStore.setState({ isPlaying });
      } finally {
        setControlLoading(false);
      }
    } else {
      // For other sources, just toggle local state
      useContentHubStore.setState({ isPlaying: !isPlaying });
    }
  }, [isPlaying, nowPlaying?.source, spotifyControls]);

  const handlePlay = useCallback(
    (item: ContentItem) => {
      play(item);
      // If it's a Spotify track, trigger actual playback
      if (item.source === 'spotify' && item.sourceMetadata?.uri) {
        spotifyControls.play(item.sourceMetadata.uri as string);
      }
    },
    [play, spotifyControls]
  );

  const handleSeek = useCallback(
    (position: number) => {
      useContentHubStore.setState({ progress: position });
      if (nowPlaying?.source === 'spotify') {
        spotifyControls.seek(position);
      }
    },
    [nowPlaying?.source, spotifyControls]
  );

  const handleNext = useCallback(async () => {
    if (nowPlaying?.source === 'spotify') {
      setControlLoading(true);
      try {
        await spotifyControls.next();
      } finally {
        setControlLoading(false);
      }
    } else {
      useContentHubStore.getState().next();
    }
  }, [nowPlaying?.source, spotifyControls]);

  const handlePrevious = useCallback(async () => {
    if (nowPlaying?.source === 'spotify') {
      setControlLoading(true);
      try {
        await spotifyControls.previous();
      } finally {
        setControlLoading(false);
      }
    } else {
      useContentHubStore.getState().previous();
    }
  }, [nowPlaying?.source, spotifyControls]);

  // Shuffle handler
  const handleShuffle = useCallback(async () => {
    if (nowPlaying?.source === 'spotify') {
      const newState = !shuffleState;
      useContentHubStore.setState({ shuffleState: newState });
      try {
        await spotifyControls.shuffle(newState);
      } catch {
        useContentHubStore.setState({ shuffleState: shuffleState });
      }
    }
  }, [nowPlaying?.source, shuffleState, spotifyControls]);

  // Repeat handler
  const handleRepeat = useCallback(async () => {
    if (nowPlaying?.source === 'spotify') {
      const nextState = repeatState === 'off' ? 'context' : 
                        repeatState === 'context' ? 'track' : 'off';
      useContentHubStore.setState({ repeatState: nextState });
      try {
        await spotifyControls.repeat(nextState);
      } catch {
        useContentHubStore.setState({ repeatState: repeatState });
      }
    }
  }, [nowPlaying?.source, repeatState, spotifyControls]);

  // Volume handler
  const handleVolumeChange = useCallback(async (volume: number) => {
    if (nowPlaying?.source === 'spotify') {
      try {
        await spotifyControls.setVolume(volume);
      } catch {
        // Volume change failed - state already updated locally
      }
    }
  }, [nowPlaying?.source, spotifyControls]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle when not in input
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'ArrowRight':
          if (e.shiftKey) handleNext();
          break;
        case 'ArrowLeft':
          if (e.shiftKey) handlePrevious();
          break;
        case 'Escape':
          if (isExpanded) toggleExpanded();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause, handleNext, handlePrevious, isExpanded, toggleExpanded]);

  // Handle AI discover action - fetch recommendations based on mode
  const handleAIDiscover = useCallback(async () => {
    const mode = useContentHubStore.getState().activeMode;
    const results = await search(`${mode} music playlist`);
    if (results.length > 0) {
      results.forEach(item => useContentHubStore.getState().addToQueue(item));
    }
  }, [search]);

  // Handle Smart Home casting - cast to Apple TV via Home Assistant
  const handleSmartHome = useCallback(async () => {
    console.log('Cast button clicked, nowPlaying:', nowPlaying);
    
    if (!nowPlaying) {
      console.log('No content to cast');
      setError('No content to cast');
      return;
    }

    setCastLoading(true);
    console.log('Starting cast to media_player.living_room...');
    
    try {
      const result = await castToDevice(nowPlaying, 'media_player.living_room');
      console.log('Cast result:', result);
      
      if (result.success) {
        // Show success message
        console.log('Cast successful:', result.message);
        setError(null);
        // Show a brief success indicator
        alert(`Cast: ${result.message}`);
      } else {
        console.log('Cast failed:', result.error);
        setError(result.error || 'Cast failed');
      }
    } catch (err) {
      console.error('Cast error:', err);
      setError('Cast failed');
    } finally {
      setCastLoading(false);
    }
  }, [nowPlaying, castToDevice, setError]);

  // Handle Voice control
  const handleVoice = useCallback(() => {
    // Toggle voice mode (could emit event to parent)
    console.log('Voice control triggered');
  }, []);

  // Handle opening a playlist to view its tracks
  const handleOpenPlaylist = useCallback(async (playlistId: string, playlistName: string) => {
    setPlaylistLoading(true);
    setSelectedPlaylist({ id: playlistId, name: playlistName });
    try {
      const data = await fetchPlaylistTracks(playlistId);
      if (data?.tracks) {
        setPlaylistTracks(data.tracks.map((t: { id: string; name: string; artist: string; imageUrl: string; duration: number; uri: string; spotifyUrl: string }) => ({
          id: `spotify-${t.id}`,
          source: 'spotify',
          type: 'track',
          title: t.name,
          subtitle: t.artist,
          thumbnailUrl: t.imageUrl,
          duration: t.duration,
          playbackUrl: t.spotifyUrl,
          deepLinkUrl: t.spotifyUrl,
          sourceMetadata: { uri: t.uri },
        })));
      }
    } finally {
      setPlaylistLoading(false);
    }
  }, [fetchPlaylistTracks]);

  // Handle closing playlist detail view
  const handleClosePlaylist = useCallback(() => {
    setSelectedPlaylist(null);
    setPlaylistTracks([]);
  }, []);

  // Handle adding current track to a playlist
  const handleAddToPlaylist = useCallback(async (playlistId: string) => {
    if (!nowPlaying?.sourceMetadata?.uri) {
      setError('No track to add');
      return;
    }
    const result = await addToPlaylist(playlistId, nowPlaying.sourceMetadata.uri as string);
    if (result.success) {
      setError(null);
    }
  }, [nowPlaying, addToPlaylist, setError]);

  // Handle creating a new playlist
  const handleCreatePlaylist = useCallback(async (name: string) => {
    const result = await createPlaylist(name);
    if (result.success) {
      // Refresh playlists
      const spotifyData = await fetchSpotifyLibrary();
      if (spotifyData?.playlists) {
        setSpotifyPlaylists(spotifyData.playlists.map((p: { id: string; name: string; imageUrl: string; owner: string; uri: string; spotifyUrl: string }) => ({
          id: `spotify-playlist-${p.id}`,
          source: 'spotify',
          type: 'playlist',
          title: p.name,
          subtitle: p.owner,
          thumbnailUrl: p.imageUrl,
          playbackUrl: p.spotifyUrl,
          deepLinkUrl: p.spotifyUrl,
          sourceMetadata: { uri: p.uri, playlistId: p.id },
        })));
      }
    }
    return result;
  }, [createPlaylist, fetchSpotifyLibrary]);

  // Handle search
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      setSearchLoading(true);
      try {
        const results = await search(query);
        setSearchResults(results);
      } finally {
        setSearchLoading(false);
      }
    } else {
      setSearchResults([]);
    }
  }, [search]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  }, []);

  // Play from search result
  const handlePlayFromSearch = useCallback((item: ContentItem) => {
    play(item);
    if (item.source === 'spotify' && item.sourceMetadata?.uri) {
      spotifyControls.play(item.sourceMetadata.uri as string);
    }
    clearSearch();
  }, [play, spotifyControls, clearSearch]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timeout);
    }
  }, [error, setError]);

  return (
    <>
      {/* Compact Widget View */}
      <motion.div
        layout
        className={cn(
          'relative overflow-hidden rounded-2xl',
          'bg-glass-bg backdrop-blur-glass border border-glass-border',
          'shadow-glass transition-all duration-300',
          className
        )}
      >
        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-0 left-0 right-0 z-50 bg-red-500/90 text-white text-xs px-3 py-1.5 flex items-center justify-between"
            >
              <span>{error}</span>
              <button onClick={() => setError(null)}>
                <X className="h-3 w-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading overlay */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-black/50 flex items-center justify-center"
            >
              <div className="h-8 w-8 border-2 border-neon-primary border-t-transparent rounded-full animate-spin" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-glass-border">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-neon-primary" />
            <span className="text-sm font-medium">ContentHub</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Search toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowSearch(!showSearch)}
            >
              <Search className="h-3.5 w-3.5" />
            </Button>

            {/* Expand toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={toggleExpanded}
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Search bar */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-glass-border"
            >
              <div className="p-2">
                <div className="relative">
                  <Input
                    placeholder="Search across all sources..."
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearch(e.target.value)}
                    className="h-8 text-sm bg-glass-bg border-glass-border pr-8"
                    autoFocus
                  />
                  {searchQuery && (
                    <button 
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={clearSearch}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Search Results */}
              {(searchResults.length > 0 || searchLoading) && (
                <div className="max-h-60 overflow-y-auto border-t border-glass-border">
                  {searchLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="h-5 w-5 border-2 border-neon-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    searchResults.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 p-2 hover:bg-glass-bg cursor-pointer"
                        onClick={() => handlePlayFromSearch(item)}
                      >
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          className="h-10 w-10 rounded object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.subtitle} • {item.source}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Now Playing Card */}
        <NowPlayingCard
          item={nowPlaying}
          isPlaying={isPlaying}
          progress={progress}
          onPlayPause={handlePlayPause}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onSeek={handleSeek}
          onExpand={toggleExpanded}
          onShuffle={nowPlaying?.source === 'spotify' ? handleShuffle : undefined}
          onRepeat={nowPlaying?.source === 'spotify' ? handleRepeat : undefined}
          onVolumeChange={nowPlaying?.source === 'spotify' ? handleVolumeChange : undefined}
          shuffleState={shuffleState}
          repeatState={repeatState}
          isLoading={controlLoading}
          compact={false}
          className="min-h-[200px]"
        />

        {/* Quick Actions */}
        <div className="px-3 py-2 border-t border-glass-border">
          <QuickActions
            onAIDiscover={handleAIDiscover}
            onSmartHome={handleSmartHome}
            onVoice={handleVoice}
          />
        </div>

        {/* Up Next Queue */}
        <div className="px-3 border-t border-glass-border">
          <UpNextQueue
            items={queue}
            onPlay={handlePlay}
            onRemove={removeFromQueue}
            maxVisible={4}
          />
        </div>
      </motion.div>

      {/* Expanded MediaCommandCenter Overlay - rendered via portal to escape container */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isExpanded && (
            <MediaCommandCenter
              onClose={toggleExpanded}
              nowPlaying={nowPlaying}
              isPlaying={isPlaying}
              progress={progress}
              queue={queue}
              recommendations={recommendations}
              trending={trending}
              spotifyPlaylists={spotifyPlaylists}
              spotifyRecentlyPlayed={spotifyRecentlyPlayed}
              spotifyTopTracks={spotifyTopTracks}
              featuredPlaylists={featuredPlaylists}
              youtubeTrending={youtubeTrending}
              youtubeMusic={youtubeMusic}
              selectedPlaylist={selectedPlaylist}
              playlistTracks={playlistTracks}
              playlistLoading={playlistLoading}
              onPlayPause={handlePlayPause}
              onNext={handleNext}
              onPrevious={handlePrevious}
              onSeek={handleSeek}
              onPlay={handlePlay}
              onRemove={removeFromQueue}
              onAIDiscover={handleAIDiscover}
              onSmartHome={handleSmartHome}
              onVoice={handleVoice}
              onOpenPlaylist={handleOpenPlaylist}
              onClosePlaylist={handleClosePlaylist}
              onAddToPlaylist={handleAddToPlaylist}
              onCreatePlaylist={handleCreatePlaylist}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

/**
 * MediaCommandCenter - Expanded fullscreen overlay
 */
interface MediaCommandCenterProps {
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
  selectedPlaylist: { id: string; name: string } | null;
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
}

function MediaCommandCenter({
  onClose,
  nowPlaying,
  isPlaying,
  progress,
  queue,
  recommendations,
  trending,
  spotifyPlaylists,
  spotifyRecentlyPlayed,
  spotifyTopTracks,
  featuredPlaylists,
  youtubeTrending,
  youtubeMusic,
  selectedPlaylist,
  playlistTracks,
  playlistLoading,
  onPlayPause,
  onNext,
  onPrevious,
  onSeek,
  onPlay,
  onRemove,
  onAIDiscover,
  onSmartHome,
  onVoice,
  onOpenPlaylist,
  onClosePlaylist,
  onAddToPlaylist,
  onCreatePlaylist,
}: MediaCommandCenterProps) {
  const { history, savedForLater, activeMode } = useContentHubStore();
  const [showAllRecommendations, setShowAllRecommendations] = useState(false);
  const [showAllTrending, setShowAllTrending] = useState(false);
  const [activeTab, setActiveTab] = useState<'discover' | 'spotify' | 'youtube'>('discover');
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl"
    >
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-10 text-white/70 hover:text-white"
        onClick={onClose}
      >
        <Minimize2 className="h-5 w-5" />
      </Button>

      <div className="h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-neon-primary" />
              <h1 className="text-2xl font-bold text-white">MediaCommandCenter</h1>
            </div>

            {/* Quick Actions */}
            <QuickActions
              onAIDiscover={onAIDiscover}
              onSmartHome={onSmartHome}
              onVoice={onVoice}
              className="flex-row-reverse"
            />
          </div>

          {/* Main content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Now Playing - Large */}
            <div className="lg:col-span-2">
              <div className="rounded-2xl overflow-hidden bg-glass-bg/50 backdrop-blur-sm border border-glass-border">
                <NowPlayingCard
                  item={nowPlaying}
                  isPlaying={isPlaying}
                  progress={progress}
                  onPlayPause={onPlayPause}
                  onNext={onNext}
                  onPrevious={onPrevious}
                  onSeek={onSeek}
                  showControls={true}
                  compact={false}
                  className="min-h-[300px]"
                />
              </div>
            </div>

            {/* Queue & History sidebar */}
            <div className="space-y-6">
              {/* Up Next */}
              <div className="rounded-2xl bg-glass-bg/50 backdrop-blur-sm border border-glass-border p-4">
                <h3 className="text-sm font-medium text-white mb-3">Up Next</h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {queue.slice(0, 5).map((item, index) => (
                    <QueueItem
                      key={item.id}
                      item={item}
                      index={index}
                      onPlay={() => onPlay(item)}
                      onRemove={() => onRemove(item.id)}
                    />
                  ))}
                  {queue.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Queue is empty
                    </p>
                  )}
                </div>
              </div>

              {/* Recently Played */}
              <div className="rounded-2xl bg-glass-bg/50 backdrop-blur-sm border border-glass-border p-4">
                <h3 className="text-sm font-medium text-white mb-3">Recently Played</h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {history.slice(0, 5).map((item, index) => (
                    <QueueItem
                      key={`${item.id}-${index}`}
                      item={item}
                      index={index}
                      onPlay={() => onPlay(item)}
                      showRemove={false}
                    />
                  ))}
                  {history.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No history yet
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Content Tabs */}
          <div className="mt-8">
            <div className="flex gap-2 mb-6 border-b border-white/10 pb-2">
              <Button
                variant={activeTab === 'discover' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('discover')}
                className={activeTab === 'discover' ? 'bg-neon-primary/20 text-neon-primary' : 'text-white/70'}
              >
                For You
              </Button>
              <Button
                variant={activeTab === 'spotify' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('spotify')}
                className={activeTab === 'spotify' ? 'bg-green-500/20 text-green-400' : 'text-white/70'}
              >
                Spotify
              </Button>
              <Button
                variant={activeTab === 'youtube' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('youtube')}
                className={activeTab === 'youtube' ? 'bg-red-500/20 text-red-400' : 'text-white/70'}
              >
                YouTube
              </Button>
            </div>

            {/* For You Tab */}
            {activeTab === 'discover' && (
              <div className="space-y-8">
                {/* Recommendations */}
                {recommendations.length > 0 && (
                  <ContentSection
                    title="Recommended for You"
                    items={recommendations}
                    onPlay={onPlay}
                    showAll={showAllRecommendations}
                    onToggleShowAll={() => setShowAllRecommendations(!showAllRecommendations)}
                  />
                )}

                {/* Recently Played */}
                {spotifyRecentlyPlayed.length > 0 && (
                  <ContentSection
                    title="Recently Played"
                    items={spotifyRecentlyPlayed}
                    onPlay={onPlay}
                  />
                )}

                {/* Top Tracks */}
                {spotifyTopTracks.length > 0 && (
                  <ContentSection
                    title="Your Top Tracks"
                    items={spotifyTopTracks}
                    onPlay={onPlay}
                  />
                )}

                {/* Saved for Later */}
                {savedForLater.length > 0 && (
                  <ContentSection
                    title="Saved for Later"
                    items={savedForLater}
                    onPlay={onPlay}
                  />
                )}
              </div>
            )}

            {/* Spotify Tab */}
            {activeTab === 'spotify' && (
              <div className="space-y-8">
                {/* Playlist Detail View */}
                {selectedPlaylist && (
                  <div className="mb-8">
                    <div className="flex items-center gap-4 mb-6">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClosePlaylist}
                        className="text-white/70 hover:text-white"
                      >
                        ← Back to Playlists
                      </Button>
                      <h3 className="text-xl font-semibold text-white">{selectedPlaylist.name}</h3>
                    </div>
                    {playlistLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {playlistTracks.map((item) => (
                          <ContentCard
                            key={item.id}
                            item={item}
                            onClick={() => onPlay(item)}
                          />
                        ))}
                        {playlistTracks.length === 0 && (
                          <p className="col-span-full text-center text-muted-foreground py-8">
                            This playlist is empty
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Playlists Grid (hidden when viewing playlist detail) */}
                {!selectedPlaylist && (
                  <>
                    {/* Add to Playlist / Create Playlist UI */}
                    {nowPlaying && nowPlaying.source === 'spotify' && (
                      <div className="mb-6 p-4 bg-white/5 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-white/70">Add current track to playlist:</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAddToPlaylist(!showAddToPlaylist)}
                            className="text-green-400 hover:text-green-300"
                          >
                            {showAddToPlaylist ? 'Cancel' : '+ Add to Playlist'}
                          </Button>
                        </div>
                        {showAddToPlaylist && (
                          <div className="space-y-3">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="New playlist name..."
                                value={newPlaylistName}
                                onChange={(e) => setNewPlaylistName(e.target.value)}
                                className="flex-1 px-3 py-1.5 text-sm bg-white/10 border border-white/20 rounded text-white placeholder:text-white/40"
                              />
                              <Button
                                size="sm"
                                disabled={!newPlaylistName.trim()}
                                onClick={async () => {
                                  const result = await onCreatePlaylist(newPlaylistName.trim());
                                  if (result.success) {
                                    setNewPlaylistName('');
                                    setShowAddToPlaylist(false);
                                  }
                                }}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Create
                              </Button>
                            </div>
                            <div className="text-xs text-white/50 mb-2">Or add to existing:</div>
                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                              {spotifyPlaylists.slice(0, 10).map((playlist) => (
                                <Button
                                  key={playlist.id}
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs border border-white/20 hover:bg-green-600/20"
                                  onClick={() => {
                                    const playlistId = playlist.id.replace('spotify-playlist-', '');
                                    onAddToPlaylist(playlistId);
                                    setShowAddToPlaylist(false);
                                  }}
                                >
                                  {playlist.title}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Your Playlists */}
                    {spotifyPlaylists.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium text-white mb-4">Your Playlists</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          {spotifyPlaylists.slice(0, 12).map((item) => (
                            <PlaylistCard
                              key={item.id}
                              item={item}
                              onClick={() => {
                                const playlistId = item.id.replace('spotify-playlist-', '');
                                onOpenPlaylist(playlistId, item.title);
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Featured Playlists */}
                    {featuredPlaylists.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium text-white mb-4">Featured Playlists</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          {featuredPlaylists.slice(0, 12).map((item) => (
                            <PlaylistCard
                              key={item.id}
                              item={item}
                              onClick={() => {
                                const playlistId = item.id.replace('spotify-featured-', '');
                                onOpenPlaylist(playlistId, item.title);
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recently Played */}
                    {spotifyRecentlyPlayed.length > 0 && (
                      <ContentSection
                        title="Recently Played"
                        items={spotifyRecentlyPlayed}
                        onPlay={onPlay}
                      />
                    )}

                    {/* Top Tracks */}
                    {spotifyTopTracks.length > 0 && (
                      <ContentSection
                        title="Your Top Tracks"
                        items={spotifyTopTracks}
                        onPlay={onPlay}
                      />
                    )}

                    {spotifyPlaylists.length === 0 && spotifyRecentlyPlayed.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Connect Spotify to see your playlists and history
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* YouTube Tab */}
            {activeTab === 'youtube' && (
              <div className="space-y-8">
                {/* Trending Music */}
                {youtubeMusic.length > 0 && (
                  <ContentSection
                    title="Trending Music"
                    items={youtubeMusic}
                    onPlay={onPlay}
                  />
                )}

                {/* Trending Videos */}
                {youtubeTrending.length > 0 && (
                  <ContentSection
                    title="Trending Videos"
                    items={youtubeTrending}
                    onPlay={onPlay}
                  />
                )}

                {/* From contenthub trending */}
                {trending.length > 0 && (
                  <ContentSection
                    title="Popular Now"
                    items={trending}
                    onPlay={onPlay}
                    showAll={showAllTrending}
                    onToggleShowAll={() => setShowAllTrending(!showAllTrending)}
                  />
                )}

                {youtubeTrending.length === 0 && youtubeMusic.length === 0 && trending.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No YouTube content available
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Queue item for sidebar lists
 */
function QueueItem({
  item,
  index,
  onPlay,
  onRemove,
  showRemove = true,
}: {
  item: ContentItem;
  index: number;
  onPlay: () => void;
  onRemove?: () => void;
  showRemove?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 cursor-pointer group"
      onClick={onPlay}
    >
      <span className="w-4 text-[10px] text-muted-foreground text-center">
        {index + 1}
      </span>
      <img
        src={item.thumbnailUrl}
        alt={item.title}
        className="h-8 w-8 rounded object-cover"
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white truncate">{item.title}</p>
        <p className="text-[10px] text-muted-foreground truncate">{item.subtitle}</p>
      </div>
      {showRemove && onRemove && (
        <button
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

/**
 * Content card for grid display
 */
function ContentCard({
  item,
  onClick,
}: {
  item: ContentItem;
  onClick: () => void;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="cursor-pointer group"
      onClick={onClick}
    >
      <div className="relative aspect-square rounded-lg overflow-hidden bg-glass-bg">
        <img
          src={item.thumbnailUrl}
          alt={item.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className="mt-1.5 text-xs font-medium text-white truncate">{item.title}</p>
      <p className="text-[10px] text-muted-foreground truncate">{item.subtitle}</p>
    </motion.div>
  );
}

/**
 * Playlist card for grid display (clickable to view contents)
 */
function PlaylistCard({
  item,
  onClick,
}: {
  item: ContentItem;
  onClick: () => void;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="cursor-pointer group"
      onClick={onClick}
    >
      <div className="relative aspect-square rounded-lg overflow-hidden bg-glass-bg">
        <img
          src={item.thumbnailUrl || '/placeholder-playlist.png'}
          alt={item.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="bg-green-500 rounded-full p-2">
            <Play className="h-4 w-4 text-white fill-white" />
          </div>
        </div>
      </div>
      <p className="mt-1.5 text-xs font-medium text-white truncate">{item.title}</p>
      <p className="text-[10px] text-muted-foreground truncate">{item.subtitle}</p>
    </motion.div>
  );
}

/**
 * Content section with title and grid of items
 */
function ContentSection({
  title,
  items,
  onPlay,
  showAll = false,
  onToggleShowAll,
  maxItems = 6,
}: {
  title: string;
  items: ContentItem[];
  onPlay: (item: ContentItem) => void;
  showAll?: boolean;
  onToggleShowAll?: () => void;
  maxItems?: number;
}) {
  const displayItems = showAll ? items : items.slice(0, maxItems);
  
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">{title}</h3>
        {items.length > maxItems && onToggleShowAll && (
          <Button
            variant="ghost"
            size="sm"
            className="text-neon-primary hover:text-neon-accent"
            onClick={onToggleShowAll}
          >
            {showAll ? 'Show less' : `Show all (${items.length})`}
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {displayItems.map((item) => (
          <ContentCard
            key={item.id}
            item={item}
            onClick={() => onPlay(item)}
          />
        ))}
      </div>
    </div>
  );
}

export default ContentHubWidget;
