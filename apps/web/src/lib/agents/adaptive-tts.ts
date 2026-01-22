/**
 * Adaptive TTS Engine
 * Content-aware text-to-speech with dynamic pacing, emphasis, and natural pauses
 *
 * Features:
 * - Content type detection (code, lists, conversational, technical)
 * - Dynamic speech rate based on content complexity
 * - Natural pause insertion at logical boundaries
 * - Emphasis detection for important phrases
 * - Emotion-aware voice modulation hints
 */

import { logger } from '@/lib/logger';

// =============================================================================
// TYPES
// =============================================================================

export type ContentType = 'conversational' | 'technical' | 'code' | 'list' | 'narrative' | 'question';
export type EmotionHint = 'neutral' | 'excited' | 'serious' | 'friendly' | 'concerned' | 'curious';

export interface TTSSegment {
  text: string;
  type: ContentType;
  speed: number; // 0.5 - 2.0
  pauseBefore: number; // milliseconds
  pauseAfter: number; // milliseconds
  emphasis: boolean;
  emotionHint: EmotionHint;
}

export interface AdaptiveTTSConfig {
  baseSpeed: number;
  enableEmphasis: boolean;
  insertPauses: boolean;
  maxSegmentLength: number;
  speakCodeBlocks: boolean;
}

