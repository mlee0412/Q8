'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Plus,
  Heart,
  Share2,
  MoreHorizontal,
  ListPlus,
  ExternalLink,
  User,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useContentHubStore } from '@/lib/stores/contenthub';
import type { ContentItem } from '@/types/contenthub';

interface EnhancedContentCardProps {
  item: ContentItem;
  onPlay: (item: ContentItem) => void;
  onAddToQueue?: (item: ContentItem) => void;
  onSaveForLater?: (item: ContentItem) => void;
  onShare?: (item: ContentItem) => void;
  onViewArtist?: (item: ContentItem) => void;
  size?: 'sm' | 'md' | 'lg';
  showDuration?: boolean;
  className?: string;
}

const SOURCE_COLORS: Record<string, string> = {
  spotify: 'bg-green-500',
  youtube: 'bg-red-500',
  netflix: 'bg-red-600',
  instagram: 'bg-gradient-to-br from-purple-500 to-pink-500',
  podcast: 'bg-orange-500',
};

const SOURCE_ABBR: Record<string, string> = {
  spotify: 'SP',
  youtube: 'YT',
  netflix: 'NX',
  instagram: 'IG',
  podcast: 'PD',
};

function formatDuration(ms: number): string {
  if (!ms || ms === 0) return '';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function EnhancedContentCard({
  item,
  onPlay,
  onAddToQueue,
  onSaveForLater,
  onShare,
  onViewArtist,
  size = 'md',
  showDuration = true,
  className,
}: EnhancedContentCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { savedForLater, saveForLater, removeFromSaved, addToQueue } = useContentHubStore();

  const isSaved = savedForLater.some((i) => i.id === item.id);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setShowMenu(true);
  }, []);

  const handleMenuAction = useCallback((action: () => void) => {
    action();
    setShowMenu(false);
  }, []);

  const handleSave = useCallback(() => {
    if (isSaved) {
      removeFromSaved(item.id);
    } else {
      saveForLater(item);
    }
  }, [isSaved, item, removeFromSaved, saveForLater]);

  const handleAddToQueue = useCallback(() => {
    addToQueue(item);
    onAddToQueue?.(item);
  }, [addToQueue, item, onAddToQueue]);

  const sizeClasses = {
    sm: 'w-20',
    md: 'w-full',
    lg: 'w-full',
  };

  const imageSizeClasses = {
    sm: 'h-20',
    md: 'aspect-square',
    lg: 'aspect-[4/3]',
  };

  return (
    <motion.div
      className={cn('relative group cursor-pointer', sizeClasses[size], className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowMenu(false);
      }}
      onContextMenu={handleContextMenu}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Thumbnail */}
      <div
        className={cn(
          'relative rounded-xl overflow-hidden bg-surface-3',
          'ring-1 ring-white/5 group-hover:ring-neon-primary/30 transition-all',
          imageSizeClasses[size]
        )}
        onClick={() => onPlay(item)}
      >
        <img
          src={item.thumbnailUrl}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Source badge */}
        <div
          className={cn(
            'absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold text-white',
            SOURCE_COLORS[item.source] || 'bg-gray-500'
          )}
        >
          {SOURCE_ABBR[item.source] || item.source.slice(0, 2).toUpperCase()}
        </div>

        {/* Duration badge */}
        {showDuration && item.duration > 0 && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-white flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {formatDuration(item.duration)}
          </div>
        )}

        {/* Play overlay */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="p-3 rounded-full bg-neon-primary shadow-lg shadow-neon-primary/30"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlay(item);
                }}
              >
                <Play className="h-5 w-5 text-white fill-white" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick actions (hover) */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-2 right-2 flex items-center gap-1"
            >
              <button
                className={cn(
                  'p-1.5 rounded-full bg-black/60 backdrop-blur-sm transition-colors',
                  isSaved ? 'text-red-400' : 'text-white/70 hover:text-white'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSave();
                }}
              >
                <Heart className={cn('h-3.5 w-3.5', isSaved && 'fill-current')} />
              </button>
              <button
                className="p-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white/70 hover:text-white transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToQueue();
                }}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                className="p-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white/70 hover:text-white transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info */}
      <div className="mt-2 px-0.5">
        <p className="text-xs font-medium text-white truncate group-hover:text-neon-primary transition-colors">
          {item.title}
        </p>
        <p className="text-[10px] text-text-muted truncate">{item.subtitle}</p>
      </div>

      {/* Context menu */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className={cn(
              'absolute top-full left-0 mt-1 z-50 w-48',
              'bg-surface-primary/95 backdrop-blur-xl',
              'border border-border-subtle rounded-lg shadow-xl',
              'py-1 overflow-hidden'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <MenuButton
              icon={<Play className="h-3.5 w-3.5" />}
              label="Play now"
              onClick={() => handleMenuAction(() => onPlay(item))}
            />
            <MenuButton
              icon={<ListPlus className="h-3.5 w-3.5" />}
              label="Add to queue"
              onClick={() => handleMenuAction(handleAddToQueue)}
            />
            <MenuButton
              icon={<Heart className={cn('h-3.5 w-3.5', isSaved && 'fill-current text-red-400')} />}
              label={isSaved ? 'Remove from saved' : 'Save for later'}
              onClick={() => handleMenuAction(handleSave)}
            />
            
            <div className="h-px bg-border-subtle my-1" />
            
            {onViewArtist && (
              <MenuButton
                icon={<User className="h-3.5 w-3.5" />}
                label="View artist"
                onClick={() => handleMenuAction(() => onViewArtist(item))}
              />
            )}
            {onShare && (
              <MenuButton
                icon={<Share2 className="h-3.5 w-3.5" />}
                label="Share"
                onClick={() => handleMenuAction(() => onShare(item))}
              />
            )}
            {(item.playbackUrl || item.deepLinkUrl) && (
              <MenuButton
                icon={<ExternalLink className="h-3.5 w-3.5" />}
                label={`Open in ${item.source}`}
                onClick={() =>
                  handleMenuAction(() =>
                    window.open(item.playbackUrl || item.deepLinkUrl, '_blank')
                  )
                }
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MenuButton({
  icon,
  label,
  onClick,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-secondary',
        'hover:bg-white/5 hover:text-white transition-colors',
        className
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

export default EnhancedContentCard;
