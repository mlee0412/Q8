'use client';

import { Sparkles } from 'lucide-react';
import { Button } from '../ui/button';

interface AIButtonProps {
  context?: Record<string, unknown>;
  prompt?: string;
  onClick?: () => void;
}

export function AIButton({ context, prompt, onClick }: AIButtonProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (prompt) {
      // TODO: Send message to agent with context
      console.log('AI Button clicked:', { prompt, context });
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className="relative group"
      aria-label="AI Assistant"
    >
      <Sparkles className="h-4 w-4 text-neon-primary animate-pulse-slow group-hover:text-neon-accent transition-colors" />
    </Button>
  );
}
