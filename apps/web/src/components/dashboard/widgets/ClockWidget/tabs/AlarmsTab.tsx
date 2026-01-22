'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, Plus, Trash2, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AlarmBadge } from '../components';
import type { AlarmsTabProps, Alarm } from '../types';

export function AlarmsTab({
  alarms,
  onToggleAlarm,
  onEditAlarm,
  onDeleteAlarm,
  onAddAlarm,
}: AlarmsTabProps) {
  const enabledAlarms = alarms.filter((a) => a.enabled);
  const disabledAlarms = alarms.filter((a) => !a.enabled);

  // Calculate next trigger time for an alarm
  const getNextTrigger = (alarm: Alarm): Date | null => {
    if (!alarm.enabled) return null;

    const now = new Date();
    const [hours, minutes] = alarm.time.split(':').map(Number);
    const today = new Date();
    today.setHours(hours ?? 0, minutes ?? 0, 0, 0);

    // Simple next trigger calculation (doesn't account for all repeat patterns)
    if (today > now) return today;

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-1 py-2 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <Bell className="h-3.5 w-3.5 text-neon-primary" />
          <span className="text-xs font-medium text-text-muted">
            {enabledAlarms.length} active
          </span>
        </div>
        <button
          onClick={onAddAlarm}
          className="btn-icon btn-icon-sm focus-ring"
          aria-label="Add alarm"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Alarms List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {alarms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="h-10 w-10 text-text-muted mb-3" />
            <p className="text-sm text-text-muted">No alarms set</p>
            <p className="text-xs text-text-subtle mt-1">
              Tap the + button to add an alarm
            </p>
            <button
              onClick={onAddAlarm}
              className="mt-4 px-4 py-2 text-sm font-medium rounded-lg bg-neon-primary/10 text-neon-primary hover:bg-neon-primary/20 transition-colors focus-ring"
            >
              Add Alarm
            </button>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {/* Enabled Alarms */}
            {enabledAlarms.length > 0 && (
              <div className="py-2">
                {enabledAlarms.map((alarm) => (
                  <AlarmItem
                    key={alarm.id}
                    alarm={alarm}
                    nextTrigger={getNextTrigger(alarm)}
                    onToggle={() => onToggleAlarm(alarm.id)}
                    onEdit={() => onEditAlarm(alarm)}
                    onDelete={() => onDeleteAlarm(alarm.id)}
                  />
                ))}
              </div>
            )}

            {/* Disabled Alarms */}
            {disabledAlarms.length > 0 && (
              <div className="py-2 border-t border-border-subtle">
                <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-text-subtle">
                  Inactive
                </p>
                {disabledAlarms.map((alarm) => (
                  <AlarmItem
                    key={alarm.id}
                    alarm={alarm}
                    nextTrigger={null}
                    onToggle={() => onToggleAlarm(alarm.id)}
                    onEdit={() => onEditAlarm(alarm)}
                    onDelete={() => onDeleteAlarm(alarm.id)}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

interface AlarmItemProps {
  alarm: Alarm;
  nextTrigger: Date | null;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function AlarmItem({ alarm, nextTrigger, onToggle, onEdit, onDelete }: AlarmItemProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={cn(
        'group flex items-center gap-3 px-3 py-3 hover:bg-surface-4/50 transition-colors',
        !alarm.enabled && 'opacity-50'
      )}
    >
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={cn(
          'p-2 rounded-lg transition-colors',
          alarm.enabled
            ? 'bg-neon-primary/10 text-neon-primary'
            : 'bg-surface-4 text-text-muted'
        )}
        aria-label={alarm.enabled ? 'Disable alarm' : 'Enable alarm'}
      >
        {alarm.enabled ? (
          <Bell className="h-4 w-4" />
        ) : (
          <BellOff className="h-4 w-4" />
        )}
      </button>

      {/* Alarm Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xl font-mono font-bold text-text-primary">
          {alarm.time}
        </p>
        <p className="text-xs text-text-muted truncate">
          {alarm.label || 'Alarm'}
          {alarm.repeat !== 'once' && (
            <span className="ml-1 text-text-subtle">· {alarm.repeat}</span>
          )}
        </p>
      </div>

      {/* Next Trigger */}
      {alarm.enabled && nextTrigger && (
        <div className="text-right">
          <p className="text-xs text-text-muted">
            {formatNextTrigger(nextTrigger)}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="btn-icon btn-icon-xs focus-ring"
          aria-label="Edit alarm"
        >
          <Edit2 className="h-3 w-3" />
        </button>
        <button
          onClick={onDelete}
          className="btn-icon btn-icon-xs focus-ring text-text-muted hover:text-error"
          aria-label="Delete alarm"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </motion.div>
  );
}

function formatNextTrigger(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'Now';
  if (diffMins < 60) return `in ${diffMins}m`;
  if (diffHours < 24) return `in ${diffHours}h ${diffMins % 60}m`;
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

AlarmsTab.displayName = 'AlarmsTab';
