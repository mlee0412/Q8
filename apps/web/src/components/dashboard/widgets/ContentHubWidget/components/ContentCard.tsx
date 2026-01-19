'use client';

import { motion } from 'framer-motion';
import type { ContentCardProps } from '../types';

export function ContentCard({ item, onClick }: ContentCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="cursor-pointer group"
      onClick={onClick}
    >
      <div className="relative aspect-square rounded-lg overflow-hidden bg-surface-3">
        <img
          src={item.thumbnailUrl}
          alt={item.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className="mt-1.5 text-xs font-medium text-white truncate">{item.title}</p>
      <p className="text-[10px] text-text-muted truncate">{item.subtitle}</p>
    </motion.div>
  );
}
