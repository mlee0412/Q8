'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Copy, Check, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

interface TranscriptionSegment {
  id: string;
  text: string;
  timestamp: Date;
  confidence: number;
  isFinal: boolean;
  speaker?: string;
  language?: string;
}

interface TranscriptionDisplayProps {
  /**
   * Transcription segments
   */
  segments: TranscriptionSegment[];

  /**
   * Show interim results (non-final segments)
   * @default true
   */
  showInterim?: boolean;

  /**
   * Show confidence indicators
   * @default true
   */
  showConfidence?: boolean;

  /**
   * Show timestamps
   * @default true
   */
  showTimestamps?: boolean;

  /**
   * Show speaker labels
   * @default false
   */
  showSpeakers?: boolean;

  /**
   * Auto-scroll to latest segment
   * @default true
   */
  autoScroll?: boolean;

  /**
   * Maximum height
   * @default '400px'
   */
  maxHeight?: string;

  /**
   * Enable export
   * @default true
   */
  enableExport?: boolean;

  /**
   * Enable copy
   * @default true
   */
  enableCopy?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Segment click callback
   */
  onSegmentClick?: (segment: TranscriptionSegment) => void;
}

/**
 * Transcription Display Component
 *
 * Live speech-to-text display with confidence indicators,
 * timestamps, and export functionality.
 *
 * Features:
 * - Live transcription with interim results
 * - Confidence bars for each segment
 * - Auto-scroll to latest segment
 * - Timestamp formatting
 * - Speaker identification
 * - Export to text/JSON
 * - Copy to clipboard
 *
 * @example
 * ```tsx
 * // Basic usage
 * <TranscriptionDisplay
 *   segments={transcriptionSegments}
 * />
 *
 * // With speaker labels and confidence
 * <TranscriptionDisplay
 *   segments={transcriptionSegments}
 *   showSpeakers
 *   showConfidence
 *   onSegmentClick={(segment) => console.log(segment)}
 * />
 *
 * // Custom max height without interim results
 * <TranscriptionDisplay
 *   segments={transcriptionSegments}
 *   showInterim={false}
 *   maxHeight="600px"
 * />
 * ```
 */
export function TranscriptionDisplay({
  segments,
  showInterim = true,
  showConfidence = true,
  showTimestamps = true,
  showSpeakers = false,
  autoScroll = true,
  maxHeight = '400px',
  enableExport = true,
  enableCopy = true,
  className,
  onSegmentClick,
}: TranscriptionDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [segments, autoScroll]);

  // Filter segments based on interim setting
  const visibleSegments = showInterim
    ? segments
    : segments.filter((s) => s.isFinal);

  // Get full transcription text
  const getFullTranscription = (): string => {
    return segments
      .filter((s) => s.isFinal)
      .map((s) => {
        let text = '';
        if (showSpeakers && s.speaker) {
          text += `[${s.speaker}] `;
        }
        if (showTimestamps) {
          text += `[${formatTimestamp(s.timestamp)}] `;
        }
        text += s.text;
        return text;
      })
      .join('\n');
  };

  // Copy to clipboard
  const handleCopy = async () => {
    const text = getFullTranscription();
    await navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Export to file
  const handleExport = (format: 'txt' | 'json') => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let content: string;
    let mimeType: string;
    let extension: string;

    if (format === 'txt') {
      content = getFullTranscription();
      mimeType = 'text/plain';
      extension = 'txt';
    } else {
      content = JSON.stringify(segments.filter((s) => s.isFinal), null, 2);
      mimeType = 'application/json';
      extension = 'json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription-${timestamp}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Format timestamp
  const formatTimestamp = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className={cn('relative surface-matte rounded-xl p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium">Live Transcription</h3>

        <div className="flex items-center gap-2">
          {/* Copy button */}
          {enableCopy && segments.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8"
            >
              {isCopied ? (
                <>
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </>
              )}
            </Button>
          )}

          {/* Export button */}
          {enableExport && segments.length > 0 && (
            <div className="relative group">
              <Button
                variant="ghost"
                size="sm"
                className="h-8"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>

              {/* Export dropdown */}
              <div className="absolute right-0 top-full mt-1 surface-matte rounded-lg shadow-lg p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={() => handleExport('txt')}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-surface-3 rounded transition-colors"
                >
                  Export as TXT
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-surface-3 rounded transition-colors"
                >
                  Export as JSON
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transcription segments */}
      <div
        ref={scrollRef}
        className="space-y-3 overflow-y-auto pr-2"
        style={{ maxHeight }}
      >
        <AnimatePresence>
          {visibleSegments.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-text-muted"
            >
              <p className="text-sm">Start speaking to see transcription</p>
            </motion.div>
          ) : (
            visibleSegments.map((segment) => (
              <motion.div
                key={segment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  'p-3 rounded-lg transition-colors cursor-pointer',
                  segment.isFinal
                    ? 'bg-surface-3 hover:bg-surface-3/80'
                    : 'bg-surface-3/50 border border-neon-primary/30',
                  onSegmentClick && 'hover:bg-surface-3/60'
                )}
                onClick={() => onSegmentClick?.(segment)}
              >
                {/* Header with timestamp and speaker */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {/* Speaker */}
                    {showSpeakers && segment.speaker && (
                      <div className="flex items-center gap-1 text-xs text-text-muted">
                        <User className="h-3 w-3" />
                        <span>{segment.speaker}</span>
                      </div>
                    )}

                    {/* Timestamp */}
                    {showTimestamps && (
                      <span className="text-xs text-text-muted">
                        {formatTimestamp(segment.timestamp)}
                      </span>
                    )}

                    {/* Language */}
                    {segment.language && (
                      <span className="text-xs px-2 py-0.5 bg-neon-primary/20 text-neon-primary rounded">
                        {segment.language}
                      </span>
                    )}
                  </div>

                  {/* Status indicator */}
                  {!segment.isFinal && (
                    <motion.span
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="text-xs text-neon-primary"
                    >
                      Interim...
                    </motion.span>
                  )}
                </div>

                {/* Transcription text */}
                <p
                  className={cn(
                    'text-sm',
                    segment.isFinal ? 'text-foreground' : 'text-text-muted italic'
                  )}
                >
                  {segment.text}
                </p>

                {/* Confidence bar */}
                {showConfidence && segment.isFinal && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-text-muted">
                      Confidence:
                    </span>
                    <div className="flex-1 h-1.5 bg-border-subtle rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${segment.confidence * 100}%` }}
                        className={cn(
                          'h-full rounded-full',
                          getConfidenceColor(segment.confidence)
                        )}
                      />
                    </div>
                    <span className="text-xs text-text-muted">
                      {Math.round(segment.confidence * 100)}%
                    </span>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Stats footer */}
      {segments.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border-subtle flex items-center justify-between text-xs text-text-muted">
          <div>
            {segments.filter((s) => s.isFinal).length} final segments
            {showInterim && ` • ${segments.filter((s) => !s.isFinal).length} interim`}
          </div>
          <div>
            {getFullTranscription().split(' ').length} words
          </div>
        </div>
      )}
    </div>
  );
}

TranscriptionDisplay.displayName = 'TranscriptionDisplay';
