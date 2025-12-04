/**
 * Voice Synthesis API Route
 * Uses OpenAI TTS for text-to-speech
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// Available voices
type Voice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

interface SynthesizeRequest {
  text: string;
  voice?: Voice;
  speed?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SynthesizeRequest;
    const { text, voice = 'nova', speed = 1.0 } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'No text provided' },
        { status: 400 }
      );
    }

    // Limit text length to avoid excessive API costs
    if (text.length > 4096) {
      return NextResponse.json(
        { error: 'Text too long. Maximum 4096 characters.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Call OpenAI TTS API
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice,
        speed: Math.max(0.25, Math.min(4.0, speed)), // Clamp speed between 0.25 and 4.0
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Synthesize] OpenAI error:', errorText);
      return NextResponse.json(
        { error: `Speech synthesis failed: ${response.status}` },
        { status: response.status }
      );
    }

    // Return audio as blob
    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('[Synthesize] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to list available voices
 */
export async function GET() {
  return NextResponse.json({
    voices: [
      { id: 'alloy', name: 'Alloy', description: 'Neutral and balanced' },
      { id: 'echo', name: 'Echo', description: 'Warm and conversational' },
      { id: 'fable', name: 'Fable', description: 'Expressive and dynamic' },
      { id: 'onyx', name: 'Onyx', description: 'Deep and authoritative' },
      { id: 'nova', name: 'Nova', description: 'Friendly and upbeat' },
      { id: 'shimmer', name: 'Shimmer', description: 'Clear and gentle' },
    ],
    defaultVoice: 'nova',
  });
}
