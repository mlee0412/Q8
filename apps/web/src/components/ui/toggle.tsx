'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'default';
  className?: string;
  'aria-label'?: string;
}

/**
 * Toggle (Switch) Component
 *
 * A11y compliant toggle switch with 40x24 hit area (default) or 32x20 (sm).
 * Uses neon accent color when active.
 */
export function Toggle({
  checked,
  onChange,
  disabled = false,
  size = 'default',
  className,
  'aria-label': ariaLabel,
}: ToggleProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!disabled) {
        onChange(!checked);
      }
    }
  };

  const sizes = {
    default: {
      track: 'w-11 h-6', // 44x24
      thumb: 'h-5 w-5',  // 20x20
      translate: checked ? 'translate-x-5' : 'translate-x-0.5',
    },
    sm: {
      track: 'w-8 h-5',  // 32x20
      thumb: 'h-4 w-4',  // 16x16
      translate: checked ? 'translate-x-3.5' : 'translate-x-0.5',
    },
  };

  const currentSize = sizes[size];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative inline-flex shrink-0 cursor-pointer items-center rounded-full',
        'border border-border-subtle transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-primary/50',
        checked ? 'bg-neon-primary border-neon-primary' : 'bg-surface-3',
        disabled && 'cursor-not-allowed opacity-50',
        currentSize.track,
        className
      )}
    >
      <span
        className={cn(
          'inline-block rounded-full bg-white shadow-sm transition-transform duration-200',
          currentSize.thumb,
          currentSize.translate
        )}
      />
    </button>
  );
}

Toggle.displayName = 'Toggle';
