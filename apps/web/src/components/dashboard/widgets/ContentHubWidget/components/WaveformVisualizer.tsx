'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface WaveformVisualizerProps {
  isPlaying: boolean;
  color?: string;
  barCount?: number;
  className?: string;
  variant?: 'bars' | 'wave' | 'circle';
}

export function WaveformVisualizer({
  isPlaying,
  color = 'rgb(var(--neon-primary))',
  barCount = 32,
  className,
  variant = 'bars',
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [heights, setHeights] = useState<number[]>(() =>
    Array.from({ length: barCount }, () => Math.random() * 0.5 + 0.1)
  );

  // Simple animated visualization (no audio analysis - works without Web Audio API)
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const animate = () => {
      setHeights((prev) =>
        prev.map((h) => {
          const target = Math.random() * 0.8 + 0.2;
          return h + (target - h) * 0.15;
        })
      );
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  if (variant === 'bars') {
    return (
      <div className={cn('flex items-end justify-center gap-[2px] h-8', className)}>
        {heights.map((height, i) => (
          <motion.div
            key={i}
            className="w-1 rounded-full"
            style={{
              backgroundColor: color,
              opacity: isPlaying ? 0.8 : 0.3,
            }}
            animate={{
              height: isPlaying ? `${height * 100}%` : '20%',
            }}
            transition={{
              duration: 0.1,
              ease: 'easeOut',
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'wave') {
    return (
      <svg
        className={cn('w-full h-8', className)}
        viewBox={`0 0 ${barCount * 4} 32`}
        preserveAspectRatio="none"
      >
        <motion.path
          d={`M 0 16 ${heights
            .map((h, i) => `Q ${i * 4 + 2} ${16 - h * 14}, ${i * 4 + 4} 16`)
            .join(' ')}`}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          style={{ opacity: isPlaying ? 0.8 : 0.3 }}
        />
      </svg>
    );
  }

  if (variant === 'circle') {
    const centerX = 50;
    const centerY = 50;
    const baseRadius = 30;

    return (
      <svg className={cn('w-16 h-16', className)} viewBox="0 0 100 100">
        {heights.slice(0, 16).map((height, i) => {
          const angle = (i / 16) * Math.PI * 2 - Math.PI / 2;
          const innerRadius = baseRadius;
          const outerRadius = baseRadius + height * 15;

          const x1 = centerX + Math.cos(angle) * innerRadius;
          const y1 = centerY + Math.sin(angle) * innerRadius;
          const x2 = centerX + Math.cos(angle) * outerRadius;
          const y2 = centerY + Math.sin(angle) * outerRadius;

          return (
            <motion.line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
              style={{ opacity: isPlaying ? 0.8 : 0.3 }}
              animate={{
                x2: centerX + Math.cos(angle) * (isPlaying ? outerRadius : innerRadius + 5),
                y2: centerY + Math.sin(angle) * (isPlaying ? outerRadius : innerRadius + 5),
              }}
              transition={{ duration: 0.1 }}
            />
          );
        })}
        <circle
          cx={centerX}
          cy={centerY}
          r={baseRadius - 5}
          fill="none"
          stroke={color}
          strokeWidth="1"
          opacity={0.3}
        />
      </svg>
    );
  }

  return null;
}

// Mini version for compact displays
export function MiniWaveform({
  isPlaying,
  className,
}: {
  isPlaying: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="w-0.5 bg-neon-primary rounded-full"
          animate={
            isPlaying
              ? {
                  height: ['4px', '12px', '4px'],
                }
              : { height: '4px' }
          }
          transition={{
            duration: 0.5,
            repeat: isPlaying ? Infinity : 0,
            delay: i * 0.1,
          }}
        />
      ))}
    </div>
  );
}

export default WaveformVisualizer;
