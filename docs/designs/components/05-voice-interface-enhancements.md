# Voice Interface Enhancements Design Specification

**Category**: Voice Interface (Phase 5 - Real-time Voice)
**Priority**: High - Differentiating feature
**Design Date**: 2025-01-20

---

## Overview

Enhanced voice interaction components for Q8's WebRTC-based voice interface using GPT-5.1 Realtime API. These components provide visual feedback, live transcription, and voice settings for natural conversation with the AI assistant.

---

## 1. VoiceButton Component

### Purpose
Mic toggle button with recording animation, permission handling, and status indicators.

### File Location
`apps/web/src/components/voice/VoiceButton.tsx`

### Component Code

```typescript
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type VoiceStatus = 'idle' | 'requesting-permission' | 'recording' | 'processing' | 'error';

interface VoiceButtonProps {
  /**
   * Current voice status
   */
  status?: VoiceStatus;

  /**
   * Toggle callback
   */
  onToggle: (isRecording: boolean) => void;

  /**
   * Error message
   */
  error?: string;

  /**
   * Button size
   * @default 'default'
   */
  size?: 'sm' | 'default' | 'lg';

  /**
   * Variant style
   * - filled: Solid background
   * - outlined: Border only
   * - glass: Glassmorphism
   * @default 'filled'
   */
  variant?: 'filled' | 'outlined' | 'glass';

  /**
   * Show status text below button
   * @default true
   */
  showStatusText?: boolean;

  /**
   * Keyboard shortcut hint
   * @default 'Space'
   */
  shortcut?: string;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export function VoiceButton({
  status = 'idle',
  onToggle,
  error,
  size = 'default',
  variant = 'filled',
  showStatusText = true,
  shortcut = 'Space',
  className,
}: VoiceButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Check microphone permission
  useEffect(() => {
    const checkPermission = async () => {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setHasPermission(result.state === 'granted');

        result.addEventListener('change', () => {
          setHasPermission(result.state === 'granted');
        });
      } catch (error) {
        console.error('Failed to check microphone permission:', error);
      }
    };

    checkPermission();
  }, []);

  // Handle toggle
  const handleToggle = () => {
    const newRecordingState = !isRecording;
    setIsRecording(newRecordingState);
    onToggle(newRecordingState);
  };

  // Handle keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        handleToggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording]);

  // Get button configuration
  const sizeConfig = {
    sm: { button: 'h-10 w-10', icon: 'h-4 w-4', text: 'text-xs' },
    default: { button: 'h-14 w-14', icon: 'h-6 w-6', text: 'text-sm' },
    lg: { button: 'h-20 w-20', icon: 'h-8 w-8', text: 'text-base' },
  }[size];

  const statusConfig = {
    idle: { text: 'Click to speak', color: 'text-muted-foreground' },
    'requesting-permission': { text: 'Requesting mic access...', color: 'text-yellow-500' },
    recording: { text: 'Listening...', color: 'text-neon-accent' },
    processing: { text: 'Processing...', color: 'text-blue-500' },
    error: { text: error || 'Error', color: 'text-red-500' },
  }[status];

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      {/* Main Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleToggle}
        disabled={status === 'requesting-permission' || status === 'error'}
        className={cn(
          'relative rounded-full flex items-center justify-center transition-all',
          sizeConfig.button,
          variant === 'filled' &&
            (status === 'recording'
              ? 'bg-neon-accent text-white'
              : 'bg-neon-primary text-white hover:bg-neon-accent'),
          variant === 'outlined' &&
            (status === 'recording'
              ? 'border-2 border-neon-accent text-neon-accent'
              : 'border-2 border-neon-primary text-neon-primary hover:border-neon-accent hover:text-neon-accent'),
          variant === 'glass' && 'glass-panel',
          status === 'error' && 'opacity-50 cursor-not-allowed'
        )}
      >
        {/* Ripple Animation (Recording) */}
        {status === 'recording' && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-neon-accent"
              animate={{ scale: [1, 1.5, 2], opacity: [0.8, 0.4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-neon-accent"
              animate={{ scale: [1, 1.5, 2], opacity: [0.8, 0.4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
            />
          </>
        )}

        {/* Icon */}
        {status === 'requesting-permission' || status === 'processing' ? (
          <Loader2 className={cn(sizeConfig.icon, 'animate-spin')} />
        ) : status === 'error' ? (
          <AlertCircle className={sizeConfig.icon} />
        ) : status === 'recording' ? (
          <MicOff className={sizeConfig.icon} />
        ) : (
          <Mic className={sizeConfig.icon} />
        )}

        {/* Recording Indicator Dot */}
        {status === 'recording' && (
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border-2 border-white"
          />
        )}
      </motion.button>

      {/* Status Text */}
      {showStatusText && (
        <div className="text-center">
          <p className={cn(sizeConfig.text, statusConfig.color, 'font-medium')}>
            {statusConfig.text}
          </p>

          {/* Keyboard Shortcut Hint */}
          {status === 'idle' && shortcut && (
            <p className="text-xs text-muted-foreground mt-1">
              Press <kbd className="px-1.5 py-0.5 glass-panel rounded text-xs">{shortcut}</kbd>
            </p>
          )}
        </div>
      )}

      {/* Permission Warning */}
      {hasPermission === false && status === 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-2 rounded-lg flex items-center gap-2 max-w-xs"
        >
          <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Microphone access required
          </p>
        </motion.div>
      )}
    </div>
  );
}

VoiceButton.displayName = 'VoiceButton';
```

