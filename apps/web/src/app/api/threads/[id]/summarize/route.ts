/**
 * Thread Summarize API Route
 * POST - Generate AI summary/title for thread
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import OpenAI from 'openai';

export const runtime = 'edge';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/threads/[id]/summarize
 * Generate AI title and summary for thread
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get thread messages
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('chat_messages')
      .select('role, content')
      .eq('thread_id', id)
      .order('created_at', { ascending: true })
      .limit(20);

    if (messagesError || !messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages found in thread' },
        { status: 400 }
      );
    }

    // Build conversation summary for AI
    const conversationText = messages
      .map((m) => `${m.role}: ${m.content.slice(0, 200)}`)
      .join('\n');

    // Generate title using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that generates concise, descriptive titles for conversations. 
Generate a title that captures the main topic or purpose of the conversation.
Rules:
- Keep it under 50 characters
- Be specific but concise
- Don't use quotes or special formatting
- Use title case`,
        },
        {
          role: 'user',
          content: `Generate a title for this conversation:\n\n${conversationText}`,
        },
      ],
      max_tokens: 50,
      temperature: 0.7,
    });

    const title = completion.choices[0]?.message?.content?.trim() || 'Untitled Conversation';

    // Generate summary if there are enough messages
    let summary = null;
    if (messages.length >= 3) {
      const summaryCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Summarize this conversation in 1-2 sentences. Focus on the key topics discussed and any conclusions reached.`,
          },
          {
            role: 'user',
            content: conversationText,
          },
        ],
        max_tokens: 100,
        temperature: 0.5,
      });
      summary = summaryCompletion.choices[0]?.message?.content?.trim() || null;
    }

    // Update thread with title and summary
    const { data: thread, error: updateError } = await supabaseAdmin
      .from('threads')
      .update({ title, summary })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[Summarize API] Error updating thread:', updateError);
      return NextResponse.json(
        { error: 'Failed to update thread' },
        { status: 500 }
      );
    }

    return NextResponse.json({ thread, title, summary });
  } catch (error) {
    console.error('[Summarize API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
