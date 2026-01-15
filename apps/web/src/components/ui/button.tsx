import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Button variants using Q8 Design System v2.0
 *
 * Variants:
 * - solid: Primary action button (neon accent)
 * - ghost: Secondary action, transparent background
 * - subtle: Tertiary action, subtle background with border
 * - neon: High-emphasis neon glow effect
 * - danger: Destructive action (red accent)
 *
 * Sizes:
 * - default: Standard button (h-9)
 * - sm: Compact button (h-8)
 * - lg: Large button (h-10)
 * - icon: Square icon button (40x40 A11y hit area)
 * - icon-sm: Compact icon button (28x28)
 */
const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-primary/50 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // Solid - primary action
        solid: 'bg-neon-primary text-white rounded-md hover:brightness-110 active:brightness-95',

        // Ghost - secondary, transparent
        ghost: 'bg-transparent text-text-secondary rounded-md hover:bg-surface-4 hover:text-text-primary',

        // Subtle - tertiary, subtle background
        subtle: 'bg-surface-3 text-text-primary border border-border-subtle rounded-md hover:border-border-strong hover:bg-surface-4',

        // Neon - high-emphasis with glow
        neon: 'bg-neon-primary text-white rounded-md shadow-neon hover:shadow-[0_0_30px_oklch(65%_0.2_260_/_0.6)] active:brightness-95',

        // Danger - destructive
        danger: 'bg-danger text-white rounded-md hover:brightness-110 active:brightness-95',

        // Glass - legacy support
        glass: 'glass-panel text-white hover:bg-surface-4',

        // Default - legacy fallback
        default: 'bg-surface-3 text-text-primary shadow-1 hover:bg-surface-4',
      },
      size: {
        default: 'h-9 px-4 py-2 text-sm',
        sm: 'h-8 px-3 text-xs rounded-md',
        lg: 'h-10 px-6 text-sm rounded-lg',
        // Icon buttons with A11y-compliant hit areas
        icon: 'h-10 w-10 rounded-md', // 40x40 minimum
        'icon-sm': 'h-7 w-7 rounded-sm text-xs', // 28x28 for tight spaces
      },
    },
    defaultVariants: {
      variant: 'solid',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
