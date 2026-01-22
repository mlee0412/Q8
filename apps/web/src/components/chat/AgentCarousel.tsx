'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, AtSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AgentCard, AgentCardMini, AGENT_INFO, type AgentInfo } from './AgentCard';
import { usePresetSuggestions } from '@/hooks/usePresetSuggestions';
import type { ServiceAvailability } from '@/lib/presets/context-resolver';

interface AgentCarouselProps {
  onSelectPreset: (prompt: string) => void;
  onMentionInsert?: (mention: string) => void;
  className?: string;
}

/**
 * Filter agents based on available services
 */
function filterAgentsByServices(
  agents: AgentInfo[],
  services: ServiceAvailability
): AgentInfo[] {
  const serviceMap: Record<string, keyof ServiceAvailability | null> = {
    home: 'homeAssistant',
    secretary: 'google',
    coder: 'github',
    finance: 'finance',
    researcher: null, // Always available
    personality: null, // Always available
  };

  return agents.filter((agent) => {
    const requiredService = serviceMap[agent.id];
    if (requiredService === null || requiredService === undefined) return true;
    return services[requiredService];
  });
}

/**
 * AgentCarousel Component
 * Horizontal scrollable carousel of agent cards with detail expansion
 */
export function AgentCarousel({
  onSelectPreset,
  onMentionInsert,
  className,
}: AgentCarouselProps) {
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);
  const { services, recordUsage } = usePresetSuggestions();

  // Filter agents by available services
  const availableAgents = filterAgentsByServices(AGENT_INFO, services);

  const handlePresetSelect = useCallback(
    (prompt: string) => {
      // Find the preset ID for tracking
      const preset = selectedAgent
        ? require('@/lib/presets/preset-config').getPresetsByAgent(selectedAgent.id)
            .find((p: { prompt: string }) => p.prompt === prompt)
        : null;
      if (preset) {
        recordUsage(preset.id);
      }
      onSelectPreset(prompt);
    },
    [selectedAgent, recordUsage, onSelectPreset]
  );

  const handleMentionClick = useCallback(
    (mention: string) => {
      onMentionInsert?.(mention);
    },
    [onMentionInsert]
  );

  return (
    <div className={cn('w-full max-w-lg', className)}>
      {/* Agent selector row */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
        {availableAgents.map((agent) => (
          <AgentCardMini
            key={agent.id}
            agent={agent}
            onClick={() =>
              setSelectedAgent(selectedAgent?.id === agent.id ? null : agent)
            }
            isActive={selectedAgent?.id === agent.id}
          />
        ))}
      </div>

      {/* Expanded agent card */}
      <AnimatePresence mode="wait">
        {selectedAgent && (
          <motion.div
            key={selectedAgent.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <AgentCard
              agent={selectedAgent}
              onSelectPreset={handlePresetSelect}
              onMentionClick={handleMentionClick}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint when no agent selected */}
      {!selectedAgent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-4"
        >
          <p className="text-xs text-text-muted">
            Tap an agent above to see what they can do
          </p>
        </motion.div>
      )}

      {/* @mention hint */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-text-muted">
        <AtSign className="h-3 w-3" />
        <span>
          Type <code className="px-1 py-0.5 bg-surface-3 rounded text-[10px]">@agent</code> to talk directly to any agent
        </span>
      </div>
    </div>
  );
}

/**
 * Compact agent list for sidebar or smaller spaces
 */
export function AgentList({
  onSelectPreset,
  className,
}: Omit<AgentCarouselProps, 'onMentionInsert'>) {
  const { services, recordUsage } = usePresetSuggestions();
  const availableAgents = filterAgentsByServices(AGENT_INFO, services);

  const handleSelect = useCallback(
    (agent: AgentInfo) => {
      const presets = require('@/lib/presets/preset-config').getPresetsByAgent(agent.id);
      if (presets[0]) {
        recordUsage(presets[0].id);
        onSelectPreset(presets[0].prompt);
      }
    },
    [recordUsage, onSelectPreset]
  );

  return (
    <div className={cn('space-y-2', className)}>
      {availableAgents.map((agent) => (
        <AgentCard
          key={agent.id}
          agent={agent}
          onSelectPreset={onSelectPreset}
          isCompact
        />
      ))}
    </div>
  );
}
