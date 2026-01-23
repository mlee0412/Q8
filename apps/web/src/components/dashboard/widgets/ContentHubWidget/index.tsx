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
  Music2,
  Mic,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useContentHubStore } from '@/lib/stores/contenthub';
import { useContentHub, useSpotifySync } from '@/hooks/useContentHub';
import { useSpotifyWebPlayback } from '@/hooks/useSpotifyWebPlayback';
import { NowPlayingCard } from './NowPlayingCard';
import { UpNextQueue } from './UpNextQueue';
import { QuickActions } from './QuickActions';
import { DeviceSelectorModal } from './DeviceSelectorModal';
import { MediaCommandCenter } from './MediaCommandCenter';
import {
  usePlaybackControls,
  useLibraryData,
  useVoiceControl,
  useKeyboardShortcuts,
  useSearchState,
  useCastState,
} from './hooks';
import { VoiceControlButton, LyricsDisplay, OnboardingCard, NowPlayingSkeleton, MiniWaveform } from './components';
import { getSafeImageUrl } from './utils/urlValidation';
import type { ContentHubWidgetProps, ContentItem } from './types';

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
  const { fetchAIRecommendations } = useContentHub();

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
    youtubeLikedVideos,
    youtubeFromSubscriptions,
    youtubeAuthenticated,
    selectedPlaylist,
    playlistTracks,
    playlistLoading,
    handleOpenPlaylist,
    handleClosePlaylist,
    handleAddToPlaylist,
    handleCreatePlaylist,
  } = useLibraryData();

  // Search state hook
  const {
    searchQuery,
    showSearch,
    searchResults,
    searchLoading,
    handleSearch,
    handlePlayFromSearch,
    clearSearch,
    setShowSearch,
  } = useSearchState();

  // Cast state hook
  const {
    castMessage,
    showDeviceSelector,
    currentDeviceName,
    setCastMessage,
    setShowDeviceSelector,
    openDeviceSelector,
    handleSmartHome,
    handleDeviceSelect,
    getDevicesWithWebPlayer,
  } = useCastState();

  // Local state
  const [aiDiscoverLoading, setAiDiscoverLoading] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);

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
      logger.error('AI Discover error', { error: err });
      setError('Failed to get AI recommendations');
    } finally {
      setAiDiscoverLoading(false);
    }
  }, [fetchAIRecommendations, setError]);

  // Smart home handler wrapper
  const handleSmartHomeAction = useCallback(async () => {
    await handleSmartHome(nowPlaying);
  }, [handleSmartHome, nowPlaying]);

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

  // Voice control hook
  const voiceControl = useVoiceControl({
    onSearch: handleSearch,
    onModeChange: (mode) => useContentHubStore.setState({ activeMode: mode }),
    onError: (err) => setError(err),
  });

  // Enhanced keyboard shortcuts (no duplicate handler needed)
  useKeyboardShortcuts({
    onSearch: () => setShowSearch(true),
    onToggleLyrics: () => setShowLyrics(!showLyrics),
    onToggleQueue: toggleExpanded,
    enabled: true,
  });

  // Voice control handler
  const handleVoice = useCallback(() => {
    voiceControl.toggleListening();
  }, [voiceControl]);

  // Play from search wrapper
  const onPlayFromSearch = useCallback(
    (item: ContentItem) => handlePlayFromSearch(item, handlePlay),
    [handlePlayFromSearch, handlePlay]
  );

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
            {/* Waveform indicator when playing */}
            {isPlaying && nowPlaying && (
              <MiniWaveform isPlaying={isPlaying} className="text-neon-primary" />
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Voice Control Button */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-7 w-7 relative",
                voiceControl.isListening && "text-neon-primary"
              )}
              onClick={handleVoice}
              title="Voice Control (say 'play', 'pause', 'next', etc.)"
            >
              <Mic className={cn(
                "h-3.5 w-3.5",
                voiceControl.isListening && "animate-pulse"
              )} />
              {voiceControl.isListening && (
                <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </Button>
            {/* Lyrics Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-7 w-7",
                showLyrics && "text-neon-primary bg-neon-primary/10"
              )}
              onClick={() => setShowLyrics(!showLyrics)}
              title="Toggle Lyrics (L)"
            >
              <Music2 className="h-3.5 w-3.5" />
            </Button>
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
                        onClick={() => onPlayFromSearch(item)}
                      >
                        <img
                          src={getSafeImageUrl(item.thumbnailUrl)}
                          alt={item.title}
                          className="h-10 w-10 rounded object-cover"
                          loading="lazy"
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

        {/* Lyrics Display - shown when toggled */}
        <AnimatePresence>
          {showLyrics && nowPlaying && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-border-subtle"
            >
              <LyricsDisplay
                trackTitle={nowPlaying.title}
                trackArtist={nowPlaying.subtitle || ''}
                progress={progress}
                isPlaying={isPlaying}
                variant="inline"
                onClose={() => setShowLyrics(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Voice Control Feedback */}
        <AnimatePresence>
          {voiceControl.isListening && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-surface-3/95 backdrop-blur-sm border border-neon-primary/30 rounded-lg px-4 py-2 shadow-lg z-50"
            >
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-neon-primary rounded-full"
                      animate={{ height: [8, 16, 8] }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                    />
                  ))}
                </div>
                <span className="text-xs text-text-muted">
                  {voiceControl.transcript || 'Listening...'}
                </span>
              </div>
              {voiceControl.lastCommand && (
                <p className="text-xs text-neon-primary mt-1">✓ {voiceControl.lastCommand}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Actions */}
        <div className="px-3 py-2 border-t border-border-subtle">
          <QuickActions
            onAIDiscover={handleAIDiscover}
            onSmartHome={handleSmartHomeAction}
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
              youtubeLikedVideos={youtubeLikedVideos}
              youtubeFromSubscriptions={youtubeFromSubscriptions}
              youtubeAuthenticated={youtubeAuthenticated}
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
              onSmartHome={handleSmartHomeAction}
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
