'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MessageSquare,
  Settings,
  Mic,
  Home,
  Calendar,
  Mail,
  Code2,
  Sun,
  Moon,
  Volume2,
  Lightbulb,
  Thermometer,
  FileText,
  Command,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: typeof Search;
  category: 'actions' | 'navigation' | 'agents' | 'smart-home';
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage?: (message: string) => void;
  onOpenSettings?: () => void;
  onOpenVoice?: () => void;
}

/**
 * CommandPalette Component
 *
 * Keyboard-driven command palette (Cmd+K)
 */
export function CommandPalette({
  isOpen,
  onClose,
  onSendMessage,
  onOpenSettings,
  onOpenVoice,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Define commands
  const commands: CommandItem[] = [
    // Actions
    {
      id: 'voice',
      title: 'Voice Mode',
      description: 'Start voice conversation',
      icon: Mic,
      category: 'actions',
      action: () => onOpenVoice?.(),
      keywords: ['talk', 'speak', 'microphone'],
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Open preferences',
      icon: Settings,
      category: 'actions',
      action: () => onOpenSettings?.(),
      keywords: ['preferences', 'config'],
    },
    {
      id: 'theme-dark',
      title: 'Dark Theme',
      description: 'Switch to dark mode',
      icon: Moon,
      category: 'actions',
      action: () => console.log('Switch to dark'),
      keywords: ['night', 'dark mode'],
    },
    {
      id: 'theme-light',
      title: 'Light Theme',
      description: 'Switch to light mode',
      icon: Sun,
      category: 'actions',
      action: () => console.log('Switch to light'),
      keywords: ['day', 'light mode'],
    },

    // Smart Home Quick Actions
    {
      id: 'lights-on',
      title: 'Turn on lights',
      description: 'Turn on all lights',
      icon: Lightbulb,
      category: 'smart-home',
      action: () => onSendMessage?.('Turn on all the lights'),
      keywords: ['light', 'lamp', 'bright'],
    },
    {
      id: 'lights-off',
      title: 'Turn off lights',
      description: 'Turn off all lights',
      icon: Lightbulb,
      category: 'smart-home',
      action: () => onSendMessage?.('Turn off all the lights'),
      keywords: ['light', 'lamp', 'dark'],
    },
    {
      id: 'thermostat',
      title: 'Set thermostat',
      description: 'Adjust temperature',
      icon: Thermometer,
      category: 'smart-home',
      action: () => onSendMessage?.('What is the current temperature?'),
      keywords: ['temperature', 'heating', 'cooling', 'hvac'],
    },

    // Agents
    {
      id: 'agent-coder',
      title: 'Talk to DevBot',
      description: 'Code assistance',
      icon: Code2,
      category: 'agents',
      action: () => onSendMessage?.('@coder '),
      keywords: ['code', 'programming', 'developer'],
    },
    {
      id: 'agent-calendar',
      title: 'Talk to Secretary',
      description: 'Calendar & email',
      icon: Calendar,
      category: 'agents',
      action: () => onSendMessage?.("What's on my calendar today?"),
      keywords: ['schedule', 'meeting', 'appointment'],
    },
    {
      id: 'agent-email',
      title: 'Check emails',
      description: 'View recent emails',
      icon: Mail,
      category: 'agents',
      action: () => onSendMessage?.('Show my recent emails'),
      keywords: ['gmail', 'inbox', 'message'],
    },
    {
      id: 'agent-home',
      title: 'Smart Home',
      description: 'Control devices',
      icon: Home,
      category: 'agents',
      action: () => onSendMessage?.('What devices are available?'),
      keywords: ['iot', 'home assistant', 'devices'],
    },

    // Quick messages
    {
      id: 'weather',
      title: 'Check weather',
      description: 'Current conditions',
      icon: Sun,
      category: 'actions',
      action: () => onSendMessage?.("What's the weather like?"),
      keywords: ['forecast', 'temperature', 'rain'],
    },
    {
      id: 'time',
      title: 'What time is it?',
      description: 'Current time',
      icon: Calendar,
      category: 'actions',
      action: () => onSendMessage?.('What time is it?'),
      keywords: ['clock', 'date'],
    },
  ];

  // Filter commands based on query
  const filteredCommands = query
    ? commands.filter((cmd) => {
        const searchText = `${cmd.title} ${cmd.description} ${cmd.keywords?.join(' ')}`.toLowerCase();
        return searchText.includes(query.toLowerCase());
      })
    : commands;

  // Group by category
  const groupedCommands = filteredCommands.reduce<Record<string, CommandItem[]>>((acc, cmd) => {
    const category = cmd.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category]!.push(cmd);
    return acc;
  }, {});

  const categoryLabels: Record<string, string> = {
    actions: 'Actions',
    navigation: 'Navigation',
    agents: 'Agents',
    'smart-home': 'Smart Home',
  };

  // Flatten for keyboard navigation
  const flatCommands = filteredCommands;

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, flatCommands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          const selectedCmd = flatCommands[selectedIndex];
          if (selectedCmd) {
            selectedCmd.action();
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [flatCommands, selectedIndex, onClose]
  );

  // Execute command
  const executeCommand = (cmd: CommandItem) => {
    cmd.action();
    onClose();
    setQuery('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="glass-panel rounded-xl w-full max-w-lg overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-glass-border">
            <Search className="h-5 w-5 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command or search..."
              className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            <kbd className="px-2 py-1 text-xs rounded bg-glass-bg border border-glass-border">
              esc
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[50vh] overflow-y-auto p-2">
            {Object.entries(groupedCommands).map(([category, commands]) => (
              <div key={category} className="mb-3">
                <div className="px-3 py-1 text-xs font-medium text-muted-foreground">
                  {categoryLabels[category] || category}
                </div>
                {commands.map((cmd) => {
                  const isSelected = flatCommands.indexOf(cmd) === selectedIndex;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => executeCommand(cmd)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                        isSelected
                          ? 'bg-neon-primary/20 text-neon-primary'
                          : 'hover:bg-glass-bg'
                      )}
                    >
                      <cmd.icon className="h-5 w-5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{cmd.title}</div>
                        {cmd.description && (
                          <div className="text-xs text-muted-foreground truncate">
                            {cmd.description}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}

            {filteredCommands.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                <Command className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No commands found</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-glass-border text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-glass-bg">↑↓</kbd> navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-glass-bg">↵</kbd> select
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-glass-bg">⌘K</kbd> to open
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

CommandPalette.displayName = 'CommandPalette';
