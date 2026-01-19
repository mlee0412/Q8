/**
 * Agent Display Configuration
 * Centralized styling and display properties for all agent types
 */

import { Bot, Code2, Home, User, Search, Calendar } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type AgentRole =
  | 'orchestrator'
  | 'coder'
  | 'researcher'
  | 'secretary'
  | 'personality'
  | 'home'
  | 'user';

export interface AgentDisplayConfig {
  name: string;
  icon: LucideIcon;
  iconColor: string;
  bgColor: string;
  description?: string;
}

/**
 * Display configuration for each agent type
 * Used across chat components for consistent styling
 */
export const AGENT_DISPLAY_CONFIG: Record<AgentRole, AgentDisplayConfig> = {
  orchestrator: {
    name: 'Q8 Orchestrator',
    icon: Bot,
    iconColor: 'text-neon-primary',
    bgColor: 'bg-neon-primary/20',
    description: 'Main routing agent',
  },
  coder: {
    name: 'DevBot',
    icon: Code2,
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-500/20',
    description: 'Code and development specialist',
  },
  researcher: {
    name: 'Research Agent',
    icon: Search,
    iconColor: 'text-purple-500',
    bgColor: 'bg-purple-500/20',
    description: 'Web search and research',
  },
  secretary: {
    name: 'Secretary',
    icon: Calendar,
    iconColor: 'text-green-500',
    bgColor: 'bg-green-500/20',
    description: 'Email, calendar, and scheduling',
  },
  personality: {
    name: 'Grok',
    icon: Bot,
    iconColor: 'text-orange-500',
    bgColor: 'bg-orange-500/20',
    description: 'Casual conversation and creativity',
  },
  home: {
    name: 'HomeBot',
    icon: Home,
    iconColor: 'text-cyan-500',
    bgColor: 'bg-cyan-500/20',
    description: 'Smart home control',
  },
  user: {
    name: 'You',
    icon: User,
    iconColor: 'text-neon-primary',
    bgColor: 'bg-neon-primary/20',
  },
};

/**
 * Get display configuration for an agent
 */
export function getAgentDisplayConfig(role: AgentRole): AgentDisplayConfig {
  return AGENT_DISPLAY_CONFIG[role] || AGENT_DISPLAY_CONFIG.orchestrator;
}

/**
 * Get agent name by role
 */
export function getAgentName(role: AgentRole): string {
  return AGENT_DISPLAY_CONFIG[role]?.name || 'Assistant';
}

/**
 * Get agent icon by role
 */
export function getAgentIcon(role: AgentRole): LucideIcon {
  return AGENT_DISPLAY_CONFIG[role]?.icon || Bot;
}
