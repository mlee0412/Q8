'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ALARM_SOUNDS, DAY_NAMES } from '../constants';
import type { SetAlarmModalProps, Alarm, AlarmRepeat } from '../types';

const REPEAT_OPTIONS: { id: AlarmRepeat; label: string }[] = [
  { id: 'once', label: 'Once' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekdays', label: 'Weekdays' },
  { id: 'weekends', label: 'Weekends' },
  { id: 'custom', label: 'Custom' },
];

export function SetAlarmModal({
  isOpen,
  onClose,
  alarm,
  onSave,
  onDelete,
}: SetAlarmModalProps) {
  const [time, setTime] = useState('07:00');
  const [label, setLabel] = useState('');
  const [repeat, setRepeat] = useState<AlarmRepeat>('once');
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [sound, setSound] = useState('gentle');
  const [snoozeMinutes, setSnoozeMinutes] = useState(5);
  const [gradualWake, setGradualWake] = useState(false);

  // Initialize form when editing
  useEffect(() => {
    if (alarm) {
      setTime(alarm.time);
      setLabel(alarm.label);
      setRepeat(alarm.repeat);
      setCustomDays(alarm.customDays || []);
      setSound(alarm.sound);
      setSnoozeMinutes(alarm.snoozeMinutes);
      setGradualWake(alarm.gradualWake);
    } else {
      // Reset to defaults for new alarm
      setTime('07:00');
      setLabel('');
      setRepeat('once');
      setCustomDays([]);
      setSound('gentle');
      setSnoozeMinutes(5);
      setGradualWake(false);
    }
  }, [alarm, isOpen]);

  const handleSave = () => {
    onSave({
      time,
      label: label || 'Alarm',
      enabled: true,
      repeat,
      customDays: repeat === 'custom' ? customDays : undefined,
      sound,
      volume: 80,
      vibrate: true,
      snoozeMinutes,
      maxSnoozes: 3,
      gradualWake,
      gradualWakeMinutes: 5,
    });
  };

  const toggleDay = (day: number) => {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-[10%] z-50 mx-auto max-w-md"
          >
            <div className="surface-matte rounded-xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-neon-primary" />
                  <h2 className="text-sm font-semibold text-text-primary">
                    {alarm ? 'Edit Alarm' : 'New Alarm'}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="btn-icon btn-icon-sm focus-ring"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-5 max-h-[60vh] overflow-y-auto scrollbar-thin">
                {/* Time Picker */}
                <div className="flex justify-center">
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="text-5xl font-mono font-bold text-text-primary bg-transparent border-none outline-none text-center appearance-none"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>

                {/* Label */}
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Label</label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Alarm"
                    className="w-full px-3 py-2 bg-surface-4 border border-border-subtle rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:border-neon-primary/50 outline-none"
                  />
                </div>

                {/* Repeat */}
                <div>
                  <label className="text-xs text-text-muted mb-2 block">Repeat</label>
                  <div className="flex flex-wrap gap-2">
                    {REPEAT_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setRepeat(option.id)}
                        className={cn(
                          'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                          repeat === option.id
                            ? 'bg-neon-primary text-black'
                            : 'bg-surface-4 text-text-secondary hover:bg-surface-3'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom Days */}
                  {repeat === 'custom' && (
                    <div className="flex gap-1 mt-3">
                      {DAY_NAMES.map((day, index) => (
                        <button
                          key={day}
                          onClick={() => toggleDay(index)}
                          className={cn(
                            'w-9 h-9 text-xs font-medium rounded-full transition-colors',
                            customDays.includes(index)
                              ? 'bg-neon-primary text-black'
                              : 'bg-surface-4 text-text-muted hover:bg-surface-3'
                          )}
                        >
                          {day.charAt(0)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sound */}
                <div>
                  <label className="text-xs text-text-muted mb-2 block">Sound</label>
                  <select
                    value={sound}
                    onChange={(e) => setSound(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-4 border border-border-subtle rounded-lg text-sm text-text-primary outline-none focus:border-neon-primary/50"
                  >
                    {ALARM_SOUNDS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Snooze */}
                <div>
                  <label className="text-xs text-text-muted mb-2 block">Snooze Duration</label>
                  <div className="flex gap-2">
                    {[5, 10, 15, 20].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => setSnoozeMinutes(mins)}
                        className={cn(
                          'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                          snoozeMinutes === mins
                            ? 'bg-neon-primary text-black'
                            : 'bg-surface-4 text-text-secondary hover:bg-surface-3'
                        )}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gradual Wake */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-primary">Gradual Wake</p>
                    <p className="text-xs text-text-muted">Slowly increase volume</p>
                  </div>
                  <button
                    onClick={() => setGradualWake(!gradualWake)}
                    className={cn(
                      'w-11 h-6 rounded-full transition-colors relative',
                      gradualWake ? 'bg-neon-primary' : 'bg-surface-4'
                    )}
                  >
                    <div
                      className={cn(
                        'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                        gradualWake ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle">
                {onDelete && alarm ? (
                  <button
                    onClick={() => onDelete(alarm.id)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-error/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm text-text-secondary hover:bg-surface-4 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 text-sm font-medium bg-neon-primary text-black rounded-lg hover:bg-neon-primary/90 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

SetAlarmModal.displayName = 'SetAlarmModal';
