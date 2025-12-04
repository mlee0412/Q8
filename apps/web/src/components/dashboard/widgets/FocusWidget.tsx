'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  Play,
  Pause,
  Square,
  Clock,
  Zap,
  Calendar,
  TrendingUp,
  Edit3,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface FocusSession {
  id: string;
  task: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // seconds
}

interface FocusStats {
  todayMinutes: number;
  weekMinutes: number;
  streak: number;
  sessionsToday: number;
}

interface FocusWidgetProps {
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
   * Callback when focus session starts/ends
   */
  onSessionChange?: (session: FocusSession | null) => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

const STORAGE_KEY = 'q8-focus-sessions';
const STATS_KEY = 'q8-focus-stats';

/**
 * Focus Widget
 *
 * Track focus sessions and productivity with:
 * - Current focus task with timer
 * - Daily/weekly stats
 * - Focus streak tracking
 * - Session history
 */
export function FocusWidget({
  colSpan = 2,
  rowSpan = 1,
  onSessionChange,
  className,
}: FocusWidgetProps) {
  const [currentTask, setCurrentTask] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [stats, setStats] = useState<FocusStats>({
    todayMinutes: 0,
    weekMinutes: 0,
    streak: 0,
    sessionsToday: 0,
  });

  // Load saved data
  useEffect(() => {
    try {
      const savedStats = localStorage.getItem(STATS_KEY);
      if (savedStats) {
        const parsed = JSON.parse(savedStats);
        // Check if stats are from today
        const today = new Date().toDateString();
        if (parsed.date === today) {
          setStats(parsed.stats);
        } else {
          // Reset daily stats, keep week and streak
          setStats((prev) => ({
            ...prev,
            todayMinutes: 0,
            sessionsToday: 0,
          }));
        }
      }
    } catch (e) {
      console.error('Failed to load focus stats:', e);
    }
  }, []);

  // Save stats
  useEffect(() => {
    try {
      localStorage.setItem(
        STATS_KEY,
        JSON.stringify({
          date: new Date().toDateString(),
          stats,
        })
      );
    } catch (e) {
      console.error('Failed to save focus stats:', e);
    }
  }, [stats]);

  // Timer
  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning]);

  const startSession = useCallback(() => {
    if (!currentTask.trim()) {
      setIsEditing(true);
      return;
    }

    setIsRunning(true);
    setSessionStart(new Date());
    setElapsedTime(0);

    onSessionChange?.({
      id: `session-${Date.now()}`,
      task: currentTask,
      startTime: new Date(),
      duration: 0,
    });
  }, [currentTask, onSessionChange]);

  const pauseSession = useCallback(() => {
    setIsRunning(false);
  }, []);

  const stopSession = useCallback(() => {
    if (elapsedTime > 0) {
      const minutes = Math.floor(elapsedTime / 60);

      // Update stats
      setStats((prev) => ({
        todayMinutes: prev.todayMinutes + minutes,
        weekMinutes: prev.weekMinutes + minutes,
        streak: prev.streak,
        sessionsToday: prev.sessionsToday + 1,
      }));

      // Save session
      const session: FocusSession = {
        id: `session-${Date.now()}`,
        task: currentTask,
        startTime: sessionStart || new Date(),
        endTime: new Date(),
        duration: elapsedTime,
      };

      onSessionChange?.(null);

      // Save to history
      try {
        const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        history.unshift(session);
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(history.slice(0, 100))
        );
      } catch (e) {
        console.error('Failed to save session:', e);
      }
    }

    setIsRunning(false);
    setElapsedTime(0);
    setSessionStart(null);
  }, [currentTask, elapsedTime, sessionStart, onSessionChange]);

  const handleTaskSubmit = () => {
    if (editValue.trim()) {
      setCurrentTask(editValue.trim());
    }
    setIsEditing(false);
    setEditValue('');
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  };

  // Calculate progress ring
  const progressPercent = Math.min((elapsedTime / (25 * 60)) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        gridColumn: `span ${colSpan}`,
        gridRow: `span ${rowSpan}`,
      }}
      className={cn(
        'glass-panel rounded-xl p-3 flex flex-col overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-neon-primary" />
          <h3 className="font-semibold text-sm">Focus</h3>
        </div>
        {isRunning && (
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex items-center gap-1 text-xs text-neon-accent"
          >
            <div className="h-2 w-2 rounded-full bg-neon-accent" />
            <span>In Focus</span>
          </motion.div>
        )}
      </div>

      <div className="flex-1 flex gap-3 min-h-0">
        {/* Timer Section */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Current Task */}
          <div className="w-full mb-2">
            {isEditing ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="What are you focusing on?"
                  autoFocus
                  className="flex-1 px-2 py-1.5 glass-panel rounded-lg border-0 focus:ring-2 focus:ring-neon-primary text-sm bg-transparent"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTaskSubmit();
                    if (e.key === 'Escape') {
                      setIsEditing(false);
                      setEditValue('');
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleTaskSubmit}
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    setIsEditing(false);
                    setEditValue('');
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div
                onClick={() => {
                  if (!isRunning) {
                    setIsEditing(true);
                    setEditValue(currentTask);
                  }
                }}
                className={cn(
                  'flex items-center gap-2 px-2 py-1 rounded-lg text-center',
                  !isRunning && 'cursor-pointer hover:bg-glass-bg'
                )}
              >
                {currentTask ? (
                  <>
                    <span className="text-sm font-medium truncate flex-1">
                      {currentTask}
                    </span>
                    {!isRunning && (
                      <Edit3 className="h-3 w-3 text-muted-foreground" />
                    )}
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground flex-1">
                    Click to set focus task...
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Timer Display */}
          <div className="relative w-16 h-16 mb-2">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                className="text-glass-border"
              />
              <motion.circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                className="text-neon-primary"
                strokeDasharray={175.93}
                strokeDashoffset={175.93 - (progressPercent / 100) * 175.93}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-mono font-bold">
                {formatTime(elapsedTime)}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {!isRunning ? (
              <Button
                variant="neon"
                size="sm"
                onClick={startSession}
                className="gap-1 h-7 text-xs"
              >
                <Play className="h-3 w-3" />
                Start
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={pauseSession}
                >
                  <Pause className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={stopSession}
                >
                  <Square className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Stats Section - Compact vertical layout */}
        <div className="w-[100px] flex flex-col gap-1.5 overflow-y-auto">
          <div className="glass-panel rounded-lg p-2 text-center flex-shrink-0">
            <div className="flex items-center justify-center gap-1">
              <Clock className="h-3 w-3 text-neon-primary" />
              <span className="text-[10px] text-muted-foreground">Today</span>
            </div>
            <p className="text-sm font-bold">
              {formatMinutes(stats.todayMinutes)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {stats.sessionsToday} sessions
            </p>
          </div>

          <div className="glass-panel rounded-lg p-2 text-center flex-shrink-0">
            <div className="flex items-center justify-center gap-1">
              <Calendar className="h-3 w-3 text-blue-400" />
              <span className="text-[10px] text-muted-foreground">Week</span>
            </div>
            <p className="text-sm font-bold">
              {formatMinutes(stats.weekMinutes)}
            </p>
          </div>

          <div className="glass-panel rounded-lg p-2 text-center flex-shrink-0">
            <div className="flex items-center justify-center gap-1">
              <Zap className="h-3 w-3 text-yellow-400" />
              <span className="text-[10px] text-muted-foreground">Streak</span>
            </div>
            <p className="text-sm font-bold">{stats.streak}d</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

FocusWidget.displayName = 'FocusWidget';
