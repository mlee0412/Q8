'use client';

import { useState, useEffect, useRef } from 'react';
import { Settings, Mic, Command, BookOpen } from 'lucide-react';
import Link from 'next/link';
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
import { UnifiedChatWithThreads, UnifiedChatWithThreadsRef } from '@/components/chat/UnifiedChatWithThreads';
import { UserProfile } from '@/components/auth/UserProfile';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { CommandPalette } from '@/components/CommandPalette';
import { SettingsPanel } from '@/components/settings';
import { ToastProvider, toast } from '@/components/ui/toast';
import { AnimatedBackground } from '@/components/shared/AnimatedBackground';
import { ChatProvider } from '@/contexts/ChatContext';
import { logger } from '@/lib/logger';

function DashboardContent() {
  // SECURITY: Get userId from authenticated session, not hardcoded
  const { userId, fullName, isLoading } = useAuth();

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const chatRef = useRef<UnifiedChatWithThreadsRef>(null);

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

            {/* Knowledge Base Button */}
            <Link
              href="/knowledge"
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-3 hover:bg-surface-2 transition-colors border border-border-subtle"
              title="Knowledge Base"
            >
              <BookOpen className="h-4 w-4" />
              <span className="text-sm">Knowledge</span>
            </Link>

            {/* Voice Mode Button - switches chat to voice mode */}
            <button
              onClick={() => chatRef.current?.switchMode('voice')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neon-primary/20 hover:bg-neon-primary/30 transition-colors border border-neon-primary/30"
              title="Switch to Voice Mode"
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
              <BentoItem colSpan={2} rowSpan={2}>
                <TaskWidget />
              </BentoItem>

              {/* Calendar Widget */}
              <BentoItem colSpan={2} rowSpan={1}>
                <CalendarWidget maxItems={3} />
              </BentoItem>

              {/* GitHub PR Widget */}
              <BentoItem colSpan={2} rowSpan={2}>
                <GitHubPRWidget maxItems={5} />
              </BentoItem>

              {/* Suggestions Widget */}
              <BentoItem colSpan={2} rowSpan={1}>
                <SuggestionsWidget
                  userId={userId}
                  sessionId="suggestions-session"
                  onSuggestionClick={(action) => {
                    logger.debug('Suggestion clicked', { action });
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
            <div className="lg:sticky lg:top-6 surface-matte rounded-2xl h-[calc(100vh-12rem)] overflow-hidden">
              <UnifiedChatWithThreads
                ref={chatRef}
                userId={userId}
                userProfile={{
                  name: fullName || 'User',
                  timezone: 'America/New_York',
                  communicationStyle: 'concise',
                }}
                defaultMode="text"
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
        onOpenVoice={() => chatRef.current?.switchMode('voice')}
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
