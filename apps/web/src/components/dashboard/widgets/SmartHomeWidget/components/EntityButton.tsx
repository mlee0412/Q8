'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLongPress } from '@/hooks/useLongPress';
import type { EntityButtonProps } from '../types';

const ACTIVE_CLASSES: Record<string, string> = {
  cyan: 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-cyan-500/40',
  amber: 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/40',
  teal: 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/40',
  violet: 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/40',
  fuchsia: 'bg-gradient-to-br from-fuchsia-500 to-pink-600 shadow-fuchsia-500/40',
  orange: 'bg-gradient-to-br from-orange-500 to-red-600 shadow-orange-500/40',
  sky: 'bg-gradient-to-br from-sky-400 to-blue-500 shadow-sky-500/40',
  yellow: 'bg-gradient-to-br from-yellow-400 to-amber-500 shadow-yellow-500/40',
  green: 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/40',
  neon: 'bg-neon-primary shadow-neon-primary/40',
};

export function EntityButton({ icon: Icon, label, isActive, activeColor = 'neon', onClick, onLongPress, fullWidth = false }: EntityButtonProps) {
  const longPressHandlers = useLongPress(
    onLongPress || (() => {}),
    onClick,
    { threshold: 500 }
  );

  const handlers = onLongPress ? longPressHandlers : { onClick };

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      {...handlers}
      className={cn(
        'rounded-xl py-3.5 px-4 flex items-center gap-3 transition-all min-h-[48px] select-none',
        fullWidth && 'w-full justify-center',
        isActive
          ? `${ACTIVE_CLASSES[activeColor]} text-white shadow-lg border border-white/20`
          : 'bg-surface-2 border border-border-subtle text-muted-foreground hover:text-white hover:border-white/20 hover:bg-glass-border/50'
      )}
    >
      <motion.div
        animate={isActive ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        <Icon className={cn('h-5 w-5', isActive && 'drop-shadow-sm')} />
      </motion.div>
      <span className="text-sm font-medium">{label}</span>
    </motion.button>
  );
}
