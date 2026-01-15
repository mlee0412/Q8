'use client';

import { useEffect, useRef, useState } from 'react';
import { useRxQuery } from '@/hooks/useRxDB';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage } from './ChatMessage';
import { AgentIndicator } from './AgentIndicator';
import { Button } from '../ui/button';

interface Message {
  id: string;
  role: 'user' | 'orchestrator' | 'coder' | 'researcher' | 'secretary' | 'personality';
  content: string;
  agent_name?: string;
  avatar?: string;
  timestamp: string;
  status?: 'sending' | 'sent' | 'error';
  conversation_id: string;
}

interface ChatHistoryProps {
  /**
   * Conversation ID
   */
  conversationId: string;

  /**
   * Currently active agent (for typing indicator)
   */
  activeAgent?: 'orchestrator' | 'coder' | 'researcher' | 'secretary' | 'personality';

  /**
   * Active agent task description
   */
  activeAgentTask?: string;

  /**
   * Show agent typing indicator
   */
  showTypingIndicator?: boolean;

  /**
   * Auto-scroll to bottom on new messages
   * @default true
   */
  autoScroll?: boolean;

  /**
   * Enable infinite scroll (load older messages)
   * @default true
   */
  enableInfiniteScroll?: boolean;

  /**
   * Messages per page
   * @default 50
   */
  pageSize?: number;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Message action callback
   */
  onMessageAction?: (action: string, messageId: string) => void;
}

/**
 * Chat History Component
 *
 * Scrollable conversation container with infinite scroll, RxDB integration,
 * date separators, and auto-scroll to bottom.
 *
 * Features:
 * - RxDB integration for message persistence
 * - Infinite scroll for older messages
 * - Date separators (Today, Yesterday, etc.)
 * - Auto-scroll to bottom on new messages
 * - Typing indicator for active agent
 * - Empty state with welcome message
 *
 * @example
 * ```tsx
 * // Basic usage
 * <ChatHistory
 *   conversationId="conv-123"
 * />
 *
 * // With typing indicator
 * <ChatHistory
 *   conversationId="conv-123"
 *   activeAgent="coder"
 *   activeAgentTask="Analyzing your code..."
 *   showTypingIndicator
 * />
 * ```
 */
export function ChatHistory({
  conversationId,
  activeAgent,
  activeAgentTask,
  showTypingIndicator = false,
  autoScroll = true,
  enableInfiniteScroll = true,
  pageSize = 50,
  className,
  onMessageAction,
}: ChatHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [page, setPage] = useState(1);

  // Fetch messages from RxDB
  const { data: messages, isLoading: isFetching } = useRxQuery<Message>(
    'chat_messages',
    (collection) =>
      collection
        .find()
        .where('conversation_id')
        .eq(conversationId)
        .sort({ timestamp: 'asc' })
        .limit(pageSize * page)
  );

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      const { scrollHeight, scrollTop, clientHeight } = scrollRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

      if (isNearBottom) {
        scrollToBottom();
      }
    }
  }, [messages, autoScroll]);

  // Handle scroll
  const handleScroll = () => {
    if (!scrollRef.current) return;

    const { scrollHeight, scrollTop, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 20;

    setShowScrollButton(!isAtBottom);

    // Load more messages when scrolling to top
    if (enableInfiniteScroll && scrollTop < 100 && !isFetching) {
      setPage((prev) => prev + 1);
    }
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  };

  // Group messages by date
  const groupedMessages = messages?.reduce((groups, message) => {
    const date = new Date(message.timestamp).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  return (
    <div className={cn('relative h-full', className)}>
      {/* Messages Container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto px-4 py-6 space-y-4"
      >
        {/* Loading older messages */}
        {isFetching && page > 1 && (
          <div className="text-center py-4">
            <div className="h-6 w-6 border-2 border-neon-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}

        {/* Messages grouped by date */}
        {groupedMessages &&
          Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date}>
              {/* Date Separator */}
              <div className="relative flex items-center justify-center mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border-subtle" />
                </div>
                <div className="relative px-4 surface-matte rounded-full">
                  <span className="text-xs text-text-muted">
                    {formatDate(new Date(date))}
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div className="space-y-4">
                {msgs.map((message) => (
                  <ChatMessage
                    key={message.id}
                    id={message.id}
                    role={message.role}
                    content={message.content}
                    agentName={message.agent_name}
                    avatar={message.avatar}
                    timestamp={new Date(message.timestamp)}
                    status={message.status}
                    onAction={onMessageAction}
                  />
                ))}
              </div>
            </div>
          ))}

        {/* Empty State */}
        {!isFetching && (!messages || messages.length === 0) && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="h-16 w-16 rounded-full bg-neon-primary/20 flex items-center justify-center mx-auto mb-4">
                <Bot className="h-8 w-8 text-neon-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
              <p className="text-sm text-text-muted">
                Ask Q8 anything, and I&apos;ll route your request to the best specialized agent.
              </p>
            </div>
          </div>
        )}

        {/* Typing Indicator */}
        {showTypingIndicator && activeAgent && (
          <AgentIndicator
            agent={activeAgent}
            task={activeAgentTask}
            showTyping
          />
        )}
      </div>

      {/* Scroll to Bottom Button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-4 right-4"
          >
            <Button
              variant="neon"
              size="icon"
              className="rounded-full shadow-lg"
              onClick={scrollToBottom}
            >
              <ArrowDown className="h-5 w-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

ChatHistory.displayName = 'ChatHistory';

// Helper: Format date
function formatDate(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}
