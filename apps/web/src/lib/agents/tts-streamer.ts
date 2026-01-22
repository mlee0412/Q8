/**
 * Streaming TTS Integration
 * Buffers text and triggers TTS at sentence boundaries for natural speech
 *
 * This utility enables real-time text-to-speech during streaming responses
 * by detecting sentence boundaries and speaking complete thoughts.
 */

export interface TTSStreamerOptions {
  /** Minimum characters before speaking (default: 40) */
  minChunkLength?: number;

  /** Maximum buffer size before forcing speech (default: 200) */
  maxBufferSize?: number;

  /** Delay between TTS calls to prevent overlap (default: 100ms) */
  speakDelayMs?: number;

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * TTS Streamer for sentence-boundary speech synthesis
 */
export class TTSStreamer {
  private buffer = '';
  private speakQueue: string[] = [];
  private isSpeaking = false;
  private onSpeak: (text: string) => Promise<void> | void;
  private options: Required<TTSStreamerOptions>;

  constructor(
    onSpeak: (text: string) => Promise<void> | void,
    options: TTSStreamerOptions = {}
  ) {
    this.onSpeak = onSpeak;
    this.options = {
      minChunkLength: options.minChunkLength ?? 40,
      maxBufferSize: options.maxBufferSize ?? 200,
      speakDelayMs: options.speakDelayMs ?? 100,
      debug: options.debug ?? false,
    };
  }

  /**
   * Add text delta to buffer, speak complete sentences
   */
  addDelta(delta: string): void {
    this.buffer += delta;

    // Check for sentence boundaries
    const sentencePattern = /([.!?])\s+/g;
    let lastIndex = 0;
    let match;
    const completeSentences: string[] = [];

    while ((match = sentencePattern.exec(this.buffer)) !== null) {
      const sentence = this.buffer.slice(lastIndex, match.index + 1).trim();
      if (sentence.length >= this.options.minChunkLength) {
        completeSentences.push(sentence);
      }
      lastIndex = match.index + match[0].length;
    }

    // Update buffer to remaining incomplete text
    if (completeSentences.length > 0) {
      this.buffer = this.buffer.slice(lastIndex);

      // Queue sentences for speaking
      for (const sentence of completeSentences) {
        this.queueSpeak(sentence);
      }
    }

    // Force speak if buffer is too large (long sentence without punctuation)
    if (this.buffer.length >= this.options.maxBufferSize) {
      // Find a good break point (comma, semicolon, or space)
      const breakPattern = /[,;]\s+|\s+/g;
      let breakPoint = -1;
      while ((match = breakPattern.exec(this.buffer)) !== null) {
        if (match.index >= this.options.minChunkLength) {
          breakPoint = match.index + match[0].length;
        }
      }

      if (breakPoint > 0) {
        const chunk = this.buffer.slice(0, breakPoint).trim();
        this.buffer = this.buffer.slice(breakPoint);
        if (chunk.length > 0) {
          this.queueSpeak(chunk);
        }
      }
    }

    if (this.options.debug) {
      console.log('[TTSStreamer] Buffer:', this.buffer.length, 'chars');
    }
  }

  /**
   * Queue text for speaking
   */
  private queueSpeak(text: string): void {
    this.speakQueue.push(text);
    this.processQueue();
  }

  /**
   * Process the speak queue
   */
  private async processQueue(): Promise<void> {
    if (this.isSpeaking || this.speakQueue.length === 0) {
      return;
    }

    this.isSpeaking = true;

    while (this.speakQueue.length > 0) {
      const text = this.speakQueue.shift();
      if (text) {
        if (this.options.debug) {
          console.log('[TTSStreamer] Speaking:', text.slice(0, 50) + '...');
        }

        try {
          await this.onSpeak(text);
          // Small delay between utterances
          await new Promise((resolve) =>
            setTimeout(resolve, this.options.speakDelayMs)
          );
        } catch (error) {
          console.error('[TTSStreamer] Speak error:', error);
        }
      }
    }

    this.isSpeaking = false;
  }

  /**
   * Flush remaining buffer (call when stream ends)
   */
  async flush(): Promise<void> {
    if (this.buffer.trim()) {
      this.queueSpeak(this.buffer.trim());
      this.buffer = '';
    }

    // Wait for queue to finish
    while (this.isSpeaking || this.speakQueue.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  /**
   * Clear buffer and queue without speaking
   */
  clear(): void {
    this.buffer = '';
    this.speakQueue = [];
  }

  /**
   * Get current buffer content (for debugging)
   */
  getBuffer(): string {
    return this.buffer;
  }

  /**
   * Get queue length (for debugging)
   */
  getQueueLength(): number {
    return this.speakQueue.length;
  }
}

/**
 * Create a TTS streamer with default settings
 */
export function createTTSStreamer(
  onSpeak: (text: string) => Promise<void> | void,
  options?: TTSStreamerOptions
): TTSStreamer {
  return new TTSStreamer(onSpeak, options);
}

/**
 * Utility to detect if text ends with a sentence boundary
 */
export function endsWithSentence(text: string): boolean {
  return /[.!?]\s*$/.test(text.trim());
}

/**
 * Split text into TTS-friendly chunks
 * Useful for pre-processing long text before speaking
 */
export function splitIntoChunks(
  text: string,
  maxChunkSize: number = 150
): string[] {
  const chunks: string[] = [];
  const sentences = text.match(/[^.!?]+[.!?]+\s*/g) || [text];

  let currentChunk = '';

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length <= maxChunkSize) {
      currentChunk += sentence;
    } else {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
