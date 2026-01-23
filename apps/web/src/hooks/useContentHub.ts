'use client';

import { useEffect, useCallback, useMemo, useRef } from 'react';
import { useContentHubStore } from '@/lib/stores/contenthub';
import type { ContentItem, ContentMode } from '@/types/contenthub';
import { PRESET_MODES } from '@/types/contenthub';
import { logger } from '@/lib/logger';

/**
 * Apply mode-specific filters to content items
 */
function applyModeFilter(content: ContentItem[], mode: ContentMode): ContentItem[] {
  const modeConfig = PRESET_MODES[mode];
  if (!modeConfig || !modeConfig.filter) {
    return content;
  }

  const filter = modeConfig.filter;

  return content.filter((item) => {
    if (filter.excludeSources?.includes(item.source)) return false;
    if (filter.excludeTypes?.includes(item.type)) return false;
    
    const durationMs = item.duration || 0;
    if (filter.minDuration && durationMs < filter.minDuration) return false;
    if (filter.maxDuration && durationMs > filter.maxDuration) return false;

    return true;
  });
}

/**
 * Get mode-specific AI prompt context
 */
function getModePromptContext(mode: ContentMode): string {
  const prompts: Record<ContentMode, string> = {
    focus: 'Recommend calm, instrumental music for concentration.',
    break: 'Recommend light, enjoyable content for relaxation.',
    workout: 'Recommend high-energy, upbeat content (120-150 BPM).',
    sleep: 'Recommend calming, slow-tempo content for winding down.',
    discover: 'Recommend diverse, new content with trending items.',
  };
  return prompts[mode] || '';
}

// Demo content for when APIs aren't available (defined outside hook to avoid dependency issues)
const DEMO_CONTENT: ContentItem[] = [
  {
    id: 'demo-1',
    source: 'spotify',
    type: 'track',
    title: 'Blinding Lights',
    subtitle: 'The Weeknd',
    thumbnailUrl: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36',
    duration: 200000,
    playbackUrl: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b',
    deepLinkUrl: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b',
    sourceMetadata: { album: 'After Hours' },
  },
  {
    id: 'demo-2',
    source: 'youtube',
    type: 'video',
    title: 'Lofi Hip Hop Radio',
    subtitle: 'Lofi Girl',
    thumbnailUrl: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg',
    duration: 0,
    playbackUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    deepLinkUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    sourceMetadata: {},
  },
  {
    id: 'demo-3',
    source: 'spotify',
    type: 'track',
    title: 'Levitating',
    subtitle: 'Dua Lipa',
    thumbnailUrl: 'https://i.scdn.co/image/ab67616d0000b273bd26ede1ae69327010d49946',
    duration: 203000,
    playbackUrl: 'https://open.spotify.com/track/39LLxExYz6ewLAcYrzQQyP',
    deepLinkUrl: 'https://open.spotify.com/track/39LLxExYz6ewLAcYrzQQyP',
    sourceMetadata: { album: 'Future Nostalgia' },
  },
];

/**
 * Hook to manage ContentHub data fetching and synchronization
 */
