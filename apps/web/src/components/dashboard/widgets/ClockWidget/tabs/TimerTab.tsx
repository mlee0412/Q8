'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, Tag, X, Edit2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TimerRing, SessionStats, QuickTimerPresets } from '../components';
import { FOCUS_PRESETS } from '../constants';
import type { TimerTabProps, FocusPreset } from '../types';

export function TimerTab({
  timerState,
  presets,
  currentTask,
  onTaskChange,
  onStartSession,
  onPause,
  onResume,
  onReset,
  onSkipBreak,
  onLinkTask,
}: TimerTabProps) {
  const [selectedPreset, setSelectedPreset] = useState<FocusPreset>('sprint');
  const [customMinutes, setCustomMinutes] = useState(25);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [taskInput, setTaskInput] = useState(currentTask);
  const taskInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingTask && taskInputRef.current) {
      taskInputRef.current.focus();
    }
  }, [isEditingTask]);

  const handleTaskSubmit = () => {
    onTaskChange(taskInput.trim());
    setIsEditingTask(false);
  };

  const handleTaskKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTaskSubmit();
    } else if (e.key === 'Escape') {
      setTaskInput(currentTask);
      setIsEditingTask(false);
    }
  };

  const { session, isRunning, progress, currentPhase, todayStats } = timerState;
  const hasActiveSession = session !== null;

  const currentPresetConfig = FOCUS_PRESETS.find((p) => p.id === (session?.preset || selectedPreset));

  const handlePresetSelect = (preset: FocusPreset) => {
    setSelectedPreset(preset);
    const presetConfig = FOCUS_PRESETS.find((p) => p.id === preset);
    if (presetConfig) {
      setCustomMinutes(presetConfig.workMinutes);
    }
  };

  const handleDurationSelect = (seconds: number) => {
    setCustomMinutes(Math.floor(seconds / 60));
    setSelectedPreset('custom');
  };

  const handleStart = () => {
    onStartSession(selectedPreset, customMinutes);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Timer Display */}
      <div className="flex-shrink-0 flex flex-col items-center py-4 border-b border-border-subtle">
        {hasActiveSession ? (
          <>
            {/* Active Session Display */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{currentPresetConfig?.icon}</span>
              <span className="text-sm font-medium text-text-primary">
                {currentPresetConfig?.label}
              </span>
              {session?.isBreak && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400">
                  Break
                </span>
              )}
            </div>

            <TimerRing
              progress={progress}
              timeRemaining={session?.remaining || 0}
              status={session?.status || 'idle'}
              isBreak={session?.isBreak || false}
              size="lg"
              showControls
              onPlay={onResume}
              onPause={onPause}
              onReset={onReset}
              onSkip={onSkipBreak}
            />

            {/* Session Info */}
            <div className="flex items-center gap-4 mt-3 text-xs text-text-muted">
              <span>Session #{(session?.sessionsCompleted || 0) + 1}</span>
              {session?.linkedTaskTitle && (
                <span className="flex items-center gap-1">
                  <Link2 className="h-3 w-3" />
                  {session.linkedTaskTitle}
                </span>
              )}
            </div>

            {/* Tags */}
            {session?.tags && session.tags.length > 0 && (
              <div className="flex items-center gap-1 mt-2">
                {session.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-[10px] rounded-full bg-surface-4 text-text-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Task Input */}
            <div className="w-full max-w-xs mb-3">
              {isEditingTask ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={taskInputRef}
                    type="text"
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    onKeyDown={handleTaskKeyDown}
                    onBlur={handleTaskSubmit}
                    placeholder="What are you focusing on?"
                    className="flex-1 bg-surface-3 border border-border-subtle rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-neon-primary"
                  />
                  <button
                    onClick={handleTaskSubmit}
                    className="p-1.5 rounded-lg bg-neon-primary/20 text-neon-primary hover:bg-neon-primary/30"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setTaskInput(currentTask);
                    setIsEditingTask(true);
                  }}
                  className="w-full text-center text-sm text-text-muted hover:text-text-primary transition-colors"
                >
                  {currentTask || 'Click to set focus task...'}
                </button>
              )}
            </div>

            {/* Idle State - Show preset selection */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{currentPresetConfig?.icon}</span>
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {currentPresetConfig?.label}
                </p>
                <p className="text-xs text-text-muted">
                  {currentPresetConfig?.description}
                </p>
              </div>
            </div>

            <TimerRing
              progress={0}
              timeRemaining={customMinutes * 60}
              status="idle"
              isBreak={false}
              size="lg"
              showControls={false}
            />

            {/* Start Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStart}
              className="mt-4 px-6 py-2 rounded-full bg-neon-primary text-black font-medium text-sm hover:bg-neon-primary/90 transition-colors focus-ring"
            >
              Start Focus Session
            </motion.button>
          </>
        )}
      </div>

      {/* Presets / Stats Section */}
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        <AnimatePresence mode="wait">
          {hasActiveSession ? (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <SessionStats stats={todayStats} />
            </motion.div>
          ) : (
            <motion.div
              key="presets"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <QuickTimerPresets
                activePreset={selectedPreset}
                activeDuration={customMinutes * 60}
                onSelectPreset={handlePresetSelect}
                onSelectDuration={handleDurationSelect}
                mode="both"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Today's Quick Stats Footer */}
      {!hasActiveSession && todayStats.sessionsCompleted > 0 && (
        <div className="flex-shrink-0 px-2 py-2 border-t border-border-subtle">
          <SessionStats stats={todayStats} isCompact />
        </div>
      )}
    </div>
  );
}

TimerTab.displayName = 'TimerTab';
