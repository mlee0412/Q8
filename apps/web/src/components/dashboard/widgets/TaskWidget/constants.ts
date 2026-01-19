/**
 * TaskWidget Constants - Kanban Board Configuration
 */

import type { TaskStatus, TaskPriority } from './types';

export interface KanbanColumn {
  id: TaskStatus;
  title: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}

export const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: 'backlog',
    title: 'Backlog',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/30',
    icon: '📋',
  },
  {
    id: 'todo',
    title: 'To Do',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    icon: '📝',
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    icon: '🔄',
  },
  {
    id: 'review',
    title: 'Review',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    icon: '👀',
  },
  {
    id: 'done',
    title: 'Done',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    icon: '✅',
  },
];

export const PRIORITY_CONFIG: Record<TaskPriority, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}> = {
  low: {
    label: 'Low',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
    borderColor: 'border-slate-500/30',
    icon: '○',
  },
  medium: {
    label: 'Medium',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
    icon: '◐',
  },
  high: {
    label: 'High',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/30',
    icon: '●',
  },
  urgent: {
    label: 'Urgent',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/30',
    icon: '🔥',
  },
};

export const STATUS_CONFIG: Record<TaskStatus, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  backlog: {
    label: 'Backlog',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
  },
  todo: {
    label: 'To Do',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
  },
  review: {
    label: 'Review',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
  },
  done: {
    label: 'Done',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
  },
};

export const QUICK_FILTERS = [
  { id: 'all', label: 'All Tasks', icon: '📋' },
  { id: 'today', label: 'Today', icon: '📅' },
  { id: 'overdue', label: 'Overdue', icon: '⚠️' },
  { id: 'thisWeek', label: 'This Week', icon: '📆' },
  { id: 'highPriority', label: 'High Priority', icon: '🔥' },
] as const;

export const VIEW_MODES = [
  { id: 'kanban', label: 'Kanban', icon: '▦' },
  { id: 'list', label: 'List', icon: '☰' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
] as const;

export const DEFAULT_TAGS = [
  { name: 'work', color: '#3b82f6' },
  { name: 'personal', color: '#10b981' },
  { name: 'urgent', color: '#ef4444' },
  { name: 'meeting', color: '#8b5cf6' },
  { name: 'idea', color: '#f59e0b' },
  { name: 'bug', color: '#dc2626' },
  { name: 'feature', color: '#06b6d4' },
  { name: 'docs', color: '#84cc16' },
];

export const ESTIMATED_TIME_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 240, label: '4 hours' },
  { value: 480, label: '8 hours' },
];
