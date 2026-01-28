'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Loader2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AskQ8ButtonProps {
  /**
   * Context to send to Q8 (will be included in the prompt)
   */
  context: Record<string, unknown>;

  /**
   * Pre-filled prompt suggestion
   */
  prompt?: string;

  /**
   * Label for the button
   */
  label?: string;

  /**
   * Callback when Q8 should be asked
   * Returns the full message to send to the chat
   */
  onAsk: (message: string) => void;

  /**
   * Whether the request is currently being processed
   */
  isLoading?: boolean;

  /**
   * Button size variant
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Disabled state
   */
  disabled?: boolean;
}

/**
 * AskQ8Button Component
 *
 * A button that widgets can use to send context-aware questions to Q8
 * Provides a consistent way for users to ask Q8 about widget data
 */
export function AskQ8Button({
  context,
  prompt = 'Help me with this',
  label = 'Ask Q8',
  onAsk,
  isLoading = false,
  size = 'sm',
  className,
  disabled = false,
}: AskQ8ButtonProps) {
  const [showPromptInput, setShowPromptInput] = useState(false);
  const [customPrompt, setCustomPrompt] = useState(prompt);

  const sizeClasses = {
    sm: 'text-xs px-2 py-1 gap-1',
    md: 'text-sm px-3 py-1.5 gap-1.5',
    lg: 'text-base px-4 py-2 gap-2',
  };

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const handleAsk = () => {
    // Build the message with context
    const contextString = Object.entries(context)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join('\n');

    const message = `${customPrompt}\n\nContext:\n${contextString}`;
    onAsk(message);
    setShowPromptInput(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowPromptInput(!showPromptInput)}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center rounded-lg',
          'bg-neon-primary/10 hover:bg-neon-primary/20',
          'text-neon-primary border border-neon-primary/20',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-neon-primary/50',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          sizeClasses[size],
          className
        )}
      >
        {isLoading ? (
          <Loader2 className={cn('animate-spin', iconSizeClasses[size])} />
        ) : (
          <Bot className={iconSizeClasses[size]} />
        )}
        <span className="font-medium">{label}</span>
      </button>

      {/* Prompt input dropdown */}
      <AnimatePresence>
        {showPromptInput && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute z-50 top-full mt-2 right-0',
              'w-72 p-3 rounded-lg',
              'bg-surface-3 border border-border-subtle shadow-lg'
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-text-muted" />
              <span className="text-sm font-medium text-text-primary">
                Ask Q8
              </span>
            </div>

            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="What would you like to know?"
              className={cn(
                'w-full p-2 rounded-md text-sm',
                'bg-surface-2 border border-border-subtle',
                'text-text-primary placeholder:text-text-muted',
                'focus:outline-none focus:ring-2 focus:ring-neon-primary/50',
                'resize-none'
              )}
              rows={3}
              autoFocus
            />

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setShowPromptInput(false)}
                className="px-3 py-1 text-xs text-text-muted hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAsk}
                disabled={!customPrompt.trim()}
                className={cn(
                  'px-3 py-1 text-xs rounded',
                  'bg-neon-primary text-white',
                  'hover:bg-neon-primary/90',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-colors'
                )}
              >
                Send
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

AskQ8Button.displayName = 'AskQ8Button';
