'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  Code2,
  Search,
  Calendar,
  Home,
  DollarSign,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PresetSuggestion } from '@/lib/presets/preset-config';
import { getPresetsByAgent, AGENT_COLORS, type ExtendedAgentType } from '@/lib/presets/preset-config';

export interface AgentInfo {
  id: ExtendedAgentType;
  name: string;
  description: string;
  icon: LucideIcon;
  capabilities: string[];
  mentionExample: string;
  color: {
    text: string;
    bg: string;
    border: string;
  };
}

/**
 * Agent definitions with display info
 */
export const AGENT_INFO: AgentInfo[] = [
  {
    id: 'home',
    name: 'HomeBot',
    description: 'Control your smart home',
    icon: Home,
    capabilities: ['Lights & switches', 'Climate control', 'Door locks', 'Scenes'],
    mentionExample: '@home turn on living room lights',
    color: AGENT_COLORS.home,
  },
  {
    id: 'secretary',
    name: 'Secretary',
    description: 'Manage calendar & email',
    icon: Calendar,
    capabilities: ['Google Calendar', 'Gmail inbox', 'Meeting scheduling', 'Reminders'],
    mentionExample: '@secretary schedule a meeting tomorrow',
    color: AGENT_COLORS.secretary,
  },
  {
    id: 'researcher',
    name: 'ResearchBot',
    description: 'Search & discover',
    icon: Search,
    capabilities: ['Web search', 'News & trends', 'Fact checking', 'Documentation'],
    mentionExample: '@researcher latest AI news',
    color: AGENT_COLORS.researcher,
  },
  {
    id: 'finance',
    name: 'FinanceBot',
    description: 'Track your money',
    icon: DollarSign,
    capabilities: ['Spending insights', 'Bill tracking', 'Net worth', 'Budgeting'],
    mentionExample: '@finance show my spending this month',
    color: AGENT_COLORS.finance,
  },
  {
    id: 'coder',
    name: 'DevBot',
    description: 'Code & GitHub',
    icon: Code2,
    capabilities: ['Code review', 'PR management', 'Database queries', 'Debugging'],
    mentionExample: '@coder check my open PRs',
    color: AGENT_COLORS.coder,
  },
  {
    id: 'personality',
    name: 'Q8',
    description: 'Chat & create',
    icon: Sparkles,
    capabilities: ['Conversation', 'Creative writing', 'Brainstorming', 'Fun & jokes'],
    mentionExample: '@personality tell me a joke',
    color: AGENT_COLORS.personality,
  },
];

interface AgentCardProps {
  agent: AgentInfo;
  onSelectPreset: (prompt: string) => void;
  onMentionClick?: (mention: string) => void;
  isCompact?: boolean;
  className?: string;
}

/**
 * AgentCard Component
 * Displays an agent's capabilities with quick action buttons
 */
export function AgentCard({
  agent,
  onSelectPreset,
  onMentionClick,
  isCompact = false,
  className,
}: AgentCardProps) {
  const Icon = agent.icon;
  const presets = getPresetsByAgent(agent.id).slice(0, 3);

  if (isCompact) {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        className={cn(
          'flex items-center gap-3 p-3 rounded-xl cursor-pointer',
          'border transition-all duration-200',
          'bg-surface-2 border-border-subtle',
          'hover:border-current',
          agent.color.text,
          className
        )}
        onClick={() => presets[0] && onSelectPreset(presets[0].prompt)}
      >
        <div className={cn('p-2 rounded-lg', agent.color.bg)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-text-primary">{agent.name}</h4>
          <p className="text-xs text-text-muted truncate">{agent.description}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-text-muted" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-4 rounded-xl border',
        'bg-surface-2 border-border-subtle',
        'hover:border-current transition-colors',
        agent.color.text,
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className={cn('p-2.5 rounded-lg', agent.color.bg)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-text-primary">{agent.name}</h4>
          <p className="text-xs text-text-muted">{agent.description}</p>
        </div>
      </div>

      {/* Capabilities */}
      <div className="mb-3">
        <div className="flex flex-wrap gap-1">
          {agent.capabilities.map((cap) => (
            <span
              key={cap}
              className={cn(
                'px-2 py-0.5 rounded text-[10px]',
                agent.color.bg,
                'text-text-secondary'
              )}
            >
              {cap}
            </span>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-1.5">
        {presets.map((preset) => {
          const PresetIcon = preset.icon;
          return (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset.prompt)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs',
                'bg-surface-3 hover:bg-surface-4 transition-colors',
                'text-text-primary hover:text-current'
              )}
            >
              <PresetIcon className="h-3.5 w-3.5 text-text-muted" />
              <span>{preset.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mention hint */}
      {onMentionClick && (
        <button
          onClick={() => onMentionClick(`@${agent.id} `)}
          className="mt-3 w-full text-left text-[10px] text-text-muted hover:text-text-secondary transition-colors"
        >
          <span className="font-mono bg-surface-3 px-1.5 py-0.5 rounded">
            @{agent.id}
          </span>
          <span className="ml-1.5">for direct access</span>
        </button>
      )}
    </motion.div>
  );
}

interface AgentCardMiniProps {
  agent: AgentInfo;
  onClick: () => void;
  isActive?: boolean;
  className?: string;
}

/**
 * Mini agent card for horizontal scrolling
 */
export function AgentCardMini({
  agent,
  onClick,
  isActive = false,
  className,
}: AgentCardMiniProps) {
  const Icon = agent.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1.5 p-3 rounded-xl min-w-[80px]',
        'border transition-all duration-200',
        isActive
          ? [agent.color.bg, agent.color.border, agent.color.text]
          : 'bg-surface-2 border-border-subtle hover:border-current',
        !isActive && agent.color.text,
        className
      )}
    >
      <div className={cn('p-2 rounded-lg', isActive ? 'bg-white/20' : agent.color.bg)}>
        <Icon className="h-4 w-4" />
      </div>
      <span className={cn('text-[10px] font-medium', isActive ? 'text-current' : 'text-text-primary')}>
        {agent.name}
      </span>
    </button>
  );
}
