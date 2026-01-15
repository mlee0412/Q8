'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import {
  Send,
  Mic,
  MicOff,
  Paperclip,
  Loader2,
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
export function ChatInput({
  onSend,
  onVoiceToggle,
  onFileUpload,
  placeholder = 'Message Q8...',
  disabled = false,
  showVoice = false,
  showFileUpload = false,
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
          className="absolute bottom-full left-0 right-0 mb-2 surface-matte rounded-xl shadow-lg overflow-hidden"
        >
          <div className="p-2">
            <p className="text-xs text-text-muted px-2 py-1">
              Mention an agent
            </p>
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => handleMentionSelect(agent.id)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-3 transition-colors focus-ring"
              >
                <span className="text-xl">{agent.icon}</span>
                <div className="text-left">
                  <p className="text-sm font-medium text-text-primary">{agent.name}</p>
                  <p className="text-xs text-text-muted">@{agent.id}</p>
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
              className="bg-surface-3 border border-border-subtle px-3 py-2 rounded-lg flex items-center gap-2"
            >
              <Paperclip className="h-4 w-4 text-text-muted" />
              <span className="text-sm text-text-primary">{file.name}</span>
              <button
                onClick={() =>
                  setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
                }
                aria-label={`Remove ${file.name}`}
                className="h-6 w-6 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors focus-ring rounded"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Container */}
      <div className="bg-surface-2 border border-border-subtle rounded-xl flex items-end gap-2 p-2.5">
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
}

ChatInput.displayName = 'ChatInput';