export interface ProcessedTTS {
  segments: TTSSegment[];
  totalDuration: number; // estimated milliseconds
  averageSpeed: number;
  contentTypes: ContentType[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_CONFIG: AdaptiveTTSConfig = {
  baseSpeed: 1.0,
  enableEmphasis: true,
  insertPauses: true,
  maxSegmentLength: 200,
  speakCodeBlocks: false,
};

// Speed modifiers by content type
const SPEED_MODIFIERS: Record<ContentType, number> = {
  conversational: 1.0,
  technical: 0.9,
  code: 0.8,
  list: 0.95,
  narrative: 1.05,
  question: 0.95,
};

// Pause durations in milliseconds
const PAUSE_DURATIONS = {
  sentence: 400,
  paragraph: 800,
  listItem: 300,
  codeBlock: 500,
  emphasis: 200,
  question: 300,
};

// Patterns for content detection
const PATTERNS = {
  code: /```[\s\S]*?```|`[^`]+`/g,
  list: /^[\s]*[-*•]\s+.+$/gm,
  numberedList: /^[\s]*\d+[.)]\s+.+$/gm,
  question: /\?[\s]*$/,
  emphasis: /\*\*[^*]+\*\*|\*[^*]+\*/g,
  technical: /\b(API|SDK|HTTP|JSON|XML|SQL|CSS|HTML|JS|TS|function|class|const|let|var|async|await)\b/gi,
  excited: /!{1,3}[\s]*$/,
  numbers: /\d+(?:,\d{3})*(?:\.\d+)?%?/g,
};

// =============================================================================
// ADAPTIVE TTS ENGINE
// =============================================================================

export class AdaptiveTTSEngine {
  private config: AdaptiveTTSConfig;

  constructor(config: Partial<AdaptiveTTSConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Detect primary content type
   */
  detectContentType(text: string): ContentType {
    // Check for code
    if (PATTERNS.code.test(text)) {
      return 'code';
    }

    // Check for lists
    if (PATTERNS.list.test(text) || PATTERNS.numberedList.test(text)) {
      return 'list';
    }

    // Check for questions
    if (PATTERNS.question.test(text)) {
      return 'question';
    }

    // Check for technical content
    const technicalMatches = text.match(PATTERNS.technical);
    if (technicalMatches && technicalMatches.length > 3) {
      return 'technical';
    }

    // Check for narrative (longer, flowing text)
    if (text.length > 300 && !text.includes('\n\n')) {
      return 'narrative';
    }

    return 'conversational';
  }

  /**
   * Detect emotional tone
   */
  detectEmotion(text: string): EmotionHint {
    const lowerText = text.toLowerCase();

    // Excited
    if (PATTERNS.excited.test(text) || /\b(great|awesome|amazing|wonderful|fantastic)\b/.test(lowerText)) {
      return 'excited';
    }

    // Concerned/serious
    if (/\b(warning|caution|important|critical|error|fail|issue)\b/.test(lowerText)) {
      return 'serious';
    }

    // Curious
    if (/\b(wonder|curious|interesting|hmm|perhaps)\b/.test(lowerText) || text.includes('?')) {
      return 'curious';
    }

    // Friendly
    if (/\b(thanks|please|welcome|happy|glad|help)\b/.test(lowerText)) {
      return 'friendly';
    }

    return 'neutral';
  }

  /**
   * Calculate optimal speed for segment
   */
  calculateSpeed(text: string, contentType: ContentType): number {
    let speed = this.config.baseSpeed * SPEED_MODIFIERS[contentType];

    // Slow down for numbers/statistics
    const numberMatches = text.match(PATTERNS.numbers);
    if (numberMatches && numberMatches.length > 2) {
      speed *= 0.9;
    }

    // Slow down for technical terms
    const technicalMatches = text.match(PATTERNS.technical);
    if (technicalMatches && technicalMatches.length > 1) {
      speed *= 0.95;
    }

    // Clamp to valid range
    return Math.max(0.5, Math.min(2.0, speed));
  }

  /**
   * Split text into speakable segments
   */
  segmentText(text: string): string[] {
    const segments: string[] = [];

    // First, handle code blocks specially
    const codeBlocks: string[] = [];
    const textWithoutCode = text.replace(PATTERNS.code, (match) => {
      codeBlocks.push(match);
      return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
    });

    // Split by paragraphs
    const paragraphs = textWithoutCode.split(/\n\n+/);

    for (const paragraph of paragraphs) {
      // Check for code block placeholder
      const codeMatch = paragraph.match(/__CODE_BLOCK_(\d+)__/);
      if (codeMatch) {
        if (this.config.speakCodeBlocks) {
          const blockIndex = parseInt(codeMatch[1] ?? '0', 10);
          const codeBlock = codeBlocks[blockIndex];
          if (codeBlock) {
            // Clean code block for speaking
            const cleanCode = codeBlock
              .replace(/```\w*\n?/g, '')
              .replace(/`/g, '')
              .trim();
            segments.push(`Code: ${cleanCode.slice(0, 100)}${cleanCode.length > 100 ? '...' : ''}`);
          }
        } else {
          segments.push('I\'ve included some code in my response.');
        }
        continue;
      }

      // Split by sentences for regular text
      const sentences = paragraph.match(/[^.!?]+[.!?]+\s*/g) || [paragraph];

      let currentSegment = '';
      for (const sentence of sentences) {
        if (currentSegment.length + sentence.length <= this.config.maxSegmentLength) {
          currentSegment += sentence;
        } else {
          if (currentSegment.trim()) {
            segments.push(currentSegment.trim());
          }
          currentSegment = sentence;
        }
      }

      if (currentSegment.trim()) {
        segments.push(currentSegment.trim());
      }
    }

    return segments.filter((s) => s.length > 0);
  }

  /**
   * Process text for adaptive TTS
   */
  process(text: string): ProcessedTTS {
    const segments: TTSSegment[] = [];
    const rawSegments = this.segmentText(text);
    const contentTypes = new Set<ContentType>();
    let totalDuration = 0;
    let totalSpeed = 0;

    for (let i = 0; i < rawSegments.length; i++) {
      const segmentText = rawSegments[i];
      if (!segmentText) continue;

      const contentType = this.detectContentType(segmentText);
      const emotionHint = this.detectEmotion(segmentText);
      const speed = this.calculateSpeed(segmentText, contentType);
      const hasEmphasis = this.config.enableEmphasis && PATTERNS.emphasis.test(segmentText);

      contentTypes.add(contentType);

      // Calculate pauses
      let pauseBefore = 0;
      let pauseAfter = 0;

      if (this.config.insertPauses) {
        // Pause before new paragraphs
        if (i > 0 && contentType !== this.detectContentType(rawSegments[i - 1] || '')) {
          pauseBefore = PAUSE_DURATIONS.paragraph;
        }

        // Pause after sentences
        pauseAfter = PAUSE_DURATIONS.sentence;

        // Extra pause for questions
        if (contentType === 'question') {
          pauseAfter += PAUSE_DURATIONS.question;
        }

        // Pause for emphasis
        if (hasEmphasis) {
          pauseBefore += PAUSE_DURATIONS.emphasis;
        }
      }

      // Estimate duration (rough: ~150 words per minute at speed 1.0)
      const wordCount = segmentText.split(/\s+/).length;
      const baseDuration = (wordCount / 150) * 60 * 1000; // milliseconds
      const adjustedDuration = baseDuration / speed;
      totalDuration += adjustedDuration + pauseBefore + pauseAfter;
      totalSpeed += speed;

      segments.push({
        text: segmentText,
        type: contentType,
        speed,
        pauseBefore,
        pauseAfter,
        emphasis: hasEmphasis,
        emotionHint,
      });
    }

    return {
      segments,
      totalDuration,
      averageSpeed: segments.length > 0 ? totalSpeed / segments.length : this.config.baseSpeed,
      contentTypes: Array.from(contentTypes),
    };
  }

  /**
   * Get TTS parameters for a segment (for API calls)
   */
  getSegmentParams(segment: TTSSegment): { speed: number; voice?: string } {
    // Map emotion to voice preference (these would be actual voice options)
    const voiceHints: Record<EmotionHint, string> = {
      neutral: 'nova',
      excited: 'shimmer',
      serious: 'onyx',
      friendly: 'nova',
      concerned: 'onyx',
      curious: 'echo',
    };

    return {
      speed: segment.speed,
      voice: voiceHints[segment.emotionHint],
    };
  }

  /**
   * Clean text for TTS (remove markdown, code blocks, etc.)
   */
  cleanForSpeech(text: string): string {
    return text
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, 'I\'ve included some code.')
      .replace(/`([^`]+)`/g, '$1')
      // Remove markdown emphasis but keep text
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      // Remove links but keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove headers
      .replace(/^#+\s+/gm, '')
      // Clean up whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}

// =============================================================================
// SINGLETON & UTILITIES
// =============================================================================

let engineInstance: AdaptiveTTSEngine | null = null;

export function getAdaptiveTTSEngine(): AdaptiveTTSEngine {
  if (!engineInstance) {
    engineInstance = new AdaptiveTTSEngine();
  }
  return engineInstance;
}

/**
 * Quick process for adaptive TTS
 */
export function processForTTS(
  text: string,
  config?: Partial<AdaptiveTTSConfig>
): ProcessedTTS {
  const engine = config ? new AdaptiveTTSEngine(config) : getAdaptiveTTSEngine();
  return engine.process(text);
}

/**
 * Clean and prepare text for TTS
 */
export function prepareForSpeech(text: string): string {
  return getAdaptiveTTSEngine().cleanForSpeech(text);
}

/**
 * Estimate speech duration in milliseconds
 */
export function estimateSpeechDuration(text: string, speed: number = 1.0): number {
  const wordCount = text.split(/\s+/).length;
  const baseDuration = (wordCount / 150) * 60 * 1000; // 150 WPM
  return baseDuration / speed;
}
