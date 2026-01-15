'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Code2,
  Search,
  Calendar,
  Sparkles,
  Home,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type AgentRole = 'orchestrator' | 'coder' | 'researcher' | 'secretary' | 'personality' | 'home';

interface AgentHandoffProps {
  /**
   * Source agent (usually orchestrator)
   */
  from?: AgentRole;

  /**
   * Target agent
   */
  to: AgentRole;

  /**
   * Routing reason
   */
  reason?: string;

  /**
   * Whether to show the animation
   */
  visible?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Get agent configuration
 */
function getAgentConfig(role: AgentRole) {
  const configs = {
    orchestrator: {
      name: 'Q8',
      icon: Bot,
      bgColor: 'bg-purple-500/20',
      iconColor: 'text-purple-400',
      borderColor: 'border-purple-500/30',
    },
    coder: {
      name: 'DevBot',
      icon: Code2,
      bgColor: 'bg-blue-500/20',
      iconColor: 'text-blue-400',
      borderColor: 'border-blue-500/30',
    },
    researcher: {
      name: 'ResearchBot',
      icon: Search,
      bgColor: 'bg-green-500/20',
      iconColor: 'text-green-400',
      borderColor: 'border-green-500/30',
    },
    secretary: {
      name: 'SecretaryBot',
      icon: Calendar,
      bgColor: 'bg-orange-500/20',
      iconColor: 'text-orange-400',
      borderColor: 'border-orange-500/30',
    },
    personality: {
      name: 'Q8',
      icon: Sparkles,
      bgColor: 'bg-pink-500/20',
      iconColor: 'text-pink-400',
      borderColor: 'border-pink-500/30',
    },
    home: {
      name: 'HomeBot',
      icon: Home,
      bgColor: 'bg-cyan-500/20',
      iconColor: 'text-cyan-400',
      borderColor: 'border-cyan-500/30',
    },
  };

  return configs[role];
}

/**
 * AgentHandoff Component
 *
 * Shows an animated transition when routing to a different agent
 */
export function AgentHandoff({
  from = 'orchestrator',
  to,
  reason,
  visible = true,
  className,
}: AgentHandoffProps) {
  const fromConfig = getAgentConfig(from);
  const toConfig = getAgentConfig(to);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className={cn(
            'flex items-center justify-center gap-4 py-3',
            className
          )}
        >
          {/* From Agent */}
          <motion.div
            initial={{ scale: 1 }}
            animate={{ scale: [1, 0.9, 1] }}
            transition={{ duration: 0.5 }}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl border',
              fromConfig.bgColor,
              fromConfig.borderColor
            )}
          >
            <fromConfig.icon className={cn('h-5 w-5', fromConfig.iconColor)} />
            <span className="text-sm font-medium">{fromConfig.name}</span>
          </motion.div>

          {/* Arrow Animation */}
          <motion.div
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <ArrowRight className="h-5 w-5 text-text-muted" />
            </motion.div>
          </motion.div>

          {/* To Agent */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl border',
              toConfig.bgColor,
              toConfig.borderColor,
              'ring-2 ring-offset-2 ring-offset-background',
              toConfig.borderColor.replace('border-', 'ring-')
            )}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <toConfig.icon className={cn('h-5 w-5', toConfig.iconColor)} />
            </motion.div>
            <span className="text-sm font-medium">{toConfig.name}</span>
          </motion.div>
        </motion.div>
      )}

      {/* Routing Reason */}
      {visible && reason && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center text-xs text-text-muted mt-1"
        >
          {reason}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

/**
 * Compact Agent Badge Component
 *
 * Shows just the target agent with a subtle animation
 */
interface AgentBadgeProps {
  agent: AgentRole;
  isActive?: boolean;
  className?: string;
}

export function AgentBadge({ agent, isActive = false, className }: AgentBadgeProps) {
  const config = getAgentConfig(agent);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs',
        'border',
        config.bgColor,
        config.borderColor,
        isActive && 'ring-1 ring-neon-primary',
        className
      )}
    >
      <config.icon className={cn('h-3 w-3', config.iconColor)} />
      <span className="font-medium">{config.name}</span>
    </motion.div>
  );
}

AgentHandoff.displayName = 'AgentHandoff';
AgentBadge.displayName = 'AgentBadge';
