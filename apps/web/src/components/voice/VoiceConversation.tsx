'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Mic, 
  Volume2, 
  VolumeX,
  Settings,
  MessageSquare,
  Bot,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoice, type Voice } from '@/hooks/useVoice';
import { useChat } from '@/hooks/useChat';
import { Button } from '@/components/ui/button';

interface VoiceConversationProps {
  /**
   * Whether the voice conversation is open
   */
  isOpen: boolean;

  /**
   * Callback to close the voice conversation
   */
  onClose: () => void;

  /**
   * User ID for chat
   */
  userId: string;

  /**
   * Thread ID for chat
   */
  threadId: string;

  /**
   * TTS Voice
   */
  voice?: Voice;

  /**
   * Additional CSS classes
   */
  className?: string;
}

interface ConversationEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * VoiceConversation Component
 *
 * Full-screen ambient voice conversation mode
 */
export function VoiceConversation({
  isOpen,
  onClose,
  userId,
  threadId,
  voice = 'nova',
  className,
}: VoiceConversationProps) {
  const [conversationHistory, setConversationHistory] = useState<ConversationEntry[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<Voice>(voice);
  const lastResponseRef = useRef<string | null>(null);

  const {
    status: voiceStatus,
    isRecording,
    isSpeaking,
    audioLevel,
    startRecording,
    stopRecording,
    speak,
    stopSpeaking,
  } = useVoice({
    voice: selectedVoice,
    onTranscription: handleTranscription,
    onError: (error) => {
      console.error('[VoiceConversation] Voice error:', error);
    },
  });

  const {
    messages,
    isLoading,
    isStreaming,
    currentAgent,
    sendMessage,
  } = useChat({
    userId,
    threadId,
    onMessage: handleAgentResponse,
  });

  /**
   * Handle user's transcribed speech
   */
  async function handleTranscription(text: string) {
    if (!text.trim()) return;

    // Add user message to history
    const userEntry: ConversationEntry = {
      id: `voice_${Date.now()}_user`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setConversationHistory(prev => [...prev, userEntry]);

    // Send to chat
    await sendMessage(text);
  }

  /**
   * Handle agent response
   */
  function handleAgentResponse(message: { content: string }) {
    if (!message.content || message.content === lastResponseRef.current) return;
    lastResponseRef.current = message.content;

    // Add assistant message to history
    const assistantEntry: ConversationEntry = {
      id: `voice_${Date.now()}_assistant`,
      role: 'assistant',
      content: message.content,
      timestamp: new Date(),
    };
    setConversationHistory(prev => [...prev, assistantEntry]);

    // Speak the response
    if (!isMuted) {
      speak(message.content);
    }
  }

  /**
   * Handle click/tap to record
   */
  const handleInteraction = useCallback(async () => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  }, [isRecording, isSpeaking, startRecording, stopRecording, stopSpeaking]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isRecording) {
          stopRecording();
        } else {
          onClose();
        }
      } else if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        handleInteraction();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isRecording, handleInteraction, stopRecording, onClose]);

  // Voice options
  const voiceOptions: { value: Voice; label: string }[] = [
    { value: 'nova', label: 'Nova (Friendly)' },
    { value: 'alloy', label: 'Alloy (Neutral)' },
    { value: 'echo', label: 'Echo (Warm)' },
    { value: 'fable', label: 'Fable (Expressive)' },
    { value: 'onyx', label: 'Onyx (Deep)' },
    { value: 'shimmer', label: 'Shimmer (Gentle)' },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={cn(
          'fixed inset-0 z-50 flex flex-col',
          'bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900',
          className
        )}
      >
        {/* Header */}
        <header className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-neon-primary/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-neon-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Voice Mode</h1>
              <p className="text-sm text-muted-foreground">
                {currentAgent ? `Talking to ${currentAgent}` : 'Q8 is listening'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
              title="Settings"
            >
              <Settings className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              title="Close"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-6 pb-4"
            >
              <div className="glass-panel rounded-xl p-4">
                <h3 className="text-sm font-medium mb-3">Voice Settings</h3>
                <div className="flex flex-wrap gap-2">
                  {voiceOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedVoice(option.value)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm transition-colors',
                        selectedVoice === option.value
                          ? 'bg-neon-primary text-white'
                          : 'bg-glass-bg hover:bg-glass-border'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          {/* Conversation History (Scrollable) */}
          <div className="w-full max-w-md mb-8 max-h-[30vh] overflow-y-auto">
            <AnimatePresence>
              {conversationHistory.slice(-4).map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={cn(
                    'mb-4 p-3 rounded-xl',
                    entry.role === 'user'
                      ? 'bg-neon-primary/20 ml-8'
                      : 'bg-glass-bg mr-8'
                  )}
                >
                  <p className="text-sm">{entry.content}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Central Voice Orb */}
          <motion.button
            onClick={handleInteraction}
            className="relative"
            whileTap={{ scale: 0.95 }}
          >
            {/* Background glow */}
            <motion.div
              className={cn(
                'absolute inset-0 rounded-full blur-3xl',
                isRecording && 'bg-red-500/30',
                isSpeaking && 'bg-green-500/30',
                !isRecording && !isSpeaking && 'bg-neon-primary/20'
              )}
              animate={{
                scale: isRecording ? [1, 1.2, 1] : 1,
                opacity: isRecording ? [0.5, 0.8, 0.5] : 0.5,
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ width: 250, height: 250 }}
            />

            {/* Main orb */}
            <motion.div
              className={cn(
                'relative h-40 w-40 rounded-full flex items-center justify-center',
                'bg-gradient-to-br shadow-2xl',
                isRecording && 'from-red-500 to-red-600',
                isSpeaking && 'from-green-500 to-green-600',
                isLoading && 'from-blue-500 to-blue-600',
                !isRecording && !isSpeaking && !isLoading && 'from-neon-primary to-purple-600'
              )}
              animate={
                isRecording
                  ? { scale: [1, 1 + audioLevel * 0.15, 1] }
                  : isSpeaking
                  ? { scale: [1, 1.05, 1] }
                  : {}
              }
              transition={{ duration: 0.3 }}
            >
              {/* Inner gradient */}
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-white/20 to-transparent" />

              {/* Icon */}
              {isLoading || isStreaming ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <Bot className="h-16 w-16 text-white/80" />
                </motion.div>
              ) : isSpeaking ? (
                <Volume2 className="h-16 w-16 text-white/80" />
              ) : (
                <Mic className="h-16 w-16 text-white/80" />
              )}
            </motion.div>

            {/* Ripple effects when recording */}
            {isRecording && (
              <>
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-red-500"
                  initial={{ scale: 1, opacity: 0.6 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{ width: 160, height: 160, margin: 'auto' }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-red-500"
                  initial={{ scale: 1, opacity: 0.4 }}
                  animate={{ scale: 2.5, opacity: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                  style={{ width: 160, height: 160, margin: 'auto' }}
                />
              </>
            )}
          </motion.button>

          {/* Status Text */}
          <motion.p
            className="mt-8 text-lg text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {isRecording && 'Listening...'}
            {voiceStatus === 'transcribing' && 'Processing...'}
            {isLoading && 'Thinking...'}
            {isStreaming && 'Responding...'}
            {isSpeaking && 'Speaking...'}
            {voiceStatus === 'idle' && !isLoading && !isStreaming && 'Tap or hold Space to speak'}
          </motion.p>

          {/* Hint */}
          <p className="mt-2 text-sm text-muted-foreground">
            Press ESC to close
          </p>
        </div>

        {/* Bottom Controls */}
        <footer className="p-6 flex justify-center">
          <Button
            variant="glass"
            onClick={onClose}
            className="gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Switch to Text
          </Button>
        </footer>
      </motion.div>
    </AnimatePresence>
  );
}

VoiceConversation.displayName = 'VoiceConversation';
