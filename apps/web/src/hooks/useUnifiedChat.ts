/**
 * useUnifiedChat Hook
 * Single state machine for text, voice, and ambient conversation modes
 *
 * This hook consolidates useChat and useVoice functionality into a unified
 * interface that supports seamless switching between interaction modes.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useChat, type ChatState, type StreamingMessage, type ToolExecution, type AgentType } from './useChat';
import { useVoice, type Voice, type VoiceStatus } from './useVoice';
import { createTTSStreamer, type TTSStreamer } from '@/lib/agents/tts-streamer';
import type { ExtendedAgentType, ConversationMode, InputMethod } from '@/lib/agents/orchestration/types';
import { logger } from '@/lib/logger';

// =============================================================================
// TYPES
// =============================================================================

export type { ConversationMode, InputMethod };

export interface UnifiedChatState extends Omit<ChatState, 'currentAgent'> {
  // Mode management
  mode: ConversationMode;
  inputMethod: InputMethod;

  // Voice-specific
  isRecording: boolean;
  isTranscribing: boolean;
  isSpeaking: boolean;
  audioLevel: number;
  voiceStatus: VoiceStatus;

  // Agent context
  activeAgent: ExtendedAgentType | null;
  agentStack: ExtendedAgentType[];

  // TTS state
  ttsEnabled: boolean;
}

export interface UseUnifiedChatOptions {
  // User context
  userId: string;
  threadId?: string | null;
  userProfile?: {
    name?: string;
    timezone?: string;
    communicationStyle?: 'concise' | 'detailed';
  };

  // Mode preferences
  defaultMode?: ConversationMode;
  autoSwitchToVoice?: boolean;
  persistMode?: boolean; // Persist mode to localStorage

  // Voice settings
  voice?: Voice;
  speed?: number;
  autoSpeak?: boolean;

  // Ambient mode settings
  vadEnabled?: boolean; // Voice Activity Detection for ambient mode
  vadSilenceThreshold?: number; // Silence threshold in ms (default: 1500)
  interruptOnSpeak?: boolean; // Stop AI speaking when user starts

  // Callbacks
  onMessage?: (message: StreamingMessage) => void;
  onToolExecution?: (tool: ToolExecution) => void;
  onRouting?: (agent: AgentType, reason: string) => void;
  onThreadCreated?: (threadId: string) => void;
  onMemoryExtracted?: (count: number) => void;
  onError?: (error: string) => void;

  // New callbacks for unified chat
  onAgentHandoff?: (from: ExtendedAgentType, to: ExtendedAgentType, reason: string) => void;
  onModeSwitch?: (from: ConversationMode, to: ConversationMode) => void;
}

export interface UseUnifiedChatReturn extends UnifiedChatState {
  // Unified send
  send: (content: string, method?: InputMethod) => Promise<void>;

  // Mode control
  switchMode: (mode: ConversationMode) => void;

  // Voice controls
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  cancelRecording: () => void;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;

  // TTS control
  enableTTS: () => void;
  disableTTS: () => void;
  toggleTTS: () => void;

  // Chat controls
  cancelStream: () => void;
  clearMessages: () => void;
  retryLast: () => void;

  // Voice settings
  setVoice: (voice: Voice) => void;
  setSpeed: (speed: number) => void;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useUnifiedChat(options: UseUnifiedChatOptions): UseUnifiedChatReturn {
  const {
    userId,
    threadId,
    userProfile,
    defaultMode = 'text',
    autoSwitchToVoice = true,
    persistMode = true,
    voice: initialVoice = 'nova',
    speed: initialSpeed = 1.0,
    autoSpeak = true,
    vadEnabled = true,
    vadSilenceThreshold = 1500,
    interruptOnSpeak = true,
    onMessage,
    onToolExecution,
    onRouting,
    onThreadCreated,
    onMemoryExtracted,
    onError,
    onAgentHandoff,
    onModeSwitch,
  } = options;

  // localStorage key for mode persistence
  const MODE_STORAGE_KEY = 'q8-conversation-mode';

  // Get initial mode from localStorage or default
  const getInitialMode = (): ConversationMode => {
    if (typeof window === 'undefined') return defaultMode;
    if (!persistMode) return defaultMode;
    const saved = localStorage.getItem(MODE_STORAGE_KEY);
    if (saved && ['text', 'voice', 'ambient'].includes(saved)) {
      return saved as ConversationMode;
    }
    return defaultMode;
  };

  // Mode state - initialize from localStorage if persisted
  const [mode, setMode] = useState<ConversationMode>(getInitialMode);
  const [inputMethod, setInputMethod] = useState<InputMethod>('keyboard');
  const [ttsEnabled, setTtsEnabled] = useState(autoSpeak);

  // VAD (Voice Activity Detection) state for ambient mode
  const vadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAudioLevelRef = useRef<number>(0);
  const isVadActiveRef = useRef<boolean>(false);

  // Agent tracking
  const [agentStack, setAgentStack] = useState<ExtendedAgentType[]>([]);
  const previousAgentRef = useRef<ExtendedAgentType | null>(null);

  // TTS streamer ref
  const ttsStreamerRef = useRef<TTSStreamer | null>(null);

  // Core chat functionality
  const chat = useChat({
    userId,
    threadId,
    userProfile,
    onMessage: (message) => {
      onMessage?.(message);

      // Auto-speak in voice/ambient mode
      if ((mode === 'voice' || mode === 'ambient') && ttsEnabled && message.content) {
        // Speak the full response when done streaming
        if (!message.isStreaming) {
          voice.speak(message.content);
        }
      }
    },
    onToolExecution,
    onRouting: (agent, reason) => {
      // Track agent hand-offs
      const previousAgent = previousAgentRef.current;

      if (previousAgent && previousAgent !== agent) {
        onAgentHandoff?.(previousAgent as ExtendedAgentType, agent as ExtendedAgentType, reason);

        setAgentStack((prev) => {
          // Limit stack size to prevent memory issues
          const newStack = [...prev, agent as ExtendedAgentType];
          return newStack.slice(-10);
        });
      }

      previousAgentRef.current = agent as ExtendedAgentType;
      onRouting?.(agent, reason);
    },
    onThreadCreated,
    onMemoryExtracted,
    onError,
  });

  // Voice functionality
  const voice = useVoice({
    voice: initialVoice,
    speed: initialSpeed,
    onTranscription: (text) => {
      if (text.trim()) {
        // Send transcribed text through chat
        setInputMethod('microphone');
        chat.sendMessage(text);
      }
    },
    onRecordingStart: () => {
      // Interruption handling: stop AI speaking when user starts recording
      if (interruptOnSpeak && voice.isSpeaking) {
        voice.stopSpeaking();
        logger.info('Interrupted AI speech - user started speaking');
      }

      // Auto-switch to voice mode if enabled
      if (autoSwitchToVoice && mode === 'text') {
        switchMode('voice');
      }
    },
    onError: (error) => {
      logger.error('Voice error', { error });
      onError?.(error);
    },
  });

  // VAD (Voice Activity Detection) for ambient mode
  useEffect(() => {
    if (mode !== 'ambient' || !vadEnabled) return;

    const checkAudioLevel = () => {
      const currentLevel = voice.audioLevel;
      const threshold = 0.1; // Minimum audio level to detect speech

      if (currentLevel > threshold && !voice.isRecording && !voice.isSpeaking) {
        // Audio detected - start recording if not already
        if (!isVadActiveRef.current) {
          isVadActiveRef.current = true;
          voice.startRecording();
          logger.debug('VAD: Speech detected, starting recording');
        }

        // Clear silence timeout
        if (vadTimeoutRef.current) {
          clearTimeout(vadTimeoutRef.current);
          vadTimeoutRef.current = null;
        }
      } else if (currentLevel <= threshold && voice.isRecording) {
        // Silence detected - schedule stop recording
        if (!vadTimeoutRef.current) {
          vadTimeoutRef.current = setTimeout(() => {
            if (voice.isRecording) {
              voice.stopRecording();
              isVadActiveRef.current = false;
              logger.debug('VAD: Silence detected, stopping recording');
            }
            vadTimeoutRef.current = null;
          }, vadSilenceThreshold);
        }
      }

      lastAudioLevelRef.current = currentLevel;
    };

    // Check audio level periodically
    const intervalId = setInterval(checkAudioLevel, 100);

    return () => {
      clearInterval(intervalId);
      if (vadTimeoutRef.current) {
        clearTimeout(vadTimeoutRef.current);
      }
    };
  }, [mode, vadEnabled, vadSilenceThreshold, voice]);

  // Initialize TTS streamer for streaming responses
  useEffect(() => {
    ttsStreamerRef.current = createTTSStreamer(
      async (text) => {
        if (ttsEnabled && (mode === 'voice' || mode === 'ambient')) {
          await voice.speak(text);
        }
      },
      { minChunkLength: 40, maxBufferSize: 200 }
    );

    return () => {
      ttsStreamerRef.current?.clear();
    };
  }, [ttsEnabled, mode, voice]);

  // Mode switching
  const switchMode = useCallback(
    (newMode: ConversationMode) => {
      const oldMode = mode;

      if (oldMode === newMode) return;

      // Cleanup current mode
      if (oldMode === 'voice' || oldMode === 'ambient') {
        if (voice.isRecording) {
          voice.cancelRecording();
        }
        if (voice.isSpeaking) {
          voice.stopSpeaking();
        }
      }

      setMode(newMode);

      // Persist mode to localStorage
      if (persistMode && typeof window !== 'undefined') {
        localStorage.setItem(MODE_STORAGE_KEY, newMode);
      }

      onModeSwitch?.(oldMode, newMode);

      logger.info('Mode switched', { from: oldMode, to: newMode });
    },
    [mode, voice, onModeSwitch, persistMode]
  );

  // Unified send
  const send = useCallback(
    async (content: string, method: InputMethod = 'keyboard') => {
      if (!content.trim()) return;

      setInputMethod(method);
      await chat.sendMessage(content);
    },
    [chat]
  );

  // TTS controls
  const enableTTS = useCallback(() => setTtsEnabled(true), []);
  const disableTTS = useCallback(() => {
    setTtsEnabled(false);
    voice.stopSpeaking();
    ttsStreamerRef.current?.clear();
  }, [voice]);
  const toggleTTS = useCallback(() => {
    if (ttsEnabled) {
      disableTTS();
    } else {
      enableTTS();
    }
  }, [ttsEnabled, enableTTS, disableTTS]);

  // Derive active agent from chat state
  const activeAgent = (chat.currentAgent as ExtendedAgentType) || null;

  return {
    // Chat state
    messages: chat.messages,
    isLoading: chat.isLoading,
    isStreaming: chat.isStreaming,
    routingReason: chat.routingReason,
    error: chat.error,
    threadId: chat.threadId,

    // Mode state
    mode,
    inputMethod,

    // Voice state
    isRecording: voice.isRecording,
    isTranscribing: voice.isTranscribing,
    isSpeaking: voice.isSpeaking,
    audioLevel: voice.audioLevel,
    voiceStatus: voice.status,

    // Agent state
    activeAgent,
    agentStack,

    // TTS state
    ttsEnabled,

    // Unified actions
    send,
    switchMode,

    // Voice actions
    startRecording: voice.startRecording,
    stopRecording: voice.stopRecording,
    cancelRecording: voice.cancelRecording,
    speak: voice.speak,
    stopSpeaking: voice.stopSpeaking,

    // TTS control
    enableTTS,
    disableTTS,
    toggleTTS,

    // Chat actions
    cancelStream: chat.cancelStream,
    clearMessages: chat.clearMessages,
    retryLast: chat.retryLast,

    // Voice settings
    setVoice: voice.setVoice,
    setSpeed: voice.setSpeed,
  };
}
