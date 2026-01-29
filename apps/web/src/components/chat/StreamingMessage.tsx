'use client';

import { useState, useEffect, useRef, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  User,
  Code2,
  Search,
  Calendar,
  Sparkles,
  Home,
  Check,
  Copy,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  Pause,
  ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToolExecutionList } from './ToolExecutionChip';
import { CitationList, InlineCitation, parseCitations, type CitationSource } from './Citation';
import { MemoryContextBadge, type MemoryContextData } from './MemoryContextBadge';
import { GeneratedImageDisplay, type GeneratedImageData } from './GeneratedImageDisplay';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { ToolExecution, Citation, MemoryContext, GeneratedImage } from '@/hooks/useChat';

type AgentRole = 'orchestrator' | 'coder' | 'researcher' | 'secretary' | 'personality' | 'home' | 'finance' | 'imagegen';

interface StreamingMessageProps {
  /**
   * Message ID
   */
  id: string;

  /**
   * Message sender role
   */
  role: 'user' | 'assistant';

  /**
   * Message content (supports markdown)
   */
  content: string;

  /**
   * Agent type (for assistant messages)
   */
  agent?: AgentRole;

  /**
   * Whether the message is currently streaming
   */
  isStreaming?: boolean;

  /**
   * Tool executions associated with this message
   */
  toolExecutions?: ToolExecution[];

  /**
   * Citations used in this message
   */
  citations?: Citation[];

  /**
   * Memories used to generate this message
   */
  memoriesUsed?: MemoryContext[];

  /**
   * Generated images in this message
   */
  images?: GeneratedImage[];

  /**
   * Image analysis text
   */
  imageAnalysis?: string;

  /**
   * Message timestamp
   */
  timestamp: Date;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Callback for message actions
   */
  onAction?: (action: 'copy' | 'regenerate' | 'thumbsUp' | 'thumbsDown', messageId: string) => void;

  /**
   * Whether TTS is currently speaking this message
   */
  isSpeaking?: boolean;

  /**
   * Callback to stop TTS playback
   */
  onStopSpeaking?: () => void;
}

/**
 * Get agent configuration
 */
function getAgentConfig(role: AgentRole | 'user') {
  const configs = {
    user: {
      name: 'You',
      icon: User,
      bgColor: 'bg-neon-primary/20',
      iconColor: 'text-neon-primary',
    },
    orchestrator: {
      name: 'Q8',
      icon: Bot,
      bgColor: 'bg-purple-500/20',
      iconColor: 'text-purple-400',
    },
    coder: {
      name: 'DevBot',
      icon: Code2,
      bgColor: 'bg-blue-500/20',
      iconColor: 'text-blue-400',
    },
    researcher: {
      name: 'ResearchBot',
      icon: Search,
      bgColor: 'bg-green-500/20',
      iconColor: 'text-green-400',
    },
    secretary: {
      name: 'SecretaryBot',
      icon: Calendar,
      bgColor: 'bg-orange-500/20',
      iconColor: 'text-orange-400',
    },
    personality: {
      name: 'Q8',
      icon: Sparkles,
      bgColor: 'bg-pink-500/20',
      iconColor: 'text-pink-400',
    },
    home: {
      name: 'HomeBot',
      icon: Home,
      bgColor: 'bg-cyan-500/20',
      iconColor: 'text-cyan-400',
    },
    finance: {
      name: 'FinanceBot',
      icon: Sparkles,
      bgColor: 'bg-emerald-500/20',
      iconColor: 'text-emerald-400',
    },
    imagegen: {
      name: 'ImageBot',
      icon: ImageIcon,
      bgColor: 'bg-pink-500/20',
      iconColor: 'text-pink-500',
    },
  };

  return configs[role] || configs.orchestrator;
}

/**
 * Format timestamp
 */
function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Streaming cursor component
 */
function StreamingCursor() {
  return (
    <motion.span
      className="inline-block w-2 h-5 bg-neon-primary ml-0.5"
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 0.8, repeat: Infinity }}
    />
  );
}

/**
 * Speaking indicator with animated waveform bars
 */
interface SpeakingIndicatorProps {
  onStop?: () => void;
}

