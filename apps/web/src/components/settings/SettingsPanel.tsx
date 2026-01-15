'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Settings,
  User,
  Bell,
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MemoriesSettings } from './MemoriesSettings';
import type { UserPreferences } from '@/lib/memory/types';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onPreferencesChange?: (preferences: Partial<UserPreferences>) => void;
}

type SettingsTab = 'profile' | 'appearance' | 'voice' | 'agents' | 'memories' | 'privacy' | 'shortcuts';

const tabs: { id: SettingsTab; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'voice', label: 'Voice', icon: Volume2 },
  { id: 'agents', label: 'Agents', icon: Brain },
  { id: 'memories', label: 'Memories', icon: Sparkles },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
];

/**
 * SettingsPanel Component
 */
export function SettingsPanel({
  isOpen,
  onClose,
  userId,
  onPreferencesChange,
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [preferences, setPreferences] = useState<Partial<UserPreferences>>({
    communicationStyle: 'concise',
    responseLength: 'medium',
    preferredVoice: 'nova',
    speechSpeed: 1.0,
    theme: 'dark',
    defaultAgent: 'personality',
    agentPersonality: 'friendly',
    memoryRetention: 'month',
    shareAnalytics: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    if (isOpen) {
      loadPreferences();
    }
  }, [isOpen, userId]);

  const loadPreferences = async () => {
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
        }
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

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
      onPreferencesChange?.(preferences);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const updatePreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="surface-matte rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-neon-primary" />
              <h2 className="text-lg font-semibold">Settings</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-surface-3 transition-colors"
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
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    activeTab === tab.id
                      ? 'bg-neon-primary/20 text-neon-primary'
                      : 'hover:bg-surface-3 text-text-muted'
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto">
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
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="neon" onClick={savePreferences} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================
// Setting Sections
// ============================================================

function ProfileSettings({
  preferences,
  updatePreference,
}: {
  preferences: Partial<UserPreferences>;
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-3">Communication Style</h3>
        <div className="grid grid-cols-2 gap-2">
          {(['concise', 'detailed'] as const).map((style) => (
            <button
              key={style}
              onClick={() => updatePreference('communicationStyle', style)}
              className={cn(
                'p-3 rounded-lg border text-sm text-left transition-colors',
                preferences.communicationStyle === style
                  ? 'border-neon-primary bg-neon-primary/10'
                  : 'border-border-subtle hover:bg-surface-3'
              )}
            >
              <div className="font-medium capitalize">{style}</div>
              <div className="text-xs text-text-muted mt-1">
                {style === 'concise' ? 'Brief, to-the-point responses' : 'Thorough explanations'}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3">Response Length</h3>
        <div className="flex gap-2">
          {(['short', 'medium', 'long'] as const).map((length) => (
            <button
              key={length}
              onClick={() => updatePreference('responseLength', length)}
              className={cn(
                'flex-1 py-2 rounded-lg border text-sm capitalize transition-colors',
                preferences.responseLength === length
                  ? 'border-neon-primary bg-neon-primary/10'
                  : 'border-border-subtle hover:bg-surface-3'
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

function AppearanceSettings({
  preferences,
  updatePreference,
}: {
  preferences: Partial<UserPreferences>;
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
}) {
  const themes = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-3">Theme</h3>
        <div className="grid grid-cols-3 gap-2">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => updatePreference('theme', theme.id)}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors',
                preferences.theme === theme.id
                  ? 'border-neon-primary bg-neon-primary/10'
                  : 'border-border-subtle hover:bg-surface-3'
              )}
            >
              <theme.icon className="h-6 w-6" />
              <span className="text-sm">{theme.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function VoiceSettings({
  preferences,
  updatePreference,
}: {
  preferences: Partial<UserPreferences>;
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
}) {
  const voices = [
    { id: 'nova', label: 'Nova', desc: 'Friendly & upbeat' },
    { id: 'alloy', label: 'Alloy', desc: 'Neutral & balanced' },
    { id: 'echo', label: 'Echo', desc: 'Warm & conversational' },
    { id: 'fable', label: 'Fable', desc: 'Expressive & dynamic' },
    { id: 'onyx', label: 'Onyx', desc: 'Deep & authoritative' },
    { id: 'shimmer', label: 'Shimmer', desc: 'Clear & gentle' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-3">Voice</h3>
        <div className="grid grid-cols-2 gap-2">
          {voices.map((voice) => (
            <button
              key={voice.id}
              onClick={() => updatePreference('preferredVoice', voice.id)}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
                preferences.preferredVoice === voice.id
                  ? 'border-neon-primary bg-neon-primary/10'
                  : 'border-border-subtle hover:bg-surface-3'
              )}
            >
              {preferences.preferredVoice === voice.id && (
                <Check className="h-4 w-4 text-neon-primary" />
              )}
              <div>
                <div className="text-sm font-medium">{voice.label}</div>
                <div className="text-xs text-text-muted">{voice.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3">
          Speech Speed: {preferences.speechSpeed}x
        </h3>
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={preferences.speechSpeed || 1}
          onChange={(e) => updatePreference('speechSpeed', parseFloat(e.target.value))}
          className="w-full accent-neon-primary"
        />
        <div className="flex justify-between text-xs text-text-muted mt-1">
          <span>Slower</span>
          <span>Faster</span>
        </div>
      </div>
    </div>
  );
}

function AgentSettings({
  preferences,
  updatePreference,
}: {
  preferences: Partial<UserPreferences>;
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
}) {
  const personalities = [
    { id: 'professional', label: 'Professional', desc: 'Formal and business-like' },
    { id: 'friendly', label: 'Friendly', desc: 'Warm and approachable' },
    { id: 'witty', label: 'Witty', desc: 'Clever and humorous' },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-3">Agent Personality</h3>
        <div className="space-y-2">
          {personalities.map((p) => (
            <button
              key={p.id}
              onClick={() => updatePreference('agentPersonality', p.id)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
                preferences.agentPersonality === p.id
                  ? 'border-neon-primary bg-neon-primary/10'
                  : 'border-border-subtle hover:bg-surface-3'
              )}
            >
              {preferences.agentPersonality === p.id && (
                <Check className="h-4 w-4 text-neon-primary flex-shrink-0" />
              )}
              <div>
                <div className="text-sm font-medium">{p.label}</div>
                <div className="text-xs text-text-muted">{p.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PrivacySettings({
  preferences,
  updatePreference,
}: {
  preferences: Partial<UserPreferences>;
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
}) {
  const retentionOptions = [
    { id: 'session', label: 'Session only', desc: 'Cleared when you leave' },
    { id: 'week', label: '1 Week', desc: 'Deleted after 7 days' },
    { id: 'month', label: '1 Month', desc: 'Deleted after 30 days' },
    { id: 'forever', label: 'Forever', desc: 'Kept indefinitely' },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-3">Memory Retention</h3>
        <div className="space-y-2">
          {retentionOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => updatePreference('memoryRetention', option.id)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
                preferences.memoryRetention === option.id
                  ? 'border-neon-primary bg-neon-primary/10'
                  : 'border-border-subtle hover:bg-surface-3'
              )}
            >
              {preferences.memoryRetention === option.id && (
                <Check className="h-4 w-4 text-neon-primary flex-shrink-0" />
              )}
              <div>
                <div className="text-sm font-medium">{option.label}</div>
                <div className="text-xs text-text-muted">{option.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={preferences.shareAnalytics || false}
            onChange={(e) => updatePreference('shareAnalytics', e.target.checked)}
            className="rounded border-border-subtle"
          />
          <div>
            <div className="text-sm font-medium">Share anonymous analytics</div>
            <div className="text-xs text-text-muted">
              Help improve Q8 by sharing usage data
            </div>
          </div>
        </label>
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
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Keyboard Shortcuts</h3>
      <div className="space-y-2">
        {shortcuts.map((shortcut, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-2 border-b border-border-subtle/50"
          >
            <span className="text-sm text-text-muted">{shortcut.action}</span>
            <div className="flex items-center gap-1">
              {shortcut.keys.map((key, j) => (
                <kbd
                  key={j}
                  className="px-2 py-1 text-xs rounded bg-surface-3 border border-border-subtle"
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

SettingsPanel.displayName = 'SettingsPanel';
