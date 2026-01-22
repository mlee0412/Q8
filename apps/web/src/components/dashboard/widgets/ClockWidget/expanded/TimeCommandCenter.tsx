'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Minimize2,
  Clock,
  Timer,
  Gauge,
  Bell,
  BarChart3,
  Globe,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Flag,
  Trash2,
  BellOff,
  Plus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DigitalClock, AnalogClock, TimerRing } from '../components';
import { FOCUS_PRESETS } from '../constants';
import type { TimeCommandCenterProps, ClockTab, FocusPreset } from '../types';

type CommandCenterView = ClockTab | 'analytics' | 'world';

const VIEW_OPTIONS: { id: CommandCenterView; icon: LucideIcon; label: string }[] = [
  { id: 'clock', icon: Clock, label: 'Clock' },
  { id: 'timer', icon: Timer, label: 'Timer' },
  { id: 'stopwatch', icon: Gauge, label: 'Stopwatch' },
  { id: 'alarms', icon: Bell, label: 'Alarms' },
  { id: 'analytics', icon: BarChart3, label: 'Analytics' },
  { id: 'world', icon: Globe, label: 'World' },
];

export function TimeCommandCenter({
  onClose,
  initialTab = 'clock',
  timezones,
  analytics,
  timerState,
  onStartSession,
  onPauseSession,
  onResumeSession,
  onResetSession,
  onSkipPhase,
  stopwatchState,
  onStopwatchStart,
  onStopwatchStop,
  onStopwatchReset,
  onStopwatchLap,
  onStopwatchLabelLap,
  onStopwatchClearLaps,
  alarms,
  onToggleAlarm,
  onAddAlarm,
  onDeleteAlarm,
}: TimeCommandCenterProps) {
  const [activeView, setActiveView] = useState<CommandCenterView>(initialTab);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedPreset, setSelectedPreset] = useState<FocusPreset>('sprint');

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format stopwatch time
  const formatStopwatchTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const centiseconds = Math.floor((ms % 1000) / 10);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl overflow-hidden"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-neon-primary/5 via-transparent to-purple-500/5 pointer-events-none" />

      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-10 text-white/70 hover:text-white"
        onClick={onClose}
      >
        <Minimize2 className="h-5 w-5" />
      </Button>

      <div className="relative h-full overflow-hidden flex">
        {/* Sidebar Navigation */}
        <div className="w-16 lg:w-48 flex-shrink-0 border-r border-white/10 py-6">
          <div className="px-3 mb-6 hidden lg:block">
            <h1 className="text-lg font-bold text-white">Time Hub</h1>
            <p className="text-xs text-white/50">Command Center</p>
          </div>

          <nav className="space-y-1 px-2">
            {VIEW_OPTIONS.map((view) => (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left',
                  activeView === view.id
                    ? 'bg-neon-primary/20 text-neon-primary'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                )}
              >
                <view.icon className="h-5 w-5 flex-shrink-0" />
                <span className="hidden lg:block text-sm font-medium">
                  {view.label}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-6 lg:p-8">
            {/* Clock View */}
            {activeView === 'clock' && (
              <div className="space-y-8">
                {/* Hero Clock */}
                <div className="flex flex-col items-center py-12">
                  <div className="flex items-center gap-8">
                    <AnalogClock time={currentTime} size="xl" theme="neon" />
                    <div className="text-center">
                      <DigitalClock
                        time={currentTime}
                        size="xl"
                        showSeconds
                        showDate
                      />
                    </div>
                  </div>
                </div>

                {/* World Clocks Grid */}
                <div>
                  <h2 className="text-lg font-semibold text-white mb-4">World Clocks</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {timezones.map((tz) => {
                      const tzTime = new Date(
                        currentTime.toLocaleString('en-US', { timeZone: tz.timezone })
                      );
                      return (
                        <div
                          key={tz.id}
                          className="p-4 rounded-xl bg-white/5 border border-white/10"
                        >
                          <p className="text-sm text-white/60">{tz.city}</p>
                          <p className="text-2xl font-mono font-bold text-white mt-1">
                            {currentTime.toLocaleTimeString('en-US', {
                              timeZone: tz.timezone,
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </p>
                          <p className="text-xs text-white/40 mt-1">
                            {currentTime.toLocaleDateString('en-US', {
                              timeZone: tz.timezone,
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Analytics View */}
            {activeView === 'analytics' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Focus Analytics</h2>
                  <p className="text-white/50">Track your productivity over time</p>
                </div>

                {/* Today's Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard
                    label="Focus Today"
                    value={`${Math.floor(analytics.today.focusMinutes / 60)}h ${analytics.today.focusMinutes % 60}m`}
                    color="neon-primary"
                  />
                  <StatCard
                    label="Sessions"
                    value={analytics.today.sessions.toString()}
                    color="purple-400"
                  />
                  <StatCard
                    label="Goal Progress"
                    value={`${Math.round(analytics.today.goalProgress)}%`}
                    color="emerald-400"
                  />
                  <StatCard
                    label="Streak"
                    value={`${analytics.thisWeek.streak} days`}
                    color="amber-400"
                  />
                </div>

                {/* Weekly Overview */}
                <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4">This Week</h3>
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <p className="text-3xl font-bold text-white">
                        {Math.floor(analytics.thisWeek.focusMinutes / 60)}h
                      </p>
                      <p className="text-sm text-white/50">Total Focus</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-white">
                        {analytics.thisWeek.sessions}
                      </p>
                      <p className="text-sm text-white/50">Sessions</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-white">
                        {analytics.thisWeek.averageSessionLength}m
                      </p>
                      <p className="text-sm text-white/50">Avg Session</p>
                    </div>
                  </div>
                </div>

                {/* Tags Breakdown */}
                {Object.keys(analytics.byTag).length > 0 && (
                  <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-4">By Category</h3>
                    <div className="space-y-3">
                      {Object.entries(analytics.byTag).map(([tag, minutes]) => (
                        <div key={tag} className="flex items-center gap-4">
                          <span className="text-sm text-white/70 w-24 truncate">{tag}</span>
                          <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-neon-primary rounded-full"
                              style={{
                                width: `${(minutes / analytics.today.focusMinutes) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm text-white/50 w-16 text-right">
                            {minutes}m
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Timer View */}
            {activeView === 'timer' && (
              <div className="space-y-8">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white mb-2">Focus Timer</h2>
                  <p className="text-white/50">Stay focused with Pomodoro-style sessions</p>
                </div>

                {/* Timer Display */}
                <div className="flex flex-col items-center py-8">
                  {timerState.session ? (
                    <>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-2xl">
                          {FOCUS_PRESETS.find(p => p.id === timerState.session?.preset)?.icon}
                        </span>
                        <span className="text-lg font-medium text-white">
                          {FOCUS_PRESETS.find(p => p.id === timerState.session?.preset)?.label}
                        </span>
                        {timerState.session.isBreak && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400">
                            Break
                          </span>
                        )}
                      </div>
                      <TimerRing
                        progress={timerState.progress}
                        timeRemaining={timerState.session.remaining}
                        status={timerState.session.status}
                        isBreak={timerState.session.isBreak}
                        size="lg"
                        showControls
                        onPlay={onResumeSession}
                        onPause={onPauseSession}
                        onReset={onResetSession}
                        onSkip={onSkipPhase}
                      />
                      <p className="mt-4 text-white/50">
                        Session #{(timerState.session.sessionsCompleted || 0) + 1}
                      </p>
                    </>
                  ) : (
                    <>
                      {/* Preset Selection */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 w-full max-w-2xl">
                        {FOCUS_PRESETS.filter(p => !p.id.includes('break')).map((preset) => (
                          <button
                            key={preset.id}
                            onClick={() => setSelectedPreset(preset.id)}
                            className={cn(
                              'p-4 rounded-xl border transition-all text-left',
                              selectedPreset === preset.id
                                ? 'bg-neon-primary/20 border-neon-primary'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                            )}
                          >
                            <span className="text-2xl">{preset.icon}</span>
                            <p className="text-white font-medium mt-2">{preset.label}</p>
                            <p className="text-white/50 text-xs">{preset.workMinutes}min</p>
                          </button>
                        ))}
                      </div>
                      <Button
                        onClick={() => onStartSession(selectedPreset)}
                        className="px-8 py-3 bg-neon-primary text-black font-medium hover:bg-neon-primary/90"
                      >
                        <Play className="h-5 w-5 mr-2" />
                        Start Focus Session
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Stopwatch View */}
            {activeView === 'stopwatch' && (
              <div className="space-y-8">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white mb-2">Stopwatch</h2>
                  <p className="text-white/50">Track time with precision</p>
                </div>

                {/* Stopwatch Display */}
                <div className="flex flex-col items-center py-8">
                  <div className="text-7xl font-mono font-bold text-white tracking-tight">
                    {formatStopwatchTime(stopwatchState.elapsedMs)}
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-4 mt-8">
                    <Button
                      size="lg"
                      onClick={stopwatchState.isRunning ? onStopwatchStop : onStopwatchStart}
                      className={cn(
                        'w-16 h-16 rounded-full',
                        stopwatchState.isRunning
                          ? 'bg-amber-500 hover:bg-amber-600'
                          : 'bg-neon-primary hover:bg-neon-primary/90'
                      )}
                    >
                      {stopwatchState.isRunning ? (
                        <Pause className="h-6 w-6 text-black" />
                      ) : (
                        <Play className="h-6 w-6 text-black ml-0.5" />
                      )}
                    </Button>
                    {stopwatchState.isRunning && (
                      <Button
                        size="lg"
                        variant="ghost"
                        onClick={onStopwatchLap}
                        className="w-14 h-14 rounded-full border border-white/20"
                      >
                        <Flag className="h-5 w-5 text-white" />
                      </Button>
                    )}
                    {!stopwatchState.isRunning && stopwatchState.elapsedMs > 0 && (
                      <Button
                        size="lg"
                        variant="ghost"
                        onClick={onStopwatchReset}
                        className="w-14 h-14 rounded-full border border-white/20"
                      >
                        <RotateCcw className="h-5 w-5 text-white" />
                      </Button>
                    )}
                  </div>

                  {/* Laps */}
                  {stopwatchState.laps.length > 0 && (
                    <div className="mt-8 w-full max-w-md">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-white/60 text-sm">Laps ({stopwatchState.laps.length})</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={onStopwatchClearLaps}
                          className="text-white/50 hover:text-white"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {stopwatchState.laps.map((lap) => (
                          <div
                            key={lap.id}
                            className={cn(
                              'flex items-center justify-between p-3 rounded-lg',
                              lap.isBest && 'bg-emerald-500/10',
                              lap.isWorst && 'bg-red-500/10',
                              !lap.isBest && !lap.isWorst && 'bg-white/5'
                            )}
                          >
                            <span className="text-white/60">#{lap.lapNumber}</span>
                            <span className={cn(
                              'font-mono font-medium',
                              lap.isBest && 'text-emerald-400',
                              lap.isWorst && 'text-red-400',
                              !lap.isBest && !lap.isWorst && 'text-white'
                            )}>
                              {formatStopwatchTime(lap.lapTime)}
                            </span>
                            <span className="text-white/40 font-mono text-sm">
                              {formatStopwatchTime(lap.totalTime)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Alarms View */}
            {activeView === 'alarms' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Alarms</h2>
                    <p className="text-white/50">Manage your alarms and reminders</p>
                  </div>
                  <Button onClick={onAddAlarm} className="bg-neon-primary text-black hover:bg-neon-primary/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Alarm
                  </Button>
                </div>

                {alarms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Bell className="h-16 w-16 text-white/20 mb-4" />
                    <p className="text-white/50">No alarms set</p>
                    <Button
                      onClick={onAddAlarm}
                      variant="ghost"
                      className="mt-4 text-neon-primary hover:text-neon-primary/80"
                    >
                      Create your first alarm
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {alarms.map((alarm) => (
                      <div
                        key={alarm.id}
                        className={cn(
                          'p-4 rounded-xl border flex items-center gap-4',
                          alarm.enabled
                            ? 'bg-white/5 border-white/10'
                            : 'bg-white/2 border-white/5 opacity-50'
                        )}
                      >
                        <button
                          onClick={() => onToggleAlarm(alarm.id)}
                          className={cn(
                            'p-3 rounded-lg',
                            alarm.enabled ? 'bg-neon-primary/20 text-neon-primary' : 'bg-white/5 text-white/40'
                          )}
                        >
                          {alarm.enabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
                        </button>
                        <div className="flex-1">
                          <p className="text-3xl font-mono font-bold text-white">{alarm.time}</p>
                          <p className="text-white/50 text-sm">
                            {alarm.label || 'Alarm'} · {alarm.repeat}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDeleteAlarm(alarm.id)}
                          className="text-white/40 hover:text-red-400"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* World Clocks View */}
            {activeView === 'world' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">World Clocks</h2>
                  <p className="text-white/50">Track time across the globe</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {timezones.map((tz) => (
                    <div
                      key={tz.id}
                      className="p-4 rounded-xl bg-white/5 border border-white/10"
                    >
                      <p className="text-sm text-white/60">{tz.city}</p>
                      <p className="text-2xl font-mono font-bold text-white mt-1">
                        {currentTime.toLocaleTimeString('en-US', {
                          timeZone: tz.timezone,
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </p>
                      <p className="text-xs text-white/40 mt-1">{tz.country}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  color: string;
}

function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
      <p className="text-sm text-white/50 mb-1">{label}</p>
      <p className={cn('text-2xl font-bold', `text-${color}`)}>{value}</p>
    </div>
  );
}

TimeCommandCenter.displayName = 'TimeCommandCenter';