function SpeakingIndicator({ onStop }: SpeakingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neon-primary/10 border border-neon-primary/30"
    >
      {/* Pulsing speaker icon */}
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 0.8, repeat: Infinity }}
      >
        <Volume2 className="h-4 w-4 text-neon-primary" />
      </motion.div>

      {/* Animated waveform bars */}
      <div className="flex items-center gap-0.5 h-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="w-1 bg-neon-primary rounded-full"
            animate={{
              height: ['8px', '16px', '8px'],
            }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              delay: i * 0.1,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      <span className="text-xs text-neon-primary font-medium">Speaking</span>

      {/* Pause/Stop button */}
      {onStop && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStop();
          }}
          className="p-1 rounded-full hover:bg-neon-primary/20 transition-colors"
          title="Stop speaking"
        >
          <Pause className="h-3 w-3 text-neon-primary" />
        </button>
      )}
    </motion.div>
  );
}

/**
 * StreamingMessage Component
 *
 * Chat message with streaming support and tool execution display
 */
export const StreamingMessage = memo(function StreamingMessage({
  id,
  role,
  content,
  agent,
  isStreaming = false,
  toolExecutions = [],
  citations = [],
  memoriesUsed = [],
  images = [],
  imageAnalysis,
  timestamp,
  className,
  onAction,
  isSpeaking = false,
  onStopSpeaking,
}: StreamingMessageProps) {
  const [showActions, setShowActions] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const isUser = role === 'user';
  const isBot = !isUser;
  const agentConfig = getAgentConfig(isUser ? 'user' : (agent || 'orchestrator'));

  // Convert citations to CitationSource format for the Citation component
  const citationSources: CitationSource[] = useMemo(() =>
    citations.map((c, index) => ({
      id: c.id || `citation-${index}`,
      title: c.source,
      url: c.url,
      relevance: c.relevance,
      source: c.url ? new URL(c.url).hostname : undefined,
    })),
    [citations]
  );

  // Convert memories to MemoryContextData format
  const memoryContexts: MemoryContextData[] = useMemo(() =>
    memoriesUsed.map(m => ({
      id: m.id,
      memoryId: m.memoryId,
      content: m.content,
      relevance: m.relevance,
    })),
    [memoriesUsed]
  );

  // Convert images to GeneratedImageData format
  const imageData: GeneratedImageData[] = useMemo(() =>
    images.map(img => ({
      id: img.id,
      data: img.data,
      mimeType: img.mimeType,
      caption: img.caption,
      model: img.model,
    })),
    [images]
  );

  // Handle copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    onAction?.('copy', id);
  };

  // Auto-scroll when streaming
  useEffect(() => {
    if (isStreaming && contentRef.current) {
      contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [content, isStreaming]);

  // Memoize markdown components
  const markdownComponents = useMemo(() => ({
    // Handle block code (pre > code) - extract code element and render with syntax highlighting
    pre({ children }: any) {
      // Extract the code element from children
      const codeElement = children as React.ReactElement<{ className?: string; children?: React.ReactNode }>;
      const className = codeElement?.props?.className || '';
      const codeContent = codeElement?.props?.children;
      const match = /language-(\w+)/.exec(className);
      const language = match ? match[1] : '';
      const codeString = String(codeContent).replace(/\n$/, '');

      return (
        <div className="relative group/code my-3">
          {language && (
            <div className="absolute top-2 right-2 z-10 px-2 py-1 bg-surface-3 border border-border-subtle rounded text-xs text-text-muted">
              {language}
            </div>
          )}
          <SyntaxHighlighter
            style={vscDarkPlus}
            language={language || 'text'}
            PreTag="div"
            className="rounded-lg !bg-black/30 !p-4"
          >
            {codeString}
          </SyntaxHighlighter>
        </div>
      );
    },
    // Inline code only (not wrapped in pre)
    code({ className, children, ...props }: { className?: string; children?: React.ReactNode }) {
      // This is inline code - render as styled inline element
      return (
        <code className={cn('px-1 py-0.5 rounded bg-surface-3 text-neon-accent text-sm', className)} {...props}>
          {children}
        </code>
      );
    },
    // Ensure paragraphs render correctly
    p({ children }: any) {
      return <p className="mb-2 last:mb-0">{children}</p>;
    },
  }), []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex gap-4 group',
        isUser ? 'flex-row-reverse' : 'flex-row',
        className
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <motion.div
          className={cn(
            'relative h-10 w-10 rounded-full flex items-center justify-center overflow-hidden',
            agentConfig.bgColor
          )}
          animate={isStreaming ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 1, repeat: isStreaming ? Infinity : 0 }}
        >
          <agentConfig.icon className={cn('h-5 w-5', agentConfig.iconColor)} />
        </motion.div>
      </div>

      {/* Message Content */}
      <div className={cn('flex-1 max-w-2xl', isUser && 'flex flex-col items-end')}>
        {/* Agent Name & Timestamp */}
        {isBot && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">{agentConfig.name}</span>
            <span className="text-xs text-text-muted">
              {formatTimestamp(timestamp)}
            </span>
            {isStreaming && (
              <motion.span
                className="text-xs text-neon-primary"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                Streaming...
              </motion.span>
            )}
          </div>
        )}

        {/* Speaking Indicator */}
        <AnimatePresence>
          {isSpeaking && !isStreaming && (
            <div className="mb-2">
              <SpeakingIndicator onStop={onStopSpeaking} />
            </div>
          )}
        </AnimatePresence>

        {/* Memory Context (shows what memories were used) */}
        {memoryContexts.length > 0 && (
          <MemoryContextBadge memories={memoryContexts} />
        )}

        {/* Tool Executions */}
        {toolExecutions.length > 0 && (
          <ToolExecutionList
            tools={toolExecutions.map(t => ({
              id: t.id,
              tool: t.tool,
              status: t.status,
              args: t.args,
              result: t.result,
            }))}
          />
        )}

        {/* Generated Images */}
        {imageData.length > 0 && (
          <GeneratedImageDisplay images={imageData} />
        )}

        {/* Message Bubble */}
        <div
          ref={contentRef}
          className={cn(
            'rounded-2xl px-4 py-3 relative',
            isUser
              ? 'surface-matte bg-neon-primary/10 border border-neon-primary/20'
              : 'surface-matte'
          )}
        >
          {/* Message Content */}
          <div
            className={cn(
              'prose prose-sm max-w-none',
              isUser && 'text-right',
              'prose-p:text-text-primary prose-headings:text-text-primary',
              'prose-code:text-neon-accent prose-code:bg-surface-3',
              'prose-pre:surface-matte prose-pre:p-0'
            )}
          >
            {content ? (
              <ReactMarkdown
                components={markdownComponents}
              >
                {content}
              </ReactMarkdown>
            ) : isStreaming ? (
              <span className="text-text-muted">Thinking...</span>
            ) : null}

            {/* Streaming cursor */}
            {isStreaming && content && <StreamingCursor />}
          </div>

          {/* Image Analysis Block */}
          {imageAnalysis && (
            <div className="mt-3 p-3 rounded-lg bg-surface-2/60 border border-border-subtle">
              <p className="text-xs text-text-muted mb-1 font-medium">Image Analysis</p>
              <p className="text-sm text-text-secondary">{imageAnalysis}</p>
            </div>
          )}

          {/* Citations List */}
          {citationSources.length > 0 && !isStreaming && (
            <CitationList
              sources={citationSources}
              title="Sources"
              collapsed={true}
            />
          )}
        </div>

        {/* Actions (for bot messages) */}
        {isBot && !isStreaming && content && (
          <AnimatePresence>
            {showActions && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="flex items-center gap-1 mt-2"
              >
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg hover:bg-surface-3 transition-colors focus-ring"
                  title="Copy"
                >
                  {isCopied ? (
                    <Check className="h-4 w-4 text-neon-accent" />
                  ) : (
                    <Copy className="h-4 w-4 text-text-muted" />
                  )}
                </button>

                <button
                  onClick={() => onAction?.('regenerate', id)}
                  className="p-1.5 rounded-lg hover:bg-surface-3 transition-colors focus-ring"
                  title="Regenerate"
                >
                  <RefreshCw className="h-4 w-4 text-text-muted" />
                </button>

                <button
                  onClick={() => onAction?.('thumbsUp', id)}
                  className="p-1.5 rounded-lg hover:bg-surface-3 transition-colors focus-ring"
                  title="Good response"
                >
                  <ThumbsUp className="h-4 w-4 text-text-muted" />
                </button>

                <button
                  onClick={() => onAction?.('thumbsDown', id)}
                  className="p-1.5 rounded-lg hover:bg-surface-3 transition-colors focus-ring"
                  title="Bad response"
                >
                  <ThumbsDown className="h-4 w-4 text-text-muted" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Timestamp (user messages) */}
        {isUser && (
          <span className="text-xs text-text-muted mt-1">
            {formatTimestamp(timestamp)}
          </span>
        )}
      </div>
    </motion.div>
  );
});

StreamingMessage.displayName = 'StreamingMessage';