export function useContentHub() {
  const {
    nowPlaying,
    isPlaying,
    activeMode,
    queue,
    play,
    pause,
    resume,
    setLoading,
    setError,
    addToQueue,
  } = useContentHubStore();

  // Fetch aggregated content from API
  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/contenthub?mode=${activeMode}&sources=spotify,youtube`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        // Fall through to demo content for auth errors
        if (response.status === 401) {
          throw new Error('Not authenticated');
        }
        throw new Error('Failed to fetch content');
      }

      const data = await response.json();

      // If there's content playing from Spotify, update store
      if (data.nowPlaying && !nowPlaying) {
        play(data.nowPlaying);
      }

      // Add content to queue if empty - mix of sources for variety
      if (queue.length === 0) {
        const queueItems: ContentItem[] = [];

        // Add YouTube user content first (personalized)
        if (data.likedVideos?.length > 0) {
          queueItems.push(...data.likedVideos.slice(0, 2));
        }

        // Add recommendations (AI-powered or from subscriptions)
        if (data.recommendations?.length > 0) {
          queueItems.push(...data.recommendations.slice(0, 2));
        }

        // Fill remaining slots with trending
        if (data.trending?.length > 0) {
          const remaining = 5 - queueItems.length;
          if (remaining > 0) {
            queueItems.push(...data.trending.slice(0, remaining));
          }
        }

        // Add to queue (addToQueue handles deduplication)
        queueItems.forEach((item: ContentItem) => {
          addToQueue(item);
        });
      }

      setError(null);
    } catch (error) {
      logger.warn('ContentHub fetch error, using demo content', { error });

      // Use demo content as fallback
      if (!nowPlaying && DEMO_CONTENT[0]) {
        play(DEMO_CONTENT[0]);
      }
      if (queue.length === 0) {
        DEMO_CONTENT.slice(1).forEach((item) => addToQueue(item));
      }
      setError(null); // Don't show error for demo mode
    } finally {
      setLoading(false);
    }
  }, [activeMode, nowPlaying, queue.length, play, addToQueue, setLoading, setError]);

  // Fetch Spotify playback state
  const fetchSpotifyState = useCallback(async () => {
    try {
      const response = await fetch('/api/spotify');
      if (!response.ok) return;

      const data = await response.json();

      if (data.track) {
        const spotifyItem: ContentItem = {
          id: `spotify-${data.track.id}`,
          source: 'spotify',
          type: 'track',
          title: data.track.title,
          subtitle: data.track.artist,
          thumbnailUrl: data.track.albumArtUrl,
          duration: data.track.durationMs,
          playbackUrl: data.track.spotifyUrl,
          deepLinkUrl: data.track.spotifyUrl,
          sourceMetadata: {
            album: data.track.album,
            uri: `spotify:track:${data.track.id}`,
          },
        };

        // Update now playing if different
        if (!nowPlaying || nowPlaying.id !== spotifyItem.id) {
          play(spotifyItem);
        }

        // Update playing state
        if (data.isPlaying && !isPlaying) {
          resume();
        } else if (!data.isPlaying && isPlaying) {
          pause();
        }

        // Update progress
        if (data.progress) {
          useContentHubStore.setState({ progress: data.progress });
        }
      }
    } catch (error) {
      logger.error('Spotify state fetch error', { error });
    }
  }, [nowPlaying, isPlaying, play, pause, resume]);

  // Control Spotify playback
  const controlSpotify = useCallback(async (action: string, params?: Record<string, unknown>) => {
    try {
      const response = await fetch('/api/spotify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...params }),
      });

      if (!response.ok) {
        throw new Error('Spotify control failed');
      }

      // Refresh state after action
      setTimeout(fetchSpotifyState, 500);
    } catch (error) {
      logger.error('Spotify control error', { action, error });
      setError('Failed to control playback');
    }
  }, [fetchSpotifyState, setError]);

  // Search across sources
  const search = useCallback(async (query: string) => {
    if (!query.trim()) return [];

    try {
      const response = await fetch(
        `/api/contenthub/search?q=${encodeURIComponent(query)}&sources=spotify,youtube&limit=10`
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      return data.results as ContentItem[];
    } catch (error) {
      logger.error('ContentHub search error', { query, error });
      setError('Search failed');
      return [];
    }
  }, [setError]);

  // Get available Spotify Connect devices
  const getSpotifyDevices = useCallback(async () => {
    try {
      const response = await fetch('/api/spotify/devices');
      const data = await response.json();
      return data.devices || [];
    } catch (error) {
      logger.error('Get Spotify devices error', { error });
      return [];
    }
  }, []);

  // Transfer Spotify playback to a device (Spotify Connect)
  const transferSpotifyPlayback = useCallback(async (deviceId: string, deviceName?: string) => {
    try {
      const response = await fetch('/api/spotify/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, deviceName, play: true }),
      });

      const data = await response.json();

      if (data.success) {
        return { success: true, message: data.message };
      } else {
        throw new Error(data.error || 'Transfer failed');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Transfer failed';
      setError(`Spotify: ${message}`);
      return { success: false, error: message };
    }
  }, [setError]);

  // Cast content - launches app on Apple TV via Home Assistant, then uses Spotify Connect
  const castToDevice = useCallback(async (
    item: ContentItem,
    haEntityId: string = 'media_player.living_room'
  ) => {
    try {
      const mediaUrl = item.playbackUrl || item.deepLinkUrl;

      // Step 1: Use Home Assistant to launch the app on Apple TV
      const requestBody = {
        mediaUrl: mediaUrl || '',
        mediaType: item.type === 'video' ? 'video' : 'music',
        title: item.title,
        source: item.source,
        entityId: haEntityId,
      };

      const castResponse = await fetch('/api/contenthub/cast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const castData = await castResponse.json();

      // Step 2: For Spotify, use Spotify Connect to transfer playback after app launches
      if (item.source === 'spotify' && castData.needsSpotifyConnect) {
        // Wait a bit for Spotify app to fully launch on Apple TV
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Try to find the Apple TV device and transfer playback
        const devices = await getSpotifyDevices();
        
        if (devices.length === 0) {
          // Retry after another delay - app might still be launching
          await new Promise(resolve => setTimeout(resolve, 2000));
          const retryDevices = await getSpotifyDevices();
          
          if (retryDevices.length === 0) {
            return { 
              success: true, 
              message: 'Spotify launched on Apple TV. Select it in Spotify to play.' 
            };
          }
        }

        // Find Apple TV device
        const allDevices = devices.length > 0 ? devices : await getSpotifyDevices();
        const appleTV = allDevices.find((d: { name: string; id: string; type: string }) => 
          d.name.toLowerCase().includes('apple tv') ||
          d.name.toLowerCase().includes('living') ||
          d.type?.toLowerCase() === 'tv'
        );

        if (appleTV) {
          const transferResult = await transferSpotifyPlayback(appleTV.id, appleTV.name);
          if (transferResult.success) {
            return { success: true, message: `Playing on ${appleTV.name}` };
          }
        }
        
        return { success: true, message: 'Spotify launched. Select Apple TV in Spotify.' };
      }

      // For YouTube or if cast succeeded
      if (castData.success) {
        return { success: true, message: castData.message };
      }

      // Fallback: open URL
      if (item.playbackUrl || item.deepLinkUrl) {
        window.open(item.playbackUrl || item.deepLinkUrl, '_blank');
        return { success: true, message: 'Opened in new tab' };
      }

      return { success: false, error: castData.error || 'Cast failed' };
    } catch (error) {
      logger.error('Cast error', { itemId: item.id, source: item.source, error });
      const message = error instanceof Error ? error.message : 'Cast failed';
      setError(`Cast: ${message}`);
      return { success: false, error: message };
    }
  }, [getSpotifyDevices, transferSpotifyPlayback, setError]);

  // Fetch recommendations
  const fetchRecommendations = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/contenthub?mode=${activeMode}&sources=spotify,youtube`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        // Don't throw for auth errors - just return empty
        if (response.status === 401) {
          return { recommendations: [], trending: [] };
        }
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json();
      return {
        recommendations: data.recommendations as ContentItem[],
        trending: data.trending as ContentItem[],
      };
    } catch (error) {
      logger.error('Recommendations fetch error', { activeMode, error });
      return { recommendations: [], trending: [] };
    }
  }, [activeMode]);

  // Fetch AI-powered recommendations
  const fetchAIRecommendations = useCallback(async () => {
    const { nowPlaying, history } = useContentHubStore.getState();

    // Determine time of day
    const hour = new Date().getHours();
    let timeOfDay = 'day';
    if (hour >= 5 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
    else timeOfDay = 'night';

    try {
      const response = await fetch('/api/contenthub/ai-recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: activeMode,
          currentTrack: nowPlaying
            ? {
                id: nowPlaying.id,
                title: nowPlaying.title,
                artist: nowPlaying.subtitle,
              }
            : undefined,
          recentHistory: history.slice(0, 5).map((item) => ({
            id: item.id,
            title: item.title,
            artist: item.subtitle,
          })),
          timeOfDay,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch AI recommendations');
      }

      const data = await response.json();
      return {
        success: data.success,
        recommendations: data.recommendations as ContentItem[],
        context: data.context,
      };
    } catch (error) {
      logger.error('AI Recommendations error', { activeMode, error });
      return { success: false, recommendations: [], context: null };
    }
  }, [activeMode]);

  // Fetch user's Spotify library (playlists, history, top tracks)
  const fetchSpotifyLibrary = useCallback(async () => {
    try {
      const response = await fetch('/api/spotify/library', { credentials: 'include' });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      logger.error('Spotify library fetch error', { error });
      return null;
    }
  }, []);

  // Fetch YouTube trending content
  const fetchYouTubeLibrary = useCallback(async () => {
    try {
      const response = await fetch('/api/youtube/library', { credentials: 'include' });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      logger.error('YouTube library fetch error', { error });
      return null;
    }
  }, []);

  // Fetch YouTube Shorts
  const fetchYouTubeShorts = useCallback(async (category?: string) => {
    try {
      const params = new URLSearchParams({
        mode: activeMode,
        limit: '12',
      });
      if (category) params.set('category', category);

      const response = await fetch(`/api/youtube/shorts?${params}`, { credentials: 'include' });
      if (!response.ok) return { shorts: [] };
      return await response.json();
    } catch (error) {
      logger.error('YouTube Shorts fetch error', { error });
      return { shorts: [] };
    }
  }, [activeMode]);

  // Fetch YouTube user history (liked videos, subscriptions)
  const fetchYouTubeHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/youtube/history?type=all&limit=20', { credentials: 'include' });
      if (!response.ok) return { authenticated: false, likedVideos: [], subscriptions: [] };
      return await response.json();
    } catch (error) {
      logger.error('YouTube history fetch error', { error });
      return { authenticated: false, likedVideos: [], subscriptions: [] };
    }
  }, []);

  // Fetch playlist tracks
  const fetchPlaylistTracks = useCallback(async (playlistId: string) => {
    try {
      const response = await fetch(`/api/spotify/playlists?id=${playlistId}`, { credentials: 'include' });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch playlist');
      }
      return await response.json();
    } catch (error) {
      logger.error('Playlist tracks fetch error', { playlistId, error });
      setError(error instanceof Error ? error.message : 'Failed to fetch playlist');
      return null;
    }
  }, [setError]);

  // Add track to playlist
  const addToPlaylist = useCallback(async (playlistId: string, trackUri: string) => {
    try {
      const response = await fetch('/api/spotify/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          playlistId,
          trackUris: [trackUri],
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add to playlist');
      }
      return { success: true, message: data.message };
    } catch (error) {
      logger.error('Add to playlist error', { playlistId, trackUri, error });
      const message = error instanceof Error ? error.message : 'Failed to add to playlist';
      setError(message);
      return { success: false, error: message };
    }
  }, [setError]);

  // Remove track from playlist
  const removeFromPlaylist = useCallback(async (playlistId: string, trackUri: string) => {
    try {
      const response = await fetch('/api/spotify/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove',
          playlistId,
          trackUris: [trackUri],
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove from playlist');
      }
      return { success: true, message: data.message };
    } catch (error) {
      logger.error('Remove from playlist error', { playlistId, trackUri, error });
      const message = error instanceof Error ? error.message : 'Failed to remove from playlist';
      setError(message);
      return { success: false, error: message };
    }
  }, [setError]);

  // Create new playlist
  const createPlaylist = useCallback(async (name: string, description?: string) => {
    try {
      const response = await fetch('/api/spotify/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name,
          description,
          isPublic: false,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create playlist');
      }
      return { success: true, playlist: data.playlist };
    } catch (error) {
      logger.error('Create playlist error', { name, error });
      const message = error instanceof Error ? error.message : 'Failed to create playlist';
      setError(message);
      return { success: false, error: message };
    }
  }, [setError]);

  // Initial fetch on mount and mode change
  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Poll Spotify state every 5 seconds when playing
  useEffect(() => {
    fetchSpotifyState();

    const interval = setInterval(fetchSpotifyState, 5000);
    return () => clearInterval(interval);
  }, [fetchSpotifyState]);

  return {
    fetchContent,
    fetchSpotifyState,
    controlSpotify,
    search,
    castToDevice,
    fetchRecommendations,
    fetchAIRecommendations,
    fetchSpotifyLibrary,
    fetchYouTubeLibrary,
    fetchYouTubeShorts,
    fetchYouTubeHistory,
    getSpotifyDevices,
    transferSpotifyPlayback,
    fetchPlaylistTracks,
    addToPlaylist,
    removeFromPlaylist,
    createPlaylist,
  };
}

