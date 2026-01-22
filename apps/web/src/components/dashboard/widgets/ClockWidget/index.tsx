'use client';

import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Timer, Gauge, Bell, Maximize2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTimeData, useTimerSession, useStopwatch, useAlarms } from './hooks';
import { ClockTab, TimerTab, StopwatchTab, AlarmsTab } from './tabs';
import { TimeCommandCenter } from './expanded';
import { AddTimezoneModal, SetAlarmModal } from './modals';
import {
  CLOCK_TABS,
  COL_SPAN_CLASSES,
  ROW_SPAN_CLASSES,
  FOCUS_PRESETS,
  TAB_VARIANTS,
} from './constants';
import type {
  ClockWidgetProps,
  ClockTab as ClockTabType,
  ClockDisplayMode,
  Alarm,
  TimeZoneConfig,
} from './types';

const TAB_ICONS: Record<ClockTabType, LucideIcon> = {
  clock: Clock,
  timer: Timer,
  stopwatch: Gauge,
  alarms: Bell,
};

/**
 * Clock Widget v3.0 - Time Command Center
 *
 * A comprehensive time management widget featuring:
 * - World clocks with customizable timezones
 * - Pomodoro/Focus timer with session tracking
 * - Stopwatch with lap recording
 * - Alarms and reminders
 *
 * Follows Q8 Design System with matte surfaces and neon accents.
 */