### Usage Examples

```typescript
// Basic usage
<VoiceButton
  status="idle"
  onToggle={(recording) => console.log('Recording:', recording)}
/>

// Large filled button (main interface)
<VoiceButton
  size="lg"
  variant="filled"
  status="recording"
  onToggle={handleVoiceToggle}
/>

// Small glass button (chat input)
<VoiceButton
  size="sm"
  variant="glass"
  showStatusText={false}
  onToggle={handleVoiceToggle}
/>

// With error state
<VoiceButton
  status="error"
  error="Microphone not available"
  onToggle={handleVoiceToggle}
/>
```

---

## 2. AudioVisualizer Component

### Purpose
Real-time audio waveform visualization with frequency analysis and volume indicators.

### File Location
`apps/web/src/components/voice/AudioVisualizer.tsx`

### Component Code

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AudioVisualizerProps {
  /**
   * Audio stream to visualize
   */
  audioStream?: MediaStream;

  /**
   * Visualizer type
   * - bars: Vertical frequency bars
   * - waveform: Sine wave animation
   * - circular: Circular frequency visualization
   * @default 'bars'
   */
  type?: 'bars' | 'waveform' | 'circular';

  /**
   * Number of bars (for bars type)
   * @default 32
   */
  barCount?: number;

  /**
   * Color scheme
   * - neon: Neon primary/accent gradient
   * - spectrum: Rainbow spectrum
   * - mono: Single color
   * @default 'neon'
   */
  colorScheme?: 'neon' | 'spectrum' | 'mono';

  /**
   * Animation speed multiplier
   * @default 1
   */
  speed?: number;

  /**
   * Height of visualizer
   * @default 150
   */
  height?: number;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export function AudioVisualizer({
  audioStream,
  type = 'bars',
  barCount = 32,
  colorScheme = 'neon',
  speed = 1,
  height = 150,
  className,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!audioStream || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up audio analyzer
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(audioStream);
    const analyzer = audioContext.createAnalyser();
    analyzer.fftSize = 256;
    analyzer.smoothingTimeConstant = 0.8;

    source.connect(analyzer);
    analyzerRef.current = analyzer;

    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Animation loop
    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      analyzer.getByteFrequencyData(dataArray);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (type === 'bars') {
        drawBars(ctx, dataArray, canvas, barCount, colorScheme);
      } else if (type === 'waveform') {
        drawWaveform(ctx, dataArray, canvas, colorScheme);
      } else if (type === 'circular') {
        drawCircular(ctx, dataArray, canvas, colorScheme);
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      audioContext.close();
    };
  }, [audioStream, type, barCount, colorScheme]);

  return (
    <div className={cn('relative overflow-hidden rounded-lg', className)}>
      <canvas
        ref={canvasRef}
        width={800}
        height={height}
        className="w-full h-full"
      />

      {/* Fallback animation (no audio stream) */}
      {!audioStream && (
        <div className="absolute inset-0 flex items-center justify-center gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              animate={{ scaleY: [1, 2, 1] }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.1,
                ease: 'easeInOut',
              }}
              className="w-2 h-8 bg-neon-primary/30 rounded-full"
            />
          ))}
        </div>
      )}
    </div>
  );
}

