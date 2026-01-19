'use client';

import { useState, useEffect, useRef } from 'react';
import { Settings, Mic, Command } from 'lucide-react';
import { BentoGrid, BentoItem } from '@/components/dashboard/BentoGrid';
import {
  StatusWidget,
  WeatherWidget,
  ContentHubWidget,
  GitHubPRWidget,
  TaskWidget,
  CalendarWidget,
  SuggestionsWidget,
  ClockWidget,
  QuickNotesWidget,
  FocusWidget,
  SmartHomeWidget,
  FinanceHubWidget,
} from '@/components/dashboard/widgets';
import { ChatWithThreads, ChatWithThreadsRef } from '@/components/chat/ChatWithThreads';
import { VoiceConversation } from '@/components/voice';
import { UserProfile } from '@/components/auth/UserProfile';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { CommandPalette } from '@/components/CommandPalette';
import { SettingsPanel } from '@/components/settings';
import { ToastProvider, toast } from '@/components/ui/toast';
import { AnimatedBackground } from '@/components/shared/AnimatedBackground';
import { ChatProvider } from '@/contexts/ChatContext';

function DashboardContent() {
  // SECURITY: Get userId from authenticated session, not hardcoded
  const { userId, fullName, isLoading } = useAuth();

  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const chatRef = useRef<ChatWithThreadsRef>(null);

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
    if (chatRef.current) {
      chatRef.current.sendMessage(message);
    }
  };

  // Show loading state while auth is being verified
  if (isLoading || !userId) {
    return null; // ProtectedRoute handles loading state
  }

  return (
    <main className="min-h-screen relative">
      {/* Animated Background */}
      <AnimatedBackground />

      <div className="container mx-auto py-6 px-4 relative z-10">
        {/* Header */}
        <header className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              Q8
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Command Palette Button */}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-3 hover:bg-surface-2 transition-colors border border-border-subtle"
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
              className="p-2 rounded-xl hover:bg-surface-3 transition-colors"
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
          userId={userId}
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

              {/* ContentHub Widget - Unified Media Hub */}
              <BentoItem colSpan={2} rowSpan={2}>
                <ContentHubWidget />
              </BentoItem>

              {/* Quick Notes */}
              <BentoItem colSpan={2} rowSpan={2}>
                <QuickNotesWidget userId={userId} />
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
                  userId={userId}
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

              {/* Finance Hub Widget */}
              <BentoItem colSpan={2} rowSpan={2}>
                <FinanceHubWidget />
              </BentoItem>
            </BentoGrid>
          </div>

          {/* Right Column - Chat Interface */}
          <div className="lg:col-span-1">
            <div className="surface-matte rounded-2xl h-[calc(100vh-12rem)] overflow-hidden">
              <ChatWithThreads
                ref={chatRef}
                userId={userId}
                userProfile={{
                  name: fullName || 'User',
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
        userId={userId}
        onPreferencesChange={(prefs) => {
          toast.success('Settings saved', 'Your preferences have been updated');
        }}
      />
    </main>
  );
}

export default function DashboardPage() {
  return (
    <ToastProvider>
      <ChatProvider>
        <ProtectedRoute>
          <DashboardContent />
        </ProtectedRoute>
      </ChatProvider>
    </ToastProvider>
  );
}
