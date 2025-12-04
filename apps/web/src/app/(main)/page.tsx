'use client';

import { useState, useEffect, useRef } from 'react';
import { Settings, Mic, Command } from 'lucide-react';
import { BentoGrid, BentoItem } from '@/components/dashboard/BentoGrid';
import {
  StatusWidget,
  WeatherWidget,
  SpotifyWidget,
  GitHubPRWidget,
  TaskWidget,
  CalendarWidget,
  SuggestionsWidget,
  ClockWidget,
  QuickNotesWidget,
  FocusWidget,
  SmartHomeWidget,
} from '@/components/dashboard/widgets';
import { ChatWithThreads } from '@/components/chat/ChatWithThreads';
import { VoiceConversation } from '@/components/voice';
import { UserProfile } from '@/components/auth/UserProfile';
import { CommandPalette } from '@/components/CommandPalette';
import { SettingsPanel } from '@/components/settings';
import { ToastProvider, toast } from '@/components/ui/toast';

const USER_ID = 'demo-user';

export default function DashboardPage() {
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const chatRef = useRef<{ sendMessage: (msg: string) => void } | null>(null);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K for command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
      // Cmd+. or Ctrl+. for settings
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault();
        setIsSettingsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle sending messages from command palette
  const handleSendMessage = (message: string) => {
    // TODO: Connect to actual chat panel
    console.log('Send message:', message);
    toast.info('Message sent', message);
  };

  return (
    <ToastProvider>
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto py-6 px-4">
        {/* Header */}
        <header className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Q8 Dashboard
            </h1>
            <p className="text-white/60">
              Local-First Multi-Model Personal Assistant
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Command Palette Button */}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-glass-bg hover:bg-glass-border transition-colors border border-glass-border"
              title="Command Palette (⌘K)"
            >
              <Command className="h-4 w-4" />
              <span className="text-sm">⌘K</span>
            </button>

            {/* Voice Mode Button */}
            <button
              onClick={() => setIsVoiceMode(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neon-primary/20 hover:bg-neon-primary/30 transition-colors border border-neon-primary/30"
              title="Voice Mode"
            >
              <Mic className="h-4 w-4" />
              <span className="text-sm font-medium">Voice</span>
            </button>

            {/* Settings Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-xl hover:bg-glass-bg transition-colors"
              title="Settings (⌘.)"
            >
              <Settings className="h-5 w-5" />
            </button>

            <UserProfile />
          </div>
        </header>

        {/* Voice Conversation Overlay */}
        <VoiceConversation
          isOpen={isVoiceMode}
          onClose={() => setIsVoiceMode(false)}
          userId={USER_ID}
          threadId="voice-session"
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Dashboard Widgets */}
          <div className="lg:col-span-2 space-y-6">
            <BentoGrid>
              {/* Clock Widget - World Time + Pomodoro */}
              <BentoItem colSpan={2} rowSpan={1}>
                <ClockWidget />
              </BentoItem>

              {/* Weather Widget - Enhanced with forecast */}
              <BentoItem colSpan={2} rowSpan={2}>
                <WeatherWidget
                  location="New York"
                  unit="fahrenheit"
                  showForecast={true}
                />
              </BentoItem>

              {/* Focus Widget - Productivity tracking */}
              <BentoItem colSpan={2} rowSpan={1}>
                <FocusWidget />
              </BentoItem>

              {/* Spotify Widget */}
              <BentoItem colSpan={2} rowSpan={1}>
                <SpotifyWidget />
              </BentoItem>

              {/* Quick Notes */}
              <BentoItem colSpan={2} rowSpan={2}>
                <QuickNotesWidget userId={USER_ID} />
              </BentoItem>

              {/* Task Widget */}
              <BentoItem colSpan={1} rowSpan={2}>
                <TaskWidget />
              </BentoItem>

              {/* Calendar Widget */}
              <BentoItem colSpan={2} rowSpan={1}>
                <CalendarWidget maxItems={3} />
              </BentoItem>

              {/* GitHub PR Widget */}
              <BentoItem colSpan={1} rowSpan={1}>
                <GitHubPRWidget maxItems={3} />
              </BentoItem>

              {/* Suggestions Widget */}
              <BentoItem colSpan={1} rowSpan={1}>
                <SuggestionsWidget
                  userId={USER_ID}
                  sessionId="suggestions-session"
                  onSuggestionClick={(action) => {
                    console.log('Suggestion clicked:', action);
                  }}
                />
              </BentoItem>

              {/* Smart Home Widget */}
              <BentoItem colSpan={2} rowSpan={3}>
                <SmartHomeWidget />
              </BentoItem>
            </BentoGrid>
          </div>

          {/* Right Column - Chat Interface */}
          <div className="lg:col-span-1">
            <div className="glass-panel rounded-2xl h-[calc(100vh-12rem)] overflow-hidden">
              <ChatWithThreads
                userId={USER_ID}
                userProfile={{
                  name: 'User',
                  timezone: 'America/New_York',
                  communicationStyle: 'concise',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSendMessage={handleSendMessage}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenVoice={() => setIsVoiceMode(true)}
      />

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userId={USER_ID}
        onPreferencesChange={(prefs) => {
          toast.success('Settings saved', 'Your preferences have been updated');
        }}
      />
    </main>
    </ToastProvider>
  );
}
