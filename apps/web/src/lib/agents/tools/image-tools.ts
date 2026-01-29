/**
 * Image Tools - OpenAI Image Generation
 * Powered by OpenAI gpt-image-1.5 (generation/editing) and GPT-5-mini (vision/analysis)
 *
 * Capabilities:
 * - Text-to-image generation
 * - Image editing with natural language
 * - Image analysis and understanding
 * - Diagram and chart creation
 * - Image comparison
 */

import type { OpenAITool } from '../types';

/**
 * Image tool definitions for OpenAI function calling
 */
export const imageTools: OpenAITool[] = [
  {
    type: 'function',
    function: {
      name: 'generate_image',
      description:
        'Generate an image from a text description using OpenAI image generation. Can create diagrams, illustrations, charts, infographics, and creative visuals. Best for: product mockups, concept art, diagrams, data visualizations.',
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description:
              'Detailed description of the image to generate. Be specific about style, colors, composition, lighting, and content. More detail = better results.',
          },
          style: {
            type: 'string',
            enum: [
              'photo',
              'illustration',
              'diagram',
              'chart',
              'infographic',
              'artistic',
              'technical',
              'sketch',
              'watercolor',
              '3d_render',
            ],
            description: 'Visual style of the generated image. Default: illustration',
          },
          aspect_ratio: {
            type: 'string',
            enum: ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9'],
            description: 'Aspect ratio of the output image. Default: 1:1',
          },
          quality: {
            type: 'string',
            enum: ['fast', 'standard', 'hd', '4k'],
            description:
              'Output quality. fast=quick generation, standard=balanced, hd=high detail, 4k=maximum quality. Higher quality = longer generation time. Default: standard',
          },
          negative_prompt: {
            type: 'string',
            description:
              'Things to avoid in the image (e.g., "blurry, low quality, text errors")',
          },
        },
        required: ['prompt'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edit_image',
      description:
        'Edit an existing image using natural language instructions. Can modify colors, add/remove elements, change style, fix issues, or transform the image. Uses gpt-image-1.5 edit endpoint with source image support.',
      parameters: {
        type: 'object',
        properties: {
          image_url: {
            type: 'string',
            description:
              'URL of the image to edit, or base64-encoded image data (prefix with "data:image/jpeg;base64," or "data:image/png;base64,")',
          },
          instruction: {
            type: 'string',
            description:
              'Natural language instruction for how to edit the image. Be specific about what to change. Examples: "Make the sky more blue and dramatic", "Add a tree on the left side", "Remove the person in the background", "Change the style to watercolor"',
          },
          preserve_style: {
            type: 'boolean',
            description:
              'Whether to maintain the original image style while making edits. Default: true',
          },
          mask_description: {
            type: 'string',
            description:
              'Optional: Describe the area to edit (e.g., "the sky", "the person\'s face"). If not provided, the AI will determine the edit region.',
          },
        },
        required: ['image_url', 'instruction'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analyze_image',
      description:
        'Analyze and describe an image in detail. Can identify objects, extract text (OCR), interpret diagrams/charts, describe scenes, and answer specific questions about the image.',
      parameters: {
        type: 'object',
        properties: {
          image_url: {
            type: 'string',
            description:
              'URL of the image to analyze, or base64-encoded image data',
          },
          analysis_type: {
            type: 'string',
            enum: [
              'general',
              'detailed',
              'text_extraction',
              'diagram_interpretation',
              'chart_data',
              'accessibility',
              'technical',
              'artistic',
            ],
            description:
              'Type of analysis to perform. general=overview, detailed=comprehensive, text_extraction=OCR, diagram_interpretation=explain diagrams, chart_data=extract data from charts, accessibility=describe for visually impaired, technical=technical details, artistic=style analysis. Default: general',
          },
          questions: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Specific questions to answer about the image. Example: ["What color is the car?", "How many people are in the image?"]',
          },
          extract_structured_data: {
            type: 'boolean',
            description:
              'If true, attempt to extract structured data (JSON) from charts, tables, or diagrams. Default: false',
          },
        },
        required: ['image_url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_diagram',
      description:
        'Generate a professional diagram from a description. Supports flowcharts, architecture diagrams, sequence diagrams, mind maps, ER diagrams, network diagrams, and more. Uses gpt-image-1.5 for high-quality text rendering.',
      parameters: {
        type: 'object',
        properties: {
          diagram_type: {
            type: 'string',
            enum: [
              'flowchart',
              'architecture',
              'sequence',
              'mindmap',
              'entity_relationship',
              'network',
              'organizational',
              'timeline',
              'state_machine',
              'class_diagram',
              'use_case',
              'data_flow',
            ],
            description: 'Type of diagram to create.',
          },
          description: {
            type: 'string',
            description:
              'Detailed description of what the diagram should show. Include nodes, connections, relationships, and any labels. Example: "A flowchart showing user login process: Start -> Enter credentials -> Validate -> If valid go to Dashboard, else show error and return to Enter credentials"',
          },
          style: {
            type: 'string',
            enum: ['minimal', 'professional', 'colorful', 'blueprint', 'sketch', 'corporate', 'dark'],
            description: 'Visual style of the diagram. Default: professional',
          },
          include_legend: {
            type: 'boolean',
            description: 'Whether to include a legend explaining symbols. Default: false',
          },
        },
        required: ['diagram_type', 'description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_chart',
      description:
        'Generate a data visualization chart from provided data. Supports bar, line, pie, scatter, area, donut, heatmap, and treemap charts. Automatically formats data and creates professional visualizations.',
      parameters: {
        type: 'object',
        properties: {
          chart_type: {
            type: 'string',
            enum: ['bar', 'line', 'pie', 'scatter', 'area', 'donut', 'heatmap', 'treemap', 'radar', 'bubble'],
            description: 'Type of chart to create.',
          },
          data: {
            type: 'object',
            description:
              'Chart data. Format depends on chart type. For bar/line: { labels: ["Jan", "Feb"], datasets: [{ name: "Sales", values: [100, 150] }] }. For pie: { labels: ["A", "B"], values: [30, 70] }.',
          },
          title: {
            type: 'string',
            description: 'Chart title displayed at the top.',
          },
          subtitle: {
            type: 'string',
            description: 'Optional subtitle or description below the title.',
          },
          style: {
            type: 'string',
            enum: ['minimal', 'corporate', 'colorful', 'dark', 'light', 'gradient'],
            description: 'Visual style of the chart. Default: corporate',
          },
          show_values: {
            type: 'boolean',
            description: 'Whether to display data values on the chart. Default: true',
          },
          x_axis_label: {
            type: 'string',
            description: 'Label for the X axis (for applicable chart types).',
          },
          y_axis_label: {
            type: 'string',
            description: 'Label for the Y axis (for applicable chart types).',
          },
        },
        required: ['chart_type', 'data'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compare_images',
      description:
        'Compare two or more images and describe their similarities and differences. Useful for before/after comparisons, version comparisons, or finding differences.',
      parameters: {
        type: 'object',
        properties: {
          image_urls: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of image URLs or base64 data to compare (2-5 images).',
          },
          comparison_type: {
            type: 'string',
            enum: ['general', 'visual_diff', 'style', 'content', 'quality'],
            description:
              'Type of comparison. general=overall comparison, visual_diff=pixel-level differences, style=artistic style comparison, content=subject matter comparison, quality=technical quality comparison. Default: general',
          },
          focus_areas: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Specific areas or aspects to focus the comparison on. Example: ["colors", "composition", "text"]',
          },
        },
        required: ['image_urls'],
      },
    },
  },
];

/**
 * Get image tools filtered by capability
 */
export function getImageToolsByCapability(
  capabilities: ('generate' | 'edit' | 'analyze' | 'diagram' | 'chart' | 'compare')[]
): OpenAITool[] {
  const capabilityMap: Record<string, string[]> = {
    generate: ['generate_image'],
    edit: ['edit_image'],
    analyze: ['analyze_image', 'compare_images'],
    diagram: ['create_diagram'],
    chart: ['create_chart'],
    compare: ['compare_images'],
  };

  const toolNames = capabilities.flatMap((cap) => capabilityMap[cap] || []);
  return imageTools.filter((tool) => toolNames.includes(tool.function.name));
}

/**
 * Check if a tool is an image tool
 */
export function isImageTool(toolName: string): boolean {
  return imageTools.some((tool) => tool.function.name === toolName);
}

export default imageTools;
