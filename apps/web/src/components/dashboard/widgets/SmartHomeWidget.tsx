'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Thermometer,
  Lightbulb,
  Tv,
  Volume2,
  VolumeX,
  Volume1,
  Speaker,
  Sun,
  Moon,
  Sofa,
  Power,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RefreshCw,
  Droplets,
  Monitor,
  Gamepad2,
  Film,
  Waves,
  Zap,
  Bath,
  Sparkles,
  CircleDot,
  AlertTriangle,
  Bed,
  UtensilsCrossed,
  DoorOpen,
  Lamp,
  Square,
  Undo2,
  Music,
  Cast,
  PanelTopOpen,
  PanelBottomClose,
  SunDim,
  Palette,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============ Light Control Types & Presets ============
interface LightControlConfig {
  entityId: string;
  name: string;
  type: 'hue' | 'led_strip';
  hasEffects: boolean;
}

const COLOR_PRESETS = [
  { name: 'Warm', rgb: [255, 180, 107] as [number, number, number], gradient: 'from-amber-400 to-orange-500' },
  { name: 'Soft White', rgb: [255, 244, 229] as [number, number, number], gradient: 'from-amber-100 to-yellow-200' },
  { name: 'Daylight', rgb: [255, 255, 255] as [number, number, number], gradient: 'from-white to-gray-200' },
  { name: 'Cool', rgb: [200, 220, 255] as [number, number, number], gradient: 'from-sky-100 to-blue-200' },
  { name: 'Cyan', rgb: [0, 255, 255] as [number, number, number], gradient: 'from-cyan-400 to-teal-500' },
  { name: 'Lavender', rgb: [200, 162, 200] as [number, number, number], gradient: 'from-purple-300 to-violet-400' },
  { name: 'Peach', rgb: [255, 200, 170] as [number, number, number], gradient: 'from-orange-300 to-pink-300' },
  { name: 'Rose', rgb: [255, 150, 180] as [number, number, number], gradient: 'from-pink-400 to-rose-500' },
];

const LED_EFFECTS = [
  { name: 'Jump RGB', value: 'jump_red_green_blue', gradient: 'from-red-500 via-green-500 to-blue-500' },
  { name: 'Rainbow', value: 'jump_red_green_blue_yellow_cyan_magenta_white', gradient: 'from-red-500 via-yellow-500 to-purple-500' },
  { name: 'Crossfade Red', value: 'crossfade_red', gradient: 'from-red-400 to-red-600' },
  { name: 'Crossfade Green', value: 'crossfade_green', gradient: 'from-green-400 to-green-600' },
  { name: 'Crossfade Blue', value: 'crossfade_blue', gradient: 'from-blue-400 to-blue-600' },
  { name: 'Crossfade Cyan', value: 'crossfade_cyan', gradient: 'from-cyan-400 to-cyan-600' },
  { name: 'Crossfade Magenta', value: 'crossfade_magenta', gradient: 'from-fuchsia-400 to-fuchsia-600' },
  { name: 'Crossfade Yellow', value: 'crossfade_yellow', gradient: 'from-yellow-400 to-yellow-600' },
  { name: 'Crossfade White', value: 'crossfade_white', gradient: 'from-gray-100 to-gray-300' },
  { name: 'Crossfade RG', value: 'crossfade_red_green', gradient: 'from-red-500 to-green-500' },
  { name: 'Crossfade RB', value: 'crossfade_red_blue', gradient: 'from-red-500 to-blue-500' },
  { name: 'Crossfade GB', value: 'crossfade_green_blue', gradient: 'from-green-500 to-blue-500' },
];

// ============ useLongPress Hook ============
function useLongPress(
  onLongPress: () => void,
  onClick?: () => void,
  options: { threshold?: number } = {}
) {
  const { threshold = 500 } = options;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const touchStarted = useRef(false);

  const start = useCallback(() => {
    isLongPressRef.current = false;
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onLongPress();
    }, threshold);
  }, [onLongPress, threshold]);

  const clear = useCallback((shouldTriggerClick = true) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (shouldTriggerClick && !isLongPressRef.current && onClick) {
      onClick();
    }
  }, [onClick]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStarted.current = true;
    start();
  }, [start]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStarted.current) {
      e.preventDefault(); // Prevent ghost click
      touchStarted.current = false;
      clear(true);
    }
  }, [clear]);

  const handleTouchCancel = useCallback(() => {
    touchStarted.current = false;
    clear(false);
  }, [clear]);

  return {
    onMouseDown: start,
    onMouseUp: () => clear(true),
    onMouseLeave: () => clear(false),
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchCancel,
  };
}

// ============ Light Control Modal ============
interface LightControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: LightControlConfig;
  currentBrightness: number;
  currentColor: [number, number, number] | null;
  isOn: boolean;
  callService: (domain: string, service: string, entityId?: string | null, data?: Record<string, any>) => Promise<boolean>;
}

