/**
 * Image Tool Executor
 * Executes image generation and analysis tools
 *
 * Uses OpenAI's Image Generation API:
 * - gpt-image-1.5 (Best quality, 4x faster than DALL-E 3)
 * - gpt-image-1 (Standard)
 * - gpt-image-1-mini (Fast, lower quality)
 */

import { logger } from '@/lib/logger';
import type { ToolResult } from '../types';

/**
 * Image generation result data
 */
export interface ImageGenerationResult {
  imageData: string;
  mimeType: string;
  model: string;
  prompt: string;
  style?: string;
  aspectRatio?: string;
  quality?: string;
}

/**
 * Image analysis result data
 */
export interface ImageAnalysisResult {
  analysis: string;
  analysisType: string;
  structuredData?: Record<string, unknown>;
  extractedText?: string;
}

/**
 * Diagram/Chart generation result
 */
export interface DiagramResult {
  imageData: string;
  mimeType: string;
  diagramType: string;
  description: string;
}

/**
 * Get the appropriate OpenAI image model based on quality setting
 */
function getModelForQuality(quality: string): string {
  switch (quality) {
    case '4k':
    case 'hd':
    case 'high':
      return 'gpt-image-1.5'; // Best quality
    case 'fast':
    case 'low':
      return 'gpt-image-1-mini'; // Fastest
    default:
      return 'gpt-image-1.5'; // Default to best
  }
}

/**
 * Get image size based on aspect ratio
 */
function getSizeFromAspectRatio(aspectRatio?: string): '1024x1024' | '1536x1024' | '1024x1536' | 'auto' {
  switch (aspectRatio) {
    case '16:9':
    case 'landscape':
      return '1536x1024';
    case '9:16':
    case 'portrait':
      return '1024x1536';
    case '1:1':
    case 'square':
    default:
      return '1024x1024';
  }
}

/**
 * Build image generation prompt with style and parameters
 */
function buildImagePrompt(
  prompt: string,
  style?: string,
  aspectRatio?: string,
  negativePrompt?: string
): string {
  let fullPrompt = prompt;

  if (style && style !== 'photo') {
    const styleDescriptions: Record<string, string> = {
      illustration: 'digital illustration style',
      diagram: 'clean technical diagram',
      chart: 'professional data visualization chart',
      infographic: 'modern infographic design',
      artistic: 'artistic creative style',
      technical: 'technical drawing with precise details',
      sketch: 'hand-drawn sketch style',
      watercolor: 'watercolor painting style',
      '3d_render': '3D rendered image with realistic lighting',
    };
    fullPrompt = `${styleDescriptions[style] || style}: ${fullPrompt}`;
  }

  if (aspectRatio && aspectRatio !== '1:1') {
    fullPrompt += `. Aspect ratio: ${aspectRatio}`;
  }

  if (negativePrompt) {
    fullPrompt += `. Avoid: ${negativePrompt}`;
  }

  return fullPrompt;
}

/**
 * Execute an image tool
 */