/**
 * Standalone hook for Spotify playback controls
 * Avoids circular dependency by not calling useContentHub
 */
export function useSpotifyControls() {
  const setError = useContentHubStore((s) => s.setError);
  const lastActionRef = useRef<string | null>(null);

  const controlSpotify = useCallback(async (
    action: string, 
    params?: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string; code?: string; authUrl?: string }> => {
    // Prevent duplicate rapid calls
    const actionKey = `${action}-${JSON.stringify(params)}`;
    if (lastActionRef.current === actionKey) {
      return { success: false, error: 'Duplicate action' };
    }
    lastActionRef.current = actionKey;
    setTimeout(() => { lastActionRef.current = null; }, 300);

    try {
      const response = await fetch('/api/spotify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...params }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error codes
        if (data.code === 'PERMISSIONS_MISSING') {
          const authMessage = 'Spotify permissions missing. Click here to re-authorize.';
          logger.error('Spotify permissions error - user needs to re-authorize', { authUrl: '/api/spotify/auth' });
          setError(authMessage);
          // Could trigger a modal or redirect here
          return { success: false, error: authMessage, code: data.code, authUrl: data.authUrl };
        }
        if (data.code === 'NO_ACTIVE_DEVICE') {
          setError('No active Spotify device. Open Spotify on any device first.');
          return { success: false, error: data.error, code: data.code };
        }
        if (data.code === 'PREMIUM_REQUIRED') {
          setError('Spotify Premium required for playback control.');
          return { success: false, error: data.error, code: data.code };
        }
        throw new Error(data.error || 'Spotify control failed');
      }

      // Check if it's a mock response
      if (data.mock) {
        logger.warn('Spotify not configured, using mock mode');
        return { success: true };
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Control failed';
      logger.error('Spotify control error', { action, message, error });
      setError(`Spotify: ${message}`);
      return { success: false, error: message };
    }
  }, [setError]);

  return useMemo(() => ({
    play: (uri?: string) => controlSpotify('play', uri ? { uri } : undefined),
    pause: () => controlSpotify('pause'),
    next: () => controlSpotify('next'),
    previous: () => controlSpotify('previous'),
    seek: (position: number) => controlSpotify('seek', { position }),
    setVolume: (volume: number) => controlSpotify('volume', { volume }),
    shuffle: (state: boolean) => controlSpotify('shuffle', { state }),
    repeat: (state: 'off' | 'track' | 'context') => controlSpotify('repeat', { state }),
    controlSpotify, // Expose raw control for advanced use
  }), [controlSpotify]);
}

/**
 * Hook for syncing Spotify state with store
 * Separated from controls to avoid unnecessary re-renders
 */
export function useSpotifySync() {
  const {
    nowPlaying,
    isPlaying,
    play,
    pause,
    resume,
  } = useContentHubStore();

  const fetchSpotifyState = useCallback(async () => {
    try {
      const response = await fetch('/api/spotify');
      if (!response.ok) return null;

      const data = await response.json();

      if (data.track) {
        const spotifyItem: ContentItem = {
          id: `spotify-${data.track.id}`,
          source: 'spotify',
          type: 'track',
          title: data.track.title,
          subtitle: data.track.artist,
          thumbnailUrl: data.track.albumArtUrl,
          duration: data.track.durationMs,
          playbackUrl: data.track.spotifyUrl,
          deepLinkUrl: data.track.spotifyUrl,
          sourceMetadata: {
            album: data.track.album,
            uri: `spotify:track:${data.track.id}`,
          },
        };

        // Update now playing if different
        if (!nowPlaying || nowPlaying.id !== spotifyItem.id) {
          play(spotifyItem);
        }

        // Update playing state
        if (data.isPlaying && !isPlaying) {
          resume();
        } else if (!data.isPlaying && isPlaying) {
          pause();
        }

        // Update progress and Spotify-specific state
        useContentHubStore.setState({ 
          progress: data.progress ?? 0,
          shuffleState: data.shuffleState ?? false,
          repeatState: data.repeatState ?? 'off',
          spotifyDevice: data.device ?? null,
        });

        return data;
      }
      return null;
    } catch (error) {
      logger.error('Spotify state sync error', { error });
      return null;
    }
  }, [nowPlaying, isPlaying, play, pause, resume]);

  // Poll Spotify state
  useEffect(() => {
    fetchSpotifyState();
    const interval = setInterval(fetchSpotifyState, 5000);
    return () => clearInterval(interval);
  }, [fetchSpotifyState]);

  return { fetchSpotifyState };
}
