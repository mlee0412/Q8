'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Share2, X, ZoomIn, Wand2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GeneratedImageData {
  id: string;
  data: string;
  mimeType: string;
  caption?: string;
  model?: string;
}

interface GeneratedImageDisplayProps {
  images: GeneratedImageData[];
  className?: string;
}

interface SingleImageProps {
  image: GeneratedImageData;
  onZoom: () => void;
}

/**
 * SingleImage - Individual image card with hover actions
 */
function SingleImage({ image, onZoom }: SingleImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `data:${image.mimeType};base64,${image.data}`;
    link.download = `generated-image-${image.id}.${image.mimeType.split('/')[1] || 'png'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    try {
      // Convert base64 to blob for sharing
      const response = await fetch(`data:${image.mimeType};base64,${image.data}`);
      const blob = await response.blob();
      const file = new File([blob], `generated-image.${image.mimeType.split('/')[1] || 'png'}`, { type: image.mimeType });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: image.caption || 'Generated Image',
        });
      } else {
        // Fallback: copy image URL to clipboard
        await navigator.clipboard.writeText(`data:${image.mimeType};base64,${image.data}`);
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'relative rounded-xl overflow-hidden',
        'bg-surface-2/80 backdrop-blur-[24px]',
        'border border-border-subtle',
        'group'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Loading skeleton */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-2">
          <Loader2 className="h-8 w-8 animate-spin text-text-muted" />
        </div>
      )}

      {/* Image */}
      <img
        src={`data:${image.mimeType};base64,${image.data}`}
        alt={image.caption || 'Generated image'}
        className={cn(
          'w-full h-auto max-h-96 object-contain cursor-zoom-in',
          'transition-transform duration-300',
          'group-hover:scale-[1.02]'
        )}
        onLoad={() => setIsLoaded(true)}
        onClick={onZoom}
      />

      {/* Model badge */}
      {image.model && (
        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-surface-1/80 backdrop-blur-sm border border-border-subtle">
          <Wand2 className="h-3 w-3 text-pink-400" />
          <span className="text-xs font-medium text-text-secondary">{image.model}</span>
        </div>
      )}

      {/* Action buttons */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-2 right-2 flex items-center gap-1"
          >
            <button
              onClick={onZoom}
              className="p-2 rounded-lg bg-surface-1/80 backdrop-blur-sm border border-border-subtle hover:bg-surface-2 transition-colors"
              title="Zoom"
            >
              <ZoomIn className="h-4 w-4 text-text-secondary" />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 rounded-lg bg-surface-1/80 backdrop-blur-sm border border-border-subtle hover:bg-surface-2 transition-colors"
              title="Download"
            >
              <Download className="h-4 w-4 text-text-secondary" />
            </button>
            <button
              onClick={handleShare}
              className="p-2 rounded-lg bg-surface-1/80 backdrop-blur-sm border border-border-subtle hover:bg-surface-2 transition-colors"
              title="Share"
            >
              <Share2 className="h-4 w-4 text-text-secondary" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Caption */}
      {image.caption && (
        <div className="px-3 py-2 bg-surface-1/60 backdrop-blur-sm border-t border-border-subtle">
          <p className="text-sm text-text-muted line-clamp-2">{image.caption}</p>
        </div>
      )}
    </motion.div>
  );
}

/**
 * ZoomedImageModal - Full-screen image viewer
 */
interface ZoomedImageModalProps {
  image: GeneratedImageData;
  onClose: () => void;
}

function ZoomedImageModal({ image, onClose }: ZoomedImageModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
      >
        <X className="h-6 w-6 text-white" />
      </button>

      <motion.img
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        src={`data:${image.mimeType};base64,${image.data}`}
        alt={image.caption || 'Generated image'}
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />

      {image.caption && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-black/60 backdrop-blur-sm">
          <p className="text-white text-sm">{image.caption}</p>
        </div>
      )}
    </motion.div>
  );
}

/**
 * GeneratedImageDisplay Component
 *
 * Displays generated images with glass card styling, zoom, download, and share actions
 */
export function GeneratedImageDisplay({ images, className }: GeneratedImageDisplayProps) {
  const [zoomedImage, setZoomedImage] = useState<GeneratedImageData | null>(null);

  if (images.length === 0) return null;

  return (
    <>
      <div className={cn('space-y-3 my-3', className)}>
        {images.map((image) => (
          <SingleImage
            key={image.id}
            image={image}
            onZoom={() => setZoomedImage(image)}
          />
        ))}
      </div>

      {/* Zoomed image modal */}
      <AnimatePresence>
        {zoomedImage && (
          <ZoomedImageModal
            image={zoomedImage}
            onClose={() => setZoomedImage(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

GeneratedImageDisplay.displayName = 'GeneratedImageDisplay';
