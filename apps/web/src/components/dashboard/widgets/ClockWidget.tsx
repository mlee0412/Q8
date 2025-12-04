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
import { Button } from '@/components/ui/button';

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

const POMODORO_WORK = 25 * 60; // 25 minutes
const POMODORO_BREAK = 5 * 60; // 5 minutes

const TIMER_PRESETS = [
  { label: '5m', seconds: 5 * 60 },
  { label: '10m', seconds: 10 * 60 },
  { label: '15m', seconds: 15 * 60 },
  { label: '30m', seconds: 30 * 60 },
];

interface ClockWidgetProps {
  /**
   * Custom timezones to display
   */
  timezones?: TimeZone[];

  /**
   * Show pomodoro timer
   * @default true
   */
  showPomodoro?: boolean;

  /**
   * Bento grid column span
   * @default 2
   */
  colSpan?: 1 | 2 | 3 | 4;

  /**
   * Bento grid row span
   * @default 1
   */
  rowSpan?: 1 | 2 | 3 | 4;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Clock Widget
 *
 * Displays world clocks for multiple timezones with an integrated
 * pomodoro timer for productivity tracking.
 *
 * Features:
 * - Multiple timezone clocks
 * - Day/night indicator
 * - Pomodoro timer with work/break modes
 * - Completed pomodoro counter
 * - Visual progress ring
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

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Pomodoro timer
  useEffect(() => {
    if (!isPomodoroRunning) return;

    const timer = setInterval(() => {
      setPomodoroTime((prev) => {
        if (prev <= 1) {
          // Timer complete
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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'glass-panel rounded-xl p-3 flex flex-col overflow-hidden w-full',
        colSpanClasses[colSpan],
        rowSpanClasses[rowSpan],
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-neon-primary" />
          <h3 className="font-semibold text-sm">World Clock</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          {currentTime.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>

      <div className="flex-1 flex gap-3 min-h-0">
        {/* Timezone Clocks */}
        <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto">
          {timezones.map((tz) => {
            const timeOfDay = getTimeOfDay(currentTime, tz.timezone);
            return (
              <motion.div
                key={tz.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between glass-panel rounded-lg px-3 py-1.5 flex-shrink-0"
              >
                <div className="flex items-center gap-2">
                  {timeOfDay === 'day' ? (
                    <Sun className="h-3.5 w-3.5 text-yellow-400" />
                  ) : (
                    <Moon className="h-3.5 w-3.5 text-blue-400" />
                  )}
                  <p className="text-xs">{tz.city}</p>
                </div>
                <p className="text-base font-mono font-semibold">
                  {formatTimeForZone(currentTime, tz.timezone)}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Pomodoro Timer */}
        {showPomodoro && (
          <div className="w-[140px] glass-panel rounded-lg p-2 flex flex-col items-center justify-center flex-shrink-0">
            <div className="flex items-center gap-1 mb-1">
              <Timer className="h-3 w-3 text-neon-primary" />
              <span className="text-xs font-medium">Timer</span>
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
                  className="text-glass-border"
                />
                <motion.circle
                  cx="28"
                  cy="28"
                  r="24"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  className={
                    pomodoroMode === 'work' ? 'text-neon-primary' : 'text-green-400'
                  }
                  strokeDasharray={150.8}
                  strokeDashoffset={150.8 - (pomodoroProgress / 100) * 150.8}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-mono font-bold">
                  {formatPomodoro(pomodoroTime)}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsPomodoroRunning(!isPomodoroRunning)}
              >
                {isPomodoroRunning ? (
                  <Pause className="h-3 w-3" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={resetPomodoro}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>

            {/* Preset Durations */}
            <div className="flex items-center gap-0.5 mt-1">
              {TIMER_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-5 w-7 text-[9px] font-medium',
                    customDuration === preset.seconds && 'bg-neon-primary/20 text-neon-primary'
                  )}
                  onClick={() => setPresetDuration(preset.seconds)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            {/* Completed Count */}
            {completedPomodoros > 0 && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                🍅 {completedPomodoros} done
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

ClockWidget.displayName = 'ClockWidget';
