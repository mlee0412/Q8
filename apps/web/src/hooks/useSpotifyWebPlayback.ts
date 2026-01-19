'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useContentHubStore } from '@/lib/stores/contenthub';
import { logger } from '@/lib/logger';

// Spotify Web Playback SDK types
declare global {
  interface Window {
    Spotify: {
      Player: new (options: SpotifyPlayerOptions) => SpotifyPlayer;
    };
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

interface SpotifyPlayerOptions {
  name: string;
  getOAuthToken: (cb: (token: string) => void) => void;
  volume?: number;
}

interface SpotifyPlayer {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener: (event: string, callback: (state: unknown) => void) => boolean;
  removeListener: (event: string, callback?: (state: unknown) => void) => boolean;
  getCurrentState: () => Promise<SpotifyPlaybackState | null>;
  setName: (name: string) => Promise<void>;
  getVolume: () => Promise<number>;
  setVolume: (volume: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  togglePlay: () => Promise<void>;
  seek: (position_ms: number) => Promise<void>;
  previousTrack: () => Promise<void>;
  nextTrack: () => Promise<void>;
  activateElement: () => Promise<void>;
  _options: {
    id: string;
  };
}

interface SpotifyPlaybackState {
  context: {
    uri: string;
    metadata: Record<string, unknown>;
  };
  disallows: {
    pausing: boolean;
    peeking_next: boolean;
    peeking_prev: boolean;
    resuming: boolean;
    seeking: boolean;
    skipping_next: boolean;
    skipping_prev: boolean;
  };
  paused: boolean;
  position: number;
  repeat_mode: number;
  shuffle: boolean;
  track_window: {
    current_track: SpotifyTrack;
    previous_tracks: SpotifyTrack[];
    next_tracks: SpotifyTrack[];
  };
}

interface SpotifyTrack {
  uri: string;
  id: string;
  type: string;
  media_type: string;
  name: string;
  is_playable: boolean;
  album: {
    uri: string;
    name: string;
    images: Array<{ url: string; height: number; width: number }>;
  };
  artists: Array<{ uri: string; name: string }>;
  duration_ms: number;
}

interface WebPlaybackError {
  message: string;
}

interface UseSpotifyWebPlaybackReturn {
  isReady: boolean;
  isActive: boolean;
  deviceId: string | null;
  deviceName: string;
  currentTrack: SpotifyTrack | null;
  isPaused: boolean;
  position: number;
  duration: number;
  volume: number;
  error: string | null;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  play: (uri?: string) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  togglePlay: () => Promise<void>;
  seek: (position: number) => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
}

const PLAYER_NAME = 'Q8 Dashboard';
const SDK_URL = 'https://sdk.scdn.co/spotify-player.js';

/**
 * Hook for Spotify Web Playback SDK
 *
 * Creates a player device in the browser that shows up in Spotify Connect.
 * This allows our app to be a playback target like any Spotify device.
 */
export function useSpotifyWebPlayback(): UseSpotifyWebPlaybackReturn {
  const [isReady, setIsReady] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [isPaused, setIsPaused] = useState(true);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(50);
  const [error, setError] = useState<string | null>(null);

  const playerRef = useRef<SpotifyPlayer | null>(null);
  const tokenRef = useRef<string | null>(null);
  const tokenExpiryRef = useRef<number>(0);

  // Get fresh access token
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    // Return cached token if still valid (with 60s buffer)
    if (tokenRef.current && Date.now() < tokenExpiryRef.current - 60000) {
      return tokenRef.current;
    }

    try {
      const response = await fetch('/api/spotify/token', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          return null; // Not authenticated, fail silently
        }
        throw new Error('Failed to fetch token');
      }
      
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return null;
      }

      tokenRef.current = data.access_token;
      tokenExpiryRef.current = Date.now() + (data.expires_in * 1000);
      return data.access_token;
    } catch (err) {
      logger.error('Failed to get Spotify token', { error: err });
      setError('Failed to authenticate with Spotify');
      return null;
    }
  }, []);

  // Load SDK script
  useEffect(() => {
    // Check if SDK is already loaded
    if (window.Spotify) {
      initializePlayer();
      return;
    }

    // Check if script is already being loaded
    if (document.querySelector(`script[src="${SDK_URL}"]`)) {
      return;
    }

    // Define callback before loading script
    window.onSpotifyWebPlaybackSDKReady = () => {
      logger.info('Spotify Web Playback SDK ready');
      initializePlayer();
    };

    // Load the SDK script
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup on unmount
      if (playerRef.current) {
        playerRef.current.disconnect();
      }
    };
  }, []);

  // Initialize player
  const initializePlayer = useCallback(async () => {
    if (!window.Spotify || playerRef.current) return;

    const token = await getAccessToken();
    if (!token) {
      setError('No Spotify access token available');
      return;
    }

    const player = new window.Spotify.Player({
      name: PLAYER_NAME,
      getOAuthToken: async (cb) => {
        const freshToken = await getAccessToken();
        if (freshToken) {
          cb(freshToken);
        }
      },
      volume: 0.5,
    });

    // Error handling - cast from unknown to specific types
    player.addListener('initialization_error', (state: unknown) => {
      const { message } = state as WebPlaybackError;
      logger.error('Spotify initialization error', { message });
      setError(`Initialization error: ${message}`);
    });

    player.addListener('authentication_error', (state: unknown) => {
      const { message } = state as WebPlaybackError;
      logger.error('Spotify auth error', { message });
      setError(`Authentication error: ${message}`);
    });

    player.addListener('account_error', (state: unknown) => {
      const { message } = state as WebPlaybackError;
      logger.error('Spotify account error', { message });
      setError(`Account error: ${message}. Spotify Premium is required.`);
    });

    player.addListener('playback_error', (state: unknown) => {
      const { message } = state as WebPlaybackError;
      logger.error('Spotify playback error', { message });
      setError(`Playback error: ${message}`);
    });

    // Ready
    player.addListener('ready', (state: unknown) => {
      const { device_id } = state as { device_id: string };
      logger.info('Spotify player ready', { deviceId: device_id });
      setDeviceId(device_id);
      setIsReady(true);
      setError(null);
    });

    // Not Ready
    player.addListener('not_ready', (state: unknown) => {
      const { device_id } = state as { device_id: string };
      logger.info('Spotify device has gone offline', { deviceId: device_id });
      setIsReady(false);
      setIsActive(false);
    });

    // Player state changed
    player.addListener('player_state_changed', (rawState: unknown) => {
      const state = rawState as SpotifyPlaybackState | null;
      if (!state) {
        setIsActive(false);
        setCurrentTrack(null);
        return;
      }

      setIsActive(true);
      setIsPaused(state.paused);
      setPosition(state.position);
      setCurrentTrack(state.track_window.current_track);
      setDuration(state.track_window.current_track?.duration_ms || 0);

      // Sync with content hub store
      const track = state.track_window.current_track;
      if (track) {
        useContentHubStore.getState().play({
          id: `spotify-${track.id}`,
          source: 'spotify',
          type: 'track',
          title: track.name,
          subtitle: track.artists.map((a) => a.name).join(', '),
          thumbnailUrl: track.album.images[0]?.url || '',
          duration: track.duration_ms,
          playbackUrl: `https://open.spotify.com/track/${track.id}`,
          deepLinkUrl: `spotify:track:${track.id}`,
          sourceMetadata: { uri: track.uri },
        });
        useContentHubStore.setState({
          isPlaying: !state.paused,
          progress: state.position,
        });
      }
    });

    playerRef.current = player;

    // Connect to Spotify
    const success = await player.connect();
    if (success) {
      logger.info('Connected to Spotify');
    } else {
      setError('Failed to connect to Spotify');
    }
  }, [getAccessToken]);

  // Connect
  const connect = useCallback(async (): Promise<boolean> => {
    const existingPlayer = playerRef.current;
    if (existingPlayer) {
      return await existingPlayer.connect();
    }
    await initializePlayer();
    // After initializePlayer, playerRef may be set
    const newPlayer = playerRef.current;
    return newPlayer ? await newPlayer.connect() : false;
  }, [initializePlayer]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.disconnect();
      setIsReady(false);
      setIsActive(false);
      setDeviceId(null);
    }
  }, []);

  // Play
  const play = useCallback(async (uri?: string) => {
    if (!deviceId) return;

    const token = await getAccessToken();
    if (!token) return;

    try {
      const body: Record<string, unknown> = {};
      if (uri) {
        if (uri.includes(':track:')) {
          body.uris = [uri];
        } else {
          body.context_uri = uri;
        }
      }

      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      logger.error('Spotify play error', { error: err });
    }
  }, [deviceId, getAccessToken]);

  // Pause
  const pause = useCallback(async () => {
    if (playerRef.current) {
      await playerRef.current.pause();
    }
  }, []);

  // Resume
  const resume = useCallback(async () => {
    if (playerRef.current) {
      await playerRef.current.resume();
    }
  }, []);

  // Toggle play
  const togglePlay = useCallback(async () => {
    if (playerRef.current) {
      await playerRef.current.togglePlay();
    }
  }, []);

  // Seek
  const seek = useCallback(async (position: number) => {
    if (playerRef.current) {
      await playerRef.current.seek(position);
    }
  }, []);

  // Next track
  const nextTrack = useCallback(async () => {
    if (playerRef.current) {
      await playerRef.current.nextTrack();
    }
  }, []);

  // Previous track
  const previousTrack = useCallback(async () => {
    if (playerRef.current) {
      await playerRef.current.previousTrack();
    }
  }, []);

  // Set volume
  const setVolume = useCallback(async (newVolume: number) => {
    if (playerRef.current) {
      await playerRef.current.setVolume(newVolume / 100);
      setVolumeState(newVolume);
    }
  }, []);

  // Update position periodically when playing
  useEffect(() => {
    if (!isActive || isPaused) return;

    const interval = setInterval(() => {
      setPosition((prev) => Math.min(prev + 1000, duration));
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, isPaused, duration]);

  return {
    isReady,
    isActive,
    deviceId,
    deviceName: PLAYER_NAME,
    currentTrack,
    isPaused,
    position,
    duration,
    volume,
    error,
    connect,
    disconnect,
    play,
    pause,
    resume,
    togglePlay,
    seek,
    nextTrack,
    previousTrack,
    setVolume,
  };
}
