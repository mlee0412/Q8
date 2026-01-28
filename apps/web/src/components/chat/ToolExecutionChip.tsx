'use client';

import { useState } from 'react';
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
  ImageIcon,
  ScanLine,
  Wand2,
  DollarSign,
  CreditCard,
  PiggyBank,
  TrendingUp,
  Brain,
  FileText,
  Globe,
  BookOpen,
  Shield,
  Zap,
  Bell,
  Cog,
  Play,
  Pause,
  SkipForward,
  Volume2,
  Trash2,
  RefreshCw,
  Copy,
  ChevronDown,
  ChevronUp,
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

  // Image tools
  if (toolLower.includes('generate_image') || toolLower.includes('create_image')) {
    return Wand2;
  }
  if (toolLower.includes('analyze_image') || toolLower.includes('describe_image')) {
    return ScanLine;
  }
  if (toolLower.includes('image') || toolLower.includes('picture') || toolLower.includes('photo')) {
    return ImageIcon;
  }

  // Finance tools
  if (toolLower.includes('balance') || toolLower.includes('net_worth')) {
    return DollarSign;
  }
  if (toolLower.includes('spending') || toolLower.includes('transaction') || toolLower.includes('payment')) {
    return CreditCard;
  }
  if (toolLower.includes('savings') || toolLower.includes('budget')) {
    return PiggyBank;
  }
  if (toolLower.includes('wealth') || toolLower.includes('invest') || toolLower.includes('portfolio')) {
    return TrendingUp;
  }
  if (toolLower.includes('subscription') || toolLower.includes('recurring') || toolLower.includes('bill')) {
    return RefreshCw;
  }

  // Home Assistant tools - expanded
  if (toolLower.includes('light') || toolLower.includes('control_device')) {
    return Lightbulb;
  }
  if (toolLower.includes('climate') || toolLower.includes('thermostat') || toolLower.includes('temperature')) {
    return Thermometer;
  }
  if (toolLower.includes('lock') || toolLower.includes('door')) {
    return Lock;
  }
  if (toolLower.includes('alarm') || toolLower.includes('security')) {
    return Shield;
  }
  if (toolLower.includes('energy') || toolLower.includes('power')) {
    return Zap;
  }
  if (toolLower.includes('notification') || toolLower.includes('alert')) {
    return Bell;
  }
  if (toolLower.includes('automation') || toolLower.includes('script')) {
    return Cog;
  }
  if (toolLower.includes('vacuum') || toolLower.includes('robot')) {
    return Home;
  }
  if (toolLower.includes('sensor')) {
    return ScanLine;
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
  if (toolLower.includes('play') || toolLower.includes('start')) {
    return Play;
  }
  if (toolLower.includes('pause') || toolLower.includes('stop')) {
    return Pause;
  }
  if (toolLower.includes('next') || toolLower.includes('skip')) {
    return SkipForward;
  }
  if (toolLower.includes('volume')) {
    return Volume2;
  }
  if (toolLower.includes('discover') || toolLower.includes('find_device')) {
    return Search;
  }
  if (toolLower.includes('home') || toolLower.includes('device')) {
    return Home;
  }

  // Knowledge/Memory tools
  if (toolLower.includes('memory') || toolLower.includes('recall') || toolLower.includes('remember')) {
    return Brain;
  }
  if (toolLower.includes('document') || toolLower.includes('file') || toolLower.includes('read')) {
    return FileText;
  }

  // Research tools
  if (toolLower.includes('web_search') || toolLower.includes('perplexity')) {
    return Globe;
  }
  if (toolLower.includes('research') || toolLower.includes('lookup') || toolLower.includes('learn')) {
    return BookOpen;
  }

  // Google tools
  if (toolLower.includes('gmail') || toolLower.includes('email') || toolLower.includes('send_email')) {
    return Mail;
  }
  if (toolLower.includes('calendar') || toolLower.includes('event') || toolLower.includes('schedule')) {
    return Calendar;
  }

  // GitHub tools
  if (toolLower.includes('github') || toolLower.includes('pr') || toolLower.includes('issue') || toolLower.includes('commit')) {
    return Github;
  }

  // Database tools
  if (toolLower.includes('supabase') || toolLower.includes('sql') || toolLower.includes('database') || toolLower.includes('query')) {
    return Database;
  }

  // Utility tools
  if (toolLower.includes('search')) {
    return Search;
  }
  if (toolLower.includes('time') || toolLower.includes('datetime') || toolLower.includes('date')) {
    return Clock;
  }
  if (toolLower.includes('calculate') || toolLower.includes('math') || toolLower.includes('compute')) {
    return Calculator;
  }
  if (toolLower.includes('weather') || toolLower.includes('forecast')) {
    return Cloud;
  }
  if (toolLower.includes('delete') || toolLower.includes('remove')) {
    return Trash2;
  }
  if (toolLower.includes('copy') || toolLower.includes('duplicate')) {
    return Copy;
  }

  // Default
  return Cog;
}

/**
 * Get friendly name for a tool
 */
