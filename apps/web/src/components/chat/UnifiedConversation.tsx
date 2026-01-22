'use client';

import { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  MessageSquare,
  Volume2,
  VolumeX,
  Keyboard,
  Radio,
  PanelLeft,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useUnifiedChat, type ConversationMode } from '@/hooks/useUnifiedChat';
import { StreamingMessage } from './StreamingMessage';
import { ChatInput, type ChatInputRef } from './ChatInput';
import { AgentHandoff, AgentBadge } from './AgentHandoff';
import { ChatEmptyState } from './ChatEmptyState';
import { AudioLevelIndicator } from '@/components/voice/AudioLevelIndicator';
import type { AgentType } from '@/hooks/useChat';
import { logger } from '@/lib/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface UnifiedConversationRef {
  sendMessage: (message: string) => void;
  switchMode: (mode: ConversationMode) => void;
}

interface UnifiedConversationProps {
  userId: string;
  threadId?: string | null;
  userProfile?: {
    name?: string;
    timezone?: string;
    communicationStyle?: 'concise' | 'detailed';
  };
  defaultMode?: ConversationMode;
  onThreadCreated?: (threadId: string) => void;
  showSidebarToggle?: boolean;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  className?: string;
}

// =============================================================================
// MODE CONFIGURATION
// =============================================================================

const MODE_CONFIG = {
  text: {
    icon: Keyboard,
    label: 'Text',
    description: 'Type your messages',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
  },
  voice: {
    icon: Mic,
    label: 'Voice',
    description: 'Push to talk',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
  },
  ambient: {
    icon: Radio,
    label: 'Ambient',
    description: 'Always listening',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
  },
} as const;

// =============================================================================
// COMPONENT
// =============================================================================

