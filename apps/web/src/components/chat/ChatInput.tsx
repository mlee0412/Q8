'use client';

import { useState, useRef, KeyboardEvent, useCallback, forwardRef, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import {
  Send,
  Mic,
  MicOff,
  Loader2,
  FileText,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { FileUploadZone } from '../documents/FileUploadZone';
import type { Document } from '@/lib/documents/types';
import { SelectedFilesList } from './SelectedFilesList';
import { AgentMentionsDropdown, type Agent } from './AgentMentionsDropdown';

export interface ChatInputRef {
  insertMention: (mention: string) => void;
  focus: () => void;
}

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
   * File upload callback (raw files)
   */
  onFileUpload?: (files: File[]) => void;

  /**
   * Document upload callback (processed documents)
   */
  onDocumentUpload?: (document: Document) => void;

  /**
   * Thread ID for conversation-scoped document uploads
   */
  threadId?: string;

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
   * @default false
   */
  showFileUpload?: boolean;

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

/**
 * Chat Input Component
 *
 * Multi-line text input with voice toggle, file upload, keyboard shortcuts,
 * and agent mention support.
 *
 * Features:
 * - Multi-line text input with auto-resize
 * - Voice recording toggle
 * - File upload with preview
 * - Agent mentions (@coder, @researcher)
 * - Keyboard shortcuts (Enter to send, Shift+Enter for new line)
 * - Character count with limit warning
 *
 * @example
 * ```tsx
 * // Basic usage
 * <ChatInput
 *   onSend={(message) => console.log('Send:', message)}
 * />
 *
 * // With voice and file upload
 * <ChatInput
 *   onSend={(message, files) => console.log('Send:', message, files)}
 *   onVoiceToggle={(recording) => console.log('Recording:', recording)}
 *   onFileUpload={(files) => console.log('Files:', files)}
 *   showVoice
 *   showFileUpload
 * />
 * ```
 */
export const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(function ChatInput({
  onSend,
  onVoiceToggle,
  onFileUpload,
  onDocumentUpload,
  threadId,
  placeholder = 'Message Q8...',
  disabled = false,
  showVoice = false,
  showFileUpload = false,
  enableAgentMentions = true,
  maxLength = 4000,
  className,
}, ref) {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<Document[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Expose methods via ref for external components
  useImperativeHandle(ref, () => ({
    insertMention: (mention: string) => {
      setMessage((prev) => prev + mention);
      textareaRef.current?.focus();
    },
    focus: () => {
      textareaRef.current?.focus();
    },
  }), []);

  // Agent mentions - all available agents
  const agents: Agent[] = [
    { id: 'home', name: 'HomeBot', icon: '🏠' },
    { id: 'secretary', name: 'Secretary', icon: '📅' },
    { id: 'researcher', name: 'ResearchBot', icon: '🔍' },
    { id: 'finance', name: 'FinanceBot', icon: '💰' },
    { id: 'coder', name: 'DevBot', icon: '💻' },
    { id: 'personality', name: 'Q8', icon: '✨' },
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

  // Handle document upload complete
  const handleDocumentUpload = useCallback((document: Document) => {
    setUploadedDocs((prev) => [...prev, document]);
    onDocumentUpload?.(document);
  }, [onDocumentUpload]);

  // Remove uploaded document from display
  const removeUploadedDoc = useCallback((docId: string) => {
    setUploadedDocs((prev) => prev.filter((d) => d.id !== docId));
  }, []);

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
      <AgentMentionsDropdown
        agents={agents}
        visible={showMentions}
        onSelect={handleMentionSelect}
      />

      {/* Uploaded Documents */}
      {uploadedDocs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {uploadedDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-surface-3 border border-border-subtle px-3 py-2 rounded-lg flex items-center gap-2"
            >
              <FileText className="h-4 w-4 text-neon-primary" />
              <span className="text-sm text-text-primary">{doc.name}</span>
              <span className="text-xs text-text-muted capitalize">
                ({doc.status})
              </span>
              <button
                onClick={() => removeUploadedDoc(doc.id)}
                aria-label={`Remove ${doc.name}`}
                className="h-6 w-6 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors focus-ring rounded"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Legacy Selected Files (for non-document files) */}
      <SelectedFilesList
        selectedFiles={selectedFiles}
        onRemove={(index) => setSelectedFiles((prev) => prev.filter((_, i) => i !== index))}
      />

      {/* Input Container */}
      <div className="bg-surface-2 border border-border-subtle rounded-xl flex items-end gap-2 p-2.5">
        {/* File Upload with Document Processing */}
        {showFileUpload && (
          <FileUploadZone
            scope={threadId ? 'conversation' : 'global'}
            threadId={threadId}
            onUploadComplete={handleDocumentUpload}
            compact
            disabled={disabled}
          />
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
            className="w-full bg-transparent border-0 outline-none resize-none max-h-32 placeholder:text-text-muted text-text-primary"
          />

          {/* Character Count */}
          {isNearLimit && (
            <span
              className={cn(
                'absolute bottom-0 right-0 text-xs',
                charactersRemaining < 0 ? 'text-danger' : 'text-text-muted'
              )}
            >
              {charactersRemaining}
            </span>
          )}
        </div>

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
        <button
          onClick={handleSend}
          disabled={disabled || (!message.trim() && selectedFiles.length === 0)}
          aria-label={disabled ? 'Sending message' : 'Send message'}
          className="flex-shrink-0 h-10 w-10 rounded-lg bg-neon-primary hover:bg-neon-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors focus-ring"
        >
          {disabled ? (
            <Loader2 className="h-4 w-4 animate-spin text-white" />
          ) : (
            <Send className="h-4 w-4 text-white" />
          )}
        </button>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="flex items-center justify-center mt-1.5 gap-3">
        <span className="text-[10px] text-text-muted/70">
          Enter to send
        </span>
        {enableAgentMentions && (
          <span className="text-[10px] text-text-muted/70">
            @ to mention agent
          </span>
        )}
      </div>
    </div>
  );
});

ChatInput.displayName = 'ChatInput';
