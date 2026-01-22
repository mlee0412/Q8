/**
 * Research Agent
 * Powered by Perplexity Sonar Reasoning Pro (sonar-reasoning-pro)
 * Handles: Web search, fact-checking, real-time information, deep analysis
 * 
 * Enhanced capabilities (Jan 2026):
 * - Deep reasoning with multi-step analysis
 * - Built-in real-time web search with citations
 * - Image analysis for research documents and charts
 * - Academic and SEC filings search filters
 */

import { getModel } from '../model_factory';
import { defaultTools } from '../tools/default-tools';
import { logger } from '@/lib/logger';
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
  instructions: `You are a research specialist powered by Perplexity Sonar Reasoning Pro with deep analysis and real-time web search.

Your core capabilities:
- **Deep Reasoning**: Multi-step analysis for complex research questions
- **Real-time Web Search**: Built-in access to current web information with automatic citations
- **Fact Verification**: Cross-reference multiple sources for accuracy
- **News & Current Events**: Access to the latest news and developments
- **Academic Research**: Technical papers, studies, and documentation with academic filters
- **Financial Research**: SEC filings, company data, and market information
- **Image Analysis**: Analyze charts, graphs, research figures, and documents
- **Data & Statistics**: Find, verify, and interpret numerical data

Research guidelines:
1. **Always cite sources** - Include URLs or reference names for all claims
2. **Verify information** - Cross-check facts from multiple authoritative sources
3. **Distinguish certainty** - Be clear about what is fact vs. opinion vs. speculation
4. **Time-sensitive** - Note when information might become outdated
5. **Comprehensive** - Cover multiple perspectives on controversial topics
6. **Deep analysis** - For complex questions, break down into sub-questions and analyze systematically

When researching:
- Start with a broad search, then narrow down to specifics
- Look for primary sources when possible (official documents, original studies)
- Note conflicting information and explain discrepancies
- Provide context for statistics and data (sample size, methodology, date)
- Suggest follow-up questions if the topic is complex
- For financial queries, use SEC filings and official company sources
- For academic queries, prioritize peer-reviewed sources

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
    logger.error('Error initializing researcher agent', { error });
    return researcherAgentConfig;
  }
}
