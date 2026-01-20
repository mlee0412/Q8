'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Settings,
  User,
  Palette,
  Volume2,
  Brain,
  Shield,
  Keyboard,
  Moon,
  Sun,
  Monitor,
  Check,
  Sparkles,
  AlertCircle,
  Eye,
  Wrench,
  MessageSquare,
  Quote,
  Route,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { MemoriesSettings } from './MemoriesSettings';
import { logger } from '@/lib/logger';
import type { UserPreferences } from '@/lib/memory/types';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onPreferencesChange?: (preferences: Partial<UserPreferences>) => void;
}

type SettingsTab = 'profile' | 'appearance' | 'display' | 'voice' | 'agents' | 'memories' | 'privacy' | 'shortcuts';

const tabs: { id: SettingsTab; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'display', label: 'Display', icon: Eye },
  { id: 'voice', label: 'Voice', icon: Volume2 },
  { id: 'agents', label: 'Agents', icon: Brain },
  { id: 'memories', label: 'Memories', icon: Sparkles },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
];

const defaultPreferences: Partial<UserPreferences> = {
  communicationStyle: 'concise',
  responseLength: 'medium',
  preferredVoice: 'nova',
  speechSpeed: 1.0,
  theme: 'dark',
  showToolExecutions: true,
  showAgentMarkers: true,
  showCitations: true,
  showRoutingDecisions: false,
  defaultAgent: 'personality',
  agentPersonality: 'friendly',
  memoryRetention: 'month',
  shareAnalytics: false,
};

/**
 * SettingsPanel Component
 *
 * Modal panel for user preferences with dirty state tracking.
 */
