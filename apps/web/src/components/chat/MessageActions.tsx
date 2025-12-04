'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy,
  Check,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

interface MessageActionsProps {
  /**
   * Message ID
   */
  messageId: string;

  /**
   * Show actions
   */
  visible: boolean;

  /**
   * Copy button callback
   */
  onCopy: () => void;

  /**
   * Is copied state
   */
  isCopied: boolean;

  /**
   * Regenerate button callback
   */
  onRegenerate?: () => void;

  /**
   * Thumbs up callback
   */
  onThumbsUp?: () => void;

  /**
   * Thumbs down callback
   */
  onThumbsDown?: () => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Message Actions Component
 *
 * Action buttons for chat messages (copy, regenerate, thumbs up/down feedback).
 *
 * Features:
 * - Copy message content
 * - Regenerate response
 * - Thumbs up/down feedback
 * - Animated appearance
 *
 * @example
 * ```tsx
 * <MessageActions
 *   messageId="msg-123"
 *   visible={showActions}
 *   onCopy={handleCopy}
 *   isCopied={isCopied}
 *   onRegenerate={handleRegenerate}
 *   onThumbsUp={handleThumbsUp}
 *   onThumbsDown={handleThumbsDown}
 * />
 * ```
 */
export function MessageActions({
  messageId,
  visible,
  onCopy,
  isCopied,
  onRegenerate,
  onThumbsUp,
  onThumbsDown,
  className,
}: MessageActionsProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className={cn('flex items-center gap-1 mt-2', className)}
        >
          {/* Copy */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onCopy}
            title="Copy message"
          >
            {isCopied ? (
              <Check className="h-4 w-4 text-neon-accent" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>

          {/* Regenerate */}
          {onRegenerate && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onRegenerate}
              title="Regenerate response"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}

          {/* Thumbs Up */}
          {onThumbsUp && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onThumbsUp}
              title="Good response"
            >
              <ThumbsUp className="h-4 w-4" />
            </Button>
          )}

          {/* Thumbs Down */}
          {onThumbsDown && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onThumbsDown}
              title="Bad response"
            >
              <ThumbsDown className="h-4 w-4" />
            </Button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

MessageActions.displayName = 'MessageActions';
