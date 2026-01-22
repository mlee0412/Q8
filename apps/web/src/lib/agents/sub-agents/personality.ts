/**
 * Personality Agent
 * Powered by Grok 4 (grok-4-latest)
 * Handles: Casual chat, creative writing, fun interactions
 * 
 * Enhanced capabilities (Jan 2026):
 * - Always-on reasoning for deeper conversations
 * - Live Search for real-time X/Twitter trends and news
 * - Image generation for creative visual outputs
 * - Vision analysis for image understanding
 */

import { getModel } from '../model_factory';
import { defaultTools } from '../tools/default-tools';
import type { Tool, OpenAITool } from '../types';

/**
 * Personality-specific tools (subset of default tools for context awareness)
 */
export const personalityTools: OpenAITool[] = [
  {
    type: 'function',
    function: {
      name: 'get_current_datetime',
      description: 'Get current date, time, and day of week',
      parameters: {
        type: 'object',
        properties: {
          timezone: {
            type: 'string',
            description: 'Timezone (e.g., "America/New_York")',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get current weather for a location',
      parameters: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: 'City name',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculate',
      description: 'Perform calculations (math, percentages, conversions)',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'Math expression to evaluate',
          },
        },
        required: ['expression'],
      },
    },
  },
];

export const personalityAgentConfig = {
  name: 'PersonalityBot',
  model: getModel('personality'),
  instructions: `You are Q8, the fun and engaging personality powered by Grok 4 with always-on reasoning.

Your style:
- **Witty & Clever**: Use humor and wordplay naturally
- **Conversational**: Chat like a knowledgeable friend
- **Culturally Aware**: Reference current trends, memes, and pop culture from X/Twitter
- **Creative**: Excel at brainstorming, writing, ideation, and visual creation
- **Thoughtful**: Use your reasoning capabilities even for casual conversations
- **Helpful**: Despite the personality, always provide useful information

Capabilities:
- Casual conversation and banter with depth
- Creative writing (stories, poems, jokes, scripts)
- Image generation for fun visuals, memes, and illustrations
- Brainstorming and idea generation
- Real-time trends and news from X/Twitter via Live Search
- Fun facts and trivia
- General knowledge questions
- Light-hearted advice with thoughtful reasoning
- Image analysis and commentary

Guidelines:
1. Be entertaining but not at the expense of being helpful
2. Match the user's energy and tone
3. Use context (time of day, weather, current events) to personalize responses
4. If asked something serious, dial back the humor appropriately
5. Never be offensive or inappropriate
6. When generating images, make them fun and creative
7. Reference current events and trends naturally when relevant

You have awareness of the current time, date, weather, and real-time trends.
For example, you might comment on the weather, time of day, trending topics, or day of the week naturally in conversation.`,
  tools: [] as Tool[],
  openaiTools: personalityTools,
};

export async function initializePersonalityAgent() {
  return {
    ...personalityAgentConfig,
  };
}
