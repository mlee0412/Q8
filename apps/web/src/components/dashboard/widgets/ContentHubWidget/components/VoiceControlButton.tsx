'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useVoiceControl } from '../hooks/useVoiceControl';
import type { ContentMode } from '@/types/contenthub';

interface VoiceControlButtonProps {
  onSearch?: (query: string) => void;
  onModeChange?: (mode: ContentMode) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function VoiceControlButton({
  onSearch,
  onModeChange,
  className,
  size = 'md',
}: VoiceControlButtonProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  
  const {
    isListening,
    isSupported,
    transcript,
    lastCommand,
    toggleListening,
  } = useVoiceControl({
    onSearch,
    onModeChange,
    onError: (error) => {
      console.error('Voice control error:', error);
    },
  });

  // Show feedback when there's a command result
  useEffect(() => {
    if (lastCommand) {
      setShowFeedback(true);
      const timer = setTimeout(() => setShowFeedback(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastCommand]);

  if (!isSupported) {
    return null;
  }

  const sizeClasses = {
    sm: 'h-7 w-7',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  };

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <div className={cn('relative', className)}>
      {/* Voice button */}
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            sizeClasses[size],
            'relative overflow-hidden transition-all',
            isListening
              ? 'text-neon-primary bg-neon-primary/20'
              : 'text-text-muted hover:text-foreground'
          )}
          onClick={toggleListening}
          title={isListening ? 'Stop listening' : 'Voice command'}
        >
          {/* Animated rings when listening */}
          <AnimatePresence>
            {isListening && (
              <>
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-neon-primary"
                  initial={{ scale: 1, opacity: 0.8 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-neon-primary"
                  initial={{ scale: 1, opacity: 0.8 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                />
              </>
            )}
          </AnimatePresence>

          {isListening ? (
            <MicOff className={cn(iconSizes[size], 'relative z-10')} />
          ) : (
            <Mic className={cn(iconSizes[size], 'relative z-10')} />
          )}
        </Button>
      </motion.div>

      {/* Listening overlay/modal */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className={cn(
              'absolute top-full right-0 mt-2 z-50 w-64',
              'bg-surface-primary/95 backdrop-blur-xl',
              'border border-border-subtle rounded-xl shadow-2xl',
              'p-4'
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <motion.div
                  className="w-3 h-3 rounded-full bg-neon-primary"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span className="text-xs font-medium text-neon-primary">Listening...</span>
              </div>
              <button
                onClick={toggleListening}
                className="p-1 rounded hover:bg-white/10 text-text-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Voice visualization */}
            <div className="flex items-center justify-center gap-1 h-8 mb-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-neon-primary rounded-full"
                  animate={{
                    height: ['8px', `${12 + Math.random() * 16}px`, '8px'],
                  }}
                  transition={{
                    duration: 0.4 + Math.random() * 0.3,
                    repeat: Infinity,
                    delay: i * 0.1,
                  }}
                />
              ))}
            </div>

            {/* Transcript */}
            <div className="min-h-[24px] mb-3">
              {transcript ? (
                <p className="text-sm text-white">&quot;{transcript}&quot;</p>
              ) : (
                <p className="text-xs text-text-muted">Say a command...</p>
              )}
            </div>

            {/* Command suggestions */}
            <div className="space-y-1 border-t border-border-subtle pt-3">
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">
                Try saying:
              </p>
              <div className="flex flex-wrap gap-1">
                {['Play', 'Pause', 'Next', 'Focus mode', 'Search...'].map((cmd) => (
                  <span
                    key={cmd}
                    className="px-2 py-0.5 text-[10px] bg-white/5 rounded-full text-text-muted"
                  >
                    {cmd}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback toast */}
      <AnimatePresence>
        {showFeedback && lastCommand && !isListening && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className={cn(
              'absolute top-full right-0 mt-2 z-50',
              'bg-neon-primary/90 backdrop-blur-sm',
              'px-3 py-1.5 rounded-lg shadow-lg',
              'text-xs text-white font-medium whitespace-nowrap'
            )}
          >
            {lastCommand}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default VoiceControlButton;
