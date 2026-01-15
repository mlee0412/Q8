'use client';

import { useOptimistic, useTransition, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OptimisticActionProps<T> {
  /**
   * Current data state
   */
  data: T;

  /**
   * Optimistic update function (applied immediately)
   */
  optimisticUpdate: (current: T) => T;

  /**
   * Server action to execute (async)
   */
  serverAction: (data: T) => Promise<T>;

  /**
   * Success callback
   */
  onSuccess?: (result: T) => void;

  /**
   * Error callback
   */
  onError?: (error: Error) => void;

  /**
   * Render function that receives optimistic data and action trigger
   */
  children: (data: T, trigger: () => void, state: ActionState) => React.ReactNode;

  /**
   * Show status indicator
   * @default true
   */
  showStatus?: boolean;

  /**
   * Status indicator position
   * @default 'bottom-right'
   */
  statusPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

type ActionState = 'idle' | 'pending' | 'success' | 'error';

/**
 * OptimisticAction component for instant UI updates with React 19's useOptimistic
 *
 * Provides optimistic UI updates that apply immediately and revert on error,
 * following the local-first architecture pattern.
 *
 * @example
 * ```tsx
 * <OptimisticAction
 *   data={post}
 *   optimisticUpdate={(current) => ({ ...current, likes: current.likes + 1 })}
 *   serverAction={async (data) => await updatePost(data)}
 *   onSuccess={(result) => console.log('Updated:', result)}
 * >
 *   {(optimisticPost, triggerUpdate, state) => (
 *     <Button onClick={triggerUpdate} disabled={state === 'pending'}>
 *       Like ({optimisticPost.likes})
 *     </Button>
 *   )}
 * </OptimisticAction>
 * ```
 */
export function OptimisticAction<T>({
  data,
  optimisticUpdate,
  serverAction,
  onSuccess,
  onError,
  children,
  showStatus = true,
  statusPosition = 'bottom-right',
}: OptimisticActionProps<T>) {
  const [isPending, startTransition] = useTransition();
  const [optimisticData, setOptimisticData] = useOptimistic(data);
  const [actionState, setActionState] = useState<ActionState>('idle');

  const handleAction = () => {
    // Apply optimistic update immediately
    startTransition(async () => {
      setActionState('pending');
      setOptimisticData(optimisticUpdate(data));

      try {
        // Execute server action
        const result = await serverAction(optimisticData as T);

        setActionState('success');
        onSuccess?.(result);

        // Reset to idle after animation
        setTimeout(() => setActionState('idle'), 2000);
      } catch (error) {
        setActionState('error');
        onError?.(error as Error);

        // Revert optimistic update on error
        setOptimisticData(data);

        // Reset to idle after animation
        setTimeout(() => setActionState('idle'), 2000);
      }
    });
  };

  return (
    <div className="relative">
      {children(optimisticData as T, handleAction, actionState)}

      {/* Status Indicator */}
      {showStatus && actionState !== 'idle' && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={cn(
              'absolute z-10 surface-matte rounded-full p-2',
              statusPosition === 'top-left' && 'top-2 left-2',
              statusPosition === 'top-right' && 'top-2 right-2',
              statusPosition === 'bottom-left' && 'bottom-2 left-2',
              statusPosition === 'bottom-right' && 'bottom-2 right-2'
            )}
            role="status"
            aria-live="polite"
            aria-label={
              actionState === 'pending'
                ? 'Action in progress'
                : actionState === 'success'
                ? 'Action completed successfully'
                : 'Action failed'
            }
          >
            {actionState === 'pending' && (
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" aria-hidden="true" />
            )}
            {actionState === 'success' && (
              <Check className="h-4 w-4 text-neon-accent" aria-hidden="true" />
            )}
            {actionState === 'error' && (
              <X className="h-4 w-4 text-red-500" aria-hidden="true" />
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

OptimisticAction.displayName = 'OptimisticAction';
