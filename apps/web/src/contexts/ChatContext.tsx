'use client';

import { createContext, useContext, useCallback, useRef, type ReactNode } from 'react';
import { logger } from '@/lib/logger';

interface ChatContextValue {
  /**
   * Send a message to the chat panel
   */
  sendMessage: (message: string, context?: Record<string, unknown>) => void;
  /**
   * Register the chat panel's sendMessage function
   * (called by ChatWithThreads when mounted)
   */
  registerChatHandler: (handler: (message: string) => void) => void;
  /**
   * Unregister the chat handler (called on unmount)
   */
  unregisterChatHandler: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

interface ChatProviderProps {
  children: ReactNode;
}

/**
 * ChatProvider
 *
 * Provides a global way to send messages to the chat panel from anywhere
 * in the component tree (e.g., AIButton, SuggestionsWidget, etc.)
 */
export function ChatProvider({ children }: ChatProviderProps) {
  const chatHandlerRef = useRef<((message: string) => void) | null>(null);

  const registerChatHandler = useCallback((handler: (message: string) => void) => {
    chatHandlerRef.current = handler;
  }, []);

  const unregisterChatHandler = useCallback(() => {
    chatHandlerRef.current = null;
  }, []);

  const sendMessage = useCallback((message: string, context?: Record<string, unknown>) => {
    if (chatHandlerRef.current) {
      // If context is provided, format the message with context
      let formattedMessage = message;
      if (context && Object.keys(context).length > 0) {
        // Add context as a formatted block at the end
        const contextStr = Object.entries(context)
          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
          .join('\n');
        formattedMessage = `${message}\n\n[Context]\n${contextStr}`;
      }
      chatHandlerRef.current(formattedMessage);
    } else {
      logger.warn('No chat handler registered', { component: 'ChatContext', message });
    }
  }, []);

  return (
    <ChatContext.Provider value={{ sendMessage, registerChatHandler, unregisterChatHandler }}>
      {children}
    </ChatContext.Provider>
  );
}

/**
 * Hook to access the chat context (throws if not in provider)
 */
export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}

/**
 * Hook to optionally access the chat context (returns null if not in provider)
 */
export function useOptionalChatContext() {
  return useContext(ChatContext);
}

/**
 * Hook to send messages to chat (safe to use outside provider)
 */
export function useSendToChat() {
  const context = useContext(ChatContext);
  return context?.sendMessage ?? (() => {
    logger.warn('No ChatProvider found', { hook: 'useSendToChat' });
  });
}
