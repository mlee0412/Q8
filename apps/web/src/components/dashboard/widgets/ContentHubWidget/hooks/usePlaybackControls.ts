/**
 * usePlaybackControls Hook
 * Encapsulates playback control logic for ContentHub
 */

import { useCallback, useState } from 'react';
import { useContentHubStore } from '@/lib/stores/contenthub';
import { useSpotifyControls } from '@/hooks/useContentHub';
import type { ContentItem } from '@/types/contenthub';

export function usePlaybackControls() {
  const {
    nowPlaying,
    isPlaying,
    shuffleState,
    repeatState,
    play,
  } = useContentHubStore();

  const spotifyControls = useSpotifyControls();
  const [controlLoading, setControlLoading] = useState(false);

  const handlePlayPause = useCallback(async () => {
    if (nowPlaying?.source === 'spotify') {
      setControlLoading(true);
      useContentHubStore.setState({ isPlaying: !isPlaying });
      try {
        if (isPlaying) {
          await spotifyControls.pause();
        } else {
          await spotifyControls.play();
        }
      } catch {
        useContentHubStore.setState({ isPlaying });
      } finally {
        setControlLoading(false);
      }
    } else {
      useContentHubStore.setState({ isPlaying: !isPlaying });
    }
  }, [isPlaying, nowPlaying?.source, spotifyControls]);

  const handlePlay = useCallback(
    (item: ContentItem) => {
      play(item);
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

  const handleVolumeChange = useCallback(async (volume: number) => {
    if (nowPlaying?.source === 'spotify') {
      try {
        await spotifyControls.setVolume(volume);
      } catch {
        // Volume change failed
      }
    }
  }, [nowPlaying?.source, spotifyControls]);

  return {
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
  };
}
