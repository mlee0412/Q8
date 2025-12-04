'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Bot,
  User,
  Code2,
  Check,
  Copy,
  Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MessageActions } from './MessageActions';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

type AgentRole =
  | 'orchestrator'
  | 'coder'
  | 'researcher'
  | 'secretary'
  | 'personality'
  | 'home'
  | 'user';

interface ChatMessageProps {
  /**
   * Message ID
   */
  id: string;

  /**
   * Message sender role
   */
  role: AgentRole;

  /**
   * Message content (supports markdown)
   */
  content: string;

  /**
   * Agent name (for bot messages)
   */
  agentName?: string;

  /**
   * Agent avatar URL or icon
   */
  avatar?: string;

  /**
   * Message timestamp
   */
  timestamp: Date;

  /**
   * Message status
   */
  status?: 'sending' | 'sent' | 'error';

  /**
   * Show actions (copy, feedback, regenerate)
   * @default true
   */
  showActions?: boolean;

  /**
   * Enable code syntax highlighting
   * @default true
   */
  enableCodeHighlight?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Callback for message actions
   */
  onAction?: (action: 'copy' | 'regenerate' | 'thumbsUp' | 'thumbsDown', messageId: string) => void;
}

/**
 * Chat Message Component
 *
 * Displays individual chat messages with agent identity, message content (text/code/media),
 * timestamps, and status indicators.
 *
 * Features:
 * - Agent-specific avatars and colors
 * - Markdown support with syntax highlighting
 * - Copy, regenerate, and feedback actions
 * - Status indicators (sending, sent, error)
 * - Timestamp formatting
 *
 * @example
 * ```tsx
 * // User message
 * <ChatMessage
 *   id="msg-1"
 *   role="user"
 *   content="Help me debug this authentication issue"
 *   timestamp={new Date()}
 * />
 *
 * // Bot message with code
 * <ChatMessage
 *   id="msg-2"
 *   role="coder"
 *   agentName="DevBot (Claude 4.5)"
 *   content={"Here's the issue:\n\n```typescript\n// Missing await\nconst user = getUser();\n```"}
 *   timestamp={new Date()}
 *   onAction={(action, id) => console.log(action, id)}
 * />
 * ```
 */
export function ChatMessage({
  id,
  role,
  content,
  agentName,
  avatar,
  timestamp,
  status = 'sent',
  showActions = true,
  enableCodeHighlight = true,
  className,
  onAction,
}: ChatMessageProps) {
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const isUser = role === 'user';
  const isBot = !isUser;

  // Get agent configuration
  const agentConfig = getAgentConfig(role);

  // Handle copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    onAction?.('copy', id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex gap-4 group',
        isUser ? 'flex-row-reverse' : 'flex-row',
        className
      )}
      onMouseEnter={() => setShowActionsMenu(true)}
      onMouseLeave={() => setShowActionsMenu(false)}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {isBot ? (
          <div
            className={cn(
              'relative h-10 w-10 rounded-full flex items-center justify-center overflow-hidden',
              agentConfig.bgColor
            )}
          >
            {avatar ? (
              <Image src={avatar} alt={agentName || 'Agent'} fill className="object-cover" />
            ) : (
              <agentConfig.icon className={cn('h-5 w-5', agentConfig.iconColor)} />
            )}
          </div>
        ) : (
          <div className="h-10 w-10 rounded-full bg-neon-primary/20 flex items-center justify-center">
            <User className="h-5 w-5 text-neon-primary" />
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className={cn('flex-1 max-w-2xl', isUser && 'flex flex-col items-end')}>
        {/* Agent Name & Timestamp */}
        {isBot && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">{agentName || agentConfig.name}</span>
            <span className="text-xs text-muted-foreground">
              {formatTimestamp(timestamp)}
            </span>
            {status === 'sending' && (
              <span className="text-xs text-muted-foreground">Sending...</span>
            )}
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-3 relative',
            isUser
              ? 'glass-panel bg-neon-primary/10 border border-neon-primary/20'
              : 'glass-panel',
            status === 'error' && 'border-red-500/50 bg-red-500/10'
          )}
        >
          {/* Message Content (Markdown Support) */}
          <div
            className={cn(
              'prose prose-sm max-w-none',
              isUser && 'text-right',
              'prose-p:text-foreground prose-headings:text-foreground',
              'prose-code:text-neon-accent prose-code:bg-glass-bg',
              'prose-pre:glass-panel prose-pre:p-0'
            )}
          >
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  const language = match ? match[1] : '';

                  return !inline && enableCodeHighlight ? (
                    <div className="relative group/code">
                      {/* Language Label */}
                      {language && (
                        <div className="absolute top-2 right-2 z-10 px-2 py-1 glass-panel rounded text-xs text-muted-foreground">
                          {language}
                        </div>
                      )}

                      {/* Code Block */}
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={language}
                        PreTag="div"
                        className="rounded-lg !bg-black/30 !p-4"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>

                      {/* Copy Button for Code */}
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(String(children));
                          setIsCopied(true);
                          setTimeout(() => setIsCopied(false), 2000);
                        }}
                        className="absolute top-2 left-2 z-10 px-2 py-1 glass-panel rounded opacity-0 group-hover/code:opacity-100 transition-opacity"
                      >
                        {isCopied ? (
                          <Check className="h-4 w-4 text-neon-accent" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </div>

          {/* Status Indicator */}
          {status === 'error' && (
            <div className="flex items-center gap-2 mt-2 text-xs text-red-500">
              <span>Failed to send</span>
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions && isBot && (
          <MessageActions
            messageId={id}
            visible={showActionsMenu}
            onCopy={handleCopy}
            isCopied={isCopied}
            onRegenerate={() => onAction?.('regenerate', id)}
            onThumbsUp={() => onAction?.('thumbsUp', id)}
            onThumbsDown={() => onAction?.('thumbsDown', id)}
          />
        )}

        {/* Timestamp (user messages) */}
        {isUser && (
          <span className="text-xs text-muted-foreground mt-1">
            {formatTimestamp(timestamp)}
          </span>
        )}
      </div>
    </motion.div>
  );
}

ChatMessage.displayName = 'ChatMessage';

// Helper: Get agent configuration
function getAgentConfig(role: AgentRole) {
  const configs = {
    orchestrator: {
      name: 'Q8 Orchestrator',
      icon: Bot,
      iconColor: 'text-neon-primary',
      bgColor: 'bg-neon-primary/20',
    },
    coder: {
      name: 'DevBot',
      icon: Code2,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-500/20',
    },
    researcher: {
      name: 'Research Agent',
      icon: Bot,
      iconColor: 'text-purple-500',
      bgColor: 'bg-purple-500/20',
    },
    secretary: {
      name: 'Secretary',
      icon: Bot,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-500/20',
    },
    personality: {
      name: 'Grok',
      icon: Bot,
      iconColor: 'text-orange-500',
      bgColor: 'bg-orange-500/20',
    },
    home: {
      name: 'HomeBot',
      icon: Home,
      iconColor: 'text-cyan-500',
      bgColor: 'bg-cyan-500/20',
    },
    user: {
      name: 'You',
      icon: User,
      iconColor: 'text-neon-primary',
      bgColor: 'bg-neon-primary/20',
    },
  };

  return configs[role];
}

// Helper: Format timestamp
function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}
