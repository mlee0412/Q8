'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Power, Sun, Palette, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COLOR_PRESETS, LED_EFFECTS } from '../constants';
import type { LightControlConfig, CallServiceFn } from '../types';

interface LightControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: LightControlConfig;
  currentBrightness: number;
  currentColor: [number, number, number] | null;
  isOn: boolean;
  callService: CallServiceFn;
}

export function LightControlModal({
  isOpen,
  onClose,
  config,
  currentBrightness,
  currentColor,
  isOn,
  callService,
}: LightControlModalProps) {
  const [brightness, setBrightness] = useState(currentBrightness);
  const [activeTab, setActiveTab] = useState<'brightness' | 'color' | 'effects'>('brightness');
  const [mounted, setMounted] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const backdropPointerDown = useRef(false);
  const modalOpenTime = useRef(0);

  // Track mounting for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    setBrightness(currentBrightness);
  }, [currentBrightness]);

  // Prevent body scrolling when modal is open and track open time
  useEffect(() => {
    if (isOpen) {
      modalOpenTime.current = Date.now();
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Backdrop close handler - only close if pointer started AND ended on backdrop
  const handleBackdropPointerDown = useCallback((e: React.PointerEvent) => {
    backdropPointerDown.current = e.target === e.currentTarget;
  }, []);

  const handleBackdropPointerUp = useCallback((e: React.PointerEvent) => {
    if (Date.now() - modalOpenTime.current < 300) {
      backdropPointerDown.current = false;
      return;
    }
    if (backdropPointerDown.current && e.target === e.currentTarget) {
      onClose();
    }
    backdropPointerDown.current = false;
  }, [onClose]);

  const handleBackdropPointerCancel = useCallback(() => {
    backdropPointerDown.current = false;
  }, []);

  const handleBackdropTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.target === e.currentTarget) {
      backdropPointerDown.current = true;
    }
  }, []);

  const handleBackdropTouchEnd = useCallback((e: React.TouchEvent) => {
    if (Date.now() - modalOpenTime.current < 300) {
      backdropPointerDown.current = false;
      e.preventDefault();
      return;
    }
    if (backdropPointerDown.current && e.target === e.currentTarget) {
      e.preventDefault();
      onClose();
    }
    backdropPointerDown.current = false;
  }, [onClose]);

  const handleBrightnessChange = useCallback((value: number) => {
    const clampedValue = Math.max(1, Math.min(100, value));
    setBrightness(clampedValue);
  }, []);

  const handleBrightnessCommit = useCallback((value: number) => {
    callService('light', 'turn_on', config.entityId, { brightness_pct: value });
  }, [callService, config.entityId]);

  const handleSliderInteraction = useCallback((clientY: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const percentage = 100 - ((clientY - rect.top) / rect.height) * 100;
    const value = Math.max(1, Math.min(100, Math.round(percentage)));
    handleBrightnessChange(value);
    return value;
  }, [handleBrightnessChange]);

  const capturedPointerId = useRef<number | null>(null);

  const handleSliderPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (sliderRef.current) {
      sliderRef.current.setPointerCapture(e.pointerId);
      capturedPointerId.current = e.pointerId;
    }
    isDragging.current = true;
    handleSliderInteraction(e.clientY);
  }, [handleSliderInteraction]);

  const handleSliderPointerMove = useCallback((e: React.PointerEvent) => {
    if (isDragging.current) {
      e.preventDefault();
      e.stopPropagation();
      handleSliderInteraction(e.clientY);
    }
  }, [handleSliderInteraction]);

  const handleSliderPointerUp = useCallback((e: React.PointerEvent) => {
    if (isDragging.current) {
      e.preventDefault();
      e.stopPropagation();
      if (sliderRef.current && capturedPointerId.current !== null) {
        sliderRef.current.releasePointerCapture(capturedPointerId.current);
        capturedPointerId.current = null;
      }
      isDragging.current = false;
      handleBrightnessCommit(brightness);
    }
  }, [brightness, handleBrightnessCommit]);

  const handleSliderPointerCancel = useCallback((e: React.PointerEvent) => {
    if (isDragging.current) {
      e.preventDefault();
      e.stopPropagation();
      if (sliderRef.current && capturedPointerId.current !== null) {
        sliderRef.current.releasePointerCapture(capturedPointerId.current);
        capturedPointerId.current = null;
      }
      isDragging.current = false;
    }
  }, []);

  const handleLostPointerCapture = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    if (isDragging.current) {
      isDragging.current = false;
      handleBrightnessCommit(brightness);
    }
  }, [brightness, handleBrightnessCommit]);

  const stopPropagationHandler = useCallback((e: React.PointerEvent | React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const setColor = (rgb: [number, number, number]) => {
    callService('light', 'turn_on', config.entityId, { rgb_color: rgb, brightness_pct: brightness });
  };

  const setEffect = (effect: string) => {
    callService('light', 'turn_on', config.entityId, { effect });
  };

  const togglePower = () => {
    callService('light', 'toggle', config.entityId);
  };

  const lightColor = currentColor ? `rgb(${currentColor[0]}, ${currentColor[1]}, ${currentColor[2]})` : '#facc15';
  const lightColorDim = currentColor ? `rgba(${currentColor[0]}, ${currentColor[1]}, ${currentColor[2]}, 0.3)` : 'rgba(250, 204, 21, 0.3)';

  if (!mounted) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="light-control-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          style={{
            touchAction: 'none',
            WebkitTapHighlightColor: 'transparent',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
          }}
          onPointerDown={handleBackdropPointerDown}
          onPointerUp={handleBackdropPointerUp}
          onPointerCancel={handleBackdropPointerCancel}
          onTouchStart={handleBackdropTouchStart}
          onTouchEnd={handleBackdropTouchEnd}
          onTouchMove={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
            }
          }}
        >
          <motion.div
            key="light-control-modal"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative w-[340px] max-h-[90vh] bg-gradient-to-b from-gray-900 to-gray-950 rounded-3xl shadow-2xl border border-white/10 overflow-hidden"
            style={{
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            onTouchCancel={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <p className="text-xs text-muted-foreground">{config.type === 'led_strip' ? 'LED Strip' : 'Light'}</p>
                <h2 className="text-lg font-semibold text-white">{config.name}</h2>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onPointerDown={stopPropagationHandler}
                onPointerUp={stopPropagationHandler}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="h-11 w-11 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                style={{ touchAction: 'manipulation' }}
              >
                <X className="h-5 w-5" />
              </motion.button>
            </div>

            {/* Brightness Slider */}
            <div className="p-6 flex justify-center">
              <div
                ref={sliderRef}
                className="relative w-24 h-64 rounded-[40px] cursor-pointer overflow-hidden select-none"
                style={{ backgroundColor: lightColorDim, touchAction: 'none' }}
                onPointerDown={handleSliderPointerDown}
                onPointerMove={handleSliderPointerMove}
                onPointerUp={handleSliderPointerUp}
                onPointerCancel={handleSliderPointerCancel}
                onLostPointerCapture={handleLostPointerCapture}
                onGotPointerCapture={stopPropagationHandler}
              >
                <motion.div
                  className="absolute bottom-0 left-0 right-0 rounded-[40px] pointer-events-none"
                  style={{ backgroundColor: isOn ? lightColor : '#4b5563' }}
                  animate={{ height: `${isOn ? brightness : 0}%` }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
                <motion.div
                  className="absolute left-1/2 -translate-x-1/2 w-16 h-2 bg-white/90 rounded-full shadow-lg pointer-events-none"
                  animate={{ bottom: `calc(${isOn ? brightness : 0}% - 4px)` }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-3xl font-bold text-white drop-shadow-lg">{isOn ? brightness : 0}%</span>
                </div>
              </div>
            </div>

            {/* Mode Tabs */}
            <div className="flex items-center justify-center gap-2 px-4 py-2 border-t border-white/10">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onPointerDown={stopPropagationHandler}
                onPointerUp={stopPropagationHandler}
                onClick={(e) => {
                  e.stopPropagation();
                  togglePower();
                }}
                className={cn(
                  'h-12 w-12 rounded-full flex items-center justify-center transition-all',
                  isOn
                    ? 'bg-green-500/20 text-green-400 border-2 border-green-500/50'
                    : 'bg-white/10 text-white/60 border-2 border-white/20'
                )}
                style={{ touchAction: 'manipulation' }}
              >
                <Power className="h-5 w-5" />
              </motion.button>
              <div className="h-8 w-px bg-white/20 mx-2" />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onPointerDown={stopPropagationHandler}
                onPointerUp={stopPropagationHandler}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab('brightness');
                }}
                className={cn(
                  'h-12 w-12 rounded-full flex items-center justify-center transition-all',
                  activeTab === 'brightness'
                    ? 'bg-amber-500/20 text-amber-400 border-2 border-amber-500/50'
                    : 'bg-white/10 text-white/60 border-2 border-white/20'
                )}
                style={{ touchAction: 'manipulation' }}
              >
                <Sun className="h-5 w-5" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onPointerDown={stopPropagationHandler}
                onPointerUp={stopPropagationHandler}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab('color');
                }}
                className={cn(
                  'h-12 w-12 rounded-full flex items-center justify-center transition-all',
                  activeTab === 'color'
                    ? 'bg-fuchsia-500/20 text-fuchsia-400 border-2 border-fuchsia-500/50'
                    : 'bg-white/10 text-white/60 border-2 border-white/20'
                )}
                style={{ touchAction: 'manipulation' }}
              >
                <Palette className="h-5 w-5" />
              </motion.button>
              {config.hasEffects && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onPointerDown={stopPropagationHandler}
                  onPointerUp={stopPropagationHandler}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab('effects');
                  }}
                  className={cn(
                    'h-12 w-12 rounded-full flex items-center justify-center transition-all',
                    activeTab === 'effects'
                      ? 'bg-cyan-500/20 text-cyan-400 border-2 border-cyan-500/50'
                      : 'bg-white/10 text-white/60 border-2 border-white/20'
                  )}
                  style={{ touchAction: 'manipulation' }}
                >
                  <Sparkles className="h-5 w-5" />
                </motion.button>
              )}
            </div>

            {/* Color Presets */}
            <AnimatePresence mode="wait">
              {activeTab === 'color' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 pb-4 overflow-hidden"
                >
                  <div className="grid grid-cols-4 gap-3 pt-3">
                    {COLOR_PRESETS.map((preset) => (
                      <motion.button
                        key={preset.name}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onPointerDown={stopPropagationHandler}
                        onPointerUp={stopPropagationHandler}
                        onClick={(e) => {
                          e.stopPropagation();
                          setColor(preset.rgb);
                        }}
                        className={cn(
                          'h-14 w-14 rounded-full bg-gradient-to-br shadow-lg border-2 border-white/20 hover:border-white/50 transition-all mx-auto',
                          preset.gradient
                        )}
                        style={{ touchAction: 'manipulation' }}
                        title={preset.name}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'effects' && config.hasEffects && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 pb-4 overflow-hidden"
                >
                  <div className="grid grid-cols-3 gap-2 pt-3 max-h-48 overflow-y-auto">
                    {LED_EFFECTS.map((effect) => (
                      <motion.button
                        key={effect.value}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onPointerDown={stopPropagationHandler}
                        onPointerUp={stopPropagationHandler}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEffect(effect.value);
                        }}
                        className={cn(
                          'min-h-[44px] py-2 px-2 rounded-xl text-[10px] font-semibold bg-gradient-to-br text-white shadow-md border border-white/10',
                          effect.gradient
                        )}
                        style={{ touchAction: 'manipulation' }}
                      >
                        {effect.name}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'brightness' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 pb-4 overflow-hidden"
                >
                  <div className="grid grid-cols-5 gap-2 pt-3">
                    {[10, 25, 50, 75, 100].map((level) => (
                      <motion.button
                        key={level}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onPointerDown={stopPropagationHandler}
                        onPointerUp={stopPropagationHandler}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBrightnessChange(level);
                          handleBrightnessCommit(level);
                        }}
                        className={cn(
                          'min-h-[44px] py-2 rounded-xl text-xs font-semibold transition-all',
                          brightness === level
                            ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 border border-white/20'
                            : 'bg-white/10 border border-white/20 text-white/80 hover:bg-white/20'
                        )}
                        style={{ touchAction: 'manipulation' }}
                      >
                        {level}%
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
