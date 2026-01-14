/**
 * useChat Hook
 * Streaming chat with tool execution visibility
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export type AgentType = 'orchestrator' | 'coder' | 'researcher' | 'secretary' | 'personality' | 'home';

export interface ToolExecution {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  status: 'running' | 'completed' | 'failed';
  result?: unknown;
  startTime: Date;
  endTime?: Date;
}

export interface StreamingMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agent?: AgentType;
  isStreaming: boolean;
  toolExecutions: ToolExecution[];
  timestamp: Date;
}

export interface ChatState {
  messages: StreamingMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  currentAgent: AgentType | null;
  routingReason: string | null;
  error: string | null;
  threadId: string | null;
}

interface UseChatOptions {
  userId: string;
  threadId?: string | null; // Optional - creates new thread if not provided
  userProfile?: {
    name?: string;
    timezone?: string;
    communicationStyle?: 'concise' | 'detailed';
  };
  onMessage?: (message: StreamingMessage) => void;
  onToolExecution?: (tool: ToolExecution) => void;
  onRouting?: (agent: AgentType, reason: string) => void;
  onThreadCreated?: (threadId: string) => void;
  onMemoryExtracted?: (count: number) => void;
  onError?: (error: string) => void;
}

export function useChat(options: UseChatOptions) {
  const { userId, threadId: initialThreadId, userProfile, onMessage, onToolExecution, onRouting, onThreadCreated, onMemoryExtracted, onError } = options;

  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    isStreaming: false,
    currentAgent: null,
    routingReason: null,
    error: null,
    threadId: initialThreadId || null,
  });

  // Load existing messages when threadId changes
  useEffect(() => {
    if (initialThreadId) {
      loadMessages(initialThreadId);
      setState(prev => ({ ...prev, threadId: initialThreadId }));
    } else {
      // Clear messages for new thread
      setState(prev => ({
        ...prev,
        messages: [],
        threadId: null,
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialThreadId]);

  /**
   * Load messages from Supabase
   */
  const loadMessages = useCallback(async (threadId: string) => {
    try {
      const response = await fetch(`/api/threads/${threadId}?includeMessages=true`);
      if (!response.ok) throw new Error('Failed to load messages');

      const data = await response.json();
      const loadedMessages: StreamingMessage[] = (data.messages || []).map((m: {
        id: string;
        role: 'user' | 'assistant';
        content: string;
        agent_name?: string;
        tool_executions?: ToolExecution[];
        created_at: string;
      }) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        agent: m.agent_name as AgentType | undefined,
        isStreaming: false,
        toolExecutions: m.tool_executions || [],
        timestamp: new Date(m.created_at),
      }));

      setState(prev => ({
        ...prev,
        messages: loadedMessages,
        threadId,
      }));
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  }, []);

  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingMessageRef = useRef<StreamingMessage | null>(null);

  /**
   * Send a message and stream the response
   */
  const sendMessage = useCallback(async (content: string) => {
    // Cancel any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const userMessageId = `msg_${Date.now()}_user`;
    const userMessage: StreamingMessage = {
      id: userMessageId,
      role: 'user',
      content,
      isStreaming: false,
      toolExecutions: [],
      timestamp: new Date(),
    };

    // Add user message
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      isStreaming: false,
      error: null,
      currentAgent: null,
      routingReason: null,
    }));

    // Create assistant message placeholder
    const assistantMessageId = `msg_${Date.now()}_assistant`;
    const assistantMessage: StreamingMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      toolExecutions: [],
      timestamp: new Date(),
    };

    streamingMessageRef.current = assistantMessage;

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, assistantMessage],
      isStreaming: true,
    }));

    // Start streaming
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          userId,
          threadId: state.threadId,
          userProfile,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(line.slice(6));
            await processStreamEvent(data, assistantMessageId);
          } catch (e) {
            console.warn('Failed to parse SSE event:', line);
          }
        }
      }

    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        isLoading: false,
        isStreaming: false,
        error: errorMessage,
      }));
      onError?.(errorMessage);
    }
  // Note: processStreamEvent is intentionally not in deps to avoid re-creating sendMessage
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, state.threadId, userProfile, onError]);

  /**
   * Process a stream event
   */
  const processStreamEvent = useCallback(async (
    event: {
      type: string;
      agent?: AgentType;
      reason?: string;
      tool?: string;
      args?: Record<string, unknown>;
      success?: boolean;
      result?: unknown;
      delta?: string;
      fullContent?: string;
      message?: string;
      threadId?: string;
      count?: number;
    },
    messageId: string
  ) => {
    switch (event.type) {
      case 'thread_created':
        if (event.threadId) {
          setState(prev => ({ ...prev, threadId: event.threadId! }));
          onThreadCreated?.(event.threadId);
        }
        break;

      case 'memory_extracted':
        if (event.count !== undefined) {
          onMemoryExtracted?.(event.count);
        }
        break;

      case 'routing':
        setState(prev => ({
          ...prev,
          currentAgent: event.agent || null,
          routingReason: event.reason || null,
        }));
        if (event.agent && event.reason) {
          onRouting?.(event.agent, event.reason);
        }
        // Update the streaming message with agent
        setState(prev => ({
          ...prev,
          messages: prev.messages.map(m =>
            m.id === messageId ? { ...m, agent: event.agent } : m
          ),
        }));
        break;

      case 'tool_start':
        if (event.tool) {
          const toolExecution: ToolExecution = {
            id: `tool_${Date.now()}`,
            tool: event.tool,
            args: event.args || {},
            status: 'running',
            startTime: new Date(),
          };
          
          setState(prev => ({
            ...prev,
            messages: prev.messages.map(m =>
              m.id === messageId
                ? { ...m, toolExecutions: [...m.toolExecutions, toolExecution] }
                : m
            ),
          }));
          onToolExecution?.(toolExecution);
        }
        break;

      case 'tool_end':
        if (event.tool) {
          setState(prev => ({
            ...prev,
            messages: prev.messages.map(m =>
              m.id === messageId
                ? {
                    ...m,
                    toolExecutions: m.toolExecutions.map(t =>
                      t.tool === event.tool && t.status === 'running'
                        ? {
                            ...t,
                            status: event.success ? 'completed' : 'failed',
                            result: event.result,
                            endTime: new Date(),
                          }
                        : t
                    ),
                  }
                : m
            ),
          }));
        }
        break;

      case 'content':
        if (event.delta) {
          setState(prev => ({
            ...prev,
            messages: prev.messages.map(m =>
              m.id === messageId
                ? { ...m, content: m.content + event.delta }
                : m
            ),
          }));
        }
        break;

      case 'done':
        setState(prev => ({
          ...prev,
          isLoading: false,
          isStreaming: false,
          messages: prev.messages.map(m =>
            m.id === messageId
              ? { 
                  ...m, 
                  content: event.fullContent || m.content,
                  agent: event.agent || m.agent,
                  isStreaming: false,
                }
              : m
          ),
        }));
        
        // Notify callback
        const finalMessage = state.messages.find(m => m.id === messageId);
        if (finalMessage) {
          onMessage?.({ ...finalMessage, content: event.fullContent || finalMessage.content, isStreaming: false });
        }
        break;

      case 'error':
        setState(prev => ({
          ...prev,
          isLoading: false,
          isStreaming: false,
          error: event.message || 'Unknown error',
          messages: prev.messages.map(m =>
            m.id === messageId
              ? { ...m, isStreaming: false, content: m.content || 'Error occurred' }
              : m
          ),
        }));
        if (event.message) {
          onError?.(event.message);
        }
        break;
    }
  }, [onRouting, onToolExecution, onMessage, onError, onThreadCreated, onMemoryExtracted, state.messages]);

  /**
   * Cancel the current stream
   */
  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setState(prev => ({
        ...prev,
        isLoading: false,
        isStreaming: false,
      }));
    }
  }, []);

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: [],
      isLoading: false,
      isStreaming: false,
      currentAgent: null,
      routingReason: null,
      error: null,
      threadId: null,
    }));
  }, []);

  /**
   * Retry the last message
   */
  const retryLast = useCallback(() => {
    const lastUserMessage = [...state.messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      // Remove the last assistant message if it exists
      setState(prev => ({
        ...prev,
        messages: prev.messages.filter(m => 
          m.role === 'user' || 
          m.timestamp < lastUserMessage.timestamp
        ),
      }));
      sendMessage(lastUserMessage.content);
    }
  }, [state.messages, sendMessage]);

  return {
    ...state,
    sendMessage,
    cancelStream,
    clearMessages,
    retryLast,
  };
}
