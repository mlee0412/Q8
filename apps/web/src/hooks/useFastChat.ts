/**
 * useFastChat Hook
 *
 * Fast chat with instant responses and realtime follow-ups.
 * Implements the Decoupled UX pattern:
 *
 * 1. User sends message → Fast Talker responds instantly (~300-800ms)
 * 2. If hasFollowUp=true → Subscribe to thread for deep response
 * 3. Deep Thinker processes in background
 * 4. Follow-up arrives via Supabase Realtime
 *
 * Benefits:
 * - Zero perceived latency for user
 * - Background processing for complex queries
 * - Graceful handling of slow/complex operations
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { RealtimeChannel } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

export type AgentType = 'orchestrator' | 'coder' | 'researcher' | 'secretary' | 'personality' | 'home' | 'finance';

export type ResponseType = 'acknowledgment' | 'clarification' | 'preview' | 'action_preview' | 'direct' | 'follow_up';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agent?: AgentType;
  responseType?: ResponseType;
  isPending: boolean;
  hasFollowUp: boolean;
  followUpReceived: boolean;
  jobId?: string;
  timestamp: Date;
}

export interface FastChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isPendingFollowUp: boolean;
  currentAgent: AgentType | null;
  error: string | null;
  threadId: string | null;
  pendingJobIds: string[];
}

interface UseFastChatOptions {
  userId: string;
  threadId?: string | null;
  userProfile?: {
    name?: string;
    timezone?: string;
    communicationStyle?: 'concise' | 'detailed';
  };
  onMessage?: (message: ChatMessage) => void;
  onFollowUp?: (message: ChatMessage) => void;
  onRouting?: (agent: AgentType, reason: string) => void;
  onThreadCreated?: (threadId: string) => void;
  onError?: (error: string) => void;
  /** Skip fast talker and wait for full response (for testing/debugging) */
  skipFastTalker?: boolean;
}

