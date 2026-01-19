'use client';

import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import type { PlaylistCardProps } from '../types';

export function PlaylistCard({ item, onClick }: PlaylistCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="cursor-pointer group"
      onClick={onClick}
    >
      <div className="relative aspect-square rounded-lg overflow-hidden bg-surface-3">
        <img
          src={item.thumbnailUrl || '/placeholder-playlist.png'}
          alt={item.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="bg-green-500 rounded-full p-2">
            <Play className="h-4 w-4 text-white fill-white" />
          </div>
        </div>
      </div>
      <p className="mt-1.5 text-xs font-medium text-white truncate">{item.title}</p>
      <p className="text-[10px] text-text-muted truncate">{item.subtitle}</p>
    </motion.div>
  );
}
