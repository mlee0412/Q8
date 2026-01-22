/**
 * Preset Suggestions Configuration
 * Agent-aware preset definitions for the chat empty state
 */

import {
  Home,
  Thermometer,
  Lock,
  Sun,
  Cloud,
  Newspaper,
  Search,
  Calendar,
  Mail,
  Clock,
  DollarSign,
  Receipt,
  TrendingUp,
  Smile,
  MessageCircle,
  Sparkles,
  Code2,
  GitPullRequest,
  Database,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type ExtendedAgentType =
  | 'orchestrator'
  | 'coder'
  | 'researcher'
  | 'secretary'
  | 'personality'
  | 'home'
  | 'finance';

export type PresetCategory = 'smart-home' | 'productivity' | 'research' | 'finance' | 'fun' | 'dev';

export interface PresetSuggestion {
  id: string;
  label: string;
  prompt: string;
  icon: LucideIcon;
  agent: ExtendedAgentType;
  category: PresetCategory;
  priority: number;
}

/**
 * Agent color mapping for visual consistency
 */
export const AGENT_COLORS: Record<ExtendedAgentType, { text: string; bg: string; border: string }> = {
  orchestrator: {
    text: 'text-neon-primary',
    bg: 'bg-neon-primary/10',
    border: 'border-neon-primary/30',
  },
  coder: {
    text: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
  },
  researcher: {
    text: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
  },
  secretary: {
    text: 'text-green-500',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
  },
  personality: {
    text: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
  },
  home: {
    text: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
  },
  finance: {
    text: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
};

/**
 * All available preset suggestions mapped to agents
 */
export const PRESET_SUGGESTIONS: PresetSuggestion[] = [
  // Smart Home (home agent)
  {
    id: 'home-lights-on',
    label: 'Turn on lights',
    prompt: 'Turn on the lights',
    icon: Sun,
    agent: 'home',
    category: 'smart-home',
    priority: 1,
  },
  {
    id: 'home-thermostat',
    label: 'Set temperature',
    prompt: 'Set the thermostat to 72 degrees',
    icon: Thermometer,
    agent: 'home',
    category: 'smart-home',
    priority: 2,
  },
  {
    id: 'home-lock',
    label: 'Lock doors',
    prompt: 'Lock all the doors',
    icon: Lock,
    agent: 'home',
    category: 'smart-home',
    priority: 3,
  },
  {
    id: 'home-status',
    label: 'Home status',
    prompt: "What's the status of my smart home devices?",
    icon: Home,
    agent: 'home',
    category: 'smart-home',
    priority: 4,
  },

  // Research (researcher agent)
  {
    id: 'research-weather',
    label: 'Weather',
    prompt: "What's the weather forecast for today?",
    icon: Cloud,
    agent: 'researcher',
    category: 'research',
    priority: 1,
  },
  {
    id: 'research-news',
    label: 'Latest news',
    prompt: "What's the latest news today?",
    icon: Newspaper,
    agent: 'researcher',
    category: 'research',
    priority: 2,
  },
  {
    id: 'research-search',
    label: 'Search the web',
    prompt: 'Search for ',
    icon: Search,
    agent: 'researcher',
    category: 'research',
    priority: 3,
  },

  // Productivity (secretary agent)
  {
    id: 'secretary-calendar',
    label: "Today's schedule",
    prompt: "What's on my calendar today?",
    icon: Calendar,
    agent: 'secretary',
    category: 'productivity',
    priority: 1,
  },
  {
    id: 'secretary-email',
    label: 'Check email',
    prompt: 'Check my recent emails',
    icon: Mail,
    agent: 'secretary',
    category: 'productivity',
    priority: 2,
  },
  {
    id: 'secretary-meetings',
    label: 'Upcoming meetings',
    prompt: 'What meetings do I have this week?',
    icon: Clock,
    agent: 'secretary',
    category: 'productivity',
    priority: 3,
  },

  // Finance (finance agent)
  {
    id: 'finance-spending',
    label: 'Monthly spending',
    prompt: 'Show me my spending summary for this month',
    icon: DollarSign,
    agent: 'finance',
    category: 'finance',
    priority: 1,
  },
  {
    id: 'finance-bills',
    label: 'Upcoming bills',
    prompt: 'What bills are coming up?',
    icon: Receipt,
    agent: 'finance',
    category: 'finance',
    priority: 2,
  },
  {
    id: 'finance-wealth',
    label: 'Net worth',
    prompt: "What's my current net worth?",
    icon: TrendingUp,
    agent: 'finance',
    category: 'finance',
    priority: 3,
  },

  // Fun (personality agent)
  {
    id: 'personality-joke',
    label: 'Tell a joke',
    prompt: 'Tell me a joke',
    icon: Smile,
    agent: 'personality',
    category: 'fun',
    priority: 1,
  },
  {
    id: 'personality-chat',
    label: 'Just chat',
    prompt: "Hey, how's it going?",
    icon: MessageCircle,
    agent: 'personality',
    category: 'fun',
    priority: 2,
  },
  {
    id: 'personality-creative',
    label: 'Get creative',
    prompt: 'Help me brainstorm some creative ideas',
    icon: Sparkles,
    agent: 'personality',
    category: 'fun',
    priority: 3,
  },

  // Development (coder agent)
  {
    id: 'coder-prs',
    label: 'Check PRs',
    prompt: 'Show me my open pull requests on GitHub',
    icon: GitPullRequest,
    agent: 'coder',
    category: 'dev',
    priority: 1,
  },
  {
    id: 'coder-review',
    label: 'Code review',
    prompt: 'Help me review some code',
    icon: Code2,
    agent: 'coder',
    category: 'dev',
    priority: 2,
  },
  {
    id: 'coder-database',
    label: 'Database query',
    prompt: 'Help me write a database query',
    icon: Database,
    agent: 'coder',
    category: 'dev',
    priority: 3,
  },
];

/**
 * Get presets by category
 */
export function getPresetsByCategory(category: PresetCategory): PresetSuggestion[] {
  return PRESET_SUGGESTIONS.filter((p) => p.category === category).sort(
    (a, b) => a.priority - b.priority
  );
}

/**
 * Get presets by agent
 */
export function getPresetsByAgent(agent: ExtendedAgentType): PresetSuggestion[] {
  return PRESET_SUGGESTIONS.filter((p) => p.agent === agent).sort(
    (a, b) => a.priority - b.priority
  );
}

/**
 * Get default presets for empty state (one from each major category)
 */
export function getDefaultPresets(): PresetSuggestion[] {
  const categories: PresetCategory[] = ['smart-home', 'research', 'productivity', 'fun'];
  return categories
    .map((cat) => getPresetsByCategory(cat)[0])
    .filter((p): p is PresetSuggestion => p !== undefined)
    .slice(0, 4);
}

/**
 * Category display configuration
 */
export const CATEGORY_CONFIG: Record<PresetCategory, { label: string; order: number }> = {
  'smart-home': { label: 'Smart Home', order: 1 },
  productivity: { label: 'Productivity', order: 2 },
  research: { label: 'Research', order: 3 },
  finance: { label: 'Finance', order: 4 },
  fun: { label: 'Fun', order: 5 },
  dev: { label: 'Development', order: 6 },
};
