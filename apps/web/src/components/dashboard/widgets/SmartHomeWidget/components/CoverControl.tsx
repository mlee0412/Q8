'use client';

import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CoverControlProps } from '../types';

export function CoverControl({ label, state, onOpen, onClose, onStop }: CoverControlProps) {
  const isOpen = state === 'open';
  const isClosed = state === 'closed';
  
  return (
    <div className="card-item rounded-xl p-3">
      <p className="text-xs font-medium mb-1 text-center">{label}</p>
      <p className={cn(
        'text-[10px] text-center capitalize mb-3 font-medium',
        isOpen && 'text-emerald-400',
        isClosed && 'text-rose-400',
        !isOpen && !isClosed && 'text-muted-foreground'
      )}>{state}</p>
      <div className="flex justify-center gap-2">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onOpen}
          className={cn(
            'h-9 w-9 rounded-lg flex items-center justify-center transition-all',
            isOpen
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-surface-2 border border-border-subtle hover:border-white/20'
          )}
        >
          <ChevronUp className="h-4 w-4" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onStop}
          className="h-9 w-9 rounded-lg flex items-center justify-center bg-surface-2 border border-border-subtle hover:border-amber-500/50 hover:bg-amber-500/10 transition-all"
        >
          <Square className="h-3.5 w-3.5" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className={cn(
            'h-9 w-9 rounded-lg flex items-center justify-center transition-all',
            isClosed
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              : 'bg-surface-2 border border-border-subtle hover:border-white/20'
          )}
        >
          <ChevronDown className="h-4 w-4" />
        </motion.button>
      </div>
    </div>
  );
}
