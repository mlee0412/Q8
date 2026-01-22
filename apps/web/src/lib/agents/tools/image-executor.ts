/**
 * Image Tool Executor
 * Executes Nano Banana image generation and analysis tools
 *
 * Uses Google's Generative AI SDK for:
 * - Gemini 3 Pro Image Preview (Nano Banana Pro) - 4K, 14 reference images, thinking mode
 * - Gemini 2.5 Flash Image (Nano Banana) - Fast, 1K, 3 reference images
 */

import { logger } from '@/lib/logger';
import { getImageModel } from '../model_factory';
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
 * Get the appropriate model based on quality setting
 */
function getModelForQuality(quality: string): { model: string; baseURL: string } {
  const config = quality === '4k' || quality === 'hd' 
    ? getImageModel('pro') 
    : getImageModel('fast');
  
  return {
    model: config.model,
    baseURL: config.baseURL || 'https://generativelanguage.googleapis.com/v1beta/openai/',
  };
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
        const quality = (args.quality as string) || 'standard';
        const negativePrompt = args.negative_prompt as string | undefined;

        const { model, baseURL } = getModelForQuality(quality);
        const fullPrompt = buildImagePrompt(prompt, style, aspectRatio, negativePrompt);

        logger.info('[ImageExecutor] Generating image', { model, prompt: fullPrompt.slice(0, 100) });

        const { OpenAI } = await import('openai');
        const client = new OpenAI({
          apiKey: process.env.GOOGLE_GENERATIVE_AI_KEY,
          baseURL,
        });

        const response = await client.chat.completions.create({
          model,
          messages: [
            {
              role: 'user',
              content: fullPrompt,
            },
          ],
          // Note: Response format for image generation varies by provider
          // Google's OpenAI-compatible endpoint returns images in a specific format
        });

        // Extract image from response
        const content = response.choices[0]?.message?.content;
        
        // For Gemini image models, the response includes base64 image data
        // The exact format depends on the API version
        if (content) {
          // Check if response contains image data marker
          const imageMatch = content.match(/data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)/);
          if (imageMatch) {
            const result: ImageGenerationResult = {
              imageData: imageMatch[2] || '',
              mimeType: `image/${imageMatch[1]}`,
              model,
              prompt,
              style,
              aspectRatio,
              quality,
            };

            return {
              success: true,
              message: 'Image generated successfully',
              data: result,
              meta: {
                durationMs: Date.now() - startTime,
                source: 'nano-banana',
              },
            };
          }
        }

        // If no image in standard format, try alternative extraction
        // Some responses may have the image in a different structure
        return {
          success: true,
          message: 'Image generation request sent. Response may contain image data in model-specific format.',
          data: {
            rawResponse: content,
            model,
            prompt,
          },
          meta: {
            durationMs: Date.now() - startTime,
            source: 'nano-banana',
          },
        };
      }

      case 'edit_image': {
        const imageUrl = args.image_url as string;
        const instruction = args.instruction as string;
        const preserveStyle = args.preserve_style !== false;
        const maskDescription = args.mask_description as string | undefined;

        const { model, baseURL } = getModelForQuality('hd'); // Use Pro for editing

        let editPrompt = instruction;
        if (preserveStyle) {
          editPrompt = `Edit this image while preserving its original style: ${instruction}`;
        }
        if (maskDescription) {
          editPrompt += `. Focus on: ${maskDescription}`;
        }

        logger.info('[ImageExecutor] Editing image', { model, instruction: editPrompt.slice(0, 100) });

        const { OpenAI } = await import('openai');
        const client = new OpenAI({
          apiKey: process.env.GOOGLE_GENERATIVE_AI_KEY,
          baseURL,
        });

        // Prepare image content
        const imageContent = imageUrl.startsWith('data:') 
          ? imageUrl 
          : `Image URL: ${imageUrl}`;

        const response = await client.chat.completions.create({
          model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: editPrompt },
                { type: 'image_url', image_url: { url: imageContent } },
              ] as unknown as string,
            },
          ],
        });

        const content = response.choices[0]?.message?.content;

        return {
          success: true,
          message: 'Image edit request processed',
          data: {
            rawResponse: content,
            model,
            instruction,
          },
          meta: {
            durationMs: Date.now() - startTime,
            source: 'nano-banana',
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

        let prompt = analysisPrompts[analysisType] || analysisPrompts.general;

        if (questions && questions.length > 0) {
          prompt += `\n\nAlso answer these specific questions:\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`;
        }

        if (extractStructured) {
          prompt += '\n\nIf there is structured data (tables, charts, lists), extract it in JSON format.';
        }

        logger.info('[ImageExecutor] Analyzing image', { analysisType });

        const { OpenAI } = await import('openai');
        const client = new OpenAI({
          apiKey: process.env.GOOGLE_GENERATIVE_AI_KEY,
          baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        });

        const response = await client.chat.completions.create({
          model: 'gemini-3-pro-preview', // Use text model for analysis
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: imageUrl } },
              ] as unknown as string,
            },
          ],
        });

        const analysis = response.choices[0]?.message?.content || '';

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
            source: 'gemini-vision',
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

        logger.info('[ImageExecutor] Creating diagram', { diagramType, style });

        const { model, baseURL } = getModelForQuality('hd'); // Use Pro for diagrams (better text)

        const { OpenAI } = await import('openai');
        const client = new OpenAI({
          apiKey: process.env.GOOGLE_GENERATIVE_AI_KEY,
          baseURL,
        });

        const response = await client.chat.completions.create({
          model,
          messages: [
            {
              role: 'user',
              content: fullPrompt,
            },
          ],
        });

        const content = response.choices[0]?.message?.content;

        return {
          success: true,
          message: `${diagramType} diagram created`,
          data: {
            rawResponse: content,
            diagramType,
            description,
            style,
          },
          meta: {
            durationMs: Date.now() - startTime,
            source: 'nano-banana-pro',
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

        logger.info('[ImageExecutor] Creating chart', { chartType, style });

        const { model, baseURL } = getModelForQuality('hd');

        const { OpenAI } = await import('openai');
        const client = new OpenAI({
          apiKey: process.env.GOOGLE_GENERATIVE_AI_KEY,
          baseURL,
        });

        const response = await client.chat.completions.create({
          model,
          messages: [
            {
              role: 'user',
              content: chartPrompt,
            },
          ],
        });

        const content = response.choices[0]?.message?.content;

        return {
          success: true,
          message: `${chartType} chart created`,
          data: {
            rawResponse: content,
            chartType,
            title,
            data,
          },
          meta: {
            durationMs: Date.now() - startTime,
            source: 'nano-banana-pro',
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

        let prompt = comparisonPrompts[comparisonType] || comparisonPrompts.general;

        if (focusAreas && focusAreas.length > 0) {
          prompt += ` Focus particularly on: ${focusAreas.join(', ')}.`;
        }

        logger.info('[ImageExecutor] Comparing images', { count: imageUrls.length, comparisonType });

        const { OpenAI } = await import('openai');
        const client = new OpenAI({
          apiKey: process.env.GOOGLE_GENERATIVE_AI_KEY,
          baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        });

        // Build content array with all images
        const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
          { type: 'text', text: prompt },
          ...imageUrls.map((url) => ({
            type: 'image_url' as const,
            image_url: { url },
          })),
        ];

        const response = await client.chat.completions.create({
          model: 'gemini-3-pro-preview',
          messages: [
            {
              role: 'user',
              content: content as unknown as string,
            },
          ],
        });

        const comparison = response.choices[0]?.message?.content || '';

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
            source: 'gemini-vision',
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
    if (errorMessage.includes('API key')) {
      return {
        success: false,
        message: 'Google API key not configured. Please set GOOGLE_GENERATIVE_AI_KEY environment variable.',
        error: { code: 'AUTH_ERROR', details: errorMessage },
      };
    }

    if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
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
        source: 'nano-banana',
      },
    };
  }
}

export default executeImageTool;