AudioVisualizer.displayName = 'AudioVisualizer';

// Helper: Draw frequency bars
function drawBars(
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  canvas: HTMLCanvasElement,
  barCount: number,
  colorScheme: string
) {
  const barWidth = canvas.width / barCount;
  const step = Math.floor(dataArray.length / barCount);

  for (let i = 0; i < barCount; i++) {
    const value = dataArray[i * step];
    const barHeight = (value / 255) * canvas.height;
    const x = i * barWidth;
    const y = canvas.height - barHeight;

    // Color based on scheme
    if (colorScheme === 'neon') {
      const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
      gradient.addColorStop(0, '#a855f7'); // neon-primary
      gradient.addColorStop(1, '#22c55e'); // neon-accent
      ctx.fillStyle = gradient;
    } else if (colorScheme === 'spectrum') {
      const hue = (i / barCount) * 360;
      ctx.fillStyle = `hsl(${hue}, 70%, 60%)`;
    } else {
      ctx.fillStyle = '#a855f7';
    }

    ctx.fillRect(x, y, barWidth - 2, barHeight);
  }
}

// Helper: Draw waveform
function drawWaveform(
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  canvas: HTMLCanvasElement,
  colorScheme: string
) {
  const sliceWidth = (canvas.width * 1.0) / dataArray.length;
  let x = 0;

  ctx.lineWidth = 2;
  ctx.strokeStyle = colorScheme === 'neon' ? '#a855f7' : '#22c55e';

  ctx.beginPath();

  for (let i = 0; i < dataArray.length; i++) {
    const v = dataArray[i] / 128.0;
    const y = (v * canvas.height) / 2;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }

    x += sliceWidth;
  }

  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.stroke();
}

