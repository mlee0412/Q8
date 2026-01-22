'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AudioLevelIndicatorProps {
  audioLevel: number;
  isRecording?: boolean;
  isSpeaking?: boolean;
  className?: string;
}

export function AudioLevelIndicator({
  audioLevel,
  isRecording = false,
  isSpeaking = false,
  className,
}: AudioLevelIndicatorProps) {
  const normalizedLevel = Math.min(1, Math.max(0, audioLevel));
  const barCount = 20;

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-1 h-full w-full px-4',
        className
      )}
    >
      {Array.from({ length: barCount }).map((_, i) => {
        const threshold = i / barCount;
        const isActive = normalizedLevel > threshold;
        const baseHeight = 8 + (i / barCount) * 24;

        return (
          <motion.div
            key={i}
            className={cn(
              'w-1.5 rounded-full transition-colors',
              isActive
                ? isRecording
                  ? 'bg-red-400'
                  : isSpeaking
                    ? 'bg-green-400'
                    : 'bg-neon-primary'
                : 'bg-surface-3'
            )}
            animate={{
              height: isActive ? baseHeight : 4,
              opacity: isActive ? 1 : 0.3,
            }}
            transition={{ duration: 0.05 }}
          />
        );
      })}

      {/* Status text */}
      <div className="ml-4 text-xs text-text-muted min-w-[80px]">
        {isRecording && <span className="text-red-400">Recording</span>}
        {isSpeaking && <span className="text-green-400">Speaking</span>}
        {!isRecording && !isSpeaking && <span>Ready</span>}
      </div>
    </div>
  );
}

AudioLevelIndicator.displayName = 'AudioLevelIndicator';
