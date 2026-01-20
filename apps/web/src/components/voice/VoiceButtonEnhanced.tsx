'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2, AlertCircle, Volume2, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoice, type Voice } from '@/hooks/useVoice';
import { logger } from '@/lib/logger';

interface VoiceButtonEnhancedProps {
  /**
   * Callback with transcribed text
   */
  onTranscription?: (text: string) => void;

  /**
   * Callback when voice input should trigger a message send
   */
  onSend?: (text: string) => void;

  /**
   * Text to speak (for TTS responses)
   */
  speakText?: string;

  /**
   * Auto-speak responses
   */
  autoSpeak?: boolean;

  /**
   * Voice for TTS
   */
  voice?: Voice;

  /**
   * Enable push-to-talk (Space bar)
   */
  enablePushToTalk?: boolean;

  /**
   * Button size
   */
  size?: 'sm' | 'default' | 'lg';

  /**
   * Show status text
   */
  showStatusText?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * VoiceButtonEnhanced Component
 *
 * Full voice interaction with recording, transcription, and TTS
 */
export function VoiceButtonEnhanced({
  onTranscription,
  onSend,
  speakText,
  autoSpeak = true,
  voice = 'nova',
  enablePushToTalk = true,
  size = 'default',
  showStatusText = true,
  className,
}: VoiceButtonEnhancedProps) {
  const [isPushToTalkActive, setIsPushToTalkActive] = useState(false);

  const {
    status,
    isRecording,
    isTranscribing,
    isSpeaking,
    transcript,
    error,
    audioLevel,
    startRecording,
    stopRecording,
    cancelRecording,
    speak,
    stopSpeaking,
  } = useVoice({
    voice,
    onTranscription: (text) => {
      onTranscription?.(text);
      // Auto-send if onSend is provided
      if (onSend && text.trim()) {
        onSend(text);
      }
    },
    onError: (err) => {
      logger.error('Voice button error', { error: err, component: 'VoiceButtonEnhanced' });
    },
  });

  // Auto-speak when speakText changes
  useEffect(() => {
    if (autoSpeak && speakText && !isSpeaking && status === 'idle') {
      speak(speakText);
    }
  }, [speakText, autoSpeak, isSpeaking, status, speak]);

  // Handle click
  const handleClick = useCallback(async () => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    if (isRecording) {
      await stopRecording();
    } else if (status === 'idle' || status === 'error') {
      await startRecording();
    }
  }, [isRecording, isSpeaking, status, startRecording, stopRecording, stopSpeaking]);

  // Keyboard shortcuts (Space bar for push-to-talk)
  useEffect(() => {
    if (!enablePushToTalk) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !e.repeat &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        if (!isRecording && !isPushToTalkActive && status === 'idle') {
          setIsPushToTalkActive(true);
          startRecording();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isPushToTalkActive) {
        e.preventDefault();
        setIsPushToTalkActive(false);
        stopRecording();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enablePushToTalk, isRecording, isPushToTalkActive, status, startRecording, stopRecording]);

  // Size variants
  const sizeClasses = {
    sm: 'h-10 w-10',
    default: 'h-14 w-14',
    lg: 'h-20 w-20',
  };

  const iconSizeClasses = {
    sm: 'h-5 w-5',
    default: 'h-7 w-7',
    lg: 'h-10 w-10',
  };

  // Status colors
  const statusColors = {
    idle: 'bg-neon-primary text-white',
    'requesting-permission': 'bg-yellow-500 text-white',
    recording: 'bg-red-500 text-white',
    transcribing: 'bg-blue-500 text-white',
    processing: 'bg-blue-500 text-white',
    speaking: 'bg-green-500 text-white',
    error: 'bg-red-600 text-white',
  };

  // Status text
  const statusText = {
    idle: enablePushToTalk ? 'Hold Space or click to talk' : 'Click to talk',
    'requesting-permission': 'Requesting microphone...',
    recording: 'Recording... Release to send',
    transcribing: 'Transcribing...',
    processing: 'Processing...',
    speaking: 'Speaking... Click to stop',
    error: error || 'Error occurred',
  };

  // Get icon based on status
  const getIcon = () => {
    if (status === 'transcribing' || status === 'processing' || status === 'requesting-permission') {
      return <Loader2 className={cn(iconSizeClasses[size], 'animate-spin')} />;
    }
    if (status === 'speaking') {
      return <Volume2 className={iconSizeClasses[size]} />;
    }
    if (status === 'error') {
      return <AlertCircle className={iconSizeClasses[size]} />;
    }
    if (isRecording) {
      return <Square className={iconSizeClasses[size]} />;
    }
    return <Mic className={iconSizeClasses[size]} />;
  };

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      {/* Voice Button */}
      <div className="relative">
        <motion.button
          onClick={handleClick}
          disabled={status === 'transcribing' || status === 'requesting-permission'}
          className={cn(
            'relative rounded-full flex items-center justify-center transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-neon-primary focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            sizeClasses[size],
            statusColors[status]
          )}
          whileTap={{ scale: 0.95 }}
          animate={isRecording ? { scale: [1, 1.05, 1] } : {}}
          transition={isRecording ? { duration: 0.5, repeat: Infinity } : {}}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={status}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              {getIcon()}
            </motion.div>
          </AnimatePresence>
        </motion.button>

        {/* Audio Level Indicator (Recording) */}
        <AnimatePresence>
          {isRecording && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-red-500"
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ 
                  scale: 1 + audioLevel * 0.5, 
                  opacity: 0.8 - audioLevel * 0.5 
                }}
                transition={{ duration: 0.1 }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-red-500"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
              />
            </>
          )}
        </AnimatePresence>

        {/* Speaking Indicator */}
        <AnimatePresence>
          {isSpeaking && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-green-500"
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0.4, 0.8] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Status Text */}
      {showStatusText && (
        <motion.p
          key={status}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'text-sm text-center max-w-[200px]',
            status === 'error' ? 'text-red-400' : 'text-text-muted'
          )}
        >
          {statusText[status]}
        </motion.p>
      )}

      {/* Transcript Preview */}
      {transcript && status === 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-text-muted text-center max-w-[200px] truncate"
        >
          &ldquo;{transcript}&rdquo;
        </motion.div>
      )}
    </div>
  );
}

VoiceButtonEnhanced.displayName = 'VoiceButtonEnhanced';
