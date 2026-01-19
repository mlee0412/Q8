'use client';

import { useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Maximize2,
  Search,
  Sparkles,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useContentHubStore } from '@/lib/stores/contenthub';
import { useContentHub, useSpotifySync } from '@/hooks/useContentHub';
import { useSpotifyWebPlayback } from '@/hooks/useSpotifyWebPlayback';
import { NowPlayingCard } from './NowPlayingCard';
import { UpNextQueue } from './UpNextQueue';
import { QuickActions } from './QuickActions';
import { DeviceSelectorModal, type SpotifyDevice } from './DeviceSelectorModal';
import { MediaCommandCenter } from './MediaCommandCenter';
import { usePlaybackControls, useLibraryData } from './hooks';
import type { ContentHubWidgetProps, CastMessage, ContentItem } from './types';

/**
 * ContentHubWidget - Unified Media Hub
 *
 * Aggregates content from multiple sources (Spotify, YouTube, Netflix, etc.)
 * with a compact "card stack" view and expandable MediaCommandCenter overlay.
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
    removeFromQueue,
    toggleExpanded,
    setError,
  } = useContentHubStore();

  // Data fetching hooks
  const { search, castToDevice, fetchAIRecommendations, getSpotifyDevices, transferSpotifyPlayback } = useContentHub();
  
  // Sync Spotify state (polls every 5s)
  useSpotifySync();

  // Web Playback SDK
  const webPlayback = useSpotifyWebPlayback();

  // Custom hooks for playback and library
  const {
    controlLoading,
    handlePlayPause,
    handlePlay,
    handleSeek,
    handleNext,
    handlePrevious,
    handleShuffle,
    handleRepeat,
    handleVolumeChange,
    spotifyControls,
  } = usePlaybackControls();

  const {
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
    handleOpenPlaylist,
    handleClosePlaylist,
    handleAddToPlaylist,
    handleCreatePlaylist,
  } = useLibraryData();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<ContentItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [castLoading, setCastLoading] = useState(false);
  const [aiDiscoverLoading, setAiDiscoverLoading] = useState(false);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [currentDeviceName, setCurrentDeviceName] = useState<string | null>(null);
  const [castMessage, setCastMessage] = useState<CastMessage | null>(null);

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      ) return;

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

  // AI Discover handler
  const handleAIDiscover = useCallback(async () => {
    setAiDiscoverLoading(true);
    try {
      const result = await fetchAIRecommendations();
      if (result.success && result.recommendations.length > 0) {
        result.recommendations.forEach((item) => {
          useContentHubStore.getState().addToQueue(item);
        });
        setError(`Added ${result.recommendations.length} tracks to your queue`);
        setTimeout(() => setError(null), 3000);
      } else {
        setError('No recommendations found. Try again later.');
      }
    } catch (err) {
      console.error('AI Discover error:', err);
      setError('Failed to get AI recommendations');
    } finally {
      setAiDiscoverLoading(false);
    }
  }, [fetchAIRecommendations, setError]);

  // Get devices with web player
  const getDevicesWithWebPlayer = useCallback(async (): Promise<SpotifyDevice[]> => {
    const devices = await getSpotifyDevices();

    if (webPlayback.isReady && webPlayback.deviceId) {
      const webPlayerDevice: SpotifyDevice = {
        id: webPlayback.deviceId,
        name: `${webPlayback.deviceName} (This Browser)`,
        type: 'Computer',
        isActive: webPlayback.isActive,
        volume: webPlayback.volume,
        supportsVolume: true,
      };
      return [webPlayerDevice, ...devices.filter((d: SpotifyDevice) => d.id !== webPlayback.deviceId)];
    }

    return devices;
  }, [getSpotifyDevices, webPlayback.isReady, webPlayback.deviceId, webPlayback.deviceName, webPlayback.isActive, webPlayback.volume]);

  // Device selection handler
  const handleDeviceSelect = useCallback(async (deviceId: string, deviceName: string) => {
    if (deviceId === webPlayback.deviceId) {
      setCurrentDeviceName(deviceName);
      if (nowPlaying?.source === 'spotify' && nowPlaying?.sourceMetadata?.uri) {
        await webPlayback.play(nowPlaying.sourceMetadata.uri as string);
        return { success: true, message: `Playing on ${deviceName}` };
      }
      return { success: true, message: `Switched to ${deviceName}` };
    }

    const result = await transferSpotifyPlayback(deviceId, deviceName);
    if (result.success) {
      setCurrentDeviceName(deviceName);
      if (nowPlaying?.source === 'spotify' && nowPlaying?.sourceMetadata?.uri) {
        setTimeout(async () => {
          await spotifyControls.play(nowPlaying.sourceMetadata?.uri as string);
        }, 500);
      }
    }
    return result;
  }, [transferSpotifyPlayback, nowPlaying, spotifyControls, webPlayback]);

  const openDeviceSelector = useCallback(() => {
    setShowDeviceSelector(true);
  }, []);

  // Smart Home casting handler
  const handleSmartHome = useCallback(async () => {
    if (!nowPlaying) {
      setError('No content to cast');
      return;
    }

    if (nowPlaying.source === 'spotify') {
      openDeviceSelector();
      return;
    }

    setCastLoading(true);
    setCastMessage({ type: 'loading', text: 'Launching YouTube on Apple TV...' });

    try {
      const result = await castToDevice(nowPlaying, 'media_player.living_room');
      if (result.success) {
        setError(null);
        setCastMessage({ type: 'success', text: 'YouTube launched on Apple TV!' });
        setTimeout(() => setCastMessage(null), 4000);
      } else {
        setCastMessage({
          type: 'error',
          text: result.error || 'Cast failed. Try opening in browser instead.',
          fallbackUrl: nowPlaying.playbackUrl || nowPlaying.deepLinkUrl,
        });
      }
    } catch {
      setCastMessage({
        type: 'error',
        text: 'Cast failed. Try opening in browser instead.',
        fallbackUrl: nowPlaying.playbackUrl || nowPlaying.deepLinkUrl,
      });
    } finally {
      setCastLoading(false);
    }
  }, [nowPlaying, castToDevice, setError, openDeviceSelector]);

  // Voice control handler
  const handleVoice = useCallback(() => {
    console.log('Voice control triggered');
  }, []);

  // Add to playlist handler
  const handleAddToPlaylistWrapper = useCallback(async (playlistId: string) => {
    if (!nowPlaying?.sourceMetadata?.uri) {
      setError('No track to add');
      return;
    }
    const result = await handleAddToPlaylist(playlistId, nowPlaying.sourceMetadata.uri as string);
    if (result.success) {
      setError(null);
    }
  }, [nowPlaying, handleAddToPlaylist, setError]);

  // Search handlers
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

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  }, []);

  const handlePlayFromSearch = useCallback((item: ContentItem) => {
    handlePlay(item);
    clearSearch();
  }, [handlePlay, clearSearch]);

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
          'bg-surface-3 backdrop-blur-glass border border-border-subtle',
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

        {/* Cast feedback banner */}
        <AnimatePresence>
          {castMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                'absolute top-0 left-0 right-0 z-50 text-white text-xs px-3 py-1.5 flex items-center gap-2',
                castMessage.type === 'loading' && 'bg-neon-primary/90',
                castMessage.type === 'success' && 'bg-green-500/90',
                castMessage.type === 'error' && 'bg-red-500/90'
              )}
            >
              {castMessage.type === 'loading' && (
                <Loader2 className="h-3 w-3 animate-spin flex-shrink-0" />
              )}
              <span className="flex-1">{castMessage.text}</span>
              {castMessage.type === 'error' && castMessage.fallbackUrl && (
                <a
                  href={castMessage.fallbackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-0.5 bg-white/20 rounded text-[10px] hover:bg-white/30 transition-colors flex-shrink-0"
                >
                  Open in Browser
                </a>
              )}
              <button onClick={() => setCastMessage(null)} className="flex-shrink-0">
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
        <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-neon-primary" />
            <span className="text-sm font-medium">ContentHub</span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowSearch(!showSearch)}
            >
              <Search className="h-3.5 w-3.5" />
            </Button>
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
              className="overflow-hidden border-b border-border-subtle"
            >
              <div className="p-2">
                <div className="relative">
                  <Input
                    placeholder="Search across all sources..."
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearch(e.target.value)}
                    className="h-8 text-sm bg-surface-3 border-border-subtle pr-8"
                    autoFocus
                  />
                  {searchQuery && (
                    <button 
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground"
                      onClick={clearSearch}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Search Results */}
              {(searchResults.length > 0 || searchLoading) && (
                <div className="max-h-60 overflow-y-auto border-t border-border-subtle">
                  {searchLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="h-5 w-5 border-2 border-neon-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    searchResults.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 p-2 hover:bg-surface-3 cursor-pointer"
                        onClick={() => handlePlayFromSearch(item)}
                      >
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          className="h-10 w-10 rounded object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.title}</p>
                          <p className="text-xs text-text-muted truncate">
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
          onDeviceSelect={nowPlaying?.source === 'spotify' ? openDeviceSelector : undefined}
          shuffleState={shuffleState}
          repeatState={repeatState}
          isLoading={controlLoading}
          compact={false}
          className="min-h-[200px]"
          currentDeviceName={currentDeviceName}
        />

        {/* Quick Actions */}
        <div className="px-3 py-2 border-t border-border-subtle">
          <QuickActions
            onAIDiscover={handleAIDiscover}
            onSmartHome={handleSmartHome}
            onVoice={handleVoice}
            aiDiscoverLoading={aiDiscoverLoading}
          />
        </div>

        {/* Up Next Queue */}
        <div className="px-3 border-t border-border-subtle">
          <UpNextQueue
            items={queue}
            onPlay={handlePlay}
            onRemove={removeFromQueue}
            maxVisible={4}
          />
        </div>
      </motion.div>

      {/* Expanded MediaCommandCenter Overlay */}
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
              aiDiscoverLoading={aiDiscoverLoading}
              onOpenPlaylist={handleOpenPlaylist}
              onClosePlaylist={handleClosePlaylist}
              onAddToPlaylist={handleAddToPlaylistWrapper}
              onCreatePlaylist={handleCreatePlaylist}
              onDeviceSelect={openDeviceSelector}
              currentDeviceName={currentDeviceName}
            />
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Device Selector Modal */}
      <DeviceSelectorModal
        isOpen={showDeviceSelector}
        onClose={() => setShowDeviceSelector(false)}
        onSelectDevice={handleDeviceSelect}
        getDevices={getDevicesWithWebPlayer}
        currentDeviceId={webPlayback.isActive ? webPlayback.deviceId : null}
      />
    </>
  );
}

export default ContentHubWidget;
