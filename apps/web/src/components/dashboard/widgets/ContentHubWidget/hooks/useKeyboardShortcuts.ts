'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useContentHubStore } from '@/lib/stores/contenthub';
import { useSpotifyControls } from '@/hooks/useContentHub';
import { logger } from '@/lib/logger';
import type { ContentMode } from '@/types/contenthub';

interface KeyboardShortcutOptions {
  onSearch?: () => void;
  onToggleLyrics?: () => void;
  onToggleQueue?: () => void;
  onToggleFullscreen?: () => void;
  enabled?: boolean;
}

interface ShortcutAction {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void | Promise<unknown>;
}

export function useKeyboardShortcuts(options: KeyboardShortcutOptions = {}) {
  const {
    onSearch,
    onToggleLyrics,
    onToggleQueue,
    onToggleFullscreen,
    enabled = true,
  } = options;

  const {
    isPlaying,
    isExpanded,
    volume,
    activeMode,
    setVolume,
    setMode,
    toggleExpanded,
    toggleLyrics,
  } = useContentHubStore();

  const spotifyControls = useSpotifyControls();
  const lastActionRef = useRef<number>(0);

  // Debounce rapid key presses
  const debounce = useCallback((fn: () => void | Promise<unknown>, delay = 200) => {
    const now = Date.now();
    if (now - lastActionRef.current < delay) return;
    lastActionRef.current = now;
    fn();
  }, []);

  // Define all shortcuts
  const shortcuts: ShortcutAction[] = [
    // Playback controls
    {
      key: ' ',
      description: 'Play/Pause',
      action: () => debounce(async () => {
        if (isPlaying) {
          await spotifyControls.pause();
        } else {
          await spotifyControls.play();
        }
      }),
    },
    {
      key: 'ArrowRight',
      shift: true,
      description: 'Next track',
      action: () => debounce(() => spotifyControls.next()),
    },
    {
      key: 'ArrowLeft',
      shift: true,
      description: 'Previous track',
      action: () => debounce(() => spotifyControls.previous()),
    },
    // Volume
    {
      key: 'ArrowUp',
      description: 'Volume up',
      action: () => debounce(async () => {
        const newVolume = Math.min(100, volume + 5);
        setVolume(newVolume);
        await spotifyControls.setVolume(newVolume);
      }),
    },
    {
      key: 'ArrowDown',
      description: 'Volume down',
      action: () => debounce(async () => {
        const newVolume = Math.max(0, volume - 5);
        setVolume(newVolume);
        await spotifyControls.setVolume(newVolume);
      }),
    },
    {
      key: 'm',
      description: 'Mute/Unmute',
      action: () => debounce(async () => {
        const newVolume = volume === 0 ? 80 : 0;
        setVolume(newVolume);
        await spotifyControls.setVolume(newVolume);
      }),
    },
    // UI toggles
    {
      key: 'f',
      description: 'Toggle fullscreen',
      action: () => {
        if (onToggleFullscreen) {
          onToggleFullscreen();
        } else {
          toggleExpanded();
        }
      },
    },
    {
      key: 'Escape',
      description: 'Close/minimize',
      action: () => {
        if (isExpanded) {
          toggleExpanded();
        }
      },
    },
    {
      key: 'l',
      description: 'Toggle lyrics',
      action: () => {
        if (onToggleLyrics) {
          onToggleLyrics();
        } else {
          toggleLyrics();
        }
      },
    },
    {
      key: 'q',
      description: 'Toggle queue',
      action: () => onToggleQueue?.(),
    },
    {
      key: '/',
      description: 'Search',
      action: () => onSearch?.(),
    },
    {
      key: 'k',
      ctrl: true,
      description: 'Search (Cmd/Ctrl+K)',
      action: () => onSearch?.(),
    },
    // Shuffle and repeat
    {
      key: 's',
      description: 'Toggle shuffle',
      action: () => debounce(async () => {
        const { shuffleState } = useContentHubStore.getState();
        await spotifyControls.shuffle(!shuffleState);
        useContentHubStore.setState({ shuffleState: !shuffleState });
      }),
    },
    {
      key: 'r',
      description: 'Cycle repeat',
      action: () => debounce(async () => {
        const { repeatState } = useContentHubStore.getState();
        const nextState = repeatState === 'off' ? 'context' : 
                         repeatState === 'context' ? 'track' : 'off';
        await spotifyControls.repeat(nextState);
        useContentHubStore.setState({ repeatState: nextState });
      }),
    },
    // Mode shortcuts (1-5)
    {
      key: '1',
      description: 'Focus mode',
      action: () => setMode('focus'),
    },
    {
      key: '2',
      description: 'Break mode',
      action: () => setMode('break'),
    },
    {
      key: '3',
      description: 'Discover mode',
      action: () => setMode('discover'),
    },
    {
      key: '4',
      description: 'Workout mode',
      action: () => setMode('workout'),
    },
    {
      key: '5',
      description: 'Sleep mode',
      action: () => setMode('sleep'),
    },
    // Save/Like
    {
      key: 'h',
      description: 'Save for later (heart)',
      action: () => {
        const { nowPlaying, saveForLater, savedForLater, removeFromSaved } = useContentHubStore.getState();
        if (nowPlaying) {
          const isSaved = savedForLater.some(i => i.id === nowPlaying.id);
          if (isSaved) {
            removeFromSaved(nowPlaying.id);
          } else {
            saveForLater(nowPlaying);
          }
        }
      },
    },
  ];

  // Key handler
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      ) {
        return;
      }

      // Find matching shortcut
      const shortcut = shortcuts.find((s) => {
        if (s.key.toLowerCase() !== e.key.toLowerCase()) return false;
        if (s.ctrl && !e.ctrlKey && !e.metaKey) return false;
        if (s.shift && !e.shiftKey) return false;
        if (s.alt && !e.altKey) return false;
        return true;
      });

      if (shortcut) {
        e.preventDefault();
        logger.debug('Keyboard shortcut triggered', { key: shortcut.key, description: shortcut.description });
        shortcut.action();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, shortcuts]);

  // Get list of shortcuts for help display
  const getShortcutsList = useCallback(() => {
    return shortcuts.map(s => ({
      key: formatShortcutKey(s),
      description: s.description,
    }));
  }, [shortcuts]);

  return {
    shortcuts: getShortcutsList(),
  };
}

function formatShortcutKey(shortcut: ShortcutAction): string {
  const parts: string[] = [];
  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');
  
  // Format special keys
  let key = shortcut.key;
  if (key === ' ') key = 'Space';
  if (key === 'ArrowUp') key = '↑';
  if (key === 'ArrowDown') key = '↓';
  if (key === 'ArrowLeft') key = '←';
  if (key === 'ArrowRight') key = '→';
  
  parts.push(key);
  return parts.join('+');
}

export default useKeyboardShortcuts;
