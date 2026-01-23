'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useContentHubStore } from '@/lib/stores/contenthub';
import { useSpotifyControls } from '@/hooks/useContentHub';
import { logger } from '@/lib/logger';
import type { ContentMode } from '@/types/contenthub';

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface VoiceCommand {
  pattern: RegExp;
  action: string;
  handler: (matches: RegExpMatchArray) => void | Promise<void>;
}

interface UseVoiceControlOptions {
  onSearch?: (query: string) => void;
  onModeChange?: (mode: ContentMode) => void;
  onError?: (error: string) => void;
}

interface UseVoiceControlReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  confidence: number;
  lastCommand: string | null;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
}

// Static command patterns - defined outside component to avoid recreation
const COMMAND_PATTERNS = {
  play: /^(play|resume|start)$/i,
  pause: /^(pause|stop)$/i,
  next: /^(next|skip|next track|skip track)$/i,
  previous: /^(previous|back|go back|last track)$/i,
  mute: /^(mute|silence)$/i,
  unmute: /^(unmute)$/i,
  volumeUp: /^volume (up|louder|increase)$/i,
  volumeDown: /^volume (down|quieter|decrease|lower)$/i,
  setVolume: /^(set )?volume (?:to )?(\d+)(?: percent)?$/i,
  shuffleOn: /^shuffle (on|enable)$/i,
  shuffleOff: /^shuffle (off|disable)$/i,
  repeatOff: /^repeat (off|disable|none)$/i,
  repeatTrack: /^repeat (track|song|one)$/i,
  repeatContext: /^repeat (all|playlist|context)$/i,
  modeFocus: /^(focus|work|concentrate) mode$/i,
  modeBreak: /^(break|relax|chill) mode$/i,
  modeWorkout: /^(workout|exercise|gym) mode$/i,
  modeSleep: /^(sleep|night|bedtime) mode$/i,
  modeDiscover: /^(discover|explore) mode$/i,
  search: /^(search|find|play|look for) (.+)$/i,
  whatPlaying: /^what('s| is) playing$/i,
} as const;

export function useVoiceControl(options: UseVoiceControlOptions = {}): UseVoiceControlReturn {
  const { onSearch, onModeChange, onError } = options;

  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [lastCommand, setLastCommand] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    isPlaying,
    volume,
    setVolume,
    setMode,
    setError,
  } = useContentHubStore();

  const spotifyControls = useSpotifyControls();

  // Memoized commands array - only recreates when dependencies change
  const commands = useMemo<VoiceCommand[]>(() => [
    // Playback controls
    {
      pattern: COMMAND_PATTERNS.play,
      action: 'play',
      handler: async () => {
        if (!isPlaying) {
          await spotifyControls.play();
          setLastCommand('Playing');
        }
      },
    },
    {
      pattern: COMMAND_PATTERNS.pause,
      action: 'pause',
      handler: async () => {
        if (isPlaying) {
          await spotifyControls.pause();
          setLastCommand('Paused');
        }
      },
    },
    {
      pattern: COMMAND_PATTERNS.next,
      action: 'next',
      handler: async () => {
        await spotifyControls.next();
        setLastCommand('Skipped to next');
      },
    },
    {
      pattern: COMMAND_PATTERNS.previous,
      action: 'previous',
      handler: async () => {
        await spotifyControls.previous();
        setLastCommand('Previous track');
      },
    },
    // Volume controls
    {
      pattern: COMMAND_PATTERNS.mute,
      action: 'mute',
      handler: async () => {
        setVolume(0);
        await spotifyControls.setVolume(0);
        setLastCommand('Muted');
      },
    },
    {
      pattern: COMMAND_PATTERNS.unmute,
      action: 'unmute',
      handler: async () => {
        setVolume(80);
        await spotifyControls.setVolume(80);
        setLastCommand('Unmuted');
      },
    },
    {
      pattern: COMMAND_PATTERNS.volumeUp,
      action: 'volume_up',
      handler: async () => {
        const newVolume = Math.min(100, volume + 10);
        setVolume(newVolume);
        await spotifyControls.setVolume(newVolume);
        setLastCommand(`Volume ${newVolume}%`);
      },
    },
    {
      pattern: COMMAND_PATTERNS.volumeDown,
      action: 'volume_down',
      handler: async () => {
        const newVolume = Math.max(0, volume - 10);
        setVolume(newVolume);
        await spotifyControls.setVolume(newVolume);
        setLastCommand(`Volume ${newVolume}%`);
      },
    },
    {
      pattern: COMMAND_PATTERNS.setVolume,
      action: 'set_volume',
      handler: async (matches) => {
        const volumeStr = matches[2] || '50';
        const newVolume = Math.min(100, Math.max(0, parseInt(volumeStr, 10)));
        setVolume(newVolume);
        await spotifyControls.setVolume(newVolume);
        setLastCommand(`Volume set to ${newVolume}%`);
      },
    },
    // Shuffle and repeat
    {
      pattern: COMMAND_PATTERNS.shuffleOn,
      action: 'shuffle_on',
      handler: async () => {
        await spotifyControls.shuffle(true);
        setLastCommand('Shuffle enabled');
      },
    },
    {
      pattern: COMMAND_PATTERNS.shuffleOff,
      action: 'shuffle_off',
      handler: async () => {
        await spotifyControls.shuffle(false);
        setLastCommand('Shuffle disabled');
      },
    },
    {
      pattern: COMMAND_PATTERNS.repeatOff,
      action: 'repeat_off',
      handler: async () => {
        await spotifyControls.repeat('off');
        setLastCommand('Repeat off');
      },
    },
    {
      pattern: COMMAND_PATTERNS.repeatTrack,
      action: 'repeat_track',
      handler: async () => {
        await spotifyControls.repeat('track');
        setLastCommand('Repeating track');
      },
    },
    {
      pattern: COMMAND_PATTERNS.repeatContext,
      action: 'repeat_context',
      handler: async () => {
        await spotifyControls.repeat('context');
        setLastCommand('Repeating playlist');
      },
    },
    // Mode changes
    {
      pattern: COMMAND_PATTERNS.modeFocus,
      action: 'mode_focus',
      handler: () => {
        setMode('focus');
        onModeChange?.('focus');
        setLastCommand('Focus mode');
      },
    },
    {
      pattern: COMMAND_PATTERNS.modeBreak,
      action: 'mode_break',
      handler: () => {
        setMode('break');
        onModeChange?.('break');
        setLastCommand('Break mode');
      },
    },
    {
      pattern: COMMAND_PATTERNS.modeWorkout,
      action: 'mode_workout',
      handler: () => {
        setMode('workout');
        onModeChange?.('workout');
        setLastCommand('Workout mode');
      },
    },
    {
      pattern: COMMAND_PATTERNS.modeSleep,
      action: 'mode_sleep',
      handler: () => {
        setMode('sleep');
        onModeChange?.('sleep');
        setLastCommand('Sleep mode');
      },
    },
    {
      pattern: COMMAND_PATTERNS.modeDiscover,
      action: 'mode_discover',
      handler: () => {
        setMode('discover');
        onModeChange?.('discover');
        setLastCommand('Discover mode');
      },
    },
    // Search
    {
      pattern: COMMAND_PATTERNS.search,
      action: 'search',
      handler: (matches) => {
        const query = matches[2] || '';
        if (query) onSearch?.(query);
        setLastCommand(`Searching: ${query}`);
      },
    },
    // Info
    {
      pattern: COMMAND_PATTERNS.whatPlaying,
      action: 'what_playing',
      handler: () => {
        const { nowPlaying } = useContentHubStore.getState();
        if (nowPlaying) {
          setLastCommand(`Now playing: ${nowPlaying.title} by ${nowPlaying.subtitle}`);
        } else {
          setLastCommand('Nothing is currently playing');
        }
      },
    },
  ], [isPlaying, volume, setVolume, setMode, spotifyControls, onModeChange, onSearch]);

  // Process voice command - now uses memoized commands
  const processCommand = useCallback(async (transcriptText: string) => {
    logger.debug('Processing voice command', { transcript: transcriptText });

    for (const command of commands) {
      const matches = transcriptText.match(command.pattern);
      if (matches) {
        logger.info('Voice command matched', { action: command.action, transcript: transcriptText });
        try {
          await command.handler(matches);
        } catch (error) {
          logger.error('Voice command error', { action: command.action, error });
          setError('Failed to execute voice command');
        }
        return;
      }
    }

    // No command matched - might be a search query
    if (transcriptText.length > 2) {
      onSearch?.(transcriptText);
      setLastCommand(`Searching: ${transcriptText}`);
    } else {
      setLastCommand('Command not recognized');
    }
  }, [commands, onSearch, setError]);

  // Check for browser support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript('');
        logger.debug('Voice recognition started');
      };

      recognition.onend = () => {
        setIsListening(false);
        logger.debug('Voice recognition ended');
      };

      recognition.onerror = (event) => {
        setIsListening(false);

        // Handle specific error types
        if (event.error === 'aborted') {
          // User stopped listening - this is normal, not an error
          logger.debug('Voice recognition aborted by user');
          return;
        } else if (event.error === 'not-allowed') {
          logger.warn('Voice recognition: microphone access denied');
          setError('Microphone access denied');
          onError?.('Microphone access denied. Please enable microphone permissions.');
        } else if (event.error === 'no-speech') {
          logger.debug('Voice recognition: no speech detected');
          setLastCommand('No speech detected');
        } else if (event.error === 'network') {
          logger.warn('Voice recognition: network error');
          onError?.('Network error. Please check your connection.');
        } else {
          logger.warn('Voice recognition error', { error: event.error });
          onError?.(`Voice error: ${event.error}`);
        }
      };

      recognition.onresult = (event) => {
        const result = event.results[event.results.length - 1];
        if (!result || !result[0]) return;

        const transcriptText = result[0].transcript.trim().toLowerCase();
        const confidenceValue = result[0].confidence;

        setTranscript(transcriptText);
        setConfidence(confidenceValue);

        // Only process final results
        if (result.isFinal) {
          processCommand(transcriptText);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onError, setError, processCommand]);

  const stopListeningRef = useRef<() => void>(() => {});

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();

        // Auto-stop after 10 seconds
        timeoutRef.current = setTimeout(() => {
          stopListeningRef.current();
        }, 10000);
      } catch (error) {
        logger.error('Failed to start voice recognition', { error });
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
  }, [isListening]);

  // Keep ref in sync
  stopListeningRef.current = stopListening;

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    isSupported,
    transcript,
    confidence,
    lastCommand,
    startListening,
    stopListening,
    toggleListening,
  };
}

export default useVoiceControl;