// Helper: Draw circular visualization
function drawCircular(
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  canvas: HTMLCanvasElement,
  colorScheme: string
) {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(centerX, centerY) - 20;

  const barCount = 64;
  const angleStep = (Math.PI * 2) / barCount;
  const step = Math.floor(dataArray.length / barCount);

  for (let i = 0; i < barCount; i++) {
    const value = dataArray[i * step];
    const barHeight = (value / 255) * radius * 0.5;
    const angle = angleStep * i;

    const x1 = centerX + Math.cos(angle) * radius;
    const y1 = centerY + Math.sin(angle) * radius;
    const x2 = centerX + Math.cos(angle) * (radius + barHeight);
    const y2 = centerY + Math.sin(angle) * (radius + barHeight);

    ctx.strokeStyle = colorScheme === 'spectrum'
      ? `hsl(${(i / barCount) * 360}, 70%, 60%)`
      : '#a855f7';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}
```

### Usage Examples

```typescript
// Frequency bars (default)
<AudioVisualizer
  audioStream={stream}
  type="bars"
  barCount={32}
  colorScheme="neon"
/>

// Waveform visualization
<AudioVisualizer
  audioStream={stream}
  type="waveform"
  colorScheme="neon"
  height={100}
/>

// Circular visualization with spectrum colors
<AudioVisualizer
  audioStream={stream}
  type="circular"
  colorScheme="spectrum"
  height={200}
/>
```

---

## 3. TranscriptionDisplay Component

### Purpose
Live speech-to-text display with word-by-word highlighting, confidence indicators, and edit capabilities.

### File Location
`apps/web/src/components/voice/TranscriptionDisplay.tsx`

### Component Code

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Edit3, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

interface TranscriptionSegment {
  id: string;
  text: string;
  timestamp: number;
  confidence?: number;
  isFinal: boolean;
}

interface TranscriptionDisplayProps {
  /**
   * Transcription segments
   */
  segments: TranscriptionSegment[];

  /**
   * Show interim (non-final) results
   * @default true
   */
  showInterim?: boolean;

  /**
   * Show confidence indicators
   * @default true
   */
  showConfidence?: boolean;

  /**
   * Enable editing
   * @default false
   */
  editable?: boolean;

  /**
   * Auto-scroll to latest
   * @default true
   */
  autoScroll?: boolean;

  /**
   * Maximum height before scrolling
   * @default 300
   */
  maxHeight?: number;

  /**
   * Edit callback
   */
  onEdit?: (segmentId: string, newText: string) => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export function TranscriptionDisplay({
  segments,
  showInterim = true,
  showConfidence = true,
  editable = false,
  autoScroll = true,
  maxHeight = 300,
  onEdit,
  className,
}: TranscriptionDisplayProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [segments, autoScroll]);

  // Handle edit start
  const startEdit = (segment: TranscriptionSegment) => {
    setEditingId(segment.id);
    setEditText(segment.text);
  };

  // Handle edit save
  const saveEdit = () => {
    if (editingId && onEdit) {
      onEdit(editingId, editText);
    }
    setEditingId(null);
    setEditText('');
  };

  // Handle edit cancel
  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  // Get confidence color
  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'text-muted-foreground';
    if (confidence > 0.9) return 'text-green-500';
    if (confidence > 0.7) return 'text-yellow-500';
    return 'text-red-500';
  };

  // Filter segments
  const visibleSegments = showInterim
    ? segments
    : segments.filter((s) => s.isFinal);

  return (
    <div
      ref={containerRef}
      style={{ maxHeight }}
      className={cn(
        'overflow-y-auto glass-panel rounded-xl p-4 space-y-3',
        className
      )}
    >
      {/* Empty State */}
      {visibleSegments.length === 0 && (
        <div className="text-center py-8">
          <Volume2 className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground">
            Start speaking to see live transcription...
          </p>
        </div>
      )}

      {/* Transcription Segments */}
      <AnimatePresence mode="popLayout">
        {visibleSegments.map((segment, index) => (
          <motion.div
            key={segment.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'relative group',
              !segment.isFinal && 'opacity-60'
            )}
          >
            {/* Segment Content */}
            {editingId === segment.id ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="flex-1 px-3 py-2 glass-panel rounded-lg border-0 focus:ring-2 focus:ring-neon-primary"
                  autoFocus
                />
                <Button
                  variant="neon"
                  size="icon"
                  className="h-8 w-8"
                  onClick={saveEdit}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={cancelEdit}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                {/* Timestamp */}
                <span className="text-xs text-muted-foreground whitespace-nowrap mt-1">
                  {formatTimestamp(segment.timestamp)}
                </span>

                {/* Text */}
                <div className="flex-1">
                  <p className="text-sm leading-relaxed">
                    {segment.text}
                  </p>

                  {/* Confidence Indicator */}
                  {showConfidence && segment.confidence !== undefined && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-1 w-16 bg-glass-border rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${segment.confidence * 100}%` }}
                          className={cn(
                            'h-full',
                            segment.confidence > 0.9 && 'bg-green-500',
                            segment.confidence > 0.7 && segment.confidence <= 0.9 && 'bg-yellow-500',
                            segment.confidence <= 0.7 && 'bg-red-500'
                          )}
                        />
                      </div>
                      <span
                        className={cn(
                          'text-xs',
                          getConfidenceColor(segment.confidence)
                        )}
                      >
                        {Math.round(segment.confidence * 100)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Edit Button */}
                {editable && segment.isFinal && (
                  <button
                    onClick={() => startEdit(segment)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  >
                    <Edit3 className="h-4 w-4 text-muted-foreground hover:text-neon-primary" />
                  </button>
                )}
              </div>
            )}

            {/* Final Indicator */}
            {!segment.isFinal && (
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute -left-2 top-2 h-2 w-2 rounded-full bg-neon-primary"
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Live Indicator */}
      {segments.some((s) => !s.isFinal) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="h-2 w-2 rounded-full bg-red-500"
          />
          <span>Live transcription</span>
        </div>
      )}
    </div>
  );
}