export function SettingsPanel({
  isOpen,
  onClose,
  userId,
  onPreferencesChange,
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [preferences, setPreferences] = useState<Partial<UserPreferences>>(defaultPreferences);
  const [savedPreferences, setSavedPreferences] = useState<Partial<UserPreferences>>(defaultPreferences);
  const [isSaving, setIsSaving] = useState(false);

  // Track dirty state
  const isDirty = useMemo(() => {
    return JSON.stringify(preferences) !== JSON.stringify(savedPreferences);
  }, [preferences, savedPreferences]);

  // Load preferences on mount
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await fetch('/api/memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'getPreferences',
            userId,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.preferences) {
            setPreferences(data.preferences);
            setSavedPreferences(data.preferences);
          }
        }
      } catch (error) {
        logger.error('Failed to load preferences', { error, userId });
      }
    };

    if (isOpen) {
      fetchPreferences();
    }
  }, [isOpen, userId]);

  const savePreferences = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updatePreferences',
          userId,
          preferences,
        }),
      });
      setSavedPreferences(preferences);
      onPreferencesChange?.(preferences);
    } catch (error) {
      logger.error('Failed to save preferences', { error, userId });
    } finally {
      setIsSaving(false);
    }
  };

  const updatePreference = useCallback(<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleClose = () => {
    if (isDirty) {
      if (window.confirm('You have unsaved changes. Discard them?')) {
        setPreferences(savedPreferences);
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="surface-elevated w-full max-w-3xl max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-neon-primary" />
              <h2 className="text-lg font-semibold">Settings</h2>
              {isDirty && (
                <span className="dirty-indicator">
                  <AlertCircle className="h-3 w-3" />
                  Unsaved
                </span>
              )}
            </div>
            <button
              onClick={handleClose}
              className="btn-icon"
              aria-label="Close settings"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex h-[60vh]">
            {/* Sidebar */}
            <nav className="w-48 border-r border-border-subtle p-3 space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                    'focus-ring',
                    activeTab === tab.id
                      ? 'bg-neon-primary/15 text-neon-primary font-medium'
                      : 'hover:bg-surface-4 text-text-muted'
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto scrollbar-thin">
              {activeTab === 'profile' && (
                <ProfileSettings
                  preferences={preferences}
                  updatePreference={updatePreference}
                />
              )}

              {activeTab === 'appearance' && (
                <AppearanceSettings
                  preferences={preferences}
                  updatePreference={updatePreference}
                />
              )}

              {activeTab === 'display' && (
                <DisplaySettings
                  preferences={preferences}
                  updatePreference={updatePreference}
                />
              )}

              {activeTab === 'voice' && (
                <VoiceSettings
                  preferences={preferences}
                  updatePreference={updatePreference}
                />
              )}

              {activeTab === 'agents' && (
                <AgentSettings
                  preferences={preferences}
                  updatePreference={updatePreference}
                />
              )}

              {activeTab === 'memories' && (
                <MemoriesSettings userId={userId} />
              )}

              {activeTab === 'privacy' && (
                <PrivacySettings
                  preferences={preferences}
                  updatePreference={updatePreference}
                />
              )}

              {activeTab === 'shortcuts' && <ShortcutsSettings />}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-subtle">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="neon"
              onClick={savePreferences}
              disabled={isSaving || !isDirty}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================
// Shared Components
// ============================================================

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="setting-row">
      <div className="setting-row-content">
        <div className="setting-row-label">{label}</div>
        {description && (
          <div className="setting-row-description">{description}</div>
        )}
      </div>
      {children}
    </div>
  );
}

interface OptionCardProps {
  selected: boolean;
  onClick: () => void;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

function OptionCard({ selected, onClick, label, description, icon }: OptionCardProps) {
  return (
    <button
      onClick={onClick}
      className="option-card"
      data-selected={selected}
    >
      {selected ? (
        <Check className="option-card-icon" style={{ opacity: 1 }} />
      ) : (
        <span className="option-card-icon" />
      )}
      <div className="flex-1">
        {icon && <div className="mb-1">{icon}</div>}
        <div className="option-card-label">{label}</div>
        {description && (
          <div className="option-card-description">{description}</div>
        )}
      </div>
    </button>
  );
}

// ============================================================
// Setting Sections
// ============================================================

interface SettingsSectionProps {
  preferences: Partial<UserPreferences>;
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
}

function ProfileSettings({ preferences, updatePreference }: SettingsSectionProps) {
  return (
    <div className="space-y-6">
      <div className="setting-section">
        <h3 className="setting-section-header">Communication</h3>
        <div className="grid grid-cols-2 gap-2">
          {(['concise', 'detailed'] as const).map((style) => (
            <OptionCard
              key={style}
              selected={preferences.communicationStyle === style}
              onClick={() => updatePreference('communicationStyle', style)}
              label={style === 'concise' ? 'Concise' : 'Detailed'}
              description={style === 'concise' ? 'Brief, to-the-point responses' : 'Thorough explanations'}
            />
          ))}
        </div>
      </div>

      <div className="setting-section">
        <h3 className="setting-section-header">Response Length</h3>
        <div className="grid grid-cols-3 gap-2">
          {(['short', 'medium', 'long'] as const).map((length) => (
            <button
              key={length}
              onClick={() => updatePreference('responseLength', length)}
              className={cn(
                'py-2.5 rounded-lg border text-sm capitalize transition-colors',
                preferences.responseLength === length
                  ? 'border-neon-primary bg-neon-primary/10 text-text-primary'
                  : 'border-border-subtle hover:bg-surface-4 text-text-muted'
              )}
            >
              {length}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AppearanceSettings({ preferences, updatePreference }: SettingsSectionProps) {
  const themes = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ] as const;

  return (
    <div className="setting-section">
      <h3 className="setting-section-header">Theme</h3>
      <div className="grid grid-cols-3 gap-3">
        {themes.map((theme) => (
          <button
            key={theme.id}
            onClick={() => updatePreference('theme', theme.id)}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors',
              preferences.theme === theme.id
                ? 'border-neon-primary bg-neon-primary/10'
                : 'border-border-subtle hover:bg-surface-4'
            )}
          >
            <theme.icon className={cn(
              'h-6 w-6',
              preferences.theme === theme.id ? 'text-neon-primary' : 'text-text-muted'
            )} />
            <span className="text-sm">{theme.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function VoiceSettings({ preferences, updatePreference }: SettingsSectionProps) {
  const voices = [
    { id: 'nova', label: 'Nova', desc: 'Friendly & upbeat' },
    { id: 'alloy', label: 'Alloy', desc: 'Neutral & balanced' },
    { id: 'echo', label: 'Echo', desc: 'Warm & conversational' },
    { id: 'fable', label: 'Fable', desc: 'Expressive & dynamic' },
    { id: 'onyx', label: 'Onyx', desc: 'Deep & authoritative' },
    { id: 'shimmer', label: 'Shimmer', desc: 'Clear & gentle' },
  ];

  const speedPercentage = ((preferences.speechSpeed || 1) - 0.5) / 1.5 * 100;

  return (
    <div className="space-y-6">
      <div className="setting-section">
        <h3 className="setting-section-header">Voice Selection</h3>
        <div className="grid grid-cols-2 gap-2">
          {voices.map((voice) => (
            <OptionCard
              key={voice.id}
              selected={preferences.preferredVoice === voice.id}
              onClick={() => updatePreference('preferredVoice', voice.id)}
              label={voice.label}
              description={voice.desc}
            />
          ))}
        </div>
      </div>

      <div className="setting-section">
        <h3 className="setting-section-header">Speech Speed</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Speed</span>
            <span className="font-medium">{preferences.speechSpeed}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={preferences.speechSpeed || 1}
            onChange={(e) => updatePreference('speechSpeed', parseFloat(e.target.value))}
            className="slider-track"
            style={{ '--slider-progress': `${speedPercentage}%` } as React.CSSProperties}
          />
          <div className="flex justify-between text-xs text-text-muted">
            <span>0.5x</span>
            <span>2x</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentSettings({ preferences, updatePreference }: SettingsSectionProps) {
  const personalities = [
    { id: 'professional', label: 'Professional', desc: 'Formal and business-like' },
    { id: 'friendly', label: 'Friendly', desc: 'Warm and approachable' },
    { id: 'witty', label: 'Witty', desc: 'Clever and humorous' },
  ] as const;

  return (
    <div className="setting-section">
      <h3 className="setting-section-header">Agent Personality</h3>
      <div className="space-y-2">
        {personalities.map((p) => (
          <OptionCard
            key={p.id}
            selected={preferences.agentPersonality === p.id}
            onClick={() => updatePreference('agentPersonality', p.id)}
            label={p.label}
            description={p.desc}
          />
        ))}
      </div>
    </div>
  );
}

function PrivacySettings({ preferences, updatePreference }: SettingsSectionProps) {
  const retentionOptions = [
    { id: 'session', label: 'Session only', desc: 'Cleared when you leave' },
    { id: 'week', label: '1 Week', desc: 'Deleted after 7 days' },
    { id: 'month', label: '1 Month', desc: 'Deleted after 30 days' },
    { id: 'forever', label: 'Forever', desc: 'Kept indefinitely' },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="setting-section">
        <h3 className="setting-section-header">Memory Retention</h3>
        <div className="space-y-2">
          {retentionOptions.map((option) => (
            <OptionCard
              key={option.id}
              selected={preferences.memoryRetention === option.id}
              onClick={() => updatePreference('memoryRetention', option.id)}
              label={option.label}
              description={option.desc}
            />
          ))}
        </div>
      </div>

      <div className="setting-section">
        <h3 className="setting-section-header">Analytics</h3>
        <SettingRow
          label="Share anonymous analytics"
          description="Help improve Q8 by sharing usage data"
        >
          <Toggle
            checked={preferences.shareAnalytics || false}
            onChange={(checked) => updatePreference('shareAnalytics', checked)}
            aria-label="Share anonymous analytics"
          />
        </SettingRow>
      </div>
    </div>
  );
}

function ShortcutsSettings() {
  const shortcuts = [
    { keys: ['Space'], action: 'Push-to-talk (hold)' },
    { keys: ['⌘', 'K'], action: 'Open command palette' },
    { keys: ['⌘', '/'], action: 'Focus chat input' },
    { keys: ['⌘', '.'], action: 'Open settings' },
    { keys: ['Esc'], action: 'Close modal / Cancel' },
    { keys: ['⌘', 'Enter'], action: 'Send message' },
  ];

  return (
    <div className="setting-section">
      <h3 className="setting-section-header">Keyboard Shortcuts</h3>
      <div className="space-y-1">
        {shortcuts.map((shortcut, i) => (
          <div
            key={i}
            className="setting-row"
          >
            <span className="text-sm text-text-secondary">{shortcut.action}</span>
            <div className="flex items-center gap-1">
              {shortcut.keys.map((key, j) => (
                <kbd
                  key={j}
                  className="px-2 py-1 text-xs rounded-md bg-surface-3 border border-border-subtle font-mono"
                >
                  {key}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DisplaySettings({ preferences, updatePreference }: SettingsSectionProps) {
  const displayOptions = [
    {
      key: 'showToolExecutions' as const,
      label: 'Tool Executions',
      description: 'Show when Q8 uses tools like search, calendar, or home controls',
      icon: Wrench,
    },
    {
      key: 'showAgentMarkers' as const,
      label: 'Agent Indicators',
      description: 'Show which specialist agent is handling your request',
      icon: MessageSquare,
    },
    {
      key: 'showCitations' as const,
      label: 'Inline Citations',
      description: 'Show source references in research responses',
      icon: Quote,
    },
    {
      key: 'showRoutingDecisions' as const,
      label: 'Routing Details',
      description: 'Show why a specific agent was chosen for your request',
      icon: Route,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="setting-section">
        <h3 className="setting-section-header">Response Visibility</h3>
        <p className="text-sm text-text-muted mb-4">
          Control what information is shown during AI responses. All options are toggleable during chat.
        </p>
        <div className="space-y-3">
          {displayOptions.map((option) => (
            <SettingRow
              key={option.key}
              label={option.label}
              description={option.description}
            >
              <div className="flex items-center gap-3">
                <option.icon className="h-4 w-4 text-text-muted" />
                <Toggle
                  checked={preferences[option.key] ?? true}
                  onChange={(checked) => updatePreference(option.key, checked)}
                  aria-label={option.label}
                />
              </div>
            </SettingRow>
          ))}
        </div>
      </div>

      <div className="setting-section">
        <h3 className="setting-section-header">Quick Toggle</h3>
        <p className="text-sm text-text-muted">
          Press <kbd className="px-1.5 py-0.5 text-xs rounded bg-surface-3 border border-border-subtle font-mono">T</kbd> during a response to toggle tool visibility on/off.
        </p>
      </div>
    </div>
  );
}

SettingsPanel.displayName = 'SettingsPanel';
