'use client';

import { motion } from 'framer-motion';
import { Bot, Code2, Search, Calendar, Sparkles, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

type AgentRole = 'orchestrator' | 'coder' | 'researcher' | 'secretary' | 'personality' | 'home';

interface AgentIndicatorProps {
  /**
   * Currently active agent
   */
  agent: AgentRole;

  /**
   * Agent display name
   */
  agentName?: string;

  /**
   * Show typing animation
   * @default true
   */
  showTyping?: boolean;

  /**
   * Current task description
   */
  task?: string;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Agent Indicator Component
 *
 * Shows which sub-agent is currently responding with typing animation
 * and agent metadata.
 *
 * Features:
 * - Agent-specific icons and colors
 * - Typing animation (three bouncing dots)
 * - Current task description
 * - Model name display
 *
 * @example
 * ```tsx
 * // Orchestrator thinking
 * <AgentIndicator
 *   agent="orchestrator"
 *   task="Routing your request..."
 * />
 *
 * // Coder working
 * <AgentIndicator
 *   agent="coder"
 *   agentName="DevBot"
 *   task="Analyzing authentication code..."
 * />
 *
 * // Without typing animation
 * <AgentIndicator
 *   agent="researcher"
 *   showTyping={false}
 * />
 * ```
 */
export function AgentIndicator({
  agent,
  agentName,
  showTyping = true,
  task,
  className,
}: AgentIndicatorProps) {
  const agentConfig = getAgentConfig(agent);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn('flex items-center gap-3 surface-matte rounded-xl p-4', className)}
    >
      {/* Agent Icon */}
      <div className={cn('h-10 w-10 rounded-full flex items-center justify-center', agentConfig.bgColor)}>
        <agentConfig.icon className={cn('h-5 w-5', agentConfig.iconColor)} />
      </div>

      {/* Agent Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {agentName || agentConfig.name}
          </span>
          <span className="text-xs text-text-muted">
            ({agentConfig.model})
          </span>
        </div>

        {task && (
          <p className="text-xs text-text-muted truncate mt-0.5">
            {task}
          </p>
        )}
      </div>

      {/* Typing Animation */}
      {showTyping && (
        <div className="flex gap-1">
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
            className="h-2 w-2 rounded-full bg-neon-primary"
          />
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
            className="h-2 w-2 rounded-full bg-neon-primary"
          />
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
            className="h-2 w-2 rounded-full bg-neon-primary"
          />
        </div>
      )}
    </motion.div>
  );
}

AgentIndicator.displayName = 'AgentIndicator';

// Helper: Get agent configuration
function getAgentConfig(role: AgentRole) {
  const configs = {
    orchestrator: {
      name: 'Q8 Orchestrator',
      model: 'GPT-5.1',
      icon: Bot,
      iconColor: 'text-neon-primary',
      bgColor: 'bg-neon-primary/20',
    },
    coder: {
      name: 'DevBot',
      model: 'Claude 4.5',
      icon: Code2,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-500/20',
    },
    researcher: {
      name: 'Research Agent',
      model: 'Perplexity Sonar',
      icon: Search,
      iconColor: 'text-purple-500',
      bgColor: 'bg-purple-500/20',
    },
    secretary: {
      name: 'Secretary',
      model: 'Gemini 3.0',
      icon: Calendar,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-500/20',
    },
    personality: {
      name: 'Grok',
      model: 'Grok 4.1',
      icon: Sparkles,
      iconColor: 'text-orange-500',
      bgColor: 'bg-orange-500/20',
    },
    home: {
      name: 'HomeBot',
      model: 'GPT-5.1',
      icon: Home,
      iconColor: 'text-cyan-500',
      bgColor: 'bg-cyan-500/20',
    },
  };

  return configs[role];
}