export function useFastChat(options: UseFastChatOptions) {
  const {
    userId,
    threadId: initialThreadId,
    userProfile,
    onMessage,
    onFollowUp,
    onRouting,
    onThreadCreated,
    onError,
    skipFastTalker = false,
  } = options;

  const [state, setState] = useState<FastChatState>({
    messages: [],
    isLoading: false,
    isPendingFollowUp: false,
    currentAgent: null,
    error: null,
    threadId: initialThreadId || null,
    pendingJobIds: [],
  });

  // Supabase client and realtime channel refs
  const supabaseRef = useRef<ReturnType<typeof createBrowserClient> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedThreadRef = useRef<string | null>(null);

  // Initialize Supabase client
  useEffect(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
    }
  }, []);

  /**
   * Subscribe to realtime updates for a thread
   */
  const subscribeToThread = useCallback((threadId: string) => {
    if (!supabaseRef.current || subscribedThreadRef.current === threadId) {
      return;
    }

    // Unsubscribe from previous channel
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    subscribedThreadRef.current = threadId;

    logger.info('[FastChat] Subscribing to thread', { threadId });

    const channel = supabaseRef.current
      .channel(`thread:${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const newMessage = payload.new as {
            id: string;
            role: 'user' | 'assistant';
            content: string;
            agent_name?: string;
            metadata?: {
              responseType?: ResponseType;
              hasFollowUp?: boolean;
              jobId?: string;
            };
            created_at: string;
          };

          // Only handle assistant messages that aren't already in state
          if (newMessage.role !== 'assistant') return;

          // Check if this is a follow-up (not a fast response)
          const isFastResponse = newMessage.agent_name === 'fast_talker';

          if (!isFastResponse) {
            // This is a follow-up message from Deep Thinker
            logger.info('[FastChat] Follow-up received', {
              messageId: newMessage.id,
              agent: newMessage.agent_name,
            });

            const followUpMessage: ChatMessage = {
              id: newMessage.id,
              role: 'assistant',
              content: newMessage.content,
              agent: newMessage.agent_name as AgentType,
              responseType: 'follow_up',
              isPending: false,
              hasFollowUp: false,
              followUpReceived: true,
              timestamp: new Date(newMessage.created_at),
            };

            setState(prev => {
              // Check if we need to update an existing pending message
              // or add a new follow-up message
              const pendingIdx = prev.messages.findIndex(
                m => m.hasFollowUp && !m.followUpReceived && m.role === 'assistant'
              );

              let newMessages: ChatMessage[];
              let newPendingJobIds = prev.pendingJobIds;

              if (pendingIdx !== -1) {
                // Update the pending message to show follow-up received
                newMessages = [...prev.messages];
                const pendingMessage = newMessages[pendingIdx];
                if (pendingMessage) {
                  newMessages[pendingIdx] = {
                    ...pendingMessage,
                    followUpReceived: true,
                  };
                  // Remove job from pending
                  if (pendingMessage.jobId) {
                    newPendingJobIds = prev.pendingJobIds.filter(id => id !== pendingMessage.jobId);
                  }
                }
                // Add the follow-up as a separate message
                newMessages.push(followUpMessage);
              } else {
                // Just add the new message
                newMessages = [...prev.messages, followUpMessage];
              }

              return {
                ...prev,
                messages: newMessages,
                isPendingFollowUp: newPendingJobIds.length > 0,
                pendingJobIds: newPendingJobIds,
              };
            });

            onFollowUp?.(followUpMessage);
          }
        }
      )
      .subscribe((status) => {
        logger.info('[FastChat] Subscription status', { threadId, status });
      });

    channelRef.current = channel;
  }, [onFollowUp]);

  // Subscribe to thread when it changes
  useEffect(() => {
    if (state.threadId && state.isPendingFollowUp) {
      subscribeToThread(state.threadId);
    }
  }, [state.threadId, state.isPendingFollowUp, subscribeToThread]);

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, []);

  // Load existing messages when threadId changes
  useEffect(() => {
    if (initialThreadId && initialThreadId !== state.threadId) {
      setState(prev => ({ ...prev, threadId: initialThreadId }));
      loadMessages(initialThreadId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialThreadId]);

  /**
   * Load messages from API
   */
  const loadMessages = useCallback(async (threadId: string) => {
    try {
      const response = await fetch(`/api/threads/${threadId}?includeMessages=true`);
      if (!response.ok) throw new Error('Failed to load messages');

      const data = await response.json();
      const loadedMessages: ChatMessage[] = (data.messages || []).map((m: {
        id: string;
        role: 'user' | 'assistant';
        content: string;
        agent_name?: string;
        metadata?: {
          responseType?: ResponseType;
          hasFollowUp?: boolean;
          jobId?: string;
        };
        created_at: string;
      }) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        agent: m.agent_name as AgentType | undefined,
        responseType: m.metadata?.responseType,
        isPending: false,
        hasFollowUp: m.metadata?.hasFollowUp ?? false,
        followUpReceived: true, // Historical messages have follow-ups resolved
        jobId: m.metadata?.jobId,
        timestamp: new Date(m.created_at),
      }));

      setState(prev => ({
        ...prev,
        messages: loadedMessages,
        threadId,
      }));
    } catch (err) {
      logger.error('Failed to load messages', { threadId, error: err });
    }
  }, []);

  /**
   * Send a message using Fast Talker
   */
  const sendMessage = useCallback(async (content: string) => {
    const userMessageId = `msg_${Date.now()}_user`;
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content,
      isPending: false,
      hasFollowUp: false,
      followUpReceived: false,
      timestamp: new Date(),
    };

    // Add user message immediately
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null,
    }));

    try {
      const response = await fetch('/api/chat/fast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          conversationId: state.threadId,
          userProfile,
          skipFastTalker,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Create assistant message from response
      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: data.content,
        agent: data.agent as AgentType,
        responseType: data.responseType as ResponseType,
        isPending: data.hasFollowUp,
        hasFollowUp: data.hasFollowUp,
        followUpReceived: !data.hasFollowUp,
        jobId: data.jobId,
        timestamp: new Date(),
      };

      // Update state with response
      setState(prev => {
        const newPendingJobIds = data.jobId
          ? [...prev.pendingJobIds, data.jobId]
          : prev.pendingJobIds;

        return {
          ...prev,
          messages: [...prev.messages, assistantMessage],
          isLoading: false,
          isPendingFollowUp: data.hasFollowUp,
          currentAgent: data.agent as AgentType,
          threadId: data.threadId,
          pendingJobIds: newPendingJobIds,
        };
      });

      // Notify callbacks
      onMessage?.(assistantMessage);

      if (data.routing) {
        onRouting?.(data.agent, data.routing.rationale);
      }

      if (data.threadId && data.threadId !== state.threadId) {
        onThreadCreated?.(data.threadId);
      }

      // Subscribe to realtime if follow-up expected
      if (data.hasFollowUp && data.threadId) {
        subscribeToThread(data.threadId);
      }

      return assistantMessage;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      onError?.(errorMessage);
      return null;
    }
  }, [
    state.threadId,
    userProfile,
    skipFastTalker,
    onMessage,
    onRouting,
    onThreadCreated,
    onError,
    subscribeToThread,
  ]);

  /**
   * Clear all messages and start fresh
   */
  const clearMessages = useCallback(() => {
    // Unsubscribe from current thread
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
      subscribedThreadRef.current = null;
    }

    setState({
      messages: [],
      isLoading: false,
      isPendingFollowUp: false,
      currentAgent: null,
      error: null,
      threadId: null,
      pendingJobIds: [],
    });
  }, []);

  /**
   * Retry the last failed message
   */
  const retryLast = useCallback(() => {
    const lastUserMessage = [...state.messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      // Remove the last assistant message if it exists and errored
      setState(prev => ({
        ...prev,
        messages: prev.messages.filter(m =>
          m.role === 'user' ||
          m.timestamp < lastUserMessage.timestamp
        ),
        error: null,
      }));

      sendMessage(lastUserMessage.content);
    }
  }, [state.messages, sendMessage]);

  /**
   * Get pending follow-up count
   */
  const pendingFollowUpCount = state.pendingJobIds.length;

  /**
   * Check if a specific job is still pending
   */
  const isJobPending = useCallback((jobId: string) => {
    return state.pendingJobIds.includes(jobId);
  }, [state.pendingJobIds]);

  return {
    ...state,
    pendingFollowUpCount,
    sendMessage,
    clearMessages,
    retryLast,
    isJobPending,
  };
}
