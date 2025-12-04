'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
}

export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 md:grid-cols-4 auto-rows-[minmax(160px,auto)] gap-4 p-4',
        className
      )}
    >
      {children}
    </div>
  );
}

interface BentoItemProps {
  children: React.ReactNode;
  colSpan?: number;
  rowSpan?: number;
  className?: string;
}

export function BentoItem({ children, colSpan = 1, rowSpan = 1, className }: BentoItemProps) {
  // Map colSpan to Tailwind classes - full width on mobile, specified span on md+
  const colSpanClasses: Record<number, string> = {
    1: 'col-span-1',
    2: 'col-span-1 md:col-span-2',
    3: 'col-span-1 md:col-span-3',
    4: 'col-span-1 md:col-span-4',
  };

  // Map rowSpan to Tailwind classes
  const rowSpanClasses: Record<number, string> = {
    1: 'row-span-1',
    2: 'row-span-2',
    3: 'row-span-3',
    4: 'row-span-4',
  };

  return (
    <motion.div
      layout
      className={cn(
        'glass-panel relative overflow-hidden w-full',
        colSpanClasses[colSpan],
        rowSpanClasses[rowSpan],
        className
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}
