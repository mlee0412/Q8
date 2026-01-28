/**
 * useChat Hook
 * Streaming chat with tool execution visibility
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';

export type AgentType = 'orchestrator' | 'coder' | 'researcher' | 'secretary' | 'personality' | 'home' | 'finance' | 'imagegen';

export interface ToolExecution {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  status: 'running' | 'completed' | 'failed';
  result?: unknown;
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

export interface Citation {
  id: string;
  source: string;
  url?: string;
  relevance?: number;
}

export interface MemoryContext {
  id: string;
  memoryId: string;
  content: string;
  relevance: number;
}

export interface GeneratedImage {
  id: string;
  data: string;
  mimeType: string;
  caption?: string;
  model?: string;
}

export interface HandoffInfo {
  from: AgentType;
  to: AgentType;
  reason: string;
  timestamp: Date;
}

export interface WidgetAction {
  widgetId: 'tasks' | 'calendar' | 'finance' | 'home' | 'weather' | 'github';
  action: 'refresh' | 'create' | 'update' | 'delete';
  data?: Record<string, unknown>;
}

export interface StreamingMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agent?: AgentType;
  isStreaming: boolean;
  toolExecutions: ToolExecution[];
  timestamp: Date;
  citations?: Citation[];
  memoriesUsed?: MemoryContext[];
  images?: GeneratedImage[];
  handoff?: HandoffInfo;
  imageAnalysis?: string;
}

export interface ChatState {
  messages: StreamingMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  currentAgent: AgentType | null;
  routingReason: string | null;
  routingConfidence: number | null;
  pendingHandoff: HandoffInfo | null;
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
  onMessage?: (message: StreamingMessage) => void;
  onToolExecution?: (tool: ToolExecution) => void;
  onRouting?: (agent: AgentType, reason: string, confidence: number) => void;
  onAgentStart?: (agent: AgentType) => void;
  onHandoff?: (handoff: HandoffInfo) => void;
  onCitation?: (citation: Citation) => void;
  onMemoryUsed?: (memory: MemoryContext) => void;
  onImageGenerated?: (image: GeneratedImage) => void;
  onImageAnalyzed?: (analysis: string, imageUrl?: string) => void;
  onTTSChunk?: (text: string, isComplete: boolean) => void;
  onWidgetAction?: (action: WidgetAction) => void;
  onThreadCreated?: (threadId: string) => void;
  onMemoryExtracted?: (count: number) => void;
  onError?: (error: string, recoverable?: boolean) => void;
}

export function useChat(options: UseChatOptions) {
  const {
    userId,
    threadId: initialThreadId,
    userProfile,
    onMessage,
    onToolExecution,
    onRouting,
    onAgentStart,
    onHandoff,
    onCitation,
    onMemoryUsed,
    onImageGenerated,
    onImageAnalyzed,
    onTTSChunk,
    onWidgetAction,
    onThreadCreated,
    onMemoryExtracted,
    onError
  } = options;

  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    isStreaming: false,
    currentAgent: null,
    routingReason: null,
    routingConfidence: null,
    pendingHandoff: null,
    error: null,
    threadId: initialThreadId || null,
  });

  // Track if we should skip the next message load (when thread is created during streaming)
  const skipNextLoadRef = useRef(false);

  // Load existing messages when threadId changes
  useEffect(() => {
    if (initialThreadId) {
      // Check current state to decide if we should load
      const shouldLoad = !state.isStreaming && !state.isLoading && state.threadId !== initialThreadId;

      // Update threadId immediately
      setState(prev => ({ ...prev, threadId: initialThreadId }));

      // Only load messages if we're switching to a different thread and not streaming
      if (shouldLoad && !skipNextLoadRef.current) {
        loadMessages(initialThreadId);
      }

      // Reset skip flag
      skipNextLoadRef.current = false;
    } else {
      // Clear messages for new thread only if not streaming
      if (!state.isStreaming && !state.isLoading) {
        setState(prev => ({
          ...prev,
          messages: [],
          threadId: null,
        }));
      }
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
      logger.error('Failed to load messages', { threadId, error: err });
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
            logger.warn('Failed to parse SSE event', { line, error: e });
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
      confidence?: number;
      source?: string;
      from?: AgentType;
      to?: AgentType;
      tool?: string;
      id?: string;
      args?: Record<string, unknown>;
      success?: boolean;
      result?: unknown;
      duration?: number;
      delta?: string;
      fullContent?: string;
      message?: string;
      recoverable?: boolean;
      threadId?: string;
      count?: number;
      // Citation fields
      url?: string;
      relevance?: number;
      // Memory fields
      memoryId?: string;
      content?: string;
      // Image fields
      imageData?: string;
      mimeType?: string;
      caption?: string;
      model?: string;
      analysis?: string;
      imageUrl?: string;
      images?: Array<{ data: string; mimeType: string; caption?: string }>;
      // TTS fields
      text?: string;
      isComplete?: boolean;
      // Widget action fields
      widgetId?: string;
      action?: string;
      data?: Record<string, unknown>;
    },
    messageId: string
  ) => {
    switch (event.type) {
      case 'thread_created':
        if (event.threadId) {
          skipNextLoadRef.current = true;
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
          routingConfidence: event.confidence ?? null,
          pendingHandoff: null, // Clear pending handoff when routing occurs
        }));
        if (event.agent && event.reason) {
          onRouting?.(event.agent, event.reason, event.confidence ?? 0);
        }
        setState(prev => ({
          ...prev,
          messages: prev.messages.map(m =>
            m.id === messageId ? { ...m, agent: event.agent } : m
          ),
        }));
        break;

      case 'agent_start':
        if (event.agent) {
          setState(prev => ({
            ...prev,
            currentAgent: event.agent || null,
            pendingHandoff: null, // Clear pending handoff when agent starts
          }));
          onAgentStart?.(event.agent);
        }
        break;

      case 'handoff':
        if (event.from && event.to && event.reason) {
          const handoff: HandoffInfo = {
            from: event.from,
            to: event.to,
            reason: event.reason,
            timestamp: new Date(),
          };
          setState(prev => ({
            ...prev,
            pendingHandoff: handoff,
            messages: prev.messages.map(m =>
              m.id === messageId ? { ...m, handoff } : m
            ),
          }));
          onHandoff?.(handoff);
        }
        break;

      case 'tool_start':
        if (event.tool) {
          const toolExecution: ToolExecution = {
            id: event.id || `tool_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
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
                    toolExecutions: m.toolExecutions.map(t => {
                      const isMatch = event.id
                        ? t.id === event.id
                        : t.tool === event.tool && t.status === 'running';

                      return isMatch
                        ? {
                            ...t,
                            status: event.success ? 'completed' : 'failed',
                            result: event.result,
                            endTime: new Date(),
                            duration: event.duration,
                          }
                        : t;
                    }),
                  }
                : m
            ),
          }));
        }
        break;

      case 'citation':
        if (event.source) {
          const citation: Citation = {
            id: `citation_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            source: event.source,
            url: event.url,
            relevance: event.relevance,
          };
          setState(prev => ({
            ...prev,
            messages: prev.messages.map(m =>
              m.id === messageId
                ? { ...m, citations: [...(m.citations || []), citation] }
                : m
            ),
          }));
          onCitation?.(citation);
        }
        break;

      case 'memory_used':
        if (event.memoryId && event.content !== undefined) {
          const memory: MemoryContext = {
            id: `memory_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            memoryId: event.memoryId,
            content: event.content,
            relevance: event.relevance ?? 0,
          };
          setState(prev => ({
            ...prev,
            messages: prev.messages.map(m =>
              m.id === messageId
                ? { ...m, memoriesUsed: [...(m.memoriesUsed || []), memory] }
                : m
            ),
          }));
          onMemoryUsed?.(memory);
        }
        break;

      case 'image_generated':
        if (event.imageData && event.mimeType) {
          const image: GeneratedImage = {
            id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            data: event.imageData,
            mimeType: event.mimeType,
            caption: event.caption,
            model: event.model,
          };
          setState(prev => ({
            ...prev,
            messages: prev.messages.map(m =>
              m.id === messageId
                ? { ...m, images: [...(m.images || []), image] }
                : m
            ),
          }));
          onImageGenerated?.(image);
        }
        break;

      case 'image_analyzed':
        if (event.analysis) {
          setState(prev => ({
            ...prev,
            messages: prev.messages.map(m =>
              m.id === messageId
                ? { ...m, imageAnalysis: event.analysis }
                : m
            ),
          }));
          onImageAnalyzed?.(event.analysis, event.imageUrl);
        }
        break;

      case 'tts_chunk':
        if (event.text !== undefined) {
          onTTSChunk?.(event.text, event.isComplete ?? false);
        }
        break;

      case 'widget_action':
        if (event.widgetId && event.action) {
          const widgetAction: WidgetAction = {
            widgetId: event.widgetId as WidgetAction['widgetId'],
            action: event.action as WidgetAction['action'],
            data: event.data,
          };
          onWidgetAction?.(widgetAction);
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
        // Handle images from done event
        const doneImages = event.images?.map(img => ({
          id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          data: img.data,
          mimeType: img.mimeType,
          caption: img.caption,
        }));

        setState(prev => ({
          ...prev,
          isLoading: false,
          isStreaming: false,
          pendingHandoff: null,
          messages: prev.messages.map(m =>
            m.id === messageId
              ? {
                  ...m,
                  content: event.fullContent || m.content,
                  agent: event.agent || m.agent,
                  isStreaming: false,
                  images: doneImages?.length ? [...(m.images || []), ...doneImages] : m.images,
                }
              : m
          ),
        }));

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
          onError?.(event.message, event.recoverable);
        }
        break;
    }
  }, [
    onRouting,
    onAgentStart,
    onHandoff,
    onToolExecution,
    onCitation,
    onMemoryUsed,
    onImageGenerated,
    onImageAnalyzed,
    onTTSChunk,
    onWidgetAction,
    onMessage,
    onError,
    onThreadCreated,
    onMemoryExtracted,
    state.messages
  ]);

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
