'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFocusSession } from './hooks';
import { TimerDisplay, TimerControls, TaskInput, FocusStatsDisplay } from './components';
import type { FocusWidgetProps } from './types';

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
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const {
    currentTask,
    setCurrentTask,
    isRunning,
    elapsedTime,
    stats,
    startSession,
    pauseSession,
    stopSession,
  } = useFocusSession(onSessionChange);

  const handleStart = useCallback(() => {
    if (!currentTask.trim()) {
      setIsEditing(true);
      return;
    }
    startSession();
  }, [currentTask, startSession]);

  const handleTaskSubmit = useCallback(() => {
    if (editValue.trim()) {
      setCurrentTask(editValue.trim());
    }
    setIsEditing(false);
    setEditValue('');
  }, [editValue, setCurrentTask]);

  const handleEditCancel = useCallback(() => {
    setIsEditing(false);
    setEditValue('');
  }, []);

  const handleEditStart = useCallback(() => {
    setIsEditing(true);
    setEditValue(currentTask);
  }, [currentTask]);

  // Calculate progress ring (25 min pomodoro)
  const progressPercent = Math.min((elapsedTime / (25 * 60)) * 100, 100);

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
      <div className="widget-header mb-2 flex-shrink-0">
        <div className="widget-header-title">
          <Target className="h-4 w-4 text-neon-primary" />
          <h3 className="text-heading text-sm">Focus</h3>
        </div>
        {isRunning && (
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex items-center gap-1 text-xs text-success"
          >
            <div className="h-2 w-2 rounded-full bg-success" />
            <span>In Focus</span>
          </motion.div>
        )}
      </div>

      <div className="flex-1 flex gap-3 min-h-0">
        {/* Timer Section */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Current Task */}
          <div className="w-full mb-2">
            <TaskInput
              currentTask={currentTask}
              isEditing={isEditing}
              editValue={editValue}
              isRunning={isRunning}
              onEditStart={handleEditStart}
              onEditChange={setEditValue}
              onEditSubmit={handleTaskSubmit}
              onEditCancel={handleEditCancel}
            />
          </div>

          {/* Timer Display */}
          <TimerDisplay elapsedTime={elapsedTime} progressPercent={progressPercent} />

          {/* Controls */}
          <TimerControls
            isRunning={isRunning}
            onStart={handleStart}
            onPause={pauseSession}
            onStop={stopSession}
          />
        </div>

        {/* Stats Section */}
        <FocusStatsDisplay stats={stats} />
      </div>
    </motion.div>
  );
}

FocusWidget.displayName = 'FocusWidget';

export default FocusWidget;
