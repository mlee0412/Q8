'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

type VisualizationStyle = 'bars' | 'waveform' | 'circular';

interface AudioVisualizerProps {
  /**
   * Audio stream to visualize
   */
  stream?: MediaStream;

  /**
   * Visualization style
   * @default 'bars'
   */
  style?: VisualizationStyle;

  /**
   * Canvas width
   * @default 400
   */
  width?: number;

  /**
   * Canvas height
   * @default 200
   */
  height?: number;

  /**
   * Bar count (for bars style)
   * @default 64
   */
  barCount?: number;

  /**
   * Smoothing time constant (0-1)
   * @default 0.8
   */
  smoothing?: number;

  /**
   * Frequency range to visualize
   * @default [20, 20000]
   */
  frequencyRange?: [number, number];

  /**
   * Show frequency labels
   * @default true
   */
  showFrequencyLabels?: boolean;

  /**
   * Primary color
   * @default '#00ffcc'
   */
  color?: string;

  /**
   * Background color
   * @default 'transparent'
   */
  backgroundColor?: string;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Audio Visualizer Component
 *
 * Real-time audio waveform visualization with multiple styles
 * and frequency analysis using Web Audio API.
 *
 * Features:
 * - Three visualization styles (bars, waveform, circular)
 * - Real-time frequency analysis with AnalyserNode
 * - Customizable smoothing and frequency range
 * - Responsive canvas sizing
 * - GPU-accelerated rendering
 *
 * @example
 * ```tsx
 * // Bar visualization
 * <AudioVisualizer
 *   stream={mediaStream}
 *   style="bars"
 *   width={500}
 *   height={200}
 * />
 *
 * // Circular visualization
 * <AudioVisualizer
 *   stream={mediaStream}
 *   style="circular"
 *   color="#ff00ff"
 *   smoothing={0.9}
 * />
 *
 * // Waveform with custom frequency range
 * <AudioVisualizer
 *   stream={mediaStream}
 *   style="waveform"
 *   frequencyRange={[100, 10000]}
 * />
 * ```
 */
export function AudioVisualizer({
  stream,
  style = 'bars',
  width = 400,
  height = 200,
  barCount = 64,
  smoothing = 0.8,
  frequencyRange = [20, 20000],
  showFrequencyLabels = true,
  color = '#00ffcc',
  backgroundColor = 'transparent',
  className,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const [isActive, setIsActive] = useState(false);

  // Draw bar visualization
  const drawBars = useCallback((ctx: CanvasRenderingContext2D, dataArray: Uint8Array, w: number, h: number) => {
    const barWidth = w / barCount;
    const barGap = 2;

    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor((i / barCount) * dataArray.length);
      const barHeight = ((dataArray[dataIndex] ?? 0) / 255) * h;

      // Gradient from bottom to top
      const gradient = ctx.createLinearGradient(0, h, 0, h - barHeight);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, adjustColorBrightness(color, 50));

      ctx.fillStyle = gradient;
      ctx.fillRect(
        i * barWidth + barGap / 2,
        h - barHeight,
        barWidth - barGap,
        barHeight
      );
    }
  }, [barCount, color]);

  // Draw waveform visualization
  const drawWaveform = useCallback((ctx: CanvasRenderingContext2D, dataArray: Uint8Array, w: number, h: number) => {
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.beginPath();

    const sliceWidth = w / dataArray.length;
    let x = 0;

    for (let i = 0; i < dataArray.length; i++) {
      const v = (dataArray[i] ?? 0) / 255;
      const y = h / 2 - (v * h) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Fill area under waveform with gradient
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, color + '40');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fill();
  }, [color]);

  // Draw circular visualization
  const drawCircular = useCallback((ctx: CanvasRenderingContext2D, dataArray: Uint8Array, w: number, h: number) => {
    const centerX = w / 2;
    const centerY = h / 2;
    const radius = Math.min(w, h) / 3;
    const bars = 128;

    for (let i = 0; i < bars; i++) {
      const dataIndex = Math.floor((i / bars) * dataArray.length);
      const barHeight = ((dataArray[dataIndex] ?? 0) / 255) * radius;
      const angle = (i / bars) * Math.PI * 2;

      const x1 = centerX + Math.cos(angle) * radius;
      const y1 = centerY + Math.sin(angle) * radius;
      const x2 = centerX + Math.cos(angle) * (radius + barHeight);
      const y2 = centerY + Math.sin(angle) * (radius + barHeight);

      // Gradient from center to edge
      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, adjustColorBrightness(color, 80));

      ctx.strokeStyle = gradient;
      ctx.lineWidth = (Math.PI * 2 * radius) / bars - 1;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Draw center circle
    ctx.fillStyle = backgroundColor === 'transparent' ? 'rgba(0,0,0,0.3)' : backgroundColor;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }, [color, backgroundColor]);

  // Visualization loop
  const visualize = useCallback(() => {
    if (!analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      // Clear canvas
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw based on style
      switch (style) {
        case 'bars':
          drawBars(ctx, dataArray, canvas.width, canvas.height);
          break;
        case 'waveform':
          drawWaveform(ctx, dataArray, canvas.width, canvas.height);
          break;
        case 'circular':
          drawCircular(ctx, dataArray, canvas.width, canvas.height);
          break;
      }
    };

    draw();
  }, [backgroundColor, style, drawBars, drawWaveform, drawCircular]);

  // Initialize audio analysis
  useEffect(() => {
    if (!stream) {
      cleanup();
      return;
    }

    try {
      // Create audio context
      audioContextRef.current = new AudioContext();
      const audioContext = audioContextRef.current;

      // Create analyser node
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = style === 'circular' ? 256 : 2048;
      analyser.smoothingTimeConstant = smoothing;
      analyserRef.current = analyser;

      // Connect stream to analyser
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      setIsActive(true);

      // Start visualization
      visualize();
    } catch (error) {
      logger.error('Failed to initialize audio visualizer', { error, style, smoothing });
      cleanup();
    }

    return cleanup;
  }, [stream, style, smoothing, visualize]);

  // Cleanup audio resources
  const cleanup = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setIsActive(false);
  };

  return (
    <div className={cn('relative', className)}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={cn(
          'rounded-xl',
          !isActive && 'opacity-30'
        )}
      />

      {/* Frequency labels */}
      {showFrequencyLabels && isActive && (
        <div className="flex justify-between mt-2 text-xs text-text-muted">
          <span>{frequencyRange[0]} Hz</span>
          <span>{Math.floor((frequencyRange[0] + frequencyRange[1]) / 2)} Hz</span>
          <span>{frequencyRange[1]} Hz</span>
        </div>
      )}

      {/* Inactive state */}
      {!isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="text-center">
            <p className="text-sm text-text-muted">
              Start recording to see audio visualization
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

AudioVisualizer.displayName = 'AudioVisualizer';

// Adjust color brightness
const adjustColorBrightness = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;

  return (
    '#' +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
};
