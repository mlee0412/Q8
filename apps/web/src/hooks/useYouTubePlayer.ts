'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// Extend Window interface for YouTube API
declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        options: {
          videoId?: string;
          width?: number | string;
          height?: number | string;
          playerVars?: Record<string, number | string | undefined>;
          events?: {
            onReady?: (event: { target: YouTubePlayer }) => void;
            onStateChange?: (event: { data?: number; target: YouTubePlayer }) => void;
            onError?: (event: { data?: number }) => void;
          };
        }
      ) => YouTubePlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YouTubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  setVolume(volume: number): void;
  getVolume(): number;
  getPlaybackRate(): number;
  setPlaybackRate(rate: number): void;
  getAvailablePlaybackRates(): number[];
  getPlayerState(): number;
  getCurrentTime(): number;
  getDuration(): number;
  getVideoLoadedFraction(): number;
  loadVideoById(videoId: string, startSeconds?: number): void;
  destroy(): void;
}

interface UseYouTubePlayerOptions {
  videoId: string;
  autoplay?: boolean;
  controls?: boolean;
  onReady?: (player: YouTubePlayer) => void;
  onStateChange?: (state: number) => void;
  onError?: (error: number) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

interface UseYouTubePlayerReturn {
  player: YouTubePlayer | null;
  isReady: boolean;
  isPlaying: boolean;
  playerState: number;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  availableRates: number[];
  loadedFraction: number;
  // Control functions
  play: () => void;
  pause: () => void;
  stop: () => void;
  togglePlay: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  mute: () => void;
  unMute: () => void;
  toggleMute: () => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  loadVideo: (videoId: string, startSeconds?: number) => void;
}

// Track if API script is loading/loaded globally
let apiLoadPromise: Promise<void> | null = null;

function loadYouTubeAPI(): Promise<void> {
  if (apiLoadPromise) return apiLoadPromise;

  if (window.YT?.Player) {
    return Promise.resolve();
  }

  apiLoadPromise = new Promise((resolve) => {
    const existingCallback = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      existingCallback?.();
      resolve();
    };

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    const firstScript = document.getElementsByTagName('script')[0];
    if (firstScript?.parentNode) {
      firstScript.parentNode.insertBefore(tag, firstScript);
    } else {
      document.head.appendChild(tag);
    }
  });

  return apiLoadPromise;
}

export function useYouTubePlayer(
  containerId: string,
  options: UseYouTubePlayerOptions
): UseYouTubePlayerReturn {
  const playerRef = useRef<YouTubePlayer | null>(null);
  const containerIdRef = useRef(containerId);
  const optionsRef = useRef(options);

  // State
  const [isReady, setIsReady] = useState(false);
  const [playerState, setPlayerState] = useState(-1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [availableRates, setAvailableRates] = useState<number[]>([0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);
  const [loadedFraction, setLoadedFraction] = useState(0);

  // Keep options ref updated
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Initialize player
  useEffect(() => {
    let destroyed = false;

    const initPlayer = async () => {
      await loadYouTubeAPI();

      if (destroyed) return;

      const container = document.getElementById(containerIdRef.current);
      if (!container || !window.YT?.Player) return;

      // Destroy existing player if any
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      playerRef.current = new window.YT.Player(containerIdRef.current, {
        videoId: optionsRef.current.videoId,
        playerVars: {
          autoplay: optionsRef.current.autoplay ? 1 : 0,
          controls: optionsRef.current.controls !== false ? 1 : 0,
          enablejsapi: 1,
          playsinline: 1,
          rel: 0,
          fs: 1,
          modestbranding: 1,
          origin: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
        events: {
          onReady: (event) => {
            if (destroyed) return;
            setIsReady(true);
            setDuration(event.target.getDuration());
            setVolumeState(event.target.getVolume());
            setIsMuted(event.target.isMuted());
            setAvailableRates(event.target.getAvailablePlaybackRates());
            optionsRef.current.onReady?.(event.target);
          },
          onStateChange: (event) => {
            if (destroyed) return;
            setPlayerState(event.data ?? -1);
            optionsRef.current.onStateChange?.(event.data ?? -1);
          },
          onError: (event) => {
            if (destroyed) return;
            optionsRef.current.onError?.(event.data ?? 0);
          },
        },
      });
    };

    initPlayer();

    return () => {
      destroyed = true;
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      setIsReady(false);
    };
  }, [options.videoId]); // Re-init when videoId changes

  // Progress tracking interval
  useEffect(() => {
    if (!isReady) return;

    const interval = setInterval(() => {
      if (playerRef.current && playerState === 1) {
        const time = playerRef.current.getCurrentTime();
        const dur = playerRef.current.getDuration();
        const loaded = playerRef.current.getVideoLoadedFraction();

        setCurrentTime(time);
        setDuration(dur);
        setLoadedFraction(loaded);

        // Notify via callback (convert to ms for consistency with ContentHub)
        optionsRef.current.onTimeUpdate?.(time * 1000, dur * 1000);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isReady, playerState]);

  // Control functions
  const play = useCallback(() => {
    playerRef.current?.playVideo();
  }, []);

  const pause = useCallback(() => {
    playerRef.current?.pauseVideo();
  }, []);

  const stop = useCallback(() => {
    playerRef.current?.stopVideo();
  }, []);

  const togglePlay = useCallback(() => {
    if (!playerRef.current) return;
    const state = playerRef.current.getPlayerState();
    if (state === 1) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  }, []);

  const seekTo = useCallback((seconds: number, allowSeekAhead = true) => {
    playerRef.current?.seekTo(seconds, allowSeekAhead);
    setCurrentTime(seconds);
  }, []);

  const mute = useCallback(() => {
    playerRef.current?.mute();
    setIsMuted(true);
  }, []);

  const unMute = useCallback(() => {
    playerRef.current?.unMute();
    setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    if (!playerRef.current) return;
    if (playerRef.current.isMuted()) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    const clampedVol = Math.max(0, Math.min(100, vol));
    playerRef.current?.setVolume(clampedVol);
    setVolumeState(clampedVol);
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    playerRef.current?.setPlaybackRate(rate);
    setPlaybackRateState(rate);
  }, []);

  const loadVideo = useCallback((videoId: string, startSeconds?: number) => {
    playerRef.current?.loadVideoById(videoId, startSeconds);
  }, []);

  return {
    player: playerRef.current,
    isReady,
    isPlaying: playerState === 1,
    playerState,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    availableRates,
    loadedFraction,
    // Controls
    play,
    pause,
    stop,
    togglePlay,
    seekTo,
    mute,
    unMute,
    toggleMute,
    setVolume,
    setPlaybackRate,
    loadVideo,
  };
}
