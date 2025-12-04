# Chat Interface Components Design Specification

**Category**: Chat Interface (Phase 3 - Agent Swarm)
**Priority**: Critical - Core multi-agent interaction
**Design Date**: 2025-01-20

---

## Overview

Components for multi-agent conversation interfaces supporting the Q8 agent swarm architecture. These components enable seamless chat with GPT-5.1 orchestrator and specialized sub-agents (Claude 4.5 Dev, Perplexity Research, Gemini 3.0 Secretary, Grok 4.1 Personality).

---

## 1. ChatMessage Component

### Purpose
Displays individual chat messages with agent identity, message content (text/code/media), timestamps, and status indicators.

### File Location
`apps/web/src/components/chat/ChatMessage.tsx`

### Component Code

```typescript
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  User,
  Code2,
  Check,
  Copy,
  ThumbsUp,
  ThumbsDown,
  MoreVertical,
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
              'h-10 w-10 rounded-full flex items-center justify-center',
              agentConfig.bgColor
            )}
          >
            {avatar ? (
              <img src={avatar} alt={agentName} className="h-full w-full rounded-full" />
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
                code({ node, inline, className, children, ...props }) {
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
```

### Usage Examples

```typescript
// User message
<ChatMessage
  id="msg-1"
  role="user"
  content="Help me debug this authentication issue"
  timestamp={new Date()}
/>

// Bot message with code
<ChatMessage
  id="msg-2"
  role="coder"
  agentName="DevBot (Claude 4.5)"
  content={"Here's the issue:\n\n```typescript\n// Missing await\nconst user = getUser();\n```"}
  timestamp={new Date()}
  onAction={(action, id) => console.log(action, id)}
/>

// Orchestrator message
<ChatMessage
  id="msg-3"
  role="orchestrator"
  content="I'll delegate this to the DevBot agent..."
  timestamp={new Date()}
/>
```

---

## 2. ChatInput Component

### Purpose
Multi-line text input with voice toggle, file upload, keyboard shortcuts, and agent mention support.

### File Location
`apps/web/src/components/chat/ChatInput.tsx`

### Component Code

```typescript
'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import {
  Send,
  Mic,
  MicOff,
  Paperclip,
  Smile,
  Loader2,
  AtSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

interface ChatInputProps {
  /**
   * Send message callback
   */
  onSend: (message: string, files?: File[]) => void;

  /**
   * Voice recording callback
   */
  onVoiceToggle?: (isRecording: boolean) => void;

  /**
   * File upload callback
   */
  onFileUpload?: (files: File[]) => void;

  /**
   * Placeholder text
   * @default 'Message Q8...'
   */
  placeholder?: string;

  /**
   * Disable input
   * @default false
   */
  disabled?: boolean;

  /**
   * Show voice button
   * @default true
   */
  showVoice?: boolean;

  /**
   * Show file upload button
   * @default true
   */
  showFileUpload?: boolean;

  /**
   * Show emoji picker button
   * @default false
   */
  showEmoji?: boolean;

  /**
   * Enable agent mentions (@coder, @researcher, etc.)
   * @default true
   */
  enableAgentMentions?: boolean;

  /**
   * Maximum message length
   * @default 4000
   */
  maxLength?: number;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export function ChatInput({
  onSend,
  onVoiceToggle,
  onFileUpload,
  placeholder = 'Message Q8...',
  disabled = false,
  showVoice = true,
  showFileUpload = true,
  showEmoji = false,
  enableAgentMentions = true,
  maxLength = 4000,
  className,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Agent mentions
  const agents = [
    { id: 'coder', name: 'DevBot (Claude)', icon: '💻' },
    { id: 'researcher', name: 'Research Agent (Perplexity)', icon: '🔍' },
    { id: 'secretary', name: 'Secretary (Gemini)', icon: '📅' },
    { id: 'personality', name: 'Grok', icon: '🤖' },
  ];

  // Handle text change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;

    if (value.length <= maxLength) {
      setMessage(value);

      // Auto-resize textarea
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }

      // Check for agent mentions
      if (enableAgentMentions && value.endsWith('@')) {
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    }
  };

  // Handle send
  const handleSend = () => {
    if (!message.trim() && selectedFiles.length === 0) return;

    onSend(message.trim(), selectedFiles);
    setMessage('');
    setSelectedFiles([]);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }

    // Escape to clear
    if (e.key === 'Escape') {
      setMessage('');
      setShowMentions(false);
    }
  };

