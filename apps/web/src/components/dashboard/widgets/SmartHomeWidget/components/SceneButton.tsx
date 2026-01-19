'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLongPress } from '@/hooks/useLongPress';
import type { SceneButtonProps } from '../types';

export function SceneButton({ icon: Icon, label, gradient, onClick, onLongPress, size = 'md' }: SceneButtonProps) {
  const longPressHandlers = useLongPress(
    onLongPress || (() => {}),
    onClick,
    { threshold: 500 }
  );

  const handlers = onLongPress ? longPressHandlers : { onClick };

  return (
    <motion.button
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      {...handlers}
      className={cn(
        'rounded-xl bg-gradient-to-br text-white flex flex-col items-center justify-center gap-1.5 transition-all shadow-lg hover:shadow-xl',
        'active:shadow-md backdrop-blur-sm border border-white/10 select-none',
        gradient,
        size === 'sm' ? 'py-3 px-3 min-h-[52px]' : 'py-4 px-4 min-h-[64px]'
      )}
    >
      <Icon className={cn('drop-shadow-sm', size === 'sm' ? 'h-5 w-5' : 'h-6 w-6')} />
      <span className={cn('font-semibold tracking-wide', size === 'sm' ? 'text-[10px]' : 'text-xs')}>{label}</span>
    </motion.button>
  );
}
