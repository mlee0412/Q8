'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ContentItem,
  ContentSource,
  ContentMode,
} from '@/types/contenthub';

interface SpotifyDevice {
  id: string;
  name: string;
  type: string;
  volume: number;
  isActive?: boolean;
}

interface ContentHubState {
  // Playback state
  nowPlaying: ContentItem | null;
  isPlaying: boolean;
  progress: number;
  volume: number;

  // Spotify-specific state
  shuffleState: boolean;
  repeatState: 'off' | 'track' | 'context';
  spotifyDevice: SpotifyDevice | null;

  // Queue management
  queue: ContentItem[];
  history: ContentItem[];
  savedForLater: ContentItem[];

  // UI state
  isExpanded: boolean;
  activeMode: ContentMode;
  activeSource: ContentSource | 'all';
  showLyrics: boolean;
  isPiPActive: boolean;

  // Dynamic theming
  dominantColor: [number, number, number] | null;

  // Shared queue
  activeSharedQueue: string | null;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions
  play: (item: ContentItem) => void;
  pause: () => void;
  resume: () => void;
  next: () => void;
  previous: () => void;
  seek: (position: number) => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;

  // Queue actions
  addToQueue: (item: ContentItem) => void;
  removeFromQueue: (itemId: string) => void;
  clearQueue: () => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;

  // Save for later
  saveForLater: (item: ContentItem) => void;
  removeFromSaved: (itemId: string) => void;

  // Mode & UI actions
  setMode: (mode: ContentMode) => void;
  setActiveSource: (source: ContentSource | 'all') => void;
  setDominantColor: (color: [number, number, number] | null) => void;
  toggleLyrics: () => void;
  toggleExpanded: () => void;
  setPiPActive: (active: boolean) => void;

  // Shared queue actions
  joinSharedQueue: (queueId: string) => void;
  leaveSharedQueue: () => void;

  // Error handling
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  nowPlaying: null,
  isPlaying: false,
  progress: 0,
  volume: 80,
  shuffleState: false,
  repeatState: 'off' as const,
  spotifyDevice: null,
  queue: [],
  history: [],
  savedForLater: [],
  isExpanded: false,
  activeMode: 'discover' as ContentMode,
  activeSource: 'all' as ContentSource | 'all',
  showLyrics: false,
  isPiPActive: false,
  dominantColor: null,
  activeSharedQueue: null,
  isLoading: false,
  error: null,
};

export const useContentHubStore = create<ContentHubState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Playback actions
      play: (item) => {
        const { nowPlaying, history } = get();
        set({
          nowPlaying: item,
          isPlaying: true,
          progress: 0,
          error: null,
          history: nowPlaying
            ? [nowPlaying, ...history.slice(0, 49)]
            : history,
        });
      },

      pause: () => set({ isPlaying: false }),

      resume: () => set({ isPlaying: true }),

      next: () => {
        const { queue, nowPlaying, history } = get();
        if (queue.length > 0) {
          const [nextItem, ...restQueue] = queue;
          set({
            nowPlaying: nextItem,
            queue: restQueue,
            progress: 0,
            isPlaying: true,
            history: nowPlaying
              ? [nowPlaying, ...history.slice(0, 49)]
              : history,
          });
        } else {
          // No more items in queue
          set({ isPlaying: false });
        }
      },

      previous: () => {
        const { history, nowPlaying, queue, progress } = get();

        // If more than 3 seconds in, restart current track
        if (progress > 3000 && nowPlaying) {
          set({ progress: 0 });
          return;
        }

        // Otherwise go to previous
        if (history.length > 0) {
          const [prevItem, ...restHistory] = history;
          set({
            nowPlaying: prevItem,
            history: restHistory,
            progress: 0,
            isPlaying: true,
            queue: nowPlaying ? [nowPlaying, ...queue] : queue,
          });
        }
      },

      seek: (position) => set({ progress: position }),

      setVolume: (volume) => set({ volume: Math.max(0, Math.min(100, volume)) }),

      setProgress: (progress) => set({ progress }),

      // Queue actions
      addToQueue: (item) =>
        set((state) => {
          // Prevent duplicate items in queue
          if (state.queue.some((i) => i.id === item.id)) {
            return state;
          }
          return { queue: [...state.queue, item] };
        }),

      removeFromQueue: (itemId) =>
        set((state) => ({
          queue: state.queue.filter((i) => i.id !== itemId),
        })),

      clearQueue: () => set({ queue: [] }),

      reorderQueue: (fromIndex, toIndex) => {
        const { queue } = get();
        const newQueue = [...queue];
        const [removed] = newQueue.splice(fromIndex, 1);
        if (removed) {
          newQueue.splice(toIndex, 0, removed);
        }
        set({ queue: newQueue });
      },

      // Save for later
      saveForLater: (item) =>
        set((state) => ({
          savedForLater: [
            item,
            ...state.savedForLater.filter((i) => i.id !== item.id),
          ],
        })),

      removeFromSaved: (itemId) =>
        set((state) => ({
          savedForLater: state.savedForLater.filter((i) => i.id !== itemId),
        })),

      // Mode & UI actions
      setMode: (mode) => set({ activeMode: mode }),

      setActiveSource: (source) => set({ activeSource: source }),

      setDominantColor: (color) => set({ dominantColor: color }),

      toggleLyrics: () => set((state) => ({ showLyrics: !state.showLyrics })),

      toggleExpanded: () => set((state) => ({ isExpanded: !state.isExpanded })),

      setPiPActive: (active) => set({ isPiPActive: active }),

      // Shared queue
      joinSharedQueue: (queueId) => set({ activeSharedQueue: queueId }),

      leaveSharedQueue: () => set({ activeSharedQueue: null }),

      // Error handling
      setError: (error) => set({ error }),

      setLoading: (loading) => set({ isLoading: loading }),

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: 'contenthub-storage',
      partialize: (state) => ({
        // Only persist these fields
        volume: state.volume,
        activeMode: state.activeMode,
        savedForLater: state.savedForLater,
        history: state.history.slice(0, 20), // Keep last 20 items
      }),
    }
  )
);

// Selector hooks for common use cases
export const useNowPlaying = () =>
  useContentHubStore((state) => state.nowPlaying);

export const useIsPlaying = () =>
  useContentHubStore((state) => state.isPlaying);

export const useContentQueue = () =>
  useContentHubStore((state) => state.queue);

export const useContentHistory = () =>
  useContentHubStore((state) => state.history);

export const useActiveMode = () =>
  useContentHubStore((state) => state.activeMode);

export const useDominantColor = () =>
  useContentHubStore((state) => state.dominantColor);

export const useShuffleState = () =>
  useContentHubStore((state) => state.shuffleState);

export const useRepeatState = () =>
  useContentHubStore((state) => state.repeatState);

export const useSpotifyDevice = () =>
  useContentHubStore((state) => state.spotifyDevice);

export const useContentHubActions = () =>
  useContentHubStore((state) => ({
    play: state.play,
    pause: state.pause,
    resume: state.resume,
    next: state.next,
    previous: state.previous,
    seek: state.seek,
    setVolume: state.setVolume,
    addToQueue: state.addToQueue,
    setMode: state.setMode,
    toggleExpanded: state.toggleExpanded,
  }));
