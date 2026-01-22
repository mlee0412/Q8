'use client';

import { useState, useCallback, forwardRef, useImperativeHandle, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ThreadSidebar } from './ThreadSidebar';
import { UnifiedConversation, UnifiedConversationRef } from './UnifiedConversation';
import { useThreads } from '@/hooks/useThreads';
import { useOptionalChatContext } from '@/contexts/ChatContext';
import { useUserContext } from '@/hooks/useUserContext';
import { logger } from '@/lib/logger';
import type { ConversationMode } from '@/lib/agents/orchestration/types';

// =============================================================================
// TYPES
// =============================================================================

export interface UnifiedChatWithThreadsRef {
  sendMessage: (message: string) => void;
  switchMode: (mode: ConversationMode) => void;
}

interface UnifiedChatWithThreadsProps {
  userId: string;
  userProfile?: {
    name?: string;
    timezone?: string;
    communicationStyle?: 'concise' | 'detailed';
    location?: {
      address?: string;
      city?: string;
      state?: string;
      country?: string;
      zipCode?: string;
      coordinates?: {
        lat: number;
        long: number;
      };
    };
  };
  defaultMode?: ConversationMode;
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const UnifiedChatWithThreads = forwardRef<UnifiedChatWithThreadsRef, UnifiedChatWithThreadsProps>(
  function UnifiedChatWithThreads({ userId, userProfile, defaultMode = 'text', className }, ref) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
    const conversationRef = useRef<UnifiedConversationRef>(null);

    // Get dynamic user context (timezone, location) from browser
    const userContext = useUserContext({ enableGeolocation: true });

    // Merge user-provided profile with dynamic context
    const enrichedUserProfile = useMemo(() => ({
      name: userProfile?.name || 'User',
      timezone: userProfile?.timezone || userContext.timezone,
      communicationStyle: userProfile?.communicationStyle || 'concise' as const,
      location: userProfile?.location || (userContext.isLocationEnabled ? userContext.location : undefined),
    }), [userProfile, userContext.timezone, userContext.location, userContext.isLocationEnabled]);

    // Request location on first mount (will prompt user)
    useEffect(() => {
      if (!userProfile?.location && !userContext.isLocationEnabled && !userContext.isLocationLoading) {
        // Auto-request location for better context
        userContext.requestLocation();
      }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Expose methods via ref for external components
    useImperativeHandle(
      ref,
      () => ({
        sendMessage: (message: string) => {
          conversationRef.current?.sendMessage(message);
        },
        switchMode: (mode: ConversationMode) => {
          conversationRef.current?.switchMode(mode);
        },
      }),
      []
    );

    // Register with ChatContext for global access (e.g., from AIButton)
    const chatContext = useOptionalChatContext();

    useEffect(() => {
      if (chatContext) {
        chatContext.registerChatHandler((message: string) => {
          conversationRef.current?.sendMessage(message);
        });
        return () => {
          chatContext.unregisterChatHandler();
        };
      }
    }, [chatContext]);

    const { threads, selectThread, updateThread, archiveThread, deleteThread, refreshThreads } = useThreads({
      userId,
    });

    // Handle thread selection
    const handleThreadSelect = useCallback(
      async (threadId: string) => {
        setCurrentThreadId(threadId);
        await selectThread(threadId);
      },
      [selectThread]
    );

    // Handle new thread creation
    const handleNewThread = useCallback(() => {
      setCurrentThreadId(null);
    }, []);

    // Handle thread created callback from conversation
    const handleThreadCreated = useCallback(
      (threadId: string) => {
        setCurrentThreadId(threadId);
        refreshThreads();
      },
      [refreshThreads]
    );

    // Handle thread title update
    const handleUpdateTitle = useCallback(
      async (title: string) => {
        if (currentThreadId) {
          await updateThread(currentThreadId, { title });
        }
      },
      [currentThreadId, updateThread]
    );

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

        {/* Main Conversation Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <UnifiedConversation
            ref={conversationRef}
            userId={userId}
            threadId={currentThreadId}
            userProfile={enrichedUserProfile}
            defaultMode={defaultMode}
            onThreadCreated={handleThreadCreated}
            showSidebarToggle={true}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          />
        </div>
      </div>
    );
  }
);

UnifiedChatWithThreads.displayName = 'UnifiedChatWithThreads';
