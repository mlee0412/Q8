'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor,
  Smartphone,
  Speaker,
  Tv,
  Cast,
  Check,
  Loader2,
  RefreshCw,
  X,
  AlertCircle,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';

export interface SpotifyDevice {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  volume: number;
  supportsVolume: boolean;
}

interface DeviceSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDevice: (deviceId: string, deviceName: string) => Promise<{ success: boolean; error?: string }>;
  getDevices: () => Promise<SpotifyDevice[]>;
  currentDeviceId?: string | null;
}

const DEVICE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Computer: Monitor,
  Smartphone: Smartphone,
  Speaker: Speaker,
  TV: Tv,
  CastVideo: Cast,
  CastAudio: Cast,
  Tablet: Smartphone,
  Automobile: Speaker,
  AVR: Tv,
  STB: Tv,
  AudioDongle: Speaker,
  GameConsole: Tv,
};

function getDeviceIcon(type: string) {
  return DEVICE_ICONS[type] || Speaker;
}

export function DeviceSelectorModal({
  isOpen,
  onClose,
  onSelectDevice,
  getDevices,
  currentDeviceId,
}: DeviceSelectorModalProps) {
  const [devices, setDevices] = useState<SpotifyDevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Fetch devices when modal opens
  const fetchDevices = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const fetchedDevices = await getDevices();
      setDevices(fetchedDevices);

      if (fetchedDevices.length === 0) {
        setError('No devices found. Open Spotify on a device to make it appear here.');
      }
    } catch (err) {
      setError('Failed to fetch devices. Please try again.');
      logger.error('Error fetching devices', { error: err });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [getDevices]);

  useEffect(() => {
    if (isOpen) {
      fetchDevices();
    }
  }, [isOpen, fetchDevices]);

  // Handle device selection
  const handleSelectDevice = async (device: SpotifyDevice) => {
    if (device.id === currentDeviceId && device.isActive) {
      // Already playing on this device
      onClose();
      return;
    }

    setSelectedDeviceId(device.id);
    setError(null);

    try {
      const result = await onSelectDevice(device.id, device.name);

      if (result.success) {
        // Brief delay to show success state
        setTimeout(() => {
          onClose();
        }, 500);
      } else {
        setError(result.error || 'Failed to transfer playback');
        setSelectedDeviceId(null);
      }
    } catch (err) {
      setError('Failed to transfer playback. Please try again.');
      setSelectedDeviceId(null);
      logger.error('Error selecting device', { error: err, deviceId: device.id, deviceName: device.name });
    }
  };

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'relative z-10 w-full max-w-sm mx-4',
              'bg-surface-primary/95 backdrop-blur-xl',
              'border border-border-subtle rounded-2xl',
              'shadow-2xl shadow-black/20'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border-subtle">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-neon-primary/10">
                  <Speaker className="h-5 w-5 text-neon-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary">Select Device</h3>
                  <p className="text-xs text-text-muted">Choose where to play</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-text-muted hover:text-text-primary"
                  onClick={() => fetchDevices(true)}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-text-muted hover:text-text-primary"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {/* Loading state */}
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 text-neon-primary animate-spin mb-3" />
                  <p className="text-sm text-text-muted">Finding devices...</p>
                </div>
              )}

              {/* Error state */}
              {error && !isLoading && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-status-error/10 border border-status-error/20 mb-4">
                  <AlertCircle className="h-5 w-5 text-status-error flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-status-error">{error}</p>
                </div>
              )}

              {/* Device list */}
              {!isLoading && devices.length > 0 && (
                <div className="space-y-2">
                  {devices.map((device) => {
                    const DeviceIcon = getDeviceIcon(device.type);
                    const isSelected = selectedDeviceId === device.id;
                    const isCurrent = device.isActive;

                    return (
                      <motion.button
                        key={device.id}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleSelectDevice(device)}
                        disabled={isSelected}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-xl',
                          'transition-all duration-200',
                          'border',
                          isCurrent
                            ? 'bg-neon-primary/10 border-neon-primary/30'
                            : 'bg-surface-secondary/50 border-border-subtle hover:bg-surface-secondary hover:border-border-default',
                          isSelected && 'opacity-70 cursor-wait'
                        )}
                      >
                        {/* Device icon */}
                        <div
                          className={cn(
                            'p-2 rounded-lg',
                            isCurrent ? 'bg-neon-primary/20' : 'bg-surface-tertiary'
                          )}
                        >
                          <DeviceIcon
                            className={cn(
                              'h-5 w-5',
                              isCurrent ? 'text-neon-primary' : 'text-text-secondary'
                            )}
                          />
                        </div>

                        {/* Device info */}
                        <div className="flex-1 text-left">
                          <p
                            className={cn(
                              'font-medium text-sm',
                              isCurrent ? 'text-neon-primary' : 'text-text-primary'
                            )}
                          >
                            {device.name}
                          </p>
                          <p className="text-xs text-text-muted capitalize">
                            {device.type.toLowerCase()}
                          </p>
                        </div>

                        {/* Status indicator */}
                        <div className="flex items-center">
                          {isSelected ? (
                            <Loader2 className="h-4 w-4 text-neon-primary animate-spin" />
                          ) : isCurrent ? (
                            <div className="flex items-center gap-1.5">
                              <div className="flex gap-0.5">
                                {[1, 2, 3].map((i) => (
                                  <motion.div
                                    key={i}
                                    className="w-0.5 bg-neon-primary rounded-full"
                                    animate={{ height: ['6px', '12px', '6px'] }}
                                    transition={{
                                      duration: 0.5,
                                      repeat: Infinity,
                                      delay: i * 0.1,
                                    }}
                                  />
                                ))}
                              </div>
                              <Check className="h-4 w-4 text-neon-primary" />
                            </div>
                          ) : null}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* Empty state with help */}
              {!isLoading && devices.length === 0 && (
                <div className="text-center py-6">
                  <div className="p-3 rounded-full bg-surface-secondary inline-block mb-3">
                    <Speaker className="h-6 w-6 text-text-muted" />
                  </div>
                  <p className="text-sm text-text-secondary mb-2">No devices available</p>
                  <p className="text-xs text-text-muted max-w-xs mx-auto">
                    Open Spotify on your phone, computer, or speaker to connect
                  </p>
                </div>
              )}
            </div>

            {/* Footer tip */}
            <div className="px-4 py-3 border-t border-border-subtle">
              <p className="text-xs text-text-muted text-center">
                Devices must have Spotify open to appear here
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