export async function executeImageTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    switch (toolName) {
      case 'generate_image': {
        const prompt = args.prompt as string;
        const style = args.style as string | undefined;
        const aspectRatio = args.aspect_ratio as string | undefined;
        const quality = (args.quality as string) || 'hd';
        const negativePrompt = args.negative_prompt as string | undefined;

        const model = getModelForQuality(quality);
        const size = getSizeFromAspectRatio(aspectRatio);
        const fullPrompt = buildImagePrompt(prompt, style, aspectRatio, negativePrompt);

        logger.info('[ImageExecutor] Generating image with OpenAI', { model, size, prompt: fullPrompt.slice(0, 100) });

        const { OpenAI } = await import('openai');
        const client = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });

        // Use OpenAI's Images API for generation
        const response = await client.images.generate({
          model,
          prompt: fullPrompt,
          n: 1,
          size,
          response_format: 'b64_json', // Get base64 data directly
        });

        const imageData = response.data?.[0];

        if (imageData?.b64_json) {
          const result: ImageGenerationResult = {
            imageData: imageData.b64_json,
            mimeType: 'image/png',
            model,
            prompt,
            style,
            aspectRatio,
            quality,
          };

          logger.info('[ImageExecutor] Image generated successfully', { model, size });

          return {
            success: true,
            message: 'Image generated successfully',
            data: result,
            meta: {
              durationMs: Date.now() - startTime,
              source: 'openai-image',
            },
          };
        }

        // Fallback if URL is returned instead of base64
        if (imageData?.url) {
          return {
            success: true,
            message: 'Image generated successfully',
            data: {
              imageUrl: imageData.url,
              model,
              prompt,
              style,
              aspectRatio,
              quality,
            },
            meta: {
              durationMs: Date.now() - startTime,
              source: 'openai-image',
            },
          };
        }

        return {
          success: false,
          message: 'Image generation failed - no image data in response',
          data: null,
          meta: {
            durationMs: Date.now() - startTime,
            source: 'openai-image',
          },
        };
      }

      case 'edit_image': {
        const imageUrl = args.image_url as string;
        const instruction = args.instruction as string;
        const preserveStyle = args.preserve_style !== false;
        const maskDescription = args.mask_description as string | undefined;

        const model = 'gpt-image-1.5'; // Best model for editing

        let editPrompt = instruction;
        if (preserveStyle) {
          editPrompt = `Edit this image while preserving its original style: ${instruction}`;
        }
        if (maskDescription) {
          editPrompt += `. Focus on: ${maskDescription}`;
        }

        logger.info('[ImageExecutor] Editing image with OpenAI', { model, instruction: editPrompt.slice(0, 100) });

        const { OpenAI } = await import('openai');
        const client = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });

        // Use GPT-4o to analyze the image and generate an enhanced edit prompt
        const analysisResponse = await client.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              content: [
                { type: 'text', text: `Describe this image in detail, then explain how to apply this edit: "${editPrompt}". Create a comprehensive prompt for image generation that would recreate this image with the requested changes.` },
                { type: 'image_url', image_url: { url: imageUrl } },
              ] as any,
            },
          ],
          max_tokens: 1000,
        });

        const enhancedPrompt = analysisResponse.choices[0]?.message?.content ?? editPrompt;

        // Generate the edited image using gpt-image-1.5
        const response = await client.images.generate({
          model,
          prompt: enhancedPrompt,
          n: 1,
          size: '1024x1024',
          response_format: 'b64_json',
        });

        const imageData = response.data?.[0];

        if (imageData?.b64_json) {
          return {
            success: true,
            message: 'Image edited successfully',
            data: {
              imageData: imageData.b64_json,
              mimeType: 'image/png',
              model,
              instruction,
            },
            meta: {
              durationMs: Date.now() - startTime,
              source: 'openai-image',
            },
          };
        }

        return {
          success: false,
          message: 'Image edit failed - no image data in response',
          data: null,
          meta: {
            durationMs: Date.now() - startTime,
            source: 'openai-image',
          },
        };
      }

      case 'analyze_image': {
        const imageUrl = args.image_url as string;
        const analysisType = (args.analysis_type as string) || 'general';
        const questions = args.questions as string[] | undefined;
        const extractStructured = args.extract_structured_data as boolean;

        const analysisPrompts: Record<string, string> = {
          general: 'Describe this image in detail, including the main subjects, setting, colors, and mood.',
          detailed: 'Provide an extremely detailed analysis of this image including all visible elements, colors, composition, lighting, textures, and context. Leave nothing out.',
          text_extraction: 'Extract and transcribe ALL text visible in this image. Format it clearly and preserve the layout where possible.',
          diagram_interpretation: 'Interpret this diagram. Explain what it represents, identify all nodes/elements, describe the relationships and connections, and explain the overall flow or structure.',
          chart_data: 'Analyze this chart. Identify the chart type, extract all data points and values, identify trends, and summarize key insights. If possible, provide the data in a structured format.',
          accessibility: 'Describe this image for someone who cannot see it. Include all relevant visual details that would help them understand the content, context, and meaning of the image.',
          technical: 'Analyze the technical aspects of this image: resolution quality, composition techniques, color palette, lighting setup, and any technical details visible.',
          artistic: 'Analyze the artistic style of this image: art movement/style influences, techniques used, color theory application, composition principles, and emotional impact.',
        };

        let prompt: string = analysisPrompts[analysisType] ?? analysisPrompts.general ?? 'Describe this image in detail.';

        if (questions && questions.length > 0) {
          prompt += `\n\nAlso answer these specific questions:\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`;
        }

        if (extractStructured) {
          prompt += '\n\nIf there is structured data (tables, charts, lists), extract it in JSON format.';
        }

        logger.info('[ImageExecutor] Analyzing image with GPT-4o', { analysisType });

        const { OpenAI } = await import('openai');
        const client = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });

        const response = await client.chat.completions.create({
          model: 'gpt-4o', // Best vision model for analysis
          messages: [
            {
              role: 'user',
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: imageUrl } },
              ] as any,
            },
          ],
          max_tokens: 2000,
        });

        const analysis = response.choices[0]?.message?.content ?? '';

        const result: ImageAnalysisResult = {
          analysis,
          analysisType,
        };

        // Try to extract structured data if requested
        if (extractStructured) {
          const jsonMatch = analysis.match(/```json\n?([\s\S]*?)\n?```/);
          if (jsonMatch && jsonMatch[1]) {
            try {
              result.structuredData = JSON.parse(jsonMatch[1]);
            } catch {
              // JSON parsing failed, leave as undefined
            }
          }
        }

        // Extract text if OCR was requested
        if (analysisType === 'text_extraction') {
          result.extractedText = analysis;
        }

        return {
          success: true,
          message: 'Image analyzed successfully',
          data: result,
          meta: {
            durationMs: Date.now() - startTime,
            source: 'gpt-4o-vision',
          },
        };
      }

      case 'create_diagram': {
        const diagramType = args.diagram_type as string;
        const description = args.description as string;
        const style = (args.style as string) || 'professional';
        const includeLegend = args.include_legend as boolean;

        const diagramPrompts: Record<string, string> = {
          flowchart: 'Create a flowchart diagram',
          architecture: 'Create a system architecture diagram',
          sequence: 'Create a sequence diagram showing interactions',
          mindmap: 'Create a mind map',
          entity_relationship: 'Create an entity-relationship (ER) diagram',
          network: 'Create a network topology diagram',
          organizational: 'Create an organizational chart',
          timeline: 'Create a timeline diagram',
          state_machine: 'Create a state machine diagram',
          class_diagram: 'Create a UML class diagram',
          use_case: 'Create a use case diagram',
          data_flow: 'Create a data flow diagram',
        };

        const basePrompt = diagramPrompts[diagramType] || 'Create a diagram';
        let fullPrompt = `${basePrompt} with ${style} style: ${description}`;
        
        if (includeLegend) {
          fullPrompt += '. Include a legend explaining the symbols and colors used.';
        }

        fullPrompt += ' Make sure all text is clearly legible and the diagram is well-organized.';

        logger.info('[ImageExecutor] Creating diagram with OpenAI', { diagramType, style });

        const model = 'gpt-image-1.5'; // Best for text rendering in diagrams

        const { OpenAI } = await import('openai');
        const client = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });

        const response = await client.images.generate({
          model,
          prompt: fullPrompt,
          n: 1,
          size: '1024x1024',
          response_format: 'b64_json',
        });

        const imageData = response.data?.[0];

        if (imageData?.b64_json) {
          return {
            success: true,
            message: `${diagramType} diagram created`,
            data: {
              imageData: imageData.b64_json,
              mimeType: 'image/png',
              diagramType,
              description,
              style,
            },
            meta: {
              durationMs: Date.now() - startTime,
              source: 'openai-image',
            },
          };
        }

        return {
          success: false,
          message: 'Diagram creation failed - no image data in response',
          data: null,
          meta: {
            durationMs: Date.now() - startTime,
            source: 'openai-image',
          },
        };
      }

      case 'create_chart': {
        const chartType = args.chart_type as string;
        const data = args.data as Record<string, unknown>;
        const title = args.title as string | undefined;
        const subtitle = args.subtitle as string | undefined;
        const style = (args.style as string) || 'corporate';
        const showValues = args.show_values !== false;
        const xAxisLabel = args.x_axis_label as string | undefined;
        const yAxisLabel = args.y_axis_label as string | undefined;

        let chartPrompt = `Create a ${chartType} chart with ${style} style.`;
        
        if (title) chartPrompt += ` Title: "${title}".`;
        if (subtitle) chartPrompt += ` Subtitle: "${subtitle}".`;
        
        chartPrompt += ` Data: ${JSON.stringify(data)}.`;
        
        if (showValues) chartPrompt += ' Display data values on the chart.';
        if (xAxisLabel) chartPrompt += ` X-axis label: "${xAxisLabel}".`;
        if (yAxisLabel) chartPrompt += ` Y-axis label: "${yAxisLabel}".`;
        
        chartPrompt += ' Make the chart clear, professional, and easy to read.';

        logger.info('[ImageExecutor] Creating chart with OpenAI', { chartType, style });

        const model = 'gpt-image-1.5'; // Best for text and data visualization

        const { OpenAI } = await import('openai');
        const client = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });

        const response = await client.images.generate({
          model,
          prompt: chartPrompt,
          n: 1,
          size: '1024x1024',
          response_format: 'b64_json',
        });

        const imageData = response.data?.[0];

        if (imageData?.b64_json) {
          return {
            success: true,
            message: `${chartType} chart created`,
            data: {
              imageData: imageData.b64_json,
              mimeType: 'image/png',
              chartType,
              title,
              data,
            },
            meta: {
              durationMs: Date.now() - startTime,
              source: 'openai-image',
            },
          };
        }

        return {
          success: false,
          message: 'Chart creation failed - no image data in response',
          data: null,
          meta: {
            durationMs: Date.now() - startTime,
            source: 'openai-image',
          },
        };
      }

      case 'compare_images': {
        const imageUrls = args.image_urls as string[];
        const comparisonType = (args.comparison_type as string) || 'general';
        const focusAreas = args.focus_areas as string[] | undefined;

        if (!imageUrls || imageUrls.length < 2) {
          return {
            success: false,
            message: 'At least 2 images are required for comparison',
          };
        }

        if (imageUrls.length > 5) {
          return {
            success: false,
            message: 'Maximum 5 images can be compared at once',
          };
        }

        const comparisonPrompts: Record<string, string> = {
          general: 'Compare these images and describe their similarities and differences.',
          visual_diff: 'Identify all visual differences between these images, including subtle changes in color, position, and content.',
          style: 'Compare the artistic styles of these images, including techniques, color palettes, and aesthetic choices.',
          content: 'Compare the subject matter and content of these images. What do they have in common? What is different?',
          quality: 'Compare the technical quality of these images: resolution, sharpness, lighting, composition, and overall quality.',
        };

        let prompt: string = comparisonPrompts[comparisonType] ?? comparisonPrompts.general ?? 'Compare these images.';

        if (focusAreas && focusAreas.length > 0) {
          prompt += ` Focus particularly on: ${focusAreas.join(', ')}.`;
        }

        logger.info('[ImageExecutor] Comparing images with GPT-4o', { count: imageUrls.length, comparisonType });

        const { OpenAI } = await import('openai');
        const client = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });

        // Build content array with all images
        const content = [
          { type: 'text', text: prompt },
          ...imageUrls.map((url) => ({
            type: 'image_url',
            image_url: { url },
          })),
        ];

        const response = await client.chat.completions.create({
          model: 'gpt-4o', // Best multi-image vision model
          messages: [
            {
              role: 'user',
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              content: content as any,
            },
          ],
          max_tokens: 2000,
        });

        const comparison = response.choices[0]?.message?.content ?? '';

        return {
          success: true,
          message: 'Images compared successfully',
          data: {
            comparison,
            comparisonType,
            imageCount: imageUrls.length,
          },
          meta: {
            durationMs: Date.now() - startTime,
            source: 'gpt-4o-vision',
          },
        };
      }

      default:
        return {
          success: false,
          message: `Unknown image tool: ${toolName}`,
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[ImageExecutor] Tool execution failed', { toolName, error: errorMessage });

    // Check for specific error types
    if (errorMessage.includes('API key') || errorMessage.includes('Incorrect API key')) {
      return {
        success: false,
        message: 'OpenAI API key not configured or invalid. Please check OPENAI_API_KEY environment variable.',
        error: { code: 'AUTH_ERROR', details: errorMessage },
      };
    }

    if (errorMessage.includes('quota') || errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return {
        success: false,
        message: 'API rate limit exceeded. Please try again later.',
        error: { code: 'RATE_LIMIT', details: errorMessage },
      };
    }

    return {
      success: false,
      message: `Image tool failed: ${errorMessage}`,
      error: { code: 'EXECUTION_ERROR', details: errorMessage },
      meta: {
        durationMs: Date.now() - startTime,
        source: 'openai-image',
      },
    };
  }
}

export default executeImageTool;
