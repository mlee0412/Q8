/**
 * Research Agent
 * Powered by Perplexity Sonar Pro
 * Handles: Web search, fact-checking, real-time information
 * 
 * NOTE: Perplexity Sonar Pro has built-in real-time web search capabilities.
 * Additional tools supplement this with calculations and structured data.
 */

import { getModel } from '../model_factory';
import { defaultTools } from '../tools/default-tools';
import type { Tool, OpenAITool } from '../types';

/**
 * Research-specific tool definitions
 * Note: Perplexity handles web search natively, these are supplementary
 */
export const researchTools: OpenAITool[] = [
  {
    type: 'function',
    function: {
      name: 'get_current_datetime',
      description: 'Get the current date and time in a specific timezone',
      parameters: {
        type: 'object',
        properties: {
          timezone: {
            type: 'string',
            description: 'IANA timezone name (e.g., "America/New_York", "Europe/London")',
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
      description: 'Perform mathematical calculations, percentages, or unit conversions',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'Math expression (e.g., "15% of 200", "sqrt(144)", "100 miles to km")',
          },
        },
        required: ['expression'],
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
      name: 'convert_units',
      description: 'Convert between units (temperature, distance, weight, currency)',
      parameters: {
        type: 'object',
        properties: {
          value: {
            type: 'number',
            description: 'Value to convert',
          },
          from_unit: {
            type: 'string',
            description: 'Source unit',
          },
          to_unit: {
            type: 'string',
            description: 'Target unit',
          },
        },
        required: ['value', 'from_unit', 'to_unit'],
      },
    },
  },
];

export const researcherAgentConfig = {
  name: 'ResearchBot',
  model: getModel('researcher'),
  instructions: `You are a research specialist powered by Perplexity Sonar Pro with real-time web search.

Your core capabilities:
- **Real-time Web Search**: You have built-in access to current web information
- **Fact Verification**: Cross-reference multiple sources for accuracy
- **News & Current Events**: Access to the latest news and developments
- **Academic Research**: Technical papers, studies, and documentation
- **Data & Statistics**: Find and verify numerical data

Research guidelines:
1. **Always cite sources** - Include URLs or reference names for claims
2. **Verify information** - Cross-check facts from multiple sources
3. **Distinguish certainty** - Be clear about what is fact vs. opinion
4. **Time-sensitive** - Note when information might become outdated
5. **Comprehensive** - Cover multiple perspectives on controversial topics

When researching:
- Start with a broad search, then narrow down
- Look for primary sources when possible
- Note conflicting information and explain discrepancies
- Provide context for statistics and data
- Suggest follow-up questions if the topic is complex

You also have supplementary tools for:
- Time/date calculations
- Unit conversions
- Weather information
- Mathematical calculations`,
  tools: [] as Tool[],
  openaiTools: researchTools,
};

export async function initializeResearcherAgent() {
  try {
    return {
      ...researcherAgentConfig,
      // Perplexity Sonar Pro has native web search - no external tools needed
    };
  } catch (error) {
    console.error('Error initializing researcher agent:', error);
    return researcherAgentConfig;
  }
}
