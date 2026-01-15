'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  Timer,
  Sun,
  Moon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeZone {
  id: string;
  label: string;
  timezone: string;
  city: string;
}

const DEFAULT_TIMEZONES: TimeZone[] = [
  { id: 'nyc', label: 'NYC', timezone: 'America/New_York', city: 'New York' },
  { id: 'la', label: 'LA', timezone: 'America/Los_Angeles', city: 'Los Angeles' },
  { id: 'seoul', label: 'SEL', timezone: 'Asia/Seoul', city: 'Seoul' },
];

const POMODORO_WORK = 25 * 60;
const POMODORO_BREAK = 5 * 60;

const TIMER_PRESETS = [
  { label: '5m', seconds: 5 * 60 },
  { label: '10m', seconds: 10 * 60 },
  { label: '15m', seconds: 15 * 60 },
  { label: '30m', seconds: 30 * 60 },
];

interface ClockWidgetProps {
  timezones?: TimeZone[];
  showPomodoro?: boolean;
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2 | 3 | 4;
  className?: string;
}

/**
 * Clock Widget v2.0
 *
 * World clocks with pomodoro timer using Q8 Design System.
 * Matte surfaces, reduced neon density.
 */
export function ClockWidget({
  timezones = DEFAULT_TIMEZONES,
  showPomodoro = true,
  colSpan = 2,
  rowSpan = 1,
  className,
}: ClockWidgetProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pomodoroTime, setPomodoroTime] = useState(POMODORO_WORK);
  const [customDuration, setCustomDuration] = useState(POMODORO_WORK);
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false);
  const [pomodoroMode, setPomodoroMode] = useState<'work' | 'break'>('work');
  const [completedPomodoros, setCompletedPomodoros] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isPomodoroRunning) return;

    const timer = setInterval(() => {
      setPomodoroTime((prev) => {
        if (prev <= 1) {
          if (pomodoroMode === 'work') {
            setCompletedPomodoros((c) => c + 1);
            setPomodoroMode('break');
            return POMODORO_BREAK;
          } else {
            setPomodoroMode('work');
            return POMODORO_WORK;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPomodoroRunning, pomodoroMode]);

  const formatTimeForZone = (date: Date, timezone: string) => {
    return date.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getTimeOfDay = (date: Date, timezone: string) => {
    const hour = parseInt(
      date.toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        hour12: false,
      })
    );
    return hour >= 6 && hour < 18 ? 'day' : 'night';
  };

  const formatPomodoro = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const resetPomodoro = () => {
    setIsPomodoroRunning(false);
    setPomodoroMode('work');
    setPomodoroTime(customDuration);
  };

  const setPresetDuration = (seconds: number) => {
    setIsPomodoroRunning(false);
    setPomodoroMode('work');
    setPomodoroTime(seconds);
    setCustomDuration(seconds);
  };

  const pomodoroProgress =
    pomodoroMode === 'work'
      ? ((customDuration - pomodoroTime) / customDuration) * 100
      : ((POMODORO_BREAK - pomodoroTime) / POMODORO_BREAK) * 100;

  const colSpanClasses: Record<number, string> = {
    1: 'col-span-1',
    2: 'col-span-1 md:col-span-2',
    3: 'col-span-1 md:col-span-3',
    4: 'col-span-1 md:col-span-4',
  };

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
      className={cn(
        'surface-matte p-3 flex flex-col overflow-hidden w-full',
        colSpanClasses[colSpan],
        rowSpanClasses[rowSpan],
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-neon-primary" />
          <h3 className="text-heading text-sm">World Clock</h3>
        </div>
        <span className="text-caption">
          {currentTime.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>

      <div className="flex-1 flex gap-3 min-h-0">
        {/* Timezone Clocks */}
        <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto scrollbar-thin">
          {timezones.map((tz) => {
            const timeOfDay = getTimeOfDay(currentTime, tz.timezone);
            return (
              <motion.div
                key={tz.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="list-row px-3 py-1.5 flex-shrink-0"
              >
                <div className="flex items-center gap-2">
                  {timeOfDay === 'day' ? (
                    <Sun className="h-3.5 w-3.5 text-warning" />
                  ) : (
                    <Moon className="h-3.5 w-3.5 text-info" />
                  )}
                  <p className="text-label text-xs">{tz.city}</p>
                </div>
                <p className="text-base font-mono font-semibold text-text-primary ml-auto">
                  {formatTimeForZone(currentTime, tz.timezone)}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Pomodoro Timer */}
        {showPomodoro && (
          <div className="w-[140px] card-item p-2 flex flex-col items-center justify-center flex-shrink-0">
            <div className="flex items-center gap-1 mb-1">
              <Timer className="h-3 w-3 text-neon-primary" />
              <span className="text-label text-xs">Timer</span>
            </div>

            {/* Circular Progress */}
            <div className="relative w-14 h-14 mb-1">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="28"
                  cy="28"
                  r="24"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  className="text-border-subtle"
                />
                <motion.circle
                  cx="28"
                  cy="28"
                  r="24"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  className={pomodoroMode === 'work' ? 'text-neon-primary' : 'text-success'}
                  strokeDasharray={150.8}
                  strokeDashoffset={150.8 - (pomodoroProgress / 100) * 150.8}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-mono font-bold text-text-primary">
                  {formatPomodoro(pomodoroTime)}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1">
              <button
                className="btn-icon btn-icon-sm focus-ring"
                onClick={() => setIsPomodoroRunning(!isPomodoroRunning)}
                aria-label={isPomodoroRunning ? 'Pause timer' : 'Start timer'}
              >
                {isPomodoroRunning ? (
                  <Pause className="h-3 w-3" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
              </button>
              <button
                className="btn-icon btn-icon-sm focus-ring"
                onClick={resetPomodoro}
                aria-label="Reset timer"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            </div>

            {/* Preset Durations */}
            <div className="flex items-center gap-0.5 mt-1">
              {TIMER_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  className={cn(
                    'h-5 w-7 text-[9px] font-medium rounded focus-ring transition-colors',
                    customDuration === preset.seconds
                      ? 'bg-neon-primary/20 text-neon-primary'
                      : 'text-text-muted hover:text-text-secondary hover:bg-surface-4'
                  )}
                  onClick={() => setPresetDuration(preset.seconds)}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Completed Count */}
            {completedPomodoros > 0 && (
              <p className="text-caption mt-0.5">
                {completedPomodoros} completed
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

ClockWidget.displayName = 'ClockWidget';
