'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ActionButtonProps } from '../types';

export function ActionButton({ icon: Icon, label, gradient, onClick }: ActionButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      onClick={onClick}
      className={cn(
        'rounded-xl py-3.5 px-4 bg-gradient-to-br text-white flex flex-col items-center justify-center gap-1.5 min-h-[56px]',
        'shadow-lg hover:shadow-xl active:shadow-md border border-white/10 backdrop-blur-sm',
        gradient
      )}
    >
      <Icon className="h-5 w-5 drop-shadow-sm" />
      <span className="text-[11px] font-semibold tracking-wide">{label}</span>
    </motion.button>
  );
}