  // Handle voice toggle
  const handleVoiceToggle = () => {
    const newRecordingState = !isRecording;
    setIsRecording(newRecordingState);
    onVoiceToggle?.(newRecordingState);
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
    onFileUpload?.(files);
  };

  // Handle mention select
  const handleMentionSelect = (agentId: string) => {
    setMessage((prev) => prev.slice(0, -1) + `@${agentId} `);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const charactersRemaining = maxLength - message.length;
  const isNearLimit = charactersRemaining < 100;

  return (
    <div className={cn('relative', className)}>
      {/* Agent Mentions Dropdown */}
      {showMentions && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-full left-0 right-0 mb-2 glass-panel rounded-xl shadow-lg overflow-hidden"
        >
          <div className="p-2">
            <p className="text-xs text-muted-foreground px-2 py-1">
              Mention an agent
            </p>
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => handleMentionSelect(agent.id)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-glass-bg transition-colors"
              >
                <span className="text-xl">{agent.icon}</span>
                <div className="text-left">
                  <p className="text-sm font-medium">{agent.name}</p>
                  <p className="text-xs text-muted-foreground">@{agent.id}</p>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="glass-panel px-3 py-2 rounded-lg flex items-center gap-2"
            >
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{file.name}</span>
              <button
                onClick={() =>
                  setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
                }
                className="text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Container */}
      <div className="glass-panel rounded-2xl flex items-end gap-2 p-3">
        {/* File Upload */}
        {showFileUpload && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
          </>
        )}

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full bg-transparent border-0 outline-none resize-none max-h-32 placeholder:text-muted-foreground"
          />

          {/* Character Count */}
          {isNearLimit && (
            <span
              className={cn(
                'absolute bottom-0 right-0 text-xs',
                charactersRemaining < 0 ? 'text-red-500' : 'text-muted-foreground'
              )}
            >
              {charactersRemaining}
            </span>
          )}
        </div>

        {/* Emoji Picker (TODO) */}
        {showEmoji && (
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0"
            disabled={disabled}
          >
            <Smile className="h-5 w-5" />
          </Button>
        )}

        {/* Voice Button */}
        {showVoice && (
          <Button
            variant={isRecording ? 'neon' : 'ghost'}
            size="icon"
            className="flex-shrink-0"
            onClick={handleVoiceToggle}
            disabled={disabled}
          >
            {isRecording ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </Button>
        )}

        {/* Send Button */}
        <Button
          variant="neon"
          size="icon"
          className="flex-shrink-0"
          onClick={handleSend}
          disabled={disabled || (!message.trim() && selectedFiles.length === 0)}
        >
          {disabled ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="flex items-center justify-between mt-2 px-2">
        <span className="text-xs text-muted-foreground">
          Press Enter to send, Shift+Enter for new line
        </span>
        {enableAgentMentions && (
          <span className="text-xs text-muted-foreground">
            Type @ to mention an agent
          </span>
        )}
      </div>
    </div>
  );
}

ChatInput.displayName = 'ChatInput';
```

### Usage Examples

```typescript
// Basic usage
<ChatInput
  onSend={(message) => console.log('Send:', message)}
/>

// With voice and file upload
<ChatInput
  onSend={(message, files) => console.log('Send:', message, files)}
  onVoiceToggle={(recording) => console.log('Recording:', recording)}
  onFileUpload={(files) => console.log('Files:', files)}
  showVoice
  showFileUpload
/>

// Disabled during loading
<ChatInput
  onSend={(message) => console.log('Send:', message)}
  disabled
  placeholder="Q8 is thinking..."
/>
```

---

## 3. AgentIndicator Component

### Purpose
Shows which sub-agent is currently responding with typing animation and agent metadata.

### File Location
`apps/web/src/components/chat/AgentIndicator.tsx`

### Component Code

```typescript
'use client';

import { motion } from 'framer-motion';
import { Bot, Code2, Search, Calendar, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type AgentRole = 'orchestrator' | 'coder' | 'researcher' | 'secretary' | 'personality';

interface AgentIndicatorProps {
  /**
   * Currently active agent
   */
  agent: AgentRole;

  /**
   * Agent display name
   */
  agentName?: string;

  /**
   * Show typing animation
   * @default true
   */
  showTyping?: boolean;

  /**
   * Current task description
   */
  task?: string;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export function AgentIndicator({
  agent,
  agentName,
  showTyping = true,
  task,
  className,
}: AgentIndicatorProps) {
  const agentConfig = getAgentConfig(agent);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn('flex items-center gap-3 glass-panel rounded-xl p-4', className)}
    >
      {/* Agent Icon */}
      <div className={cn('h-10 w-10 rounded-full flex items-center justify-center', agentConfig.bgColor)}>
        <agentConfig.icon className={cn('h-5 w-5', agentConfig.iconColor)} />
      </div>

      {/* Agent Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {agentName || agentConfig.name}
          </span>
          <span className="text-xs text-muted-foreground">
            ({agentConfig.model})
          </span>
        </div>

        {task && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {task}
          </p>
        )}
      </div>

      {/* Typing Animation */}
      {showTyping && (
        <div className="flex gap-1">
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
            className="h-2 w-2 rounded-full bg-neon-primary"
          />
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
            className="h-2 w-2 rounded-full bg-neon-primary"
          />
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
            className="h-2 w-2 rounded-full bg-neon-primary"
          />
        </div>
      )}
    </motion.div>
  );
}

AgentIndicator.displayName = 'AgentIndicator';

// Helper: Get agent configuration
function getAgentConfig(role: AgentRole) {
  const configs = {
    orchestrator: {
      name: 'Q8 Orchestrator',
      model: 'GPT-5.1',
      icon: Bot,
      iconColor: 'text-neon-primary',
      bgColor: 'bg-neon-primary/20',
    },
    coder: {
      name: 'DevBot',
      model: 'Claude 4.5',
      icon: Code2,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-500/20',
    },
    researcher: {
      name: 'Research Agent',
      model: 'Perplexity Sonar',
      icon: Search,
      iconColor: 'text-purple-500',
      bgColor: 'bg-purple-500/20',
    },
    secretary: {
      name: 'Secretary',
      model: 'Gemini 3.0',
      icon: Calendar,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-500/20',
    },
    personality: {
      name: 'Grok',
      model: 'Grok 4.1',
      icon: Sparkles,
      iconColor: 'text-orange-500',
      bgColor: 'bg-orange-500/20',
    },
  };

  return configs[role];
}
```

### Usage Examples

```typescript
// Orchestrator thinking
<AgentIndicator
  agent="orchestrator"
  task="Routing your request..."
/>

// Coder working
<AgentIndicator
  agent="coder"
  agentName="DevBot"
  task="Analyzing authentication code..."
/>

// Without typing animation
<AgentIndicator
  agent="researcher"
  showTyping={false}
/>
```

---

## 4. ChatHistory Component

### Purpose
Scrollable conversation container with infinite scroll, RxDB integration, date separators, and auto-scroll to bottom.

### File Location
`apps/web/src/components/chat/ChatHistory.tsx`

### Component Code

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRxData } from 'rxdb-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
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
  activeAgent?: Message['role'];

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
  const { result: messages, isFetching } = useRxData<Message>(
    'messages',
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
                  <div className="w-full border-t border-glass-border" />
                </div>
                <div className="relative px-4 glass-panel rounded-full">
                  <span className="text-xs text-muted-foreground">
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
              <p className="text-sm text-muted-foreground">
                Ask Q8 anything, and I'll route your request to the best specialized agent.
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
```

### Usage Examples

```typescript
// Basic usage
<ChatHistory
  conversationId="conv-123"
/>

// With typing indicator
<ChatHistory
  conversationId="conv-123"
  activeAgent="coder"
  activeAgentTask="Analyzing your code..."
  showTypingIndicator
/>

// Custom page size
<ChatHistory
  conversationId="conv-123"
  pageSize={100}
  enableInfiniteScroll
  onMessageAction={(action, id) => console.log(action, id)}
/>
```

---

## 5. MessageActions Component

### Purpose
Action buttons for chat messages (copy, regenerate, thumbs up/down feedback).

### File Location
`apps/web/src/components/chat/MessageActions.tsx`

### Component Code

```typescript
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy,
  Check,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

interface MessageActionsProps {
  /**
   * Message ID
   */
  messageId: string;

  /**
   * Show actions
   */
  visible: boolean;

  /**
   * Copy button callback
   */
  onCopy: () => void;

  /**
   * Is copied state
   */
  isCopied: boolean;

  /**
   * Regenerate button callback
   */
  onRegenerate?: () => void;

  /**
   * Thumbs up callback
   */
  onThumbsUp?: () => void;

  /**
   * Thumbs down callback
   */
  onThumbsDown?: () => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export function MessageActions({
  messageId,
  visible,
  onCopy,
  isCopied,
  onRegenerate,
  onThumbsUp,
  onThumbsDown,
  className,
}: MessageActionsProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className={cn('flex items-center gap-1 mt-2', className)}
        >
          {/* Copy */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onCopy}
            title="Copy message"
          >
            {isCopied ? (
              <Check className="h-4 w-4 text-neon-accent" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>

          {/* Regenerate */}
          {onRegenerate && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onRegenerate}
              title="Regenerate response"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}

          {/* Thumbs Up */}
          {onThumbsUp && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onThumbsUp}
              title="Good response"
            >
              <ThumbsUp className="h-4 w-4" />
            </Button>
          )}

          {/* Thumbs Down */}
          {onThumbsDown && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onThumbsDown}
              title="Bad response"
            >
              <ThumbsDown className="h-4 w-4" />
            </Button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

MessageActions.displayName = 'MessageActions';
```

### Usage Examples

```typescript
// Used internally by ChatMessage
<MessageActions
  messageId="msg-123"
  visible={showActions}
  onCopy={handleCopy}
  isCopied={isCopied}
  onRegenerate={handleRegenerate}
  onThumbsUp={handleThumbsUp}
  onThumbsDown={handleThumbsDown}
/>
```

---

## Complete Chat Interface Example

```typescript
// apps/web/src/app/chat/page.tsx
'use client';

import { useState } from 'react';
import { ChatHistory } from '@/components/chat/ChatHistory';
import { ChatInput } from '@/components/chat/ChatInput';

export default function ChatPage() {
  const [conversationId] = useState('conv-123');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeAgent, setActiveAgent] = useState<'orchestrator' | 'coder' | null>(null);

  const handleSend = async (message: string, files?: File[]) => {
    setIsProcessing(true);
    setActiveAgent('orchestrator');

    try {
      // TODO: Send message to agent swarm
      // await sendMessageToAgents(message, files);

      // Simulate agent response
      setTimeout(() => {
        setActiveAgent('coder');
      }, 1000);

      setTimeout(() => {
        setActiveAgent(null);
        setIsProcessing(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsProcessing(false);
      setActiveAgent(null);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Chat History */}
      <div className="flex-1 overflow-hidden">
        <ChatHistory
          conversationId={conversationId}
          activeAgent={activeAgent || undefined}
          activeAgentTask={activeAgent === 'orchestrator' ? 'Routing your request...' : 'Writing code...'}
          showTypingIndicator={isProcessing}
          onMessageAction={(action, id) => console.log(action, id)}
        />
      </div>

      {/* Chat Input */}
      <div className="p-4 border-t border-glass-border">
        <ChatInput
          onSend={handleSend}
          disabled={isProcessing}
          placeholder={isProcessing ? 'Q8 is thinking...' : 'Message Q8...'}
        />
      </div>
    </div>
  );
}
```

---

## Implementation Checklist

### Phase 1: Core Components
- [ ] Create `ChatMessage.tsx` with markdown support
- [ ] Create `ChatInput.tsx` with voice toggle
- [ ] Create `AgentIndicator.tsx` with typing animation
- [ ] Create `ChatHistory.tsx` with RxDB integration
- [ ] Create `MessageActions.tsx` for message interactions

### Phase 2: Integration
- [ ] Set up RxDB schema for `messages` collection
- [ ] Integrate with Agent Swarm orchestrator
- [ ] Implement agent routing logic
- [ ] Add voice recording integration
- [ ] Set up file upload handling

### Phase 3: Features
- [ ] Implement agent mentions (@coder, @researcher)
- [ ] Add code syntax highlighting
- [ ] Implement message regeneration
- [ ] Add feedback system (thumbs up/down)
- [ ] Create conversation management

### Phase 4: Testing
- [ ] Write unit tests for all components
- [ ] Test multi-agent conversations
- [ ] Verify accessibility compliance
- [ ] Test keyboard shortcuts
- [ ] Validate markdown rendering

---

## Design Decisions & Rationale

### Multi-Agent Identity
Each agent has unique color coding and icons to help users understand which specialist is responding.

### Markdown Support
Messages support full markdown with code syntax highlighting for technical conversations.

### Optimistic UI
Messages appear instantly using RxDB, with background sync to Supabase for persistence.

### Voice Integration
Voice toggle in input enables seamless switching between text and voice modes.

### Agent Mentions
Users can direct messages to specific agents using @mentions, bypassing the orchestrator.

---

## Next Steps

After implementing Chat Interface Components, proceed to:
1. **Voice Interface Enhancements** (Category 4) - Advanced voice features

---

**End of Chat Interface Components Design Specification**
