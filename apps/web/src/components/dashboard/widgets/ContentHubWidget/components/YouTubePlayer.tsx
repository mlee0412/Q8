'use client';

import { useEffect, useId, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useYouTubePlayer } from '@/hooks/useYouTubePlayer';
import { Loader2 } from 'lucide-react';

interface YouTubePlayerProps {
  videoId: string;
  className?: string;
  autoplay?: boolean;
  onStateChange?: (state: number) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onReady?: () => void;
  onError?: (error: number) => void;
}

export function YouTubePlayer({
  videoId,
  className,
  autoplay = false,
  onStateChange,
  onTimeUpdate,
  onReady,
  onError,
}: YouTubePlayerProps) {
  const playerId = useId().replace(/:/g, '-');
  const containerId = `yt-player${playerId}`;

  const handleReady = useCallback(() => {
    onReady?.();
  }, [onReady]);

  const handleStateChange = useCallback(
    (state: number) => {
      onStateChange?.(state);
    },
    [onStateChange]
  );

  const handleTimeUpdate = useCallback(
    (currentTime: number, duration: number) => {
      onTimeUpdate?.(currentTime, duration);
    },
    [onTimeUpdate]
  );

  const handleError = useCallback(
    (error: number) => {
      onError?.(error);
    },
    [onError]
  );

  const { isReady } = useYouTubePlayer(containerId, {
    videoId,
    autoplay,
    controls: true,
    onReady: handleReady,
    onStateChange: handleStateChange,
    onTimeUpdate: handleTimeUpdate,
    onError: handleError,
  });

  return (
    <div
      className={cn(
        'relative w-full aspect-video rounded-lg overflow-hidden bg-black',
        className
      )}
    >
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <Loader2 className="h-8 w-8 text-white animate-spin" />
        </div>
      )}
      <div id={containerId} className="absolute inset-0 w-full h-full" />
    </div>
  );
}

export default YouTubePlayer;