export function ClockWidget({
  defaultTab = 'clock',
  timezones: initialTimezones,
  showAnalytics = true,
  enableAlarms = true,
  enableStopwatch = true,
  colSpan = 2,
  rowSpan = 2,
  className,
}: ClockWidgetProps) {
  const [activeTab, setActiveTab] = useState<ClockTabType>(defaultTab);
  const [displayMode, setDisplayMode] = useState<ClockDisplayMode>('digital');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAddTimezone, setShowAddTimezone] = useState(false);
  const [showSetAlarm, setShowSetAlarm] = useState(false);
  const [editingAlarm, setEditingAlarm] = useState<Alarm | undefined>(undefined);

  // Hooks
  const {
    currentTime,
    timezones,
    addTimezone,
    removeTimezone,
    reorderTimezones,
  } = useTimeData({ timezones: initialTimezones });

  const {
    timerState,
    currentTask,
    setCurrentTask,
    startSession,
    pauseSession,
    resumeSession,
    resetSession,
    skipPhase,
    linkTask,
  } = useTimerSession({
    onSessionComplete: (session) => {
      // Could trigger notification here
      console.log('Session completed:', session);
    },
  });

  const stopwatch = useStopwatch();

  const {
    alarms,
    addAlarm,
    updateAlarm,
    deleteAlarm,
    toggleAlarm,
  } = useAlarms({
    onAlarmTrigger: (alarm) => {
      // Could trigger notification here
      console.log('Alarm triggered:', alarm);
    },
  });

  // Handlers
  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleAddTimezone = useCallback((config: TimeZoneConfig) => {
    addTimezone(config);
    setShowAddTimezone(false);
  }, [addTimezone]);

  const handleEditAlarm = useCallback((alarm: Alarm) => {
    setEditingAlarm(alarm);
    setShowSetAlarm(true);
  }, []);

  const handleSaveAlarm = useCallback((alarmData: Partial<Alarm>) => {
    if (editingAlarm) {
      updateAlarm(editingAlarm.id, alarmData);
    } else {
      addAlarm(alarmData as Omit<Alarm, 'id' | 'createdAt' | 'snoozeCount'>);
    }
    setShowSetAlarm(false);
    setEditingAlarm(undefined);
  }, [editingAlarm, updateAlarm, addAlarm]);

  const handleDeleteAlarm = useCallback((id: string) => {
    deleteAlarm(id);
    setShowSetAlarm(false);
    setEditingAlarm(undefined);
  }, [deleteAlarm]);

  // Filter tabs based on props
  const visibleTabs = CLOCK_TABS.filter((tab) => {
    if (tab.id === 'alarms' && !enableAlarms) return false;
    if (tab.id === 'stopwatch' && !enableStopwatch) return false;
    return true;
  });

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={cn(
          'surface-matte overflow-hidden flex flex-col w-full',
          COL_SPAN_CLASSES[colSpan],
          ROW_SPAN_CLASSES[rowSpan],
          className
        )}
      >
        {/* Header */}
        <div className="widget-header px-4 py-3 border-b border-border-subtle">
          <div className="widget-header-title">
            <Clock className="h-4 w-4 text-neon-primary" />
            <h3 className="text-heading text-sm">Time Hub</h3>
          </div>
          <div className="flex items-center gap-2">
            {/* Current Date */}
            <span className="text-caption hidden sm:block">
              {currentTime.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </span>
            {/* Expand Button */}
            <button
              onClick={toggleExpanded}
              className="btn-icon btn-icon-sm focus-ring"
              aria-label="Expand to full view"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border-subtle">
          {visibleTabs.map((tab) => {
            const Icon = TAB_ICONS[tab.id];
            return (
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
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={TAB_VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeTab === 'clock' && (
                <ClockTab
                  currentTime={currentTime}
                  timezones={timezones}
                  displayMode={displayMode}
                  onDisplayModeChange={setDisplayMode}
                  onAddTimezone={() => setShowAddTimezone(true)}
                  onRemoveTimezone={removeTimezone}
                  onReorderTimezones={reorderTimezones}
                />
              )}

              {activeTab === 'timer' && (
                <TimerTab
                  timerState={timerState}
                  presets={FOCUS_PRESETS}
                  currentTask={currentTask}
                  onTaskChange={setCurrentTask}
                  onStartSession={startSession}
                  onPause={pauseSession}
                  onResume={resumeSession}
                  onReset={resetSession}
                  onSkipBreak={skipPhase}
                  onLinkTask={linkTask}
                />
              )}

              {activeTab === 'stopwatch' && enableStopwatch && (
                <StopwatchTab
                  state={stopwatch.state}
                  onStart={stopwatch.start}
                  onStop={stopwatch.stop}
                  onReset={stopwatch.reset}
                  onLap={stopwatch.lap}
                  onLabelLap={stopwatch.labelLap}
                  onClearLaps={stopwatch.clearLaps}
                  onExportLaps={stopwatch.exportLaps}
                />
              )}

              {activeTab === 'alarms' && enableAlarms && (
                <AlarmsTab
                  alarms={alarms}
                  onToggleAlarm={toggleAlarm}
                  onEditAlarm={handleEditAlarm}
                  onDeleteAlarm={deleteAlarm}
                  onAddAlarm={() => {
                    setEditingAlarm(undefined);
                    setShowSetAlarm(true);
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Modals */}
      <AddTimezoneModal
        isOpen={showAddTimezone}
        onClose={() => setShowAddTimezone(false)}
        onAdd={handleAddTimezone}
        existingTimezones={timezones.map((tz) => tz.timezone)}
      />

      <SetAlarmModal
        isOpen={showSetAlarm}
        onClose={() => {
          setShowSetAlarm(false);
          setEditingAlarm(undefined);
        }}
        alarm={editingAlarm}
        onSave={handleSaveAlarm}
        onDelete={editingAlarm ? () => handleDeleteAlarm(editingAlarm.id) : undefined}
      />

      {/* Expanded Time Command Center - Portal to body */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isExpanded && (
              <TimeCommandCenter
                onClose={toggleExpanded}
                initialTab={activeTab}
                timezones={timezones.map((tz) => ({
                  id: tz.id,
                  timezone: tz.timezone,
                  city: tz.city,
                  country: tz.country,
                  label: tz.label,
                  isPinned: tz.isPinned,
                  sortOrder: tz.sortOrder,
                }))}
                analytics={{
                  today: {
                    focusMinutes: timerState.todayStats.focusMinutes,
                    breakMinutes: timerState.todayStats.breakMinutes,
                    sessions: timerState.todayStats.sessionsCompleted,
                    goalProgress: Math.min((timerState.todayStats.focusMinutes / 240) * 100, 100),
                  },
                  thisWeek: {
                    focusMinutes: timerState.todayStats.focusMinutes,
                    sessions: timerState.todayStats.sessionsCompleted,
                    averageSessionLength: timerState.todayStats.sessionsCompleted > 0
                      ? Math.floor(timerState.todayStats.focusMinutes / timerState.todayStats.sessionsCompleted)
                      : 0,
                    streak: 1,
                    bestDay: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
                  },
                  byHour: {},
                  byDay: {},
                  byTag: timerState.todayStats.tags,
                  recentSessions: [],
                }}
                // Timer functionality
                timerState={timerState}
                onStartSession={startSession}
                onPauseSession={pauseSession}
                onResumeSession={resumeSession}
                onResetSession={resetSession}
                onSkipPhase={skipPhase}
                // Stopwatch functionality
                stopwatchState={stopwatch.state}
                onStopwatchStart={stopwatch.start}
                onStopwatchStop={stopwatch.stop}
                onStopwatchReset={stopwatch.reset}
                onStopwatchLap={stopwatch.lap}
                onStopwatchLabelLap={stopwatch.labelLap}
                onStopwatchClearLaps={stopwatch.clearLaps}
                // Alarms functionality
                alarms={alarms}
                onToggleAlarm={toggleAlarm}
                onAddAlarm={() => {
                  setEditingAlarm(undefined);
                  setShowSetAlarm(true);
                }}
                onEditAlarm={handleEditAlarm}
                onDeleteAlarm={deleteAlarm}
              />
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}

ClockWidget.displayName = 'ClockWidget';

export default ClockWidget;

export type { ClockWidgetProps } from './types';
