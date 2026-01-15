'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Input variant
   */
  variant?: 'default' | 'ghost';
}

/**
 * Input component using Q8 Design System v2.0
 *
 * Features:
 * - Solid matte background with clear focus ring
 * - Proper contrast for placeholder text
 * - A11y-compliant focus states
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = 'default', ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles
          'flex h-10 w-full rounded-md px-3 py-2 text-sm text-text-primary',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-text-muted',
          // Focus states
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-primary/50 focus-visible:border-neon-primary',
          // Disabled state
          'disabled:cursor-not-allowed disabled:opacity-50',
          // Transition
          'transition-all duration-150',
          // Variant styles
          variant === 'default' && 'bg-surface-2 border border-border-subtle hover:border-border-strong',
          variant === 'ghost' && 'bg-transparent border border-transparent hover:bg-surface-4',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