TranscriptionDisplay.displayName = 'TranscriptionDisplay';

// Helper: Format timestamp
function formatTimestamp(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
```

### Usage Examples

```typescript
// Basic live transcription
<TranscriptionDisplay
  segments={transcriptionSegments}
  showInterim
  showConfidence
/>

// Editable transcription (for corrections)
<TranscriptionDisplay
  segments={transcriptionSegments}
  editable
  onEdit={(id, text) => console.log('Edit:', id, text)}
/>

// Final results only
<TranscriptionDisplay
  segments={transcriptionSegments}
  showInterim={false}
  maxHeight={400}
/>
```

---

## 4. VoiceSettings Component

### Purpose
Voice preferences panel for configuring voice input/output settings, language, and audio devices.

### File Location
`apps/web/src/components/voice/VoiceSettings.tsx`

### Component Code

```typescript
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Mic,
  Volume2,
  Globe,
  Settings,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

interface VoiceConfig {
  inputDevice: string;
  outputDevice: string;
  language: string;
  autoDetectLanguage: boolean;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  volume: number;
  playbackSpeed: number;
}

interface VoiceSettingsProps {
  /**
   * Current voice configuration
   */
  config: VoiceConfig;

  /**
   * Configuration change callback
   */
  onChange: (config: Partial<VoiceConfig>) => void;

  /**
   * Show advanced settings
   * @default false
   */
  showAdvanced?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export function VoiceSettings({
  config,
  onChange,
  showAdvanced = false,
  className,
}: VoiceSettingsProps) {
  const [devices, setDevices] = useState<{
    audioInput: MediaDeviceInfo[];
    audioOutput: MediaDeviceInfo[];
  }>({ audioInput: [], audioOutput: [] });

  // Fetch available devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        const deviceList = await navigator.mediaDevices.enumerateDevices();

        setDevices({
          audioInput: deviceList.filter((d) => d.kind === 'audioinput'),
          audioOutput: deviceList.filter((d) => d.kind === 'audiooutput'),
        });
      } catch (error) {
        console.error('Failed to enumerate devices:', error);
      }
    };

    getDevices();

    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', getDevices);

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', getDevices);
    };
  }, []);

  // Supported languages
  const languages = [
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'es-ES', name: 'Spanish' },
    { code: 'fr-FR', name: 'French' },
    { code: 'de-DE', name: 'German' },
    { code: 'ja-JP', name: 'Japanese' },
    { code: 'zh-CN', name: 'Chinese (Simplified)' },
  ];

  return (
    <div className={cn('glass-panel rounded-xl p-6 space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-neon-primary" />
        <h3 className="font-semibold">Voice Settings</h3>
      </div>

      {/* Input Device */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Mic className="h-4 w-4 text-muted-foreground" />
          Microphone
        </label>
        <select
          value={config.inputDevice}
          onChange={(e) => onChange({ inputDevice: e.target.value })}
          className="w-full px-3 py-2 glass-panel rounded-lg border-0 focus:ring-2 focus:ring-neon-primary"
        >
          <option value="">Default</option>
          {devices.audioInput.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
            </option>
          ))}
        </select>
      </div>

      {/* Output Device */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          Speaker
        </label>
        <select
          value={config.outputDevice}
          onChange={(e) => onChange({ outputDevice: e.target.value })}
          className="w-full px-3 py-2 glass-panel rounded-lg border-0 focus:ring-2 focus:ring-neon-primary"
        >
          <option value="">Default</option>
          {devices.audioOutput.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
            </option>
          ))}
        </select>
      </div>

      {/* Language */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Globe className="h-4 w-4 text-muted-foreground" />
          Language
        </label>
        <select
          value={config.language}
          onChange={(e) => onChange({ language: e.target.value })}
          disabled={config.autoDetectLanguage}
          className="w-full px-3 py-2 glass-panel rounded-lg border-0 focus:ring-2 focus:ring-neon-primary disabled:opacity-50"
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>

        {/* Auto-detect toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.autoDetectLanguage}
            onChange={(e) => onChange({ autoDetectLanguage: e.target.checked })}
            className="w-4 h-4 rounded border-glass-border bg-glass-bg text-neon-primary focus:ring-2 focus:ring-neon-primary"
          />
          <span className="text-sm text-muted-foreground">
            Auto-detect language
          </span>
        </label>
      </div>

      {/* Volume */}
      <div className="space-y-2">
        <label className="flex items-center justify-between text-sm font-medium">
          <span>Volume</span>
          <span className="text-muted-foreground">{config.volume}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={config.volume}
          onChange={(e) => onChange({ volume: parseInt(e.target.value) })}
          className="w-full accent-neon-primary"
        />
      </div>

      {/* Advanced Settings */}
      {showAdvanced && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-4 pt-4 border-t border-glass-border"
        >
          <h4 className="text-sm font-medium text-muted-foreground">
            Advanced Settings
          </h4>

          {/* Playback Speed */}
          <div className="space-y-2">
            <label className="flex items-center justify-between text-sm font-medium">
              <span>Playback Speed</span>
              <span className="text-muted-foreground">{config.playbackSpeed}x</span>
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={config.playbackSpeed}
              onChange={(e) => onChange({ playbackSpeed: parseFloat(e.target.value) })}
              className="w-full accent-neon-primary"
            />
          </div>

          {/* Noise Suppression */}
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm">Noise Suppression</span>
            <input
              type="checkbox"
              checked={config.noiseSuppression}
              onChange={(e) => onChange({ noiseSuppression: e.target.checked })}
              className="w-4 h-4 rounded border-glass-border bg-glass-bg text-neon-primary focus:ring-2 focus:ring-neon-primary"
            />
          </label>

          {/* Echo Cancellation */}
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm">Echo Cancellation</span>
            <input
              type="checkbox"
              checked={config.echoCancellation}
              onChange={(e) => onChange({ echoCancellation: e.target.checked })}
              className="w-4 h-4 rounded border-glass-border bg-glass-bg text-neon-primary focus:ring-2 focus:ring-neon-primary"
            />
          </label>
        </motion.div>
      )}

      {/* Test Button */}
      <Button
        variant="glass"
        className="w-full"
        onClick={() => {
          // TODO: Implement audio test
          console.log('Testing audio configuration...');
        }}
      >
        <Volume2 className="h-4 w-4 mr-2" />
        Test Audio
      </Button>
    </div>
  );
}

