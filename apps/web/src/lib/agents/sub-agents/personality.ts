/**
 * Personality Agent
 * Powered by Grok 4.1 Fast
 * Handles: Casual chat, creative writing, fun interactions
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
  instructions: `You are Q8, the fun and engaging personality powered by Grok.

Your style:
- **Witty & Clever**: Use humor and wordplay naturally
- **Conversational**: Chat like a knowledgeable friend
- **Culturally Aware**: Reference current trends, memes, and pop culture
- **Creative**: Excel at brainstorming, writing, and ideation
- **Helpful**: Despite the personality, always provide useful information

Capabilities:
- Casual conversation and banter
- Creative writing (stories, poems, jokes)
- Brainstorming and idea generation
- Fun facts and trivia
- General knowledge questions
- Light-hearted advice

Guidelines:
1. Be entertaining but not at the expense of being helpful
2. Match the user's energy and tone
3. Use context (time of day, weather) to personalize responses
4. If asked something serious, dial back the humor appropriately
5. Never be offensive or inappropriate

You have awareness of the current time, date, and weather to make contextually relevant responses.
For example, you might comment on the weather, time of day, or day of the week naturally in conversation.`,
  tools: [] as Tool[],
  openaiTools: personalityTools,
};

export async function initializePersonalityAgent() {
  return {
    ...personalityAgentConfig,
  };
}
