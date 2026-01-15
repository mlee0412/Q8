'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type VoiceStatus = 'idle' | 'requesting-permission' | 'recording' | 'processing' | 'error';

interface VoiceButtonProps {
  /**
   * Recording state callback
   */
  onRecordingChange?: (isRecording: boolean) => void;

  /**
   * Status change callback
   */
  onStatusChange?: (status: VoiceStatus) => void;

  /**
   * Error callback
   */
  onError?: (error: Error) => void;

  /**
   * Button variant
   * @default 'filled'
   */
  variant?: 'filled' | 'outlined' | 'glass';

  /**
   * Button size
   * @default 'default'
   */
  size?: 'sm' | 'default' | 'lg';

  /**
   * Enable push-to-talk (Space bar)
   * @default true
   */
  enablePushToTalk?: boolean;

  /**
   * Disable the button
   * @default false
   */
  disabled?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Show status text
   * @default true
   */
  showStatusText?: boolean;
}

/**
 * Voice Button Component
 *
 * Interactive microphone toggle button with recording animation,
 * permission handling, and status indicators.
 *
 * Features:
 * - Recording animation with ripple effect
 * - Microphone permission checking
 * - Status indicators (idle, requesting, recording, processing, error)
 * - Keyboard shortcut (Space bar for push-to-talk)
 * - Multiple variants and sizes
 * - WCAG 2.1 AA accessible
 *
 * @example
 * ```tsx
 * // Basic usage
 * <VoiceButton
 *   onRecordingChange={(isRecording) => console.log('Recording:', isRecording)}
 * />
 *
 * // Glass variant with custom size
 * <VoiceButton
 *   variant="glass"
 *   size="lg"
 *   onStatusChange={(status) => console.log('Status:', status)}
 * />
 *
 * // Disable push-to-talk
 * <VoiceButton
 *   enablePushToTalk={false}
 *   showStatusText={false}
 * />
 * ```
 */
export function VoiceButton({
  onRecordingChange,
  onStatusChange,
  onError,
  variant = 'filled',
  size = 'default',
  enablePushToTalk = true,
  disabled = false,
  className,
  showStatusText = true,
}: VoiceButtonProps) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [isPushToTalkActive, setIsPushToTalkActive] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Update status and notify parent
  const updateStatus = useCallback((newStatus: VoiceStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  // Check microphone permission on mount
  useEffect(() => {
    checkMicrophonePermission();
  }, []);

  // Check microphone permission
  const checkMicrophonePermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      setPermissionGranted(result.state === 'granted');

      result.addEventListener('change', () => {
        setPermissionGranted(result.state === 'granted');
      });
    } catch (error) {
      // Fallback: permission API not supported
      setPermissionGranted(null);
    }
  };

  // Request microphone permission
  const requestMicrophonePermission = useCallback(async () => {
    updateStatus('requesting-permission');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setPermissionGranted(true);
      updateStatus('idle');
      return true;
    } catch (error) {
      setPermissionGranted(false);
      updateStatus('error');
      onError?.(error as Error);
      return false;
    }
  }, [updateStatus, onError]);

  // Toggle recording
  const toggleRecording = useCallback(async () => {
    if (disabled) return;

    if (!isRecording) {
      // Start recording
      if (permissionGranted === false) {
        const granted = await requestMicrophonePermission();
        if (!granted) return;
      }

      updateStatus('recording');
      setIsRecording(true);
      onRecordingChange?.(true);
    } else {
      // Stop recording
      updateStatus('processing');
      setIsRecording(false);
      onRecordingChange?.(false);

      // Simulate processing delay
      setTimeout(() => {
        updateStatus('idle');
      }, 500);
    }
  }, [disabled, isRecording, permissionGranted, requestMicrophonePermission, updateStatus, onRecordingChange]);

  // Keyboard shortcuts (Space bar for push-to-talk)
  useEffect(() => {
    if (!enablePushToTalk || disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (!isRecording && !isPushToTalkActive) {
          setIsPushToTalkActive(true);
          toggleRecording();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isPushToTalkActive) {
        e.preventDefault();
        setIsPushToTalkActive(false);
        toggleRecording();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enablePushToTalk, disabled, isRecording, isPushToTalkActive, toggleRecording]);

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

  // Variant styles
  const variantClasses = {
    filled: 'bg-neon-primary text-white hover:bg-neon-primary/90',
    outlined: 'border-2 border-neon-primary text-neon-primary hover:bg-neon-primary/10',
    glass: 'surface-matte border border-neon-primary/30 text-neon-primary hover:bg-neon-primary/10',
  };

  // Status colors
  const statusColors = {
    idle: 'text-white',
    'requesting-permission': 'text-yellow-500',
    recording: 'text-red-500',
    processing: 'text-blue-500',
    error: 'text-red-500',
  };

  // Status text
  const statusText = {
    idle: 'Click or press Space to talk',
    'requesting-permission': 'Requesting microphone access...',
    recording: 'Recording... Release to send',
    processing: 'Processing...',
    error: 'Microphone access denied',
  };

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      {/* Voice Button */}
      <div className="relative">
        <motion.button
          ref={buttonRef}
          onClick={toggleRecording}
          disabled={disabled || status === 'requesting-permission' || status === 'processing'}
          className={cn(
            'relative rounded-full flex items-center justify-center transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-neon-primary focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            sizeClasses[size],
            variantClasses[variant]
          )}
          whileTap={{ scale: 0.95 }}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          aria-pressed={isRecording}
        >
          {/* Icon */}
          <AnimatePresence mode="wait">
            {status === 'requesting-permission' || status === 'processing' ? (
              <motion.div
                key="loader"
                initial={{ opacity: 0, rotate: 0 }}
                animate={{ opacity: 1, rotate: 360 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, rotate: { duration: 1, repeat: Infinity, ease: 'linear' } }}
              >
                <Loader2 className={cn(iconSizeClasses[size])} />
              </motion.div>
            ) : status === 'error' ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <AlertCircle className={cn(iconSizeClasses[size], 'text-red-500')} />
              </motion.div>
            ) : isRecording ? (
              <motion.div
                key="recording"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <MicOff className={cn(iconSizeClasses[size])} />
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Mic className={cn(iconSizeClasses[size])} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recording indicator dot */}
          {isRecording && (
            <motion.div
              className="absolute top-2 right-2 h-3 w-3 rounded-full bg-red-500"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [1, 0.8, 1],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              aria-hidden="true"
            />
          )}
        </motion.button>

        {/* Ripple effect when recording */}
        <AnimatePresence>
          {isRecording && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-neon-primary"
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: 1.5, opacity: 0 }}
                exit={{ scale: 1, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                aria-hidden="true"
              />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-neon-primary"
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: 1.5, opacity: 0 }}
                exit={{ scale: 1, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
                aria-hidden="true"
              />
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Status text */}
      {showStatusText && (
        <motion.p
          key={status}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn('text-sm text-center max-w-[200px]', statusColors[status])}
        >
          {statusText[status]}
        </motion.p>
      )}

      {/* Push-to-talk hint */}
      {enablePushToTalk && !isRecording && status === 'idle' && showStatusText && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-text-muted text-center"
        >
          Hold <kbd className="px-2 py-1 bg-surface-3 rounded border border-border-subtle">Space</kbd> to talk
        </motion.p>
      )}
    </div>
  );
}

VoiceButton.displayName = 'VoiceButton';