VoiceSettings.displayName = 'VoiceSettings';
```

### Usage Examples

```typescript
// Basic voice settings
const [voiceConfig, setVoiceConfig] = useState({
  inputDevice: '',
  outputDevice: '',
  language: 'en-US',
  autoDetectLanguage: false,
  noiseSuppression: true,
  echoCancellation: true,
  volume: 80,
  playbackSpeed: 1,
});

<VoiceSettings
  config={voiceConfig}
  onChange={(updates) => setVoiceConfig({ ...voiceConfig, ...updates })}
/>

// With advanced settings
<VoiceSettings
  config={voiceConfig}
  onChange={(updates) => setVoiceConfig({ ...voiceConfig, ...updates })}
  showAdvanced
/>
```

---

## Complete Voice Interface Example

```typescript
// apps/web/src/app/voice/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { VoiceButton } from '@/components/voice/VoiceButton';
import { AudioVisualizer } from '@/components/voice/AudioVisualizer';
import { TranscriptionDisplay } from '@/components/voice/TranscriptionDisplay';
import { VoiceSettings } from '@/components/voice/VoiceSettings';

export default function VoicePage() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [transcriptionSegments, setTranscriptionSegments] = useState([]);
  const [voiceConfig, setVoiceConfig] = useState({
    inputDevice: '',
    outputDevice: '',
    language: 'en-US',
    autoDetectLanguage: false,
    noiseSuppression: true,
    echoCancellation: true,
    volume: 80,
    playbackSpeed: 1,
  });

  const handleVoiceToggle = async (recording: boolean) => {
    if (recording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: voiceConfig.echoCancellation,
            noiseSuppression: voiceConfig.noiseSuppression,
          },
        });

        setAudioStream(stream);
        setIsRecording(true);

        // TODO: Start voice recognition
      } catch (error) {
        console.error('Failed to start recording:', error);
      }
    } else {
      audioStream?.getTracks().forEach((track) => track.stop());
      setAudioStream(null);
      setIsRecording(false);

      // TODO: Stop voice recognition
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Voice Interface</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voice Control */}
        <div className="space-y-6">
          <VoiceButton
            size="lg"
            status={isRecording ? 'recording' : 'idle'}
            onToggle={handleVoiceToggle}
          />

          <AudioVisualizer
            audioStream={audioStream || undefined}
            type="bars"
            barCount={32}
            colorScheme="neon"
            height={150}
          />
        </div>

        {/* Settings */}
        <VoiceSettings
          config={voiceConfig}
          onChange={(updates) => setVoiceConfig({ ...voiceConfig, ...updates })}
          showAdvanced
        />
      </div>

      {/* Transcription */}
      <div className="mt-6">
        <TranscriptionDisplay
          segments={transcriptionSegments}
          showInterim
          showConfidence
          editable
        />
      </div>
    </div>
  );
}
```

---

## Implementation Checklist

### Phase 1: Core Components
- [ ] Create `VoiceButton.tsx` with animations
- [ ] Create `AudioVisualizer.tsx` with frequency analysis
- [ ] Create `TranscriptionDisplay.tsx` with live updates
- [ ] Create `VoiceSettings.tsx` with device selection

### Phase 2: WebRTC Integration
- [ ] Integrate GPT-5.1 Realtime API
- [ ] Set up WebRTC connection
- [ ] Implement audio streaming
- [ ] Add voice activity detection

### Phase 3: Features
- [ ] Implement live transcription
- [ ] Add multi-language support
- [ ] Create audio device switching
- [ ] Add noise suppression controls

### Phase 4: Testing
- [ ] Write unit tests for all components
- [ ] Test with different microphones
- [ ] Verify browser compatibility
- [ ] Test accessibility features

---

## Design Decisions & Rationale

### Real-Time Feedback
Visual feedback (animations, waveforms, transcription) provides confirmation that voice input is being processed.

### Device Flexibility
Users can select specific audio devices for scenarios like using external microphones or speakers.

### Confidence Indicators
Transcription confidence helps users identify when corrections may be needed.

### Accessibility
Keyboard shortcuts (Space for push-to-talk) and visual indicators ensure voice features are accessible.

---

**All 5 Component Categories Complete!**

Total components designed: **24 components** across:
1. ✅ RxDB Integration (4 components)
2. ✅ Authentication (4 components)
3. ✅ Dashboard Widgets (5 components)
4. ✅ Chat Interface (5 components)
5. ✅ Voice Interface (4 components)

Next steps: Implementation following the phased approach in each specification document.

---

**End of Voice Interface Enhancements Design Specification**
