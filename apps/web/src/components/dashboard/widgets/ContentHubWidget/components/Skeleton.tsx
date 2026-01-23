'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <motion.div
      className={cn(
        'bg-gradient-to-r from-white/5 via-white/10 to-white/5 rounded',
        'relative overflow-hidden',
        className
      )}
      animate={{
        backgroundPosition: ['200% 0', '-200% 0'],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'linear',
      }}
      style={{
        backgroundSize: '200% 100%',
      }}
    />
  );
}

export function NowPlayingSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-6 w-6 rounded" />
      </div>
      
      <div className="flex items-start gap-4">
        <Skeleton className="h-16 w-16 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      
      <div className="space-y-2">
        <Skeleton className="h-1.5 w-full rounded-full" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-8" />
        </div>
      </div>
      
      <div className="flex items-center justify-center gap-2">
        <Skeleton className="h-7 w-7 rounded" />
        <Skeleton className="h-7 w-7 rounded" />
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-7 w-7 rounded" />
        <Skeleton className="h-7 w-7 rounded" />
      </div>
    </div>
  );
}

export function ContentCardSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="aspect-square w-full rounded-lg" />
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-2.5 w-1/2" />
    </div>
  );
}

export function QueueItemSkeleton() {
  return (
    <div className="flex items-center gap-2 p-1.5">
      <Skeleton className="w-4 h-3" />
      <Skeleton className="h-8 w-8 rounded flex-shrink-0" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-2.5 w-1/2" />
      </div>
    </div>
  );
}

export function ContentSectionSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <ContentCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function PlaylistGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-2.5 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function MiniPlayerSkeleton() {
  return (
    <div className="flex items-center gap-3 p-2">
      <Skeleton className="h-10 w-10 rounded flex-shrink-0" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-2.5 w-24" />
      </div>
      <Skeleton className="h-8 w-8 rounded-full" />
      <Skeleton className="h-1 w-20 rounded-full" />
    </div>
  );
}

export default Skeleton;
