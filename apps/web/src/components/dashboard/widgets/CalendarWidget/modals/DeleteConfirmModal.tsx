'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { DeleteConfirmModalProps } from '../types';

/**
 * DeleteConfirmModal - Confirmation dialog for event deletion
 *
 * Prevents accidental deletion with confirmation step.
 */
export const DeleteConfirmModal = memo(function DeleteConfirmModal({
  isOpen,
  onClose,
  event,
  onConfirm,
  isDeleting,
}: DeleteConfirmModalProps) {
  if (!event) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              'fixed z-50',
              'inset-x-3 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2',
              'w-auto md:w-full max-w-sm',
              'bg-surface-2 rounded-2xl shadow-2xl',
              'border border-border-subtle overflow-hidden',
              'max-h-[90vh] overflow-y-auto'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-error" />
                <h2 className="text-lg font-semibold text-text-primary">
                  Delete Event?
                </h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
                disabled={isDeleting}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-4">
              <p className="text-sm text-text-secondary mb-4">
                Are you sure you want to delete this event?
              </p>

              <div className="p-3 rounded-lg bg-surface-3 border border-border-subtle">
                <h3 className="text-sm font-medium text-text-primary mb-1">
                  {event.title}
                </h3>
                <p className="text-xs text-text-muted">
                  {new Date(event.start_time).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                  {!event.all_day && (
                    <>
                      {' '}
                      at{' '}
                      {new Date(event.start_time).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </>
                  )}
                </p>
              </div>

              <p className="text-xs text-text-muted mt-4">
                This action cannot be undone. The event will be removed from
                Google Calendar.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 p-4 pt-0">
              <Button
                variant="subtle"
                size="sm"
                onClick={onClose}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={onConfirm}
                disabled={isDeleting}
                className="bg-error hover:bg-error/90 text-white"
              >
                {isDeleting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/50 border-t-white rounded-full animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete Event
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

DeleteConfirmModal.displayName = 'DeleteConfirmModal';

export default DeleteConfirmModal;