function LightControlModal({
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
    // Only track if the pointer down is directly on the backdrop
    backdropPointerDown.current = e.target === e.currentTarget;
  }, []);

  const handleBackdropPointerUp = useCallback((e: React.PointerEvent) => {
    // Ignore clicks within 300ms of modal opening (prevents ghost clicks from long-press)
    if (Date.now() - modalOpenTime.current < 300) {
      backdropPointerDown.current = false;
      return;
    }
    // Only close if pointer started AND ended on the backdrop itself
    if (backdropPointerDown.current && e.target === e.currentTarget) {
      onClose();
    }
    backdropPointerDown.current = false;
  }, [onClose]);

  const handleBackdropPointerCancel = useCallback(() => {
    backdropPointerDown.current = false;
  }, []);

  // Touch handlers for backdrop - must preventDefault to stop touch passthrough on iOS
  const handleBackdropTouchStart = useCallback((e: React.TouchEvent) => {
    // Only track if touch started directly on backdrop (not on child elements)
    if (e.target === e.currentTarget) {
      backdropPointerDown.current = true;
    }
    // Don't preventDefault here - we want child elements to receive touch
  }, []);

  const handleBackdropTouchEnd = useCallback((e: React.TouchEvent) => {
    // Ignore touches within 300ms of modal opening (prevents ghost clicks from long-press)
    if (Date.now() - modalOpenTime.current < 300) {
      backdropPointerDown.current = false;
      e.preventDefault();
      return;
    }
    // Only close if touch started AND ended on the backdrop itself
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

  // Track the captured pointer ID for proper release
  const capturedPointerId = useRef<number | null>(null);

  // Unified pointer event handlers for slider (works on both touch and mouse)
  const handleSliderPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Capture pointer on the slider container (not e.target which could be a child)
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
      // Release pointer capture on the slider container
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
      // Release pointer capture on the slider container
      if (sliderRef.current && capturedPointerId.current !== null) {
        sliderRef.current.releasePointerCapture(capturedPointerId.current);
        capturedPointerId.current = null;
      }
      isDragging.current = false;
    }
  }, []);

  // Handle lost pointer capture - prevents the event from bubbling and closing modal
  const handleLostPointerCapture = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    // Clean up dragging state if pointer capture was lost unexpectedly
    if (isDragging.current) {
      isDragging.current = false;
      handleBrightnessCommit(brightness);
    }
  }, [brightness, handleBrightnessCommit]);

  // Utility handler to prevent touch/pointer events from bubbling to backdrop
  // This is critical for mobile - without it, touches on buttons bubble up and close the modal
  const stopPropagationHandler = useCallback((e: React.PointerEvent | React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // Click handler wrapper that stops propagation - critical for mobile
  // Without this, onClick events bubble to backdrop and close modal
  const createClickHandler = useCallback(<T extends unknown[]>(handler: (...args: T) => void) => {
    return (e: React.MouseEvent, ...args: T) => {
      e.stopPropagation();
      e.preventDefault();
      handler(...args);
    };
  }, []);

  // Mouse event listeners removed - using pointer events with capture instead

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

  // Don't render anything on server or before mount
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
            // Prevent scroll on backdrop, but allow on modal content
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
              {/* Filled portion - pointer-events-none ensures slider container captures all touch */}
              <motion.div
                className="absolute bottom-0 left-0 right-0 rounded-[40px] pointer-events-none"
                style={{ backgroundColor: isOn ? lightColor : '#4b5563' }}
                animate={{ height: `${isOn ? brightness : 0}%` }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
              {/* Handle - pointer-events-none ensures slider container captures all touch */}
              <motion.div
                className="absolute left-1/2 -translate-x-1/2 w-16 h-2 bg-white/90 rounded-full shadow-lg pointer-events-none"
                animate={{ bottom: `calc(${isOn ? brightness : 0}% - 4px)` }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
              {/* Percentage label */}
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

// Entity IDs from Home Assistant dashboard config
const ENTITIES = {
  climate: 'climate.simon_aire_inc',
  scenes: {
    relax: 'scene.entertainment_relax',
    bright: 'scene.entertainment_bright',
    naturalLight: 'scene.entertainment_natural_light_2',
    dimmed: 'scene.entertainment_dimmed',
    rest: 'scene.entertainment_rest',
    night: 'scene.entertainment_nightlight',
    allOff: 'scene.all_lights_off',
  },
  remotes: {
    appleTV: 'remote.living_room',
    samsungTV: 'remote.tv_samsung_7_series_65',
    padMode: 'input_select.remote_pad_mode',
  },
  media: {
    appleTV: 'media_player.living_room',
    sonos: 'media_player.sonos',
  },
  syncBox: {
    power: 'switch.sync_box_power',
    lightSync: 'switch.sync_box_light_sync',
    dolbyVision: 'switch.sync_box_dolby_vision_compatibility',
    hdmiInput: 'select.sync_box_hdmi_input',
    syncMode: 'select.sync_box_sync_mode',
    intensity: 'select.sync_box_intensity',
    brightness: 'number.sync_box_brightness',
  },
  covers: {
    left: 'cover.left_blind',
    right: 'cover.right_blind',
  },
  switches: {
    bathroom: 'switch.bathroom',
    kitchen: 'switch.kitchen',
  },
  lights: {
    bedroomGroup: 'light.bedroom_group',
    bedside: 'light.bedside',
    bedLED: 'light.elk_bledom02',
    deskLED: 'light.elk_bledom0c',
    kitchenBar: 'light.kitchen_bar',
    entry: 'light.entry',
    entertainment: 'light.entertainment',
  },
  sonos: {
    audioDelay: 'number.sonos_audio_delay',
    balance: 'number.sonos_balance',
    bass: 'number.sonos_bass',
    crossfade: 'switch.sonos_crossfade',
    loudness: 'switch.sonos_loudness',
  },
};

type HAState = Record<string, { state: string; attributes: Record<string, any> }>;
type TabType = 'home' | 'lights' | 'media' | 'climate';

interface SmartHomeWidgetProps {
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2 | 3 | 4;
  className?: string;
}

export function SmartHomeWidget({
  colSpan = 2,
  rowSpan = 3,
  className,
}: SmartHomeWidgetProps) {
  const [states, setStates] = useState<HAState>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lightModal, setLightModal] = useState<LightControlConfig | null>(null);

  const openLightControl = useCallback((config: LightControlConfig) => {
    setLightModal(config);
  }, []);

  const closeLightControl = useCallback(() => {
    setLightModal(null);
  }, []);

  const fetchStates = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const allEntities = [
        ENTITIES.climate,
        ...Object.values(ENTITIES.scenes),
        ...Object.values(ENTITIES.remotes),
        ...Object.values(ENTITIES.media),
        ...Object.values(ENTITIES.syncBox),
        ...Object.values(ENTITIES.covers),
        ...Object.values(ENTITIES.switches),
        ...Object.values(ENTITIES.lights),
        ...Object.values(ENTITIES.sonos),
      ];

      const response = await fetch(
        `/api/homeassistant?entities=${allEntities.join(',')}`
      );

      if (!response.ok) throw new Error('Failed to fetch states');

      const data = await response.json();
      const stateMap: HAState = {};
      data.states?.forEach((s: any) => {
        stateMap[s.entity_id] = { state: s.state, attributes: s.attributes };
      });
      setStates(stateMap);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStates();
    const interval = setInterval(fetchStates, 10000);
    return () => clearInterval(interval);
  }, [fetchStates]);

  const callService = async (
    domain: string,
    service: string,
    entityId?: string | null,
    data?: Record<string, any>
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/homeassistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, service, entity_id: entityId, data }),
      });
      const result = await response.json();
      if (!response.ok) {
        console.error('Service call failed:', result.error);
        return false;
      }
      setTimeout(fetchStates, 500);
      return true;
    } catch (err) {
      console.error('Service call failed:', err);
      return false;
    }
  };

  const getState = (entityId: string) => states[entityId]?.state || 'unavailable';
  const getAttr = (entityId: string, attr: string) => states[entityId]?.attributes?.[attr];
  const isOn = (entityId: string) => getState(entityId) === 'on';
  const toggleEntity = (domain: string, entityId: string) => callService(domain, 'toggle', entityId);
  const activateScene = (entityId: string) => callService('scene', 'turn_on', entityId);

  const sonosVolume = Math.round((getAttr(ENTITIES.media.sonos, 'volume_level') || 0) * 100);
  const sonosMuted = getAttr(ENTITIES.media.sonos, 'is_volume_muted');
  const setVolume = (level: number) => callService('media_player', 'volume_set', ENTITIES.media.sonos, { volume_level: level / 100 });
  const toggleMute = () => callService('media_player', 'volume_mute', ENTITIES.media.sonos, { is_volume_muted: !sonosMuted });

  const tabs: { id: TabType; icon: any; label: string }[] = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'lights', icon: Lightbulb, label: 'Lights' },
    { id: 'media', icon: Tv, label: 'Media' },
    { id: 'climate', icon: Thermometer, label: 'Climate' },
  ];

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
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn('surface-matte overflow-hidden flex flex-col w-full', colSpanClasses[colSpan], rowSpanClasses[rowSpan], className)}
    >
      {/* Header */}
      <div className="widget-header px-4 py-3 border-b border-border-subtle">
        <div className="widget-header-title">
          <Home className="h-4 w-4 text-neon-primary" />
          <h3 className="text-heading text-sm">Smart Home</h3>
        </div>
        <button
          className="btn-icon btn-icon-sm focus-ring"
          onClick={fetchStates}
          disabled={isRefreshing}
          aria-label="Refresh states"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-border-subtle">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors focus-ring',
              activeTab === tab.id
                ? 'text-neon-primary border-b-2 border-neon-primary'
                : 'text-text-muted hover:text-text-primary'
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="h-8 w-8 animate-spin text-text-muted" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <AlertTriangle className="h-8 w-8 text-warning" />
            <p className="text-sm text-text-muted">{error}</p>
            <button className="btn-ghost text-sm focus-ring" onClick={fetchStates}>
              Retry
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {activeTab === 'home' && (
                <HomeTab
                  isOn={isOn}
                  activateScene={activateScene}
                  toggleEntity={toggleEntity}
                  sonosVolume={sonosVolume}
                  sonosMuted={sonosMuted}
                  setVolume={setVolume}
                  toggleMute={toggleMute}
                  callService={callService}
                  openLightControl={openLightControl}
                />
              )}
              {activeTab === 'lights' && (
                <LightsTab
                  isOn={isOn}
                  toggleEntity={toggleEntity}
                  activateScene={activateScene}
                  callService={callService}
                  openLightControl={openLightControl}
                  getAttr={getAttr}
                />
              )}
              {activeTab === 'media' && (
                <MediaTab
                  isOn={isOn}
                  getState={getState}
                  getAttr={getAttr}
                  callService={callService}
                  toggleEntity={toggleEntity}
                  sonosVolume={sonosVolume}
                  sonosMuted={sonosMuted}
                  setVolume={setVolume}
                  toggleMute={toggleMute}
                />
              )}
              {activeTab === 'climate' && (
                <ClimateTab
                  getState={getState}
                  getAttr={getAttr}
                  callService={callService}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Light Control Modal */}
      {lightModal && (
        <LightControlModal
          isOpen={!!lightModal}
          onClose={closeLightControl}
          config={lightModal}
          currentBrightness={Math.round((getAttr(lightModal.entityId, 'brightness') || 0) / 255 * 100)}
          currentColor={getAttr(lightModal.entityId, 'rgb_color') || null}
          isOn={isOn(lightModal.entityId)}
          callService={callService}
        />
      )}
    </motion.div>
  );
}

