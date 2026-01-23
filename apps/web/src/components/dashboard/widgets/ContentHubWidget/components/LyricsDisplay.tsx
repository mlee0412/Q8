'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Maximize2, Minimize2, Music2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

interface LyricLine {
  time: number; // Start time in ms
  text: string;
  endTime?: number;
}

interface LyricsDisplayProps {
  trackId?: string;
  trackTitle?: string;
  trackArtist?: string;
  progress: number; // Current playback position in ms
  isPlaying: boolean;
  onClose?: () => void;
  className?: string;
  variant?: 'inline' | 'fullscreen' | 'overlay';
}

export function LyricsDisplay({
  trackId,
  trackTitle,
  trackArtist,
  progress,
  isPlaying,
  onClose,
  className,
  variant = 'inline',
}: LyricsDisplayProps) {
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(variant === 'fullscreen');
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch lyrics when track changes
  useEffect(() => {
    if (!trackTitle || !trackArtist) {
      setLyrics([]);
      return;
    }

    const fetchLyrics = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/contenthub/lyrics?title=${encodeURIComponent(trackTitle)}&artist=${encodeURIComponent(trackArtist)}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            setError('Lyrics not found for this track');
            setLyrics([]);
            return;
          }
          throw new Error('Failed to fetch lyrics');
        }

        const data = await response.json();
        
        if (data.syncedLyrics) {
          // Parse synced lyrics (LRC format)
          const parsed = parseLRC(data.syncedLyrics);
          setLyrics(parsed);
        } else if (data.plainLyrics) {
          // Convert plain lyrics to simple format
          const lines = data.plainLyrics.split('\n').map((text: string, i: number) => ({
            time: i * 3000, // Estimate 3 seconds per line
            text: text.trim(),
          })).filter((l: LyricLine) => l.text);
          setLyrics(lines);
        } else {
          setError('No lyrics available');
          setLyrics([]);
        }
      } catch (err) {
        logger.error('Lyrics fetch error', { trackTitle, trackArtist, error: err });
        setError('Failed to load lyrics');
        setLyrics([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLyrics();
  }, [trackId, trackTitle, trackArtist]);

  // Update current line based on progress
  useEffect(() => {
    if (lyrics.length === 0) return;

    const currentIndex = lyrics.findIndex((line, i) => {
      const nextLine = lyrics[i + 1];
      return progress >= line.time && (!nextLine || progress < nextLine.time);
    });

    if (currentIndex !== -1 && currentIndex !== currentLineIndex) {
      setCurrentLineIndex(currentIndex);
    }
  }, [progress, lyrics, currentLineIndex]);

  // Auto-scroll to current line
  useEffect(() => {
    if (containerRef.current && lyrics.length > 0) {
      const container = containerRef.current;
      const currentLine = container.querySelector(`[data-line-index="${currentLineIndex}"]`);
      
      if (currentLine) {
        currentLine.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [currentLineIndex, lyrics.length]);

  if (isFullscreen) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl"
      >
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(false)}
            className="text-white/70 hover:text-white"
          >
            <Minimize2 className="h-5 w-5" />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white/70 hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        <div className="h-full flex flex-col items-center justify-center p-8">
          {/* Track info */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-1">{trackTitle}</h2>
            <p className="text-lg text-white/60">{trackArtist}</p>
          </div>

          {/* Lyrics */}
          <LyricsContent
            ref={containerRef}
            lyrics={lyrics}
            currentLineIndex={currentLineIndex}
            isLoading={isLoading}
            error={error}
            className="max-w-2xl text-center"
            variant="fullscreen"
          />
        </div>
      </motion.div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Music2 className="h-3.5 w-3.5" />
          <span>Lyrics</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-text-muted hover:text-white"
            onClick={() => setIsFullscreen(true)}
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-text-muted hover:text-white"
              onClick={onClose}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Lyrics content */}
      <LyricsContent
        ref={containerRef}
        lyrics={lyrics}
        currentLineIndex={currentLineIndex}
        isLoading={isLoading}
        error={error}
        className="max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10"
        variant="inline"
      />
    </div>
  );
}

// Separated content component for reuse
interface LyricsContentProps {
  lyrics: LyricLine[];
  currentLineIndex: number;
  isLoading: boolean;
  error: string | null;
  className?: string;
  variant: 'inline' | 'fullscreen';
}

const LyricsContent = ({ 
  lyrics, 
  currentLineIndex, 
  isLoading, 
  error, 
  className,
  variant,
  ...props
}: LyricsContentProps & { ref?: React.Ref<HTMLDivElement> }) => {
  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <Loader2 className="h-6 w-6 text-neon-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('text-center py-8', className)}>
        <p className="text-sm text-text-muted">{error}</p>
      </div>
    );
  }

  if (lyrics.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <Music2 className="h-8 w-8 text-text-muted mx-auto mb-2 opacity-50" />
        <p className="text-sm text-text-muted">No lyrics available</p>
      </div>
    );
  }

  const textSizes = {
    inline: {
      current: 'text-sm',
      other: 'text-xs',
    },
    fullscreen: {
      current: 'text-3xl',
      other: 'text-xl',
    },
  };

  return (
    <div className={cn('space-y-2', className)} {...props}>
      {lyrics.map((line, index) => {
        const isCurrent = index === currentLineIndex;
        const isPast = index < currentLineIndex;

        return (
          <motion.p
            key={`${line.time}-${index}`}
            data-line-index={index}
            initial={{ opacity: 0.3 }}
            animate={{
              opacity: isCurrent ? 1 : isPast ? 0.4 : 0.6,
              scale: isCurrent ? 1.02 : 1,
            }}
            transition={{ duration: 0.3 }}
            className={cn(
              'transition-all duration-300',
              isCurrent
                ? cn(textSizes[variant].current, 'font-semibold text-white')
                : cn(textSizes[variant].other, 'text-white/50')
            )}
          >
            {line.text || '♪'}
          </motion.p>
        );
      })}
    </div>
  );
};

// Parse LRC format lyrics
function parseLRC(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/g;
  let match;

  while ((match = regex.exec(lrc)) !== null) {
    const minutesStr = match[1];
    const secondsStr = match[2];
    const msStr = match[3];
    const textStr = match[4];
    
    if (minutesStr && secondsStr && msStr) {
      const minutes = parseInt(minutesStr, 10);
      const seconds = parseInt(secondsStr, 10);
      const ms = parseInt(msStr.padEnd(3, '0'), 10);
      const time = minutes * 60 * 1000 + seconds * 1000 + ms;
      const text = textStr?.trim() || '';

      lines.push({ time, text });
    }
  }

  return lines.sort((a, b) => a.time - b.time);
}

export default LyricsDisplay;
