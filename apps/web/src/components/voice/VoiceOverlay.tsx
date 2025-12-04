'use client';

import { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '../ui/button';

interface VoiceOverlayProps {
  isActive: boolean;
  onToggle: () => void;
}

export function VoiceOverlay({ isActive, onToggle }: VoiceOverlayProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl">
      <div className="flex flex-col items-center gap-8">
        <h2 className="text-3xl font-light text-white tracking-tight">
          {isSpeaking ? 'Q8 is speaking...' : 'Listening...'}
        </h2>

        {/* Audio Visualizer Placeholder */}
        <div className="w-64 h-32 glass-panel flex items-center justify-center">
          <div className="flex gap-2">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="w-2 bg-neon-primary rounded-full animate-pulse"
                style={{
                  height: `${Math.random() * 80 + 20}px`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        </div>

        <Button
          variant="ghost"
          size="lg"
          onClick={onToggle}
          className="px-8 py-3 rounded-full bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30"
        >
          <MicOff className="mr-2 h-4 w-4" />
          End Session
        </Button>
      </div>
    </div>
  );
}
