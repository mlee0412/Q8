'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Music,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ExternalLink,
  Volume2,
  Shuffle,
  Repeat,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumArtUrl: string;
  durationMs: number;
  spotifyUrl: string;
}

interface SpotifyState {
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

interface SpotifyWidgetProps {
  /**
   * Bento grid column span
   * @default 2
   */
  colSpan?: 1 | 2 | 3 | 4;

  /**
   * Bento grid row span
   * @default 1
   */
  rowSpan?: 1 | 2 | 3 | 4;

  /**
   * Show playback controls
   * @default true
   */
  showControls?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Spotify Now Playing Widget
 *
 * Displays currently playing track from Spotify with playback controls
 * and track metadata.
 *
 * Features:
 * - Real Spotify API integration
 * - Now playing display with album art
 * - Playback controls (play/pause, skip, shuffle, repeat)
 * - Progress tracking with real-time updates
 * - Direct Spotify links
 */
export function SpotifyWidget({
  colSpan = 2,
  rowSpan = 1,
  showControls = true,
  className,
}: SpotifyWidgetProps) {
  const [state, setState] = useState<SpotifyState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [localProgress, setLocalProgress] = useState(0);

  // Fetch current playback state
  const fetchPlayback = useCallback(async () => {
    try {
      const response = await fetch('/api/spotify');
      const data = await response.json();

      setState(data);
      setLocalProgress(data.progress || 0);
    } catch (error) {
      console.error('Failed to fetch Spotify state:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    fetchPlayback();

    // Poll for updates every 5 seconds
    const interval = setInterval(fetchPlayback, 5000);
    return () => clearInterval(interval);
  }, [fetchPlayback]);

  // Update local progress every second when playing
  useEffect(() => {
    if (!state?.isPlaying || !state?.track) return;

    const interval = setInterval(() => {
      setLocalProgress((prev) => {
        const newProgress = prev + 1000;
        if (newProgress >= (state.track?.durationMs || 0)) {
          fetchPlayback(); // Refresh when track ends
          return 0;
        }
        return newProgress;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state?.isPlaying, state?.track, fetchPlayback]);

  // Playback control helper
  const controlPlayback = async (action: string, params?: Record<string, any>) => {
    try {
      await fetch('/api/spotify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...params }),
      });

      // Optimistic update
      if (action === 'play') {
        setState((prev) => prev ? { ...prev, isPlaying: true } : prev);
      } else if (action === 'pause') {
        setState((prev) => prev ? { ...prev, isPlaying: false } : prev);
      }

      // Refresh after a short delay
      setTimeout(fetchPlayback, 300);
    } catch (error) {
      console.error(`Spotify ${action} failed:`, error);
    }
  };

  const handlePlayPause = () => {
    controlPlayback(state?.isPlaying ? 'pause' : 'play');
  };

  const handleSkipPrevious = () => controlPlayback('previous');
  const handleSkipNext = () => controlPlayback('next');

  const handleShuffle = () => {
    controlPlayback('shuffle', { state: !state?.shuffleState });
  };

  const handleRepeat = () => {
    const nextState = state?.repeatState === 'off' ? 'context' : 
                      state?.repeatState === 'context' ? 'track' : 'off';
    controlPlayback('repeat', { state: nextState });
  };

  // Calculate progress percentage
  const track = state?.track;
  const progressPercent = track
    ? (localProgress / track.durationMs) * 100
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        gridColumn: `span ${colSpan}`,
        gridRow: `span ${rowSpan}`,
      }}
      className={cn(
        'glass-panel rounded-xl overflow-hidden relative',
        className
      )}
    >
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 border-2 border-neon-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !track && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="text-center">
            <Music className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">Not playing</p>
          </div>
        </div>
      )}

      {/* Now Playing */}
      <AnimatePresence mode="wait">
        {!isLoading && track && (
          <motion.div
            key={track.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative h-full"
          >
            {/* Background Album Art (Blurred) */}
            <div
              className="absolute inset-0 bg-cover bg-center opacity-20 blur-2xl"
              style={{ backgroundImage: `url(${track.albumArtUrl})` }}
            />

            {/* Content */}
            <div className="relative h-full flex flex-col p-3">
              <div className="flex items-start gap-3 flex-1 min-h-0">
                {/* Album Art */}
                <motion.img
                  layoutId={`album-art-${track.id}`}
                  src={track.albumArtUrl}
                  alt={track.album}
                  className="h-12 w-12 rounded-lg shadow-lg flex-shrink-0"
                />

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate">{track.title}</h4>
                  <p className="text-xs text-muted-foreground truncate">
                    {track.artist}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {track.album}
                  </p>

                  {/* Spotify Link */}
                  <a
                    href={track.spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-neon-primary hover:text-neon-accent mt-0.5"
                  >
                    Open in Spotify
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-2 flex-shrink-0">
                <div className="h-1 bg-glass-border rounded-full overflow-hidden mb-1">
                  <motion.div
                    className="h-full bg-neon-accent"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{formatDuration(localProgress)}</span>
                  <span>{formatDuration(track.durationMs)}</span>
                </div>
              </div>

              {/* Playback Controls */}
              {showControls && (
                <div className="flex items-center justify-center gap-1 mt-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn('h-6 w-6', state?.shuffleState && 'text-neon-primary')}
                    onClick={handleShuffle}
                  >
                    <Shuffle className="h-3 w-3" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleSkipPrevious}
                  >
                    <SkipBack className="h-3.5 w-3.5" />
                  </Button>

                  <Button
                    variant="neon"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handlePlayPause}
                  >
                    {state?.isPlaying ? (
                      <Pause className="h-3.5 w-3.5" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleSkipNext}
                  >
                    <SkipForward className="h-3.5 w-3.5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'h-6 w-6',
                      state?.repeatState !== 'off' && 'text-neon-primary'
                    )}
                    onClick={handleRepeat}
                  >
                    <Repeat className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

SpotifyWidget.displayName = 'SpotifyWidget';

// Helper: Format duration
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
