'use client';

import { useState, useCallback, forwardRef, useImperativeHandle, useRef, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeftClose, PanelLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThreadSidebar } from './ThreadSidebar';
import { StreamingChatPanel, StreamingChatPanelRef } from './StreamingChatPanel';
import { useThreads } from '@/hooks/useThreads';
import { useOptionalChatContext } from '@/contexts/ChatContext';
import { logger } from '@/lib/logger';

export interface ChatWithThreadsRef {
  sendMessage: (message: string) => void;
}

interface ChatWithThreadsProps {
  userId: string;
  userProfile?: {
    name?: string;
    timezone?: string;
    communicationStyle?: 'concise' | 'detailed';
  };
  className?: string;
}

/**
 * ChatWithThreads Component
 *
 * Full chat interface with thread sidebar for managing multiple conversations
 */
export const ChatWithThreads = forwardRef<ChatWithThreadsRef, ChatWithThreadsProps>(
  function ChatWithThreads({ userId, userProfile, className }, ref) {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Collapsed by default
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const chatPanelRef = useRef<StreamingChatPanelRef>(null);

  // Expose sendMessage via ref for external components
  useImperativeHandle(ref, () => ({
    sendMessage: (message: string) => {
      chatPanelRef.current?.sendMessage(message);
    },
  }), []);

  // Register with ChatContext for global access (e.g., from AIButton)
  const chatContext = useOptionalChatContext();

  useEffect(() => {
    if (chatContext) {
      chatContext.registerChatHandler((message: string) => {
        chatPanelRef.current?.sendMessage(message);
      });
      return () => {
        chatContext.unregisterChatHandler();
      };
    }
  }, [chatContext]);

  const { threads, currentThread, selectThread, updateThread, archiveThread, deleteThread, refreshThreads } = useThreads({
    userId,
  });

  // Handle thread selection
  const handleThreadSelect = useCallback(async (threadId: string) => {
    setCurrentThreadId(threadId);
    await selectThread(threadId);
  }, [selectThread]);

  // Handle new thread creation
  const handleNewThread = useCallback(() => {
    setCurrentThreadId(null);
  }, []);

  // Handle thread created callback from chat
  const handleThreadCreated = useCallback((threadId: string) => {
    setCurrentThreadId(threadId);
    refreshThreads();
  }, [refreshThreads]);

  // Handle thread title update
  const handleUpdateTitle = useCallback(async (title: string) => {
    if (currentThreadId) {
      await updateThread(currentThreadId, { title });
    }
  }, [currentThreadId, updateThread]);

  // Handle thread archive
  const handleArchive = useCallback(async () => {
    if (currentThreadId) {
      await archiveThread(currentThreadId);
      setCurrentThreadId(null);
    }
  }, [currentThreadId, archiveThread]);

  // Handle thread delete
  const handleDelete = useCallback(async () => {
    if (currentThreadId) {
      await deleteThread(currentThreadId);
      setCurrentThreadId(null);
    }
  }, [currentThreadId, deleteThread]);

  // Handle regenerate title
  const handleRegenerateTitle = useCallback(async () => {
    if (!currentThreadId) return;
    try {
      await fetch(`/api/threads/${currentThreadId}/summarize`, { method: 'POST' });
      await refreshThreads();
    } catch (err) {
      logger.error('Failed to regenerate title', { threadId: currentThreadId, error: err });
    }
  }, [currentThreadId, refreshThreads]);

  return (
    <div className={cn('flex h-full', className)}>

      {/* Thread Sidebar */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="h-full border-r border-border-subtle overflow-hidden flex-shrink-0 bg-surface-2/50"
          >
            <ThreadSidebar
              userId={userId}
              currentThreadId={currentThreadId}
              onThreadSelect={handleThreadSelect}
              onNewThread={handleNewThread}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Panel with integrated toggle */}
        <StreamingChatPanel
          ref={chatPanelRef}
          userId={userId}
          threadId={currentThreadId}
          userProfile={userProfile}
          onThreadCreated={handleThreadCreated}
          showSidebarToggle={true}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
      </div>
    </div>
  );
});

ChatWithThreads.displayName = 'ChatWithThreads';
