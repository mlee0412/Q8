/**
 * useVoice Hook
 * Handles voice recording, transcription, and TTS playback
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export type VoiceStatus = 
  | 'idle' 
  | 'requesting-permission' 
  | 'recording' 
  | 'transcribing' 
  | 'processing' 
  | 'speaking' 
  | 'error';

export type Voice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

interface UseVoiceOptions {
  /**
   * Voice for TTS output
   */
  voice?: Voice;

  /**
   * Speech speed (0.25 to 4.0)
   */
  speed?: number;

  /**
   * Language for transcription
   */
  language?: string;

  /**
   * Auto-play TTS responses
   */
  autoSpeak?: boolean;

  /**
   * Callback when transcription is complete
   */
  onTranscription?: (text: string) => void;

  /**
   * Callback when an error occurs
   */
  onError?: (error: string) => void;

  /**
   * Callback when recording starts
   */
  onRecordingStart?: () => void;

  /**
   * Callback when recording stops
   */
  onRecordingStop?: () => void;

  /**
   * Callback when speaking starts
   */
  onSpeakingStart?: () => void;

  /**
   * Callback when speaking ends
   */
  onSpeakingEnd?: () => void;
}

interface UseVoiceReturn {
  status: VoiceStatus;
  isRecording: boolean;
  isTranscribing: boolean;
  isSpeaking: boolean;
  transcript: string | null;
  error: string | null;
  audioLevel: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  cancelRecording: () => void;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;
  setVoice: (voice: Voice) => void;
  setSpeed: (speed: number) => void;
}

export function useVoice(options: UseVoiceOptions = {}): UseVoiceReturn {
  const {
    voice: initialVoice = 'nova',
    speed: initialSpeed = 1.0,
    language = 'en',
    autoSpeak = false,
    onTranscription,
    onError,
    onRecordingStart,
    onRecordingStop,
    onSpeakingStart,
    onSpeakingEnd,
  } = options;

  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [voice, setVoice] = useState<Voice>(initialVoice);
  const [speed, setSpeed] = useState(initialSpeed);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
    };
  }, []);

  /**
   * Update audio level visualization
   */
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average level
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    setAudioLevel(average / 255); // Normalize to 0-1

    if (status === 'recording') {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  }, [status]);

  /**
   * Start recording
   */
  const startRecording = useCallback(async () => {
    try {
      setStatus('requesting-permission');
      setError(null);
      setTranscript(null);
      audioChunksRef.current = [];

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      streamRef.current = stream;

      // Set up audio analysis for visualization
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setStatus('recording');
      onRecordingStart?.();

      // Start audio level updates
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      setError(errorMessage);
      setStatus('error');
      onError?.(errorMessage);
    }
  }, [updateAudioLevel, onRecordingStart, onError]);

  /**
   * Stop recording and transcribe
   */
  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!mediaRecorderRef.current || status !== 'recording') {
      return null;
    }

    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;

      mediaRecorder.onstop = async () => {
        // Stop audio level updates
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        setAudioLevel(0);

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        // Close audio context
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }

        onRecordingStop?.();

        // Create audio blob
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        // Check if we have audio data
        if (audioBlob.size < 1000) {
          setError('Recording too short');
          setStatus('idle');
          resolve(null);
          return;
        }

        // Transcribe
        setStatus('transcribing');

        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          formData.append('language', language);

          const response = await fetch('/api/voice/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Transcription failed: ${response.status}`);
          }

          const result = await response.json();
          const transcribedText = result.text;

          setTranscript(transcribedText);
          setStatus('idle');
          onTranscription?.(transcribedText);
          resolve(transcribedText);

        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Transcription failed';
          setError(errorMessage);
          setStatus('error');
          onError?.(errorMessage);
          resolve(null);
        }
      };

      mediaRecorder.stop();
    });
  }, [status, language, onRecordingStop, onTranscription, onError]);

  /**
   * Cancel recording without transcribing
   */
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && status === 'recording') {
      mediaRecorderRef.current.stop();
    }

    // Stop audio level updates
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setAudioLevel(0);

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    audioChunksRef.current = [];
    setStatus('idle');
  }, [status]);

  /**
   * Speak text using TTS
   */
  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;

    try {
      setStatus('speaking');
      onSpeakingStart?.();

      const response = await fetch('/api/voice/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice,
          speed,
        }),
      });

      if (!response.ok) {
        throw new Error(`Speech synthesis failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create and play audio
      const audio = new Audio(audioUrl);
      audioElementRef.current = audio;

      audio.onended = () => {
        setStatus('idle');
        onSpeakingEnd?.();
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setStatus('error');
        setError('Failed to play audio');
        onError?.('Failed to play audio');
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Speech synthesis failed';
      setError(errorMessage);
      setStatus('error');
      onError?.(errorMessage);
    }
  }, [voice, speed, onSpeakingStart, onSpeakingEnd, onError]);

  /**
   * Stop speaking
   */
  const stopSpeaking = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      audioElementRef.current = null;
    }
    setStatus('idle');
    onSpeakingEnd?.();
  }, [onSpeakingEnd]);

  return {
    status,
    isRecording: status === 'recording',
    isTranscribing: status === 'transcribing',
    isSpeaking: status === 'speaking',
    transcript,
    error,
    audioLevel,
    startRecording,
    stopRecording,
    cancelRecording,
    speak,
    stopSpeaking,
    setVoice,
    setSpeed,
  };
}
