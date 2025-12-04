'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Loader2, PanelLeft, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChat, type AgentType } from '@/hooks/useChat';
import { StreamingMessage } from './StreamingMessage';
import { ChatInput } from './ChatInput';
import { AgentHandoff, AgentBadge } from './AgentHandoff';
import { Button } from '../ui/button';

interface StreamingChatPanelProps {
  /**
   * User ID
   */
  userId: string;

  /**
   * Thread ID (optional - creates new thread if not provided)
   */
  threadId?: string | null;

  /**
   * User profile for context
   */
  userProfile?: {
    name?: string;
    timezone?: string;
    communicationStyle?: 'concise' | 'detailed';
  };

  /**
   * Callback when a new thread is created
   */
  onThreadCreated?: (threadId: string) => void;

  /**
   * Show sidebar toggle button
   */
  showSidebarToggle?: boolean;

  /**
   * Sidebar open state
   */
  sidebarOpen?: boolean;

  /**
   * Callback to toggle sidebar
   */
  onToggleSidebar?: () => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * StreamingChatPanel Component
 *
 * Complete chat interface with streaming support, tool visibility, and agent handoffs
 */
export function StreamingChatPanel({
  userId,
  threadId,
  userProfile,
  onThreadCreated,
  showSidebarToggle = false,
  sidebarOpen = false,
  onToggleSidebar,
  className,
}: StreamingChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading,
    isStreaming,
    currentAgent,
    routingReason,
    error,
    threadId: currentThreadId,
    sendMessage,
    cancelStream,
    clearMessages,
    retryLast,
  } = useChat({
    userId,
    threadId,
    userProfile,
    onRouting: (agent, reason) => {
      console.log(`[Chat] Routing to ${agent}: ${reason}`);
    },
    onToolExecution: (tool) => {
      console.log(`[Chat] Tool executed: ${tool.tool}`, tool.status);
    },
    onThreadCreated: (newThreadId) => {
      console.log(`[Chat] Thread created: ${newThreadId}`);
      onThreadCreated?.(newThreadId);
    },
    onMemoryExtracted: (count) => {
      if (count > 0) {
        console.log(`[Chat] ${count} memories extracted`);
      }
    },
    onError: (error) => {
      console.error('[Chat] Error:', error);
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming]);

  // Handle send
  const handleSend = (content: string) => {
    if (content.trim()) {
      sendMessage(content);
    }
  };

  // Handle message action
  const handleMessageAction = (action: string, messageId: string) => {
    if (action === 'regenerate') {
      retryLast();
    }
    // Other actions can be handled here
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header with current agent */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-glass-border">
        <div className="flex items-center gap-2">
          {showSidebarToggle && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              className="h-8 w-8 p-0"
              title={sidebarOpen ? 'Hide conversations' : 'Show conversations'}
            >
              <PanelLeft className={cn('h-4 w-4 transition-transform', sidebarOpen && 'text-neon-primary')} />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Chat</span>
          </div>
          {currentAgent && (
            <AgentBadge agent={currentAgent} isActive={isStreaming} />
          )}
        </div>

        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearMessages}
            className="text-xs h-7"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {/* Empty State */}
        {messages.length === 0 && !isLoading && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-sm px-4">
              <div className="h-12 w-12 rounded-full bg-neon-primary/20 flex items-center justify-center mx-auto mb-3">
                <Bot className="h-6 w-6 text-neon-primary" />
              </div>
              <h3 className="text-base font-medium mb-1">Start a conversation</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Ask Q8 anything!
              </p>
              <div className="flex flex-wrap justify-center gap-1.5">
                <SuggestionChip onClick={() => handleSend("What's the weather like?")}>
                  Weather
                </SuggestionChip>
                <SuggestionChip onClick={() => handleSend("Turn on the lights")}>
                  Smart Home
                </SuggestionChip>
                <SuggestionChip onClick={() => handleSend("Tell me a joke")}>
                  Fun
                </SuggestionChip>
              </div>
            </div>
          </div>
        )}

        {/* Agent Handoff Animation */}
        <AnimatePresence>
          {isLoading && currentAgent && routingReason && !isStreaming && (
            <AgentHandoff
              to={currentAgent as AgentType}
              reason={routingReason}
            />
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
            className="flex items-center justify-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400"
          >
            <span className="text-sm">{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={retryLast}
              className="text-xs"
            >
              Retry
            </Button>
          </motion.div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-glass-border">
        {isStreaming && (
          <div className="flex items-center justify-center mb-2">
            <button
              onClick={cancelStream}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <Loader2 className="h-3 w-3 animate-spin" />
              Stop
            </button>
          </div>
        )}

        <ChatInput
          onSend={handleSend}
          disabled={isLoading}
          placeholder={isStreaming ? 'Waiting...' : 'Message Q8...'}
        />
      </div>
    </div>
  );
}

/**
 * Suggestion Chip Component
 */
function SuggestionChip({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 rounded-full text-xs bg-glass-bg/50 border border-glass-border/50 hover:bg-neon-primary/10 hover:border-neon-primary/30 transition-colors"
    >
      {children}
    </button>
  );
}

StreamingChatPanel.displayName = 'StreamingChatPanel';