// ============ Home Tab ============
function HomeTab({ isOn, activateScene, toggleEntity, sonosVolume, sonosMuted, setVolume, toggleMute, callService, openLightControl }: any) {
  const entertainmentLightConfig: LightControlConfig = {
    entityId: ENTITIES.lights.entertainment,
    name: 'Entertainment',
    type: 'hue',
    hasEffects: false,
  };

  return (
    <>
      <section>
        <div className="grid grid-cols-2 gap-2">
          <SceneButton
            icon={Sofa}
            label="Relax"
            gradient="from-cyan-500 to-blue-600"
            onClick={() => activateScene(ENTITIES.scenes.relax)}
            onLongPress={() => openLightControl(entertainmentLightConfig)}
          />
          <SceneButton
            icon={Sun}
            label="Bright"
            gradient="from-amber-400 to-yellow-500"
            onClick={() => activateScene(ENTITIES.scenes.bright)}
            onLongPress={() => openLightControl(entertainmentLightConfig)}
          />
          <SceneButton
            icon={Palette}
            label="Natural Light"
            gradient="from-green-400 to-teal-500"
            onClick={() => activateScene(ENTITIES.scenes.naturalLight)}
            onLongPress={() => openLightControl(entertainmentLightConfig)}
          />
          <SceneButton icon={Power} label="All Off" gradient="from-slate-600 to-slate-800" onClick={() => activateScene(ENTITIES.scenes.allOff)} />
        </div>
      </section>

      <section>
        <div className="grid grid-cols-2 gap-2">
          <EntityButton icon={Bath} label="Bathroom" isActive={isOn(ENTITIES.switches.bathroom)} activeColor="cyan" onClick={() => toggleEntity('switch', ENTITIES.switches.bathroom)} />
          <EntityButton icon={UtensilsCrossed} label="Kitchen" isActive={isOn(ENTITIES.switches.kitchen)} activeColor="amber" onClick={() => toggleEntity('switch', ENTITIES.switches.kitchen)} />
        </div>
      </section>

      <section>
        <div className="grid grid-cols-3 gap-2">
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => callService('cover', 'open_cover', null, { entity_id: [ENTITIES.covers.left, ENTITIES.covers.right] })}
            className="py-4 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg border border-white/10 flex flex-col items-center justify-center gap-1.5"
          >
            <PanelTopOpen className="h-6 w-6" />
            <div className="flex gap-0.5">
              <div className="w-3 h-1 bg-white/80 rounded-full" />
              <div className="w-3 h-1 bg-white/80 rounded-full" />
              <div className="w-3 h-1 bg-white/80 rounded-full" />
            </div>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => callService('cover', 'set_cover_position', null, { entity_id: [ENTITIES.covers.left, ENTITIES.covers.right], position: 50 })}
            className="py-4 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg border border-white/10 flex flex-col items-center justify-center gap-1.5"
          >
            <SunDim className="h-6 w-6" />
            <div className="flex gap-0.5">
              <div className="w-3 h-2 bg-white/60 rounded-sm" />
              <div className="w-3 h-2 bg-white/60 rounded-sm" />
              <div className="w-3 h-2 bg-white/60 rounded-sm" />
            </div>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => callService('cover', 'close_cover', null, { entity_id: [ENTITIES.covers.left, ENTITIES.covers.right] })}
            className="py-4 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-lg border border-white/10 flex flex-col items-center justify-center gap-1.5"
          >
            <PanelBottomClose className="h-6 w-6" />
            <div className="flex gap-0.5">
              <div className="w-3 h-3 bg-white/40 rounded-sm" />
              <div className="w-3 h-3 bg-white/40 rounded-sm" />
              <div className="w-3 h-3 bg-white/40 rounded-sm" />
            </div>
          </motion.button>
        </div>
      </section>

      <section>
        <div className="card-item p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <motion.div
                animate={!sonosMuted ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Speaker className="h-5 w-5 text-info" />
              </motion.div>
              <span className="text-base font-semibold text-text-primary">{sonosMuted ? 'Muted' : `${sonosVolume}%`}</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleMute}
              className={cn(
                'h-9 w-9 rounded-full flex items-center justify-center transition-all focus-ring',
                sonosMuted
                  ? 'bg-danger/20 text-danger border border-danger/30'
                  : 'bg-surface-2 border border-border-subtle hover:border-white/20'
              )}
              aria-label={sonosMuted ? 'Unmute' : 'Mute'}
            >
              {sonosMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </motion.button>
          </div>
          <div className="h-2 bg-border-subtle rounded-full overflow-hidden mb-4">
            <motion.div
              className="h-full bg-gradient-to-r from-info to-cyan-400 rounded-full"
              animate={{ width: `${sonosMuted ? 0 : sonosVolume}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            />
          </div>
          <div className="grid grid-cols-5 gap-2">
            {[
              { level: 15, label: 'Sleep', color: 'from-purple-600 to-violet-600' },
              { level: 20, label: 'Chat', color: 'from-cyan-500 to-teal-500' },
              { level: 40, label: 'Music', color: 'from-orange-500 to-amber-500' },
              { level: 70, label: 'Party', color: 'from-green-500 to-emerald-500' },
              { level: 90, label: 'Max', color: 'from-red-500 to-rose-500' },
            ].map((preset) => (
              <motion.button
                key={preset.level}
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setVolume(preset.level)}
                className={cn(
                  'py-2.5 rounded-lg text-[10px] font-semibold transition-all bg-gradient-to-br text-white shadow-md',
                  'border border-white/10 hover:shadow-lg',
                  preset.color,
                  sonosVolume === preset.level && 'ring-2 ring-white ring-offset-2 ring-offset-transparent scale-105'
                )}
              >
                {preset.label}
              </motion.button>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

// ============ Lights Tab ============
function LightsTab({ isOn, toggleEntity, activateScene, callService, openLightControl, getAttr }: any) {
  const entertainmentConfig: LightControlConfig = {
    entityId: ENTITIES.lights.entertainment,
    name: 'Entertainment',
    type: 'hue',
    hasEffects: false,
  };

  const bedsideConfig: LightControlConfig = {
    entityId: ENTITIES.lights.bedside,
    name: 'Bedside Lamp',
    type: 'hue',
    hasEffects: false,
  };

  const bedLEDConfig: LightControlConfig = {
    entityId: ENTITIES.lights.bedLED,
    name: 'Bed LED Strip',
    type: 'led_strip',
    hasEffects: true,
  };

  const kitchenBarConfig: LightControlConfig = {
    entityId: ENTITIES.lights.kitchenBar,
    name: 'Kitchen Bar',
    type: 'hue',
    hasEffects: false,
  };

  const entryConfig: LightControlConfig = {
    entityId: ENTITIES.lights.entry,
    name: 'Entry',
    type: 'hue',
    hasEffects: false,
  };

  const deskLEDConfig: LightControlConfig = {
    entityId: ENTITIES.lights.deskLED,
    name: 'Desk LED Strip',
    type: 'led_strip',
    hasEffects: true,
  };

  const bedroomIsOn = isOn(ENTITIES.lights.bedside) || isOn(ENTITIES.lights.bedLED);
  
  const toggleBedroom = () => {
    if (bedroomIsOn) {
      callService('light', 'turn_off', ENTITIES.lights.bedside);
      callService('light', 'turn_off', ENTITIES.lights.bedLED);
    } else {
      callService('light', 'turn_on', ENTITIES.lights.bedside);
      callService('light', 'turn_on', ENTITIES.lights.bedLED);
    }
  };

  return (
    <>
      <section>
        <div className="grid grid-cols-3 gap-2">
          <SceneButton icon={Sun} label="Bright" gradient="from-amber-400 to-yellow-500" onClick={() => activateScene(ENTITIES.scenes.bright)} onLongPress={() => openLightControl(entertainmentConfig)} size="sm" />
          <SceneButton icon={Sofa} label="Relax" gradient="from-pink-500 to-rose-500" onClick={() => activateScene(ENTITIES.scenes.relax)} onLongPress={() => openLightControl(entertainmentConfig)} size="sm" />
          <SceneButton icon={SunDim} label="Dimmed" gradient="from-orange-400 to-amber-600" onClick={() => activateScene(ENTITIES.scenes.dimmed)} onLongPress={() => openLightControl(entertainmentConfig)} size="sm" />
          <SceneButton icon={Bed} label="Rest" gradient="from-purple-500 to-violet-600" onClick={() => activateScene(ENTITIES.scenes.rest)} onLongPress={() => openLightControl(entertainmentConfig)} size="sm" />
          <SceneButton icon={Sparkles} label="Night" gradient="from-blue-500 to-indigo-600" onClick={() => activateScene(ENTITIES.scenes.night)} onLongPress={() => openLightControl(entertainmentConfig)} size="sm" />
          <SceneButton icon={Palette} label="Natural Light" gradient="from-green-400 to-teal-500" onClick={() => activateScene(ENTITIES.scenes.naturalLight)} onLongPress={() => openLightControl(entertainmentConfig)} size="sm" />
        </div>
      </section>

      <section>
        <div className="space-y-2">
          <EntityButton icon={Bed} label="Bedroom" isActive={bedroomIsOn} activeColor="teal" onClick={toggleBedroom} fullWidth />
          <div className="grid grid-cols-2 gap-2">
            <EntityButton icon={Lamp} label="Bedside Lamp" isActive={isOn(ENTITIES.lights.bedside)} activeColor="amber" onClick={() => toggleEntity('light', ENTITIES.lights.bedside)} onLongPress={() => openLightControl(bedsideConfig)} />
            <EntityButton icon={Waves} label="Bed LED Strip" isActive={isOn(ENTITIES.lights.bedLED)} activeColor="violet" onClick={() => toggleEntity('light', ENTITIES.lights.bedLED)} onLongPress={() => openLightControl(bedLEDConfig)} />
          </div>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-2 gap-2">
          <EntityButton icon={UtensilsCrossed} label="Kitchen Bar" isActive={isOn(ENTITIES.lights.kitchenBar)} activeColor="orange" onClick={() => toggleEntity('light', ENTITIES.lights.kitchenBar)} onLongPress={() => openLightControl(kitchenBarConfig)} />
          <EntityButton icon={DoorOpen} label="Entry" isActive={isOn(ENTITIES.lights.entry)} activeColor="sky" onClick={() => toggleEntity('light', ENTITIES.lights.entry)} onLongPress={() => openLightControl(entryConfig)} />
          <EntityButton icon={Bath} label="Bathroom" isActive={isOn(ENTITIES.switches.bathroom)} activeColor="cyan" onClick={() => toggleEntity('switch', ENTITIES.switches.bathroom)} />
          <EntityButton icon={Lightbulb} label="Kitchen" isActive={isOn(ENTITIES.switches.kitchen)} activeColor="yellow" onClick={() => toggleEntity('switch', ENTITIES.switches.kitchen)} />
        </div>
      </section>

      <section>
        <EntityButton icon={Monitor} label="Desk LED Strip" isActive={isOn(ENTITIES.lights.deskLED)} activeColor="fuchsia" onClick={() => toggleEntity('light', ENTITIES.lights.deskLED)} onLongPress={() => openLightControl(deskLEDConfig)} fullWidth />
        <div className="grid grid-cols-4 gap-2 mt-3">
          {[
            { name: 'Gaming', color: '#FF0000', gradient: 'from-red-600 to-red-800' },
            { name: 'Chill', color: '#0064FF', gradient: 'from-blue-500 to-blue-700' },
            { name: 'Focus', temp: 4500, gradient: 'from-gray-100 to-gray-300', dark: true },
            { name: 'Night', color: '#FF3200', gradient: 'from-orange-600 to-red-700' },
          ].map((mode) => (
            <motion.button
              key={mode.name}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              onClick={() => {
                if (mode.color) {
                  const r = parseInt(mode.color.slice(1, 3), 16);
                  const g = parseInt(mode.color.slice(3, 5), 16);
                  const b = parseInt(mode.color.slice(5, 7), 16);
                  callService('light', 'turn_on', ENTITIES.lights.deskLED, { rgb_color: [r, g, b], brightness_pct: 80 });
                } else if (mode.temp) {
                  callService('light', 'turn_on', ENTITIES.lights.deskLED, { color_temp_kelvin: mode.temp, brightness_pct: 85 });
                }
              }}
              className={cn(
                'py-3 rounded-xl text-[11px] font-semibold bg-gradient-to-br text-white shadow-md hover:shadow-lg',
                'border border-white/10 transition-all',
                mode.gradient,
                mode.dark && 'text-gray-800'
              )}
            >
              {mode.name}
            </motion.button>
          ))}
        </div>
      </section>
    </>
  );
}

// ============ Media Tab ============
function MediaTab({ isOn, getState, callService, toggleEntity, sonosVolume, sonosMuted, setVolume, toggleMute }: any) {
  const syncBoxPower = isOn(ENTITIES.syncBox.power);
  const lightSync = isOn(ENTITIES.syncBox.lightSync);
  const dolbyVision = isOn(ENTITIES.syncBox.dolbyVision);
  const syncMode = getState(ENTITIES.syncBox.syncMode);
  const intensity = getState(ENTITIES.syncBox.intensity);

  return (
    <>
      <section>
        <div className="grid grid-cols-3 gap-2">
          <ActionButton icon={Tv} label="TV Power" gradient="from-red-500 to-rose-600" onClick={() => callService('homeassistant', 'toggle', ENTITIES.remotes.samsungTV)} />
          <ActionButton icon={CircleDot} label="Apple TV" gradient="from-gray-700 to-gray-900" onClick={async () => {
            // Turn on Samsung TV
            await callService('remote', 'turn_on', ENTITIES.remotes.samsungTV);
            // Turn on Hue Sync Box
            await callService('switch', 'turn_on', ENTITIES.syncBox.power);
            // Set HDMI input to Apple TV
            await callService('select', 'select_option', ENTITIES.syncBox.hdmiInput, { option: 'APPLE TV' });
            // Wake Apple TV and go to home
            await callService('remote', 'turn_on', ENTITIES.remotes.appleTV);
            setTimeout(() => callService('remote', 'send_command', ENTITIES.remotes.appleTV, { command: 'home' }), 1000);
          }} />
          <ActionButton icon={Gamepad2} label="Nintendo" gradient="from-red-600 to-red-800" onClick={async () => {
            // Turn on Samsung TV
            await callService('remote', 'turn_on', ENTITIES.remotes.samsungTV);
            // Turn on Hue Sync Box
            await callService('switch', 'turn_on', ENTITIES.syncBox.power);
            // Set HDMI input to Nintendo Switch
            await callService('select', 'select_option', ENTITIES.syncBox.hdmiInput, { option: 'Nintendo Switch' });
          }} />
        </div>
      </section>

      <section>
        <div className="card-item rounded-xl p-3 space-y-3">
          {/* Navigation D-Pad - Edge to Edge */}
          <div className="grid grid-cols-3 gap-1.5">
            {/* Top Row */}
            <motion.button
              whileTap={{ scale: 0.95, backgroundColor: 'rgba(255,255,255,0.1)' }}
              onClick={() => callService('remote', 'send_command', ENTITIES.remotes.appleTV, { command: 'menu' })}
              className="h-14 rounded-xl bg-gradient-to-br from-gray-700/80 to-gray-800/80 border border-glass-border flex items-center justify-center gap-2 text-white/80 hover:text-white hover:border-white/20 transition-all"
            >
              <Undo2 className="h-4 w-4" />
              <span className="text-xs font-medium">Back</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95, backgroundColor: 'rgba(59,130,246,0.3)' }}
              onClick={() => callService('remote', 'send_command', ENTITIES.remotes.appleTV, { command: 'up' })}
              className="h-14 rounded-xl bg-gradient-to-b from-gray-600/80 to-gray-700/80 border border-glass-border flex items-center justify-center text-white hover:border-blue-500/50 hover:from-blue-600/30 hover:to-blue-700/30 transition-all"
            >
              <ChevronUp className="h-7 w-7" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95, backgroundColor: 'rgba(255,255,255,0.1)' }}
              onClick={() => callService('remote', 'send_command', ENTITIES.remotes.appleTV, { command: 'home' })}
              className="h-14 rounded-xl bg-gradient-to-br from-gray-700/80 to-gray-800/80 border border-glass-border flex items-center justify-center gap-2 text-white/80 hover:text-white hover:border-white/20 transition-all"
            >
              <Tv className="h-4 w-4" />
              <span className="text-xs font-medium">Home</span>
            </motion.button>

            {/* Middle Row */}
            <motion.button
              whileTap={{ scale: 0.95, backgroundColor: 'rgba(59,130,246,0.3)' }}
              onClick={() => callService('remote', 'send_command', ENTITIES.remotes.appleTV, { command: 'left' })}
              className="h-16 rounded-xl bg-gradient-to-r from-gray-600/80 to-gray-700/80 border border-glass-border flex items-center justify-center text-white hover:border-blue-500/50 hover:from-blue-600/30 hover:to-blue-700/30 transition-all"
            >
              <ChevronLeft className="h-7 w-7" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => callService('remote', 'send_command', ENTITIES.remotes.appleTV, { command: 'select' })}
              className="h-16 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-blue-400/30 shadow-lg shadow-blue-500/20 flex items-center justify-center text-white hover:shadow-blue-500/40 hover:border-blue-400/50 transition-all"
            >
              <span className="text-sm font-bold">OK</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95, backgroundColor: 'rgba(59,130,246,0.3)' }}
              onClick={() => callService('remote', 'send_command', ENTITIES.remotes.appleTV, { command: 'right' })}
              className="h-16 rounded-xl bg-gradient-to-l from-gray-600/80 to-gray-700/80 border border-glass-border flex items-center justify-center text-white hover:border-blue-500/50 hover:from-blue-600/30 hover:to-blue-700/30 transition-all"
            >
              <ChevronRight className="h-7 w-7" />
            </motion.button>

            {/* Bottom Row */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => callService('remote', 'send_command', ENTITIES.remotes.appleTV, { command: 'skip_backward' })}
              className="h-14 rounded-xl bg-gradient-to-br from-gray-700/80 to-gray-800/80 border border-glass-border flex items-center justify-center text-white/80 hover:text-white hover:border-white/20 transition-all"
            >
              <SkipBack className="h-5 w-5" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95, backgroundColor: 'rgba(59,130,246,0.3)' }}
              onClick={() => callService('remote', 'send_command', ENTITIES.remotes.appleTV, { command: 'down' })}
              className="h-14 rounded-xl bg-gradient-to-t from-gray-600/80 to-gray-700/80 border border-glass-border flex items-center justify-center text-white hover:border-blue-500/50 hover:from-blue-600/30 hover:to-blue-700/30 transition-all"
            >
              <ChevronDown className="h-7 w-7" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => callService('remote', 'send_command', ENTITIES.remotes.appleTV, { command: 'skip_forward' })}
              className="h-14 rounded-xl bg-gradient-to-br from-gray-700/80 to-gray-800/80 border border-glass-border flex items-center justify-center text-white/80 hover:text-white hover:border-white/20 transition-all"
            >
              <SkipForward className="h-5 w-5" />
            </motion.button>
          </div>

          {/* Playback Controls */}
          <div className="grid grid-cols-3 gap-1.5">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => callService('media_player', 'media_previous_track', ENTITIES.media.appleTV)}
              className="h-12 rounded-xl bg-surface-2 border border-border-subtle flex items-center justify-center gap-2 text-white/70 hover:text-white hover:border-white/20 transition-all"
            >
              <SkipBack className="h-4 w-4" />
              <span className="text-xs">Prev</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => callService('media_player', 'media_play_pause', ENTITIES.media.appleTV)}
              className="h-12 rounded-xl bg-gradient-to-br from-green-600 to-green-700 border border-green-400/20 shadow-md flex items-center justify-center text-white hover:shadow-green-500/30 transition-all"
            >
              <Play className="h-5 w-5 mr-[-2px]" />
              <Pause className="h-5 w-5 ml-[-2px]" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => callService('media_player', 'media_next_track', ENTITIES.media.appleTV)}
              className="h-12 rounded-xl bg-surface-2 border border-border-subtle flex items-center justify-center gap-2 text-white/70 hover:text-white hover:border-white/20 transition-all"
            >
              <span className="text-xs">Next</span>
              <SkipForward className="h-4 w-4" />
            </motion.button>
          </div>

          {/* App Shortcuts - 2 Rows with Brand Logos */}
          <div className="space-y-1.5">
            <div className="grid grid-cols-4 gap-1.5">
              {/* YouTube - Red with play button logo */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => callService('media_player', 'select_source', ENTITIES.media.appleTV, { source: 'YouTube' })}
                className="h-11 rounded-xl bg-[#FF0000] text-white shadow-md border border-white/10 flex items-center justify-center"
                title="YouTube"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </motion.button>
              {/* Netflix - Red N logo */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => callService('media_player', 'select_source', ENTITIES.media.appleTV, { source: 'Netflix' })}
                className="h-11 rounded-xl bg-[#141414] text-[#E50914] shadow-md border border-white/10 flex items-center justify-center"
                title="Netflix"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                  <path d="M5.398 0v.006c3.028 8.556 5.37 15.175 8.348 23.596 2.344.058 4.85.398 4.854.398-2.8-7.924-5.923-16.747-8.487-24zm8.489 0v9.63L18.6 22.951c-.043-7.86-.004-15.913.002-22.95zM5.398 1.05V24c1.873-.225 2.81-.312 4.715-.398v-9.22z"/>
                </svg>
              </motion.button>
              {/* Disney+ - Blue with Disney logo */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => callService('media_player', 'select_source', ENTITIES.media.appleTV, { source: 'Disney+' })}
                className="h-11 rounded-xl bg-[#0063e5] text-white shadow-md border border-white/10 flex items-center justify-center"
                title="Disney+"
              >
                <svg viewBox="0 0 52 24" className="h-5 w-10" fill="white">
                  <text x="2" y="17" fontSize="14" fontWeight="bold" fontFamily="system-ui" fontStyle="italic">Disney</text>
                  <text x="42" y="17" fontSize="12" fontWeight="bold" fontFamily="system-ui">+</text>
                </svg>
              </motion.button>
              {/* Apple TV+ - Black with Apple logo */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => callService('media_player', 'select_source', ENTITIES.media.appleTV, { source: 'Apple TV+' })}
                className="h-11 rounded-xl bg-black text-white shadow-md border border-white/20 flex items-center justify-center gap-0.5"
                title="Apple TV+"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <span className="text-[10px] font-bold">tv+</span>
              </motion.button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {/* Prime Video - Dark with smile arrow */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => callService('media_player', 'select_source', ENTITIES.media.appleTV, { source: 'Prime Video' })}
                className="h-11 rounded-xl bg-[#232F3E] shadow-md border border-white/10 flex flex-col items-center justify-center py-1"
                title="Prime Video"
              >
                <span className="text-white text-[9px] font-medium tracking-tight">prime</span>
                <svg viewBox="0 0 40 12" className="w-8 h-3 -mt-0.5">
                  <path fill="#00A8E1" d="M2 8 Q20 14 38 8" strokeWidth="2.5" stroke="#00A8E1" strokeLinecap="round" fillOpacity="0"/>
                  <path fill="#00A8E1" d="M34 4 L38 8 L34 6 Z"/>
                </svg>
              </motion.button>
              {/* Spotify - Green with logo */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => callService('media_player', 'select_source', ENTITIES.media.appleTV, { source: 'Spotify' })}
                className="h-11 rounded-xl bg-[#191414] text-[#1DB954] shadow-md border border-white/10 flex items-center justify-center"
                title="Spotify"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
              </motion.button>
              {/* Kiwi+ (Kiwidisk) - Yellow with white text */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => callService('media_player', 'select_source', ENTITIES.media.appleTV, { source: 'Kiwi+' })}
                className="h-11 rounded-xl bg-[#FFEB3B] shadow-md border border-white/10 flex items-center justify-center gap-0.5 px-2"
                title="Kiwi+ (Korean Streaming)"
              >
                <span className="text-white font-bold text-sm drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]" style={{ fontFamily: 'system-ui', letterSpacing: '-0.5px' }}>kiwi</span>
                <span className="text-[#E91E63] text-lg font-bold -mt-2 -ml-0.5">•</span>
                <span className="text-[#7CB342] font-bold text-base ml-0.5">+</span>
              </motion.button>
              {/* Sleep Mode - Power off all media */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={async () => {
                  await callService('remote', 'turn_off', ENTITIES.remotes.appleTV);
                  await callService('switch', 'turn_off', ENTITIES.syncBox.power);
                  await callService('remote', 'turn_off', ENTITIES.remotes.samsungTV);
                }}
                className="h-11 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-md border border-white/10 flex items-center justify-center gap-1.5 hover:from-red-900 hover:to-red-950 transition-all"
                title="Turn off all media devices"
              >
                <Power className="h-4 w-4" />
                <span className="text-[10px] font-semibold">Sleep</span>
              </motion.button>
            </div>
          </div>
        </div>
      </section>

      {/* Sonos Volume - No header */}
      <section>
        <div className="card-item rounded-xl p-4">
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setVolume(Math.max(0, sonosVolume - 5))}
              className="h-10 w-10 rounded-full bg-surface-2 border border-border-subtle hover:border-white/20 flex items-center justify-center transition-all"
            >
              <Volume1 className="h-4 w-4" />
            </motion.button>
            <div className="flex-1 relative">
              <input
                type="range"
                min={0}
                max={100}
                value={sonosMuted ? 0 : sonosVolume}
                onChange={(e) => setVolume(parseInt(e.target.value))}
                className="w-full h-3 bg-glass-border rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-blue-500 [&::-webkit-slider-thumb]:to-cyan-400 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/30"
                style={{ background: `linear-gradient(to right, rgb(59 130 246) 0%, rgb(34 211 238) ${sonosMuted ? 0 : sonosVolume}%, rgba(255,255,255,0.15) ${sonosMuted ? 0 : sonosVolume}%)` }}
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setVolume(Math.min(100, sonosVolume + 5))}
              className="h-10 w-10 rounded-full bg-surface-2 border border-border-subtle hover:border-white/20 flex items-center justify-center transition-all"
            >
              <Volume2 className="h-4 w-4" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleMute}
              className={cn(
                'h-10 w-10 rounded-full flex items-center justify-center transition-all',
                sonosMuted
                  ? 'bg-red-500/20 text-red-400 border-2 border-red-500/50'
                  : 'bg-surface-2 border border-border-subtle hover:border-white/20'
              )}
              title={sonosMuted ? 'Unmute' : 'Mute'}
            >
              {sonosMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </motion.button>
          </div>
          <div className="text-center mt-2 text-sm font-medium">{sonosMuted ? <span className="text-red-400">Muted</span> : `${sonosVolume}%`}</div>
        </div>
      </section>

      <HueSyncBoxCard
        syncBoxPower={syncBoxPower}
        lightSync={lightSync}
        dolbyVision={dolbyVision}
        syncMode={syncMode}
        intensity={intensity}
        toggleEntity={toggleEntity}
        callService={callService}
      />
    </>
  );
}

// ============ Hue Sync Box Card (Collapsible) ============
function HueSyncBoxCard({ syncBoxPower, lightSync, dolbyVision, syncMode, intensity, toggleEntity, callService }: any) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section>
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "w-full flex items-center justify-center gap-3 py-3 rounded-xl transition-all",
          isExpanded 
            ? "bg-gradient-to-r from-fuchsia-600/20 to-purple-600/20 border border-fuchsia-500/30"
            : "bg-surface-2 border border-border-subtle hover:border-fuchsia-500/30"
        )}
      >
        <motion.div
          animate={syncBoxPower ? { opacity: [0.5, 1, 0.5] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Palette className={cn("h-5 w-5", syncBoxPower ? "text-fuchsia-400" : "text-muted-foreground")} />
        </motion.div>
        <span className={cn("text-sm font-medium", isExpanded ? "text-white" : "text-muted-foreground")}>
          {syncBoxPower ? "Hue Sync Active" : "Hue Sync Box"}
        </span>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className={cn("h-4 w-4", isExpanded ? "text-white" : "text-muted-foreground")} />
        </motion.div>
      </motion.button>
      
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="card-item rounded-xl p-4 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <EntityButton icon={Power} label="Power" isActive={syncBoxPower} activeColor="green" onClick={() => toggleEntity('switch', ENTITIES.syncBox.power)} />
                <EntityButton icon={Zap} label="Sync" isActive={lightSync} activeColor="fuchsia" onClick={() => toggleEntity('switch', ENTITIES.syncBox.lightSync)} />
                <EntityButton icon={Film} label="Dolby" isActive={dolbyVision} activeColor="amber" onClick={() => toggleEntity('switch', ENTITIES.syncBox.dolbyVision)} />
              </div>
              <div>
                <span className="text-xs text-muted-foreground mb-2 block">Sync Mode: <span className="text-white font-medium capitalize">{syncMode}</span></span>
                <div className="grid grid-cols-3 gap-2">
                  {['video', 'music', 'game'].map((mode) => (
                    <motion.button
                      key={mode}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => callService('select', 'select_option', ENTITIES.syncBox.syncMode, { option: mode })}
                      className={cn(
                        'py-2.5 rounded-lg text-xs font-medium transition-all capitalize',
                        syncMode === mode
                          ? 'bg-neon-primary text-white shadow-lg shadow-neon-primary/30 border border-white/20'
                          : 'bg-surface-2 border border-border-subtle text-muted-foreground hover:text-white hover:border-white/20'
                      )}
                    >
                      {mode}
                    </motion.button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground mb-2 block">Intensity: <span className="text-amber-400 font-medium capitalize">{intensity}</span></span>
                <div className="grid grid-cols-4 gap-2">
                  {['subtle', 'moderate', 'high', 'intense'].map((level) => (
                    <motion.button
                      key={level}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => callService('select', 'select_option', ENTITIES.syncBox.intensity, { option: level })}
                      className={cn(
                        'py-2 rounded-lg text-[10px] font-medium transition-all capitalize',
                        intensity === level
                          ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 border border-white/20'
                          : 'bg-surface-2 border border-border-subtle text-muted-foreground hover:text-white hover:border-white/20'
                      )}
                    >
                      {level}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// ============ Climate Tab ============
function ClimateTab({ getState, getAttr, callService }: any) {
  const currentTemp = getAttr(ENTITIES.climate, 'current_temperature');
  const targetTemp = getAttr(ENTITIES.climate, 'temperature');
  const hvacMode = getState(ENTITIES.climate);
  const hvacAction = getAttr(ENTITIES.climate, 'hvac_action');

  const setClimateTemp = (temp: number) => callService('climate', 'set_temperature', ENTITIES.climate, { temperature: temp });

  return (
    <>
      <section>
        <div className="card-item rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-3xl font-bold">{currentTemp || '--'}°</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Target</p>
              <p className="text-2xl font-semibold text-neon-primary">{targetTemp || '--'}°</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-6 mb-5">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              onClick={() => setClimateTemp((targetTemp || 70) - 1)}
              className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 flex items-center justify-center hover:border-blue-400/50 transition-all shadow-lg"
            >
              <ChevronDown className="h-7 w-7 text-blue-400" />
            </motion.button>
            <div className="flex flex-col items-center">
              <motion.div
                animate={hvacAction === 'heating' || hvacAction === 'cooling' ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Thermometer className={cn('h-10 w-10 mb-2', hvacAction === 'heating' && 'text-orange-500', hvacAction === 'cooling' && 'text-blue-500', hvacAction === 'idle' && 'text-muted-foreground')} />
              </motion.div>
              <span className={cn(
                'text-sm font-medium capitalize',
                hvacAction === 'heating' && 'text-orange-400',
                hvacAction === 'cooling' && 'text-blue-400',
                hvacAction === 'idle' && 'text-muted-foreground'
              )}>{hvacAction || hvacMode}</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              onClick={() => setClimateTemp((targetTemp || 70) + 1)}
              className="h-14 w-14 rounded-full bg-gradient-to-br from-orange-500/20 to-red-600/20 border border-orange-500/30 flex items-center justify-center hover:border-orange-400/50 transition-all shadow-lg"
            >
              <ChevronUp className="h-7 w-7 text-orange-400" />
            </motion.button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { mode: 'off', label: 'Off' },
              { mode: 'heat_cool', label: 'Heat/Cool' },
            ].map(({ mode, label }) => (
              <motion.button
                key={mode}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => callService('climate', 'set_hvac_mode', ENTITIES.climate, { hvac_mode: mode })}
                className={cn(
                  'py-2.5 rounded-xl text-xs font-medium transition-all',
                  hvacMode === mode
                    ? 'bg-neon-primary text-white shadow-lg shadow-neon-primary/30 border border-white/20'
                    : 'bg-surface-2 border border-border-subtle text-muted-foreground hover:text-white hover:border-white/20'
                )}
              >
                {label}
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <CoverControl label="Left Window" state={getState(ENTITIES.covers.left)} onOpen={() => callService('cover', 'open_cover', ENTITIES.covers.left)} onClose={() => callService('cover', 'close_cover', ENTITIES.covers.left)} onStop={() => callService('cover', 'stop_cover', ENTITIES.covers.left)} />
            <CoverControl label="Right Window" state={getState(ENTITIES.covers.right)} onOpen={() => callService('cover', 'open_cover', ENTITIES.covers.right)} onClose={() => callService('cover', 'close_cover', ENTITIES.covers.right)} onStop={() => callService('cover', 'stop_cover', ENTITIES.covers.right)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <motion.button
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => callService('cover', 'open_cover', null, { entity_id: [ENTITIES.covers.left, ENTITIES.covers.right] })}
              className="py-3.5 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg border border-white/10 flex flex-col items-center justify-center gap-1"
            >
              <PanelTopOpen className="h-5 w-5" />
              <div className="flex gap-0.5">
                <div className="w-2.5 h-0.5 bg-white/80 rounded-full" />
                <div className="w-2.5 h-0.5 bg-white/80 rounded-full" />
                <div className="w-2.5 h-0.5 bg-white/80 rounded-full" />
              </div>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => callService('cover', 'set_cover_position', null, { entity_id: [ENTITIES.covers.left, ENTITIES.covers.right], position: 50 })}
              className="py-3.5 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg border border-white/10 flex flex-col items-center justify-center gap-1"
            >
              <SunDim className="h-5 w-5" />
              <div className="flex gap-0.5">
                <div className="w-2.5 h-1.5 bg-white/60 rounded-sm" />
                <div className="w-2.5 h-1.5 bg-white/60 rounded-sm" />
                <div className="w-2.5 h-1.5 bg-white/60 rounded-sm" />
              </div>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => callService('cover', 'close_cover', null, { entity_id: [ENTITIES.covers.left, ENTITIES.covers.right] })}
              className="py-3.5 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-lg border border-white/10 flex flex-col items-center justify-center gap-1"
            >
              <PanelBottomClose className="h-5 w-5" />
              <div className="flex gap-0.5">
                <div className="w-2.5 h-2.5 bg-white/40 rounded-sm" />
                <div className="w-2.5 h-2.5 bg-white/40 rounded-sm" />
                <div className="w-2.5 h-2.5 bg-white/40 rounded-sm" />
              </div>
            </motion.button>
          </div>
        </div>
      </section>
    </>
  );
}

// ============ Reusable Components ============

function SceneButton({ icon: Icon, label, gradient, onClick, onLongPress, size = 'md' }: any) {
  const longPressHandlers = useLongPress(
    onLongPress || (() => {}),
    onClick,
    { threshold: 500 }
  );

  const handlers = onLongPress ? longPressHandlers : { onClick };

  return (
    <motion.button
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      {...handlers}
      className={cn(
        'rounded-xl bg-gradient-to-br text-white flex flex-col items-center justify-center gap-1.5 transition-all shadow-lg hover:shadow-xl',
        'active:shadow-md backdrop-blur-sm border border-white/10 select-none',
        gradient,
        size === 'sm' ? 'py-3 px-3 min-h-[52px]' : 'py-4 px-4 min-h-[64px]'
      )}
    >
      <Icon className={cn('drop-shadow-sm', size === 'sm' ? 'h-5 w-5' : 'h-6 w-6')} />
      <span className={cn('font-semibold tracking-wide', size === 'sm' ? 'text-[10px]' : 'text-xs')}>{label}</span>
    </motion.button>
  );
}

function EntityButton({ icon: Icon, label, isActive, activeColor = 'neon', onClick, onLongPress, fullWidth = false }: any) {
  const longPressHandlers = useLongPress(
    onLongPress || (() => {}),
    onClick,
    { threshold: 500 }
  );

  const handlers = onLongPress ? longPressHandlers : { onClick };

  const activeClasses: Record<string, string> = {
    cyan: 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-cyan-500/40',
    amber: 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/40',
    teal: 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/40',
    violet: 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/40',
    fuchsia: 'bg-gradient-to-br from-fuchsia-500 to-pink-600 shadow-fuchsia-500/40',
    orange: 'bg-gradient-to-br from-orange-500 to-red-600 shadow-orange-500/40',
    sky: 'bg-gradient-to-br from-sky-400 to-blue-500 shadow-sky-500/40',
    yellow: 'bg-gradient-to-br from-yellow-400 to-amber-500 shadow-yellow-500/40',
    green: 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/40',
    neon: 'bg-neon-primary shadow-neon-primary/40',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      {...handlers}
      className={cn(
        'rounded-xl py-3.5 px-4 flex items-center gap-3 transition-all min-h-[48px] select-none',
        fullWidth && 'w-full justify-center',
        isActive
          ? `${activeClasses[activeColor]} text-white shadow-lg border border-white/20`
          : 'bg-surface-2 border border-border-subtle text-muted-foreground hover:text-white hover:border-white/20 hover:bg-glass-border/50'
      )}
    >
      <motion.div
        animate={isActive ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        <Icon className={cn('h-5 w-5', isActive && 'drop-shadow-sm')} />
      </motion.div>
      <span className="text-sm font-medium">{label}</span>
    </motion.button>
  );
}

function ActionButton({ icon: Icon, label, gradient, onClick }: any) {
  return (
    <motion.button
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      onClick={onClick}
      className={cn(
        'rounded-xl py-3.5 px-4 bg-gradient-to-br text-white flex flex-col items-center justify-center gap-1.5 min-h-[56px]',
        'shadow-lg hover:shadow-xl active:shadow-md border border-white/10 backdrop-blur-sm',
        gradient
      )}
    >
      <Icon className="h-5 w-5 drop-shadow-sm" />
      <span className="text-[11px] font-semibold tracking-wide">{label}</span>
    </motion.button>
  );
}

function RemoteButton({ icon: Icon, label, onClick, size = 'md', color }: any) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      onClick={onClick}
      className={cn(
        'rounded-xl flex items-center justify-center transition-all gap-1.5',
        size === 'lg' ? 'h-14 w-14 shadow-lg' : 'h-11 min-w-[44px]',
        label && !Icon && 'px-4',
        label && Icon && 'px-3',
        color
          ? `bg-gradient-to-br ${color} text-white shadow-md hover:shadow-lg border border-white/10`
          : 'bg-surface-2 border border-border-subtle hover:bg-glass-border hover:border-white/20'
      )}
    >
      {Icon && <Icon className={cn(size === 'lg' ? 'h-6 w-6' : 'h-4 w-4')} />}
      {label && <span className="text-[11px] font-semibold">{label}</span>}
    </motion.button>
  );
}

function CoverControl({ label, state, onOpen, onClose, onStop }: any) {
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

SmartHomeWidget.displayName = 'SmartHomeWidget';
