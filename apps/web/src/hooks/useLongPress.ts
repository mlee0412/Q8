/**
 * useLongPress Hook
 * Detects long press gestures with support for both mouse and touch events
 */

import { useCallback, useRef } from 'react';

export interface UseLongPressOptions {
  threshold?: number;
}

export interface UseLongPressHandlers {
  onMouseDown: () => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchCancel: () => void;
}

export function useLongPress(
  onLongPress: () => void,
  onClick?: () => void,
  options: UseLongPressOptions = {}
): UseLongPressHandlers {
  const { threshold = 500 } = options;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const touchStarted = useRef(false);

  const start = useCallback(() => {
    isLongPressRef.current = false;
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onLongPress();
    }, threshold);
  }, [onLongPress, threshold]);

  const clear = useCallback((shouldTriggerClick = true) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (shouldTriggerClick && !isLongPressRef.current && onClick) {
      onClick();
    }
  }, [onClick]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStarted.current = true;
    start();
  }, [start]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStarted.current) {
      e.preventDefault(); // Prevent ghost click
      touchStarted.current = false;
      clear(true);
    }
  }, [clear]);

  const handleTouchCancel = useCallback(() => {
    touchStarted.current = false;
    clear(false);
  }, [clear]);

  return {
    onMouseDown: start,
    onMouseUp: () => clear(true),
    onMouseLeave: () => clear(false),
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchCancel,
  };
}