function getToolDisplayName(tool: string): string {
  const nameMap: Record<string, string> = {
    // Home Assistant tools
    control_device: 'Controlling Device',
    set_climate: 'Setting Climate',
    activate_scene: 'Activating Scene',
    control_media: 'Controlling Media',
    control_cover: 'Adjusting Blinds',
    control_lock: 'Managing Lock',
    get_device_state: 'Checking State',
    discover_devices: 'Discovering Devices',
    control_alarm: 'Managing Alarm',
    get_sensor_state: 'Reading Sensor',
    get_sensor_history: 'Fetching History',
    trigger_automation: 'Running Automation',
    toggle_automation: 'Toggling Automation',
    run_script: 'Running Script',
    control_vacuum: 'Controlling Vacuum',
    get_energy_stats: 'Fetching Energy Data',
    send_notification: 'Sending Notification',

    // Image tools
    generate_image: 'Generating Image',
    edit_image: 'Editing Image',
    analyze_image: 'Analyzing Image',
    create_diagram: 'Creating Diagram',
    create_chart: 'Creating Chart',
    compare_images: 'Comparing Images',

    // Finance tools
    get_balance_sheet: 'Fetching Balances',
    get_spending_summary: 'Analyzing Spending',
    get_upcoming_bills: 'Checking Bills',
    find_subscriptions: 'Finding Subscriptions',
    can_i_afford: 'Checking Affordability',
    project_wealth: 'Projecting Wealth',
    get_transactions: 'Fetching Transactions',
    categorize_transaction: 'Categorizing',

    // Google tools
    gmail_list_messages: 'Searching Gmail',
    gmail_send_message: 'Sending Email',
    gmail_get_message: 'Reading Email',
    calendar_list_events: 'Checking Calendar',
    calendar_create_event: 'Creating Event',
    calendar_update_event: 'Updating Event',
    calendar_delete_event: 'Deleting Event',
    drive_search_files: 'Searching Drive',
    drive_get_file: 'Reading File',

    // GitHub tools
    github_search_code: 'Searching Code',
    github_get_file: 'Reading File',
    github_list_prs: 'Listing PRs',
    github_get_pr: 'Fetching PR',
    github_create_issue: 'Creating Issue',
    github_list_issues: 'Listing Issues',

    // Database tools
    supabase_run_sql: 'Running SQL',
    supabase_get_schema: 'Reading Schema',
    supabase_query: 'Querying Database',
    supabase_insert: 'Inserting Data',
    supabase_update: 'Updating Data',

    // Research tools
    web_search: 'Searching Web',
    perplexity_search: 'Researching',
    search_web: 'Web Search',

    // Memory tools
    recall_memories: 'Recalling Memory',
    store_memory: 'Storing Memory',
    search_memories: 'Searching Memory',

    // Utility tools
    get_current_datetime: 'Getting Time',
    get_weather: 'Checking Weather',
    calculate: 'Calculating',
  };

  return nameMap[tool] || tool.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * ToolResultPreview Component
 *
 * Expandable panel showing full tool execution result
 */
interface ToolResultPreviewProps {
  result: unknown;
  onCopy?: () => void;
  className?: string;
}

function ToolResultPreview({ result, onCopy, className }: ToolResultPreviewProps) {
  const [isCopied, setIsCopied] = useState(false);
  const resultString = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
  const isTruncated = resultString.length > 500;
  const [showFull, setShowFull] = useState(false);

  const displayResult = showFull ? resultString : resultString.slice(0, 500);

  const handleCopy = () => {
    navigator.clipboard.writeText(resultString);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    onCopy?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={cn(
        'mt-2 p-3 rounded-lg',
        'bg-surface-2 border border-border-subtle',
        'text-xs font-mono',
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-text-muted font-sans text-xs">Result</span>
        <button
          onClick={handleCopy}
          className="p-1 rounded hover:bg-surface-3 transition-colors"
          title="Copy result"
        >
          {isCopied ? (
            <Check className="h-3 w-3 text-green-400" />
          ) : (
            <Copy className="h-3 w-3 text-text-muted" />
          )}
        </button>
      </div>

      <pre className="whitespace-pre-wrap break-words text-text-secondary">
        {displayResult}
        {isTruncated && !showFull && '...'}
      </pre>

      {isTruncated && (
        <button
          onClick={() => setShowFull(!showFull)}
          className="flex items-center gap-1 mt-2 text-text-muted hover:text-text-primary transition-colors font-sans"
        >
          {showFull ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Show more
            </>
          )}
        </button>
      )}
    </motion.div>
  );
}

/**
 * ToolExecutionChip Component
 *
 * Shows a tool being executed with status, icon, and expandable result preview
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
  const [showResult, setShowResult] = useState(false);
  const Icon = getToolIcon(tool);
  const displayName = getToolDisplayName(tool);

  const handleClick = () => {
    if (status !== 'running' && result !== undefined) {
      setShowResult(!showResult);
    }
    onClick?.();
  };

  return (
    <div className="inline-block">
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
        onClick={handleClick}
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

        {/* Expand indicator when result available */}
        {status !== 'running' && result !== undefined && (
          <motion.div
            animate={{ rotate: showResult ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-3 w-3 opacity-60" />
          </motion.div>
        )}

        {/* Args summary (if expanded and no result shown) */}
        {expanded && !showResult && args && Object.keys(args).length > 0 && (
          <span className="text-xs opacity-60">
            {Object.entries(args)
              .slice(0, 2)
              .map(([key, value]) => `${key}: ${String(value).slice(0, 20)}`)
              .join(', ')}
          </span>
        )}
      </motion.div>

      {/* Result Preview */}
      <AnimatePresence>
        {showResult && result !== undefined && (
          <ToolResultPreview result={result} />
        )}
      </AnimatePresence>
    </div>
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
