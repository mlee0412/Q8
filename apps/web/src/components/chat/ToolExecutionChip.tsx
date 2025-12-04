'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  Check,
  X,
  Lightbulb,
  Thermometer,
  Search,
  Mail,
  Calendar,
  Database,
  Github,
  Clock,
  Calculator,
  Cloud,
  Home,
  Lock,
  Music,
  Tv,
  Blinds,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToolStatus = 'running' | 'completed' | 'failed';

interface ToolExecutionChipProps {
  /**
   * Tool name
   */
  tool: string;

  /**
   * Execution status
   */
  status: ToolStatus;

  /**
   * Tool arguments (for display)
   */
  args?: Record<string, unknown>;

  /**
   * Result summary (for completed tools)
   */
  result?: string;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Show expanded details
   */
  expanded?: boolean;

  /**
   * Click handler
   */
  onClick?: () => void;
}

/**
 * Get icon for a tool
 */
function getToolIcon(tool: string) {
  const toolLower = tool.toLowerCase();

  // Home Assistant tools
  if (toolLower.includes('light') || toolLower.includes('control_device')) {
    return Lightbulb;
  }
  if (toolLower.includes('climate') || toolLower.includes('thermostat')) {
    return Thermometer;
  }
  if (toolLower.includes('lock')) {
    return Lock;
  }
  if (toolLower.includes('media') || toolLower.includes('music') || toolLower.includes('speaker')) {
    return Music;
  }
  if (toolLower.includes('tv') || toolLower.includes('scene')) {
    return Tv;
  }
  if (toolLower.includes('cover') || toolLower.includes('blind')) {
    return Blinds;
  }
  if (toolLower.includes('home') || toolLower.includes('device')) {
    return Home;
  }

  // Google tools
  if (toolLower.includes('gmail') || toolLower.includes('email')) {
    return Mail;
  }
  if (toolLower.includes('calendar') || toolLower.includes('event')) {
    return Calendar;
  }

  // GitHub tools
  if (toolLower.includes('github') || toolLower.includes('pr') || toolLower.includes('issue')) {
    return Github;
  }

  // Database tools
  if (toolLower.includes('supabase') || toolLower.includes('sql') || toolLower.includes('database')) {
    return Database;
  }

  // Utility tools
  if (toolLower.includes('search') || toolLower.includes('web')) {
    return Search;
  }
  if (toolLower.includes('time') || toolLower.includes('datetime')) {
    return Clock;
  }
  if (toolLower.includes('calculate') || toolLower.includes('math')) {
    return Calculator;
  }
  if (toolLower.includes('weather')) {
    return Cloud;
  }

  // Default
  return Search;
}

/**
 * Get friendly name for a tool
 */
function getToolDisplayName(tool: string): string {
  const nameMap: Record<string, string> = {
    control_device: 'Device Control',
    set_climate: 'Climate Control',
    activate_scene: 'Scene',
    control_media: 'Media Control',
    control_cover: 'Blinds/Cover',
    control_lock: 'Lock Control',
    get_device_state: 'Check State',
    gmail_list_messages: 'Gmail Search',
    gmail_send_message: 'Send Email',
    gmail_get_message: 'Read Email',
    calendar_list_events: 'Calendar',
    calendar_create_event: 'Create Event',
    drive_search_files: 'Drive Search',
    github_search_code: 'Code Search',
    github_get_file: 'Get File',
    github_list_prs: 'List PRs',
    supabase_run_sql: 'SQL Query',
    supabase_get_schema: 'Schema',
    get_current_datetime: 'Time',
    get_weather: 'Weather',
    calculate: 'Calculate',
    search_web: 'Web Search',
  };

  return nameMap[tool] || tool.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * ToolExecutionChip Component
 *
 * Shows a tool being executed with status and icon
 */
export function ToolExecutionChip({
  tool,
  status,
  args,
  result,
  className,
  expanded = false,
  onClick,
}: ToolExecutionChipProps) {
  const Icon = getToolIcon(tool);
  const displayName = getToolDisplayName(tool);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm',
        'border transition-all cursor-pointer',
        status === 'running' && 'bg-blue-500/10 border-blue-500/30 text-blue-400',
        status === 'completed' && 'bg-green-500/10 border-green-500/30 text-green-400',
        status === 'failed' && 'bg-red-500/10 border-red-500/30 text-red-400',
        className
      )}
      onClick={onClick}
    >
      {/* Status Icon */}
      <AnimatePresence mode="wait">
        {status === 'running' ? (
          <motion.div
            key="running"
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="h-4 w-4" />
          </motion.div>
        ) : status === 'completed' ? (
          <motion.div
            key="completed"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            <Check className="h-4 w-4" />
          </motion.div>
        ) : (
          <motion.div
            key="failed"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            <X className="h-4 w-4" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tool Icon */}
      <Icon className="h-4 w-4" />

      {/* Tool Name */}
      <span className="font-medium">{displayName}</span>

      {/* Args summary (if expanded) */}
      {expanded && args && Object.keys(args).length > 0 && (
        <span className="text-xs opacity-60">
          {Object.entries(args)
            .slice(0, 2)
            .map(([key, value]) => `${key}: ${String(value).slice(0, 20)}`)
            .join(', ')}
        </span>
      )}
    </motion.div>
  );
}

/**
 * ToolExecutionList Component
 *
 * Shows a list of tool executions
 */
interface ToolExecutionListProps {
  tools: Array<{
    id: string;
    tool: string;
    status: ToolStatus;
    args?: Record<string, unknown>;
    result?: unknown;
  }>;
  className?: string;
}

export function ToolExecutionList({ tools, className }: ToolExecutionListProps) {
  if (tools.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-2 my-2', className)}>
      <AnimatePresence>
        {tools.map((tool) => (
          <ToolExecutionChip
            key={tool.id}
            tool={tool.tool}
            status={tool.status}
            args={tool.args}
            result={typeof tool.result === 'string' ? tool.result : undefined}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

ToolExecutionChip.displayName = 'ToolExecutionChip';
ToolExecutionList.displayName = 'ToolExecutionList';