export const UnifiedConversation = forwardRef<UnifiedConversationRef, UnifiedConversationProps>(
  function UnifiedConversation(
    {
      userId,
      threadId,
      userProfile,
      defaultMode = 'text',
      onThreadCreated,
      showSidebarToggle = false,
      sidebarOpen = false,
      onToggleSidebar,
      className,
    },
    ref
  ) {
    const [showModeSelector, setShowModeSelector] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatInputRef = useRef<ChatInputRef>(null);

    const {
      // Chat state
      messages,
      isLoading,
      isStreaming,
      routingReason,
      error,
      threadId: currentThreadId,

      // Mode state
      mode,
      inputMethod,

      // Voice state
      isRecording,
      isTranscribing,
      isSpeaking,
      audioLevel,

      // Agent state
      activeAgent,
      agentStack,

      // TTS state
      ttsEnabled,

      // Actions
      send,
      switchMode,
      startRecording,
      stopRecording,
      cancelRecording,
      stopSpeaking,
      toggleTTS,
      cancelStream,
      clearMessages,
      retryLast,
    } = useUnifiedChat({
      userId,
      threadId,
      userProfile,
      defaultMode,
      autoSpeak: true,
      onRouting: (agent, reason) => {
        logger.info('Routing to agent', { agent, reason });
      },
      onAgentHandoff: (from, to, reason) => {
        logger.info('Agent hand-off', { from, to, reason });
      },
      onModeSwitch: (from, to) => {
        logger.info('Mode switched', { from, to });
      },
      onThreadCreated: (newThreadId) => {
        logger.info('Thread created', { threadId: newThreadId });
        onThreadCreated?.(newThreadId);
      },
      onError: (err) => {
        logger.error('Unified chat error', { error: err });
      },
    });

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        sendMessage: (message: string) => {
          if (message.trim()) {
            send(message, 'keyboard');
          }
        },
        switchMode,
      }),
      [send, switchMode]
    );

    // Auto-scroll to bottom
    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isStreaming]);

    // Handle voice interaction
    const handleVoiceInteraction = useCallback(async () => {
      if (isSpeaking) {
        stopSpeaking();
        return;
      }

      if (isRecording) {
        await stopRecording();
      } else {
        await startRecording();
      }
    }, [isRecording, isSpeaking, startRecording, stopRecording, stopSpeaking]);

    // Keyboard shortcuts for voice mode
    useEffect(() => {
      if (mode === 'text') return;

      const handleKeyDown = (e: KeyboardEvent) => {
        // Space to toggle recording (when not in textarea)
        if (e.code === 'Space' && !e.repeat && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          handleVoiceInteraction();
        }
        // Escape to cancel recording
        if (e.key === 'Escape' && isRecording) {
          cancelRecording();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [mode, isRecording, handleVoiceInteraction, cancelRecording]);

    // Handle send from text input
    const handleSend = useCallback(
      (content: string) => {
        if (content.trim()) {
          send(content, 'keyboard');
        }
      },
      [send]
    );

    // Handle mention insert from empty state
    const handleMentionInsert = useCallback((mention: string) => {
      chatInputRef.current?.insertMention(mention);
    }, []);

    // Handle message action (regenerate, etc.)
    const handleMessageAction = useCallback(
      (action: string) => {
        if (action === 'regenerate') {
          retryLast();
        }
      },
      [retryLast]
    );

    const CurrentModeIcon = MODE_CONFIG[mode].icon;

    return (
      <div className={cn('flex flex-col h-full', className)}>
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-2 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            {/* Sidebar Toggle */}
            {showSidebarToggle && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleSidebar}
                className="h-8 w-8 p-0"
                title={sidebarOpen ? 'Hide conversations' : 'Show conversations'}
              >
                <PanelLeft
                  className={cn('h-4 w-4 transition-transform', sidebarOpen && 'text-neon-primary')}
                />
              </Button>
            )}

            {/* Mode Selector */}
            <div className="relative">
              <button
                onClick={() => setShowModeSelector(!showModeSelector)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors',
                  'bg-surface-3 hover:bg-border-subtle',
                  MODE_CONFIG[mode].color
                )}
              >
                <CurrentModeIcon className="h-4 w-4" />
                <span className="text-sm font-medium">{MODE_CONFIG[mode].label}</span>
              </button>

              {/* Mode Dropdown */}
              <AnimatePresence>
                {showModeSelector && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-2 z-50 bg-surface-2 border border-border-subtle rounded-xl shadow-lg p-2 min-w-[160px]"
                  >
                    {(Object.entries(MODE_CONFIG) as [ConversationMode, typeof MODE_CONFIG.text][]).map(
                      ([key, config]) => (
                        <button
                          key={key}
                          onClick={() => {
                            switchMode(key);
                            setShowModeSelector(false);
                          }}
                          className={cn(
                            'flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-colors text-left',
                            mode === key ? 'bg-neon-primary/20' : 'hover:bg-surface-3'
                          )}
                        >
                          <config.icon className={cn('h-4 w-4', config.color)} />
                          <div>
                            <p className="text-sm font-medium">{config.label}</p>
                            <p className="text-xs text-text-muted">{config.description}</p>
                          </div>
                        </button>
                      )
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Active Agent Badge */}
            {activeAgent && <AgentBadge agent={activeAgent as AgentType} isActive={isStreaming} />}

            {/* Agent Stack (shows hand-off history) */}
            {agentStack.length > 1 && (
              <div className="hidden sm:flex items-center gap-1 text-xs text-text-muted">
                {agentStack.slice(-3).map((agent, i) => (
                  <span key={`${agent}-${i}`} className="flex items-center gap-1">
                    {i > 0 && <span className="text-border-subtle">→</span>}
                    <span className="capitalize">{agent}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* TTS Toggle (visible in voice/ambient mode) */}
            {(mode === 'voice' || mode === 'ambient') && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTTS}
                title={ttsEnabled ? 'Mute responses' : 'Unmute responses'}
                className="h-8 w-8"
              >
                {ttsEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4 text-text-muted" />
                )}
              </Button>
            )}

            {/* Clear Button */}
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearMessages} className="text-xs h-7">
                Clear
              </Button>
            )}
          </div>
        </header>

        {/* Voice Visualizer (visible when recording or speaking) */}
        <AnimatePresence>
          {(mode === 'voice' || mode === 'ambient') && (isRecording || isSpeaking) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 48, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-border-subtle overflow-hidden"
            >
              <AudioLevelIndicator audioLevel={audioLevel} isRecording={isRecording} isSpeaking={isSpeaking} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {/* Empty State */}
          {messages.length === 0 && !isLoading && (
            <ChatEmptyState onSend={handleSend} onMentionInsert={handleMentionInsert} />
          )}

          {/* Agent Handoff Animation */}
          <AnimatePresence>
            {isLoading && activeAgent && routingReason && !isStreaming && (
              <AgentHandoff to={activeAgent as AgentType} reason={routingReason} />
            )}
          </AnimatePresence>

          {/* Messages */}
          {messages.map((message) => (
            <StreamingMessage
              key={message.id}
              id={message.id}
              role={message.role}
              content={message.content}
              agent={message.agent as AgentType}
              isStreaming={message.isStreaming}
              toolExecutions={message.toolExecutions}
              timestamp={message.timestamp}
              onAction={handleMessageAction}
            />
          ))}

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2 p-4 rounded-xl bg-danger/10 border border-danger/30 text-danger"
            >
              <span className="text-sm">{error}</span>
              <Button variant="ghost" size="sm" onClick={retryLast} className="text-xs">
                Retry
              </Button>
            </motion.div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 border-t border-border-subtle">
          {/* Cancel streaming button */}
          {isStreaming && (
            <div className="flex items-center justify-center mb-2">
              <button
                onClick={cancelStream}
                className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1 transition-colors focus-ring rounded"
              >
                <Loader2 className="h-3 w-3 animate-spin" />
                Stop
              </button>
            </div>
          )}

          {/* Adaptive Input */}
          {mode === 'text' ? (
            // Text mode: standard chat input
            <ChatInput
              ref={chatInputRef}
              onSend={handleSend}
              disabled={isLoading}
              placeholder={isStreaming ? 'Waiting...' : 'Message Q8...'}
              showFileUpload={true}
              showVoice={true}
              onVoiceToggle={() => switchMode('voice')}
              threadId={currentThreadId || undefined}
            />
          ) : (
            // Voice/Ambient mode: centered voice button
            <div className="flex flex-col items-center gap-3 py-4">
              <motion.button
                onClick={handleVoiceInteraction}
                disabled={isTranscribing}
                className={cn(
                  'relative h-16 w-16 rounded-full flex items-center justify-center transition-all',
                  'shadow-lg focus-ring',
                  isRecording && 'bg-red-500 scale-110',
                  isSpeaking && 'bg-green-500',
                  isTranscribing && 'bg-blue-500',
                  !isRecording && !isSpeaking && !isTranscribing && 'bg-neon-primary hover:bg-neon-primary/90'
                )}
                whileTap={{ scale: 0.95 }}
              >
                {/* Pulsing ring when recording */}
                {isRecording && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-red-400"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0, 0.8] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}

                {isRecording ? (
                  <MicOff className="h-6 w-6 text-white" />
                ) : isTranscribing ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Mic className="h-6 w-6 text-white" />
                )}
              </motion.button>

              {/* Status text */}
              <p className="text-sm text-text-muted text-center">
                {isRecording && 'Listening... Release to send'}
                {isTranscribing && 'Processing...'}
                {isSpeaking && 'Speaking...'}
                {isLoading && !isTranscribing && 'Thinking...'}
                {!isRecording && !isTranscribing && !isSpeaking && !isLoading && 'Tap or press Space to speak'}
              </p>

              {/* Quick switch to text */}
              <Button variant="ghost" size="sm" onClick={() => switchMode('text')} className="text-xs gap-1">
                <Keyboard className="h-3 w-3" />
                Switch to Text
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }
);

UnifiedConversation.displayName = 'UnifiedConversation';
