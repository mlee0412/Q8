/**
 * Document Parser
 * Parses different file types into text chunks for embedding
 */

import type { FileType, ParsedDocument, ParsedChunk, ChunkType } from './types';
import { logger } from '@/lib/logger';

/**
 * Chunk size configuration
 */
const CHUNK_CONFIG = {
  maxChunkSize: 1000,      // Max characters per chunk
  chunkOverlap: 200,       // Overlap between chunks for context
  minChunkSize: 100,       // Minimum chunk size
  codeChunkSize: 500,      // Smaller chunks for code
};

/**
 * Detect file type from MIME type and extension
 */
export function detectFileType(mimeType: string, fileName: string): FileType {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  // Check by MIME type first
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
  if (mimeType === 'application/msword') return 'doc';
  if (mimeType === 'text/plain') return ext === 'md' ? 'md' : 'txt';
  if (mimeType === 'text/markdown') return 'md';
  if (mimeType === 'text/csv') return 'csv';
  if (mimeType === 'application/json') return 'json';
  if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'xlsx';
  if (mimeType === 'application/vnd.ms-excel') return 'xls';
  if (mimeType.startsWith('image/')) return 'image';

  // Check by extension for code files
  const codeExtensions = [
    'js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h',
    'cs', 'php', 'swift', 'kt', 'scala', 'sh', 'bash', 'zsh', 'sql', 'html',
    'css', 'scss', 'sass', 'less', 'vue', 'svelte', 'yaml', 'yml', 'toml',
    'xml', 'graphql', 'prisma', 'tf', 'dockerfile',
  ];
  if (codeExtensions.includes(ext)) return 'code';

  // Check extension as fallback
  const extMap: Record<string, FileType> = {
    pdf: 'pdf',
    docx: 'docx',
    doc: 'doc',
    txt: 'txt',
    md: 'md',
    csv: 'csv',
    json: 'json',
    xlsx: 'xlsx',
    xls: 'xls',
  };

  return extMap[ext] || 'other';
}

/**
 * Parse a document based on its file type
 */
export async function parseDocument(
  content: ArrayBuffer | string,
  fileType: FileType,
  fileName: string
): Promise<ParsedDocument> {
  switch (fileType) {
    case 'pdf':
      return parsePDF(content as ArrayBuffer);
    case 'docx':
      return parseDOCX(content as ArrayBuffer);
    case 'txt':
    case 'md':
      return parseText(content as string, fileType);
    case 'csv':
      return parseCSV(content as string);
    case 'json':
      return parseJSON(content as string);
    case 'code':
      return parseCode(content as string, fileName);
    case 'xlsx':
    case 'xls':
      return parseExcel(content as ArrayBuffer);
    default:
      // Try to parse as text
      if (typeof content === 'string') {
        return parseText(content, 'txt');
      }
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

/**
 * Parse PDF document
 */
async function parsePDF(content: ArrayBuffer): Promise<ParsedDocument> {
  try {
    // Dynamic import for PDF parsing
    const pdfParseModule = await import('pdf-parse');
    // Handle both ESM and CJS exports
    const pdfParse = (pdfParseModule as { default?: (buffer: Buffer) => Promise<{ text: string; numpages: number; info: Record<string, unknown> }> }).default
      ?? (pdfParseModule as unknown as (buffer: Buffer) => Promise<{ text: string; numpages: number; info: Record<string, unknown> }>);
    const buffer = Buffer.from(content);
    const data = await pdfParse(buffer);

    const chunks = chunkText(data.text, 'text');

    // Add page information if available
    const pageChunks: ParsedChunk[] = chunks.map((chunk, index) => ({
      ...chunk,
      sourcePage: Math.floor((index / chunks.length) * (data.numpages || 1)) + 1,
    }));

    return {
      content: data.text,
      metadata: {
        pages: data.numpages,
        info: data.info,
      },
      chunks: pageChunks,
    };
  } catch (error) {
    logger.error('PDF parsing failed', { error });
    throw new Error('Failed to parse PDF document');
  }
}

/**
 * Parse DOCX document
 */
async function parseDOCX(content: ArrayBuffer): Promise<ParsedDocument> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ arrayBuffer: content });

    const chunks = chunkText(result.value, 'text');

    return {
      content: result.value,
      metadata: {
        messages: result.messages,
      },
      chunks,
    };
  } catch (error) {
    logger.error('DOCX parsing failed', { error });
    throw new Error('Failed to parse DOCX document');
  }
}

/**
 * Parse plain text or markdown
 */
function parseText(content: string, type: 'txt' | 'md'): ParsedDocument {
  const chunks: ParsedChunk[] = [];

  if (type === 'md') {
    // Parse markdown with heading awareness
    const sections = content.split(/(?=^#{1,6}\s)/m);

    for (const section of sections) {
      if (section.trim()) {
        const headingMatch = section.match(/^(#{1,6})\s+(.+)/);
        if (headingMatch && headingMatch[2]) {
          // Add heading as separate chunk
          chunks.push({
            content: headingMatch[2].trim(),
            chunkType: 'heading',
          });
          // Chunk the rest
          const rest = section.slice(headingMatch[0].length).trim();
          if (rest) {
            chunks.push(...chunkText(rest, 'text'));
          }
        } else {
          chunks.push(...chunkText(section, 'text'));
        }
      }
    }
  } else {
    chunks.push(...chunkText(content, 'text'));
  }

  return {
    content,
    metadata: {
      lineCount: content.split('\n').length,
      charCount: content.length,
    },
    chunks,
  };
}

/**
 * Parse CSV file
 */
async function parseCSV(content: string): Promise<ParsedDocument> {
  try {
    const Papa = (await import('papaparse')).default;
    const result = Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
    });

    const chunks: ParsedChunk[] = [];

    // Add header as metadata chunk
    if (result.meta.fields) {
      chunks.push({
        content: `Columns: ${result.meta.fields.join(', ')}`,
        chunkType: 'metadata',
      });
    }

    // Chunk rows into groups
    const rowsPerChunk = 20;
    for (let i = 0; i < result.data.length; i += rowsPerChunk) {
      const rowChunk = result.data.slice(i, i + rowsPerChunk) as unknown[];
      const chunkContent = rowChunk
        .map((row: unknown) => JSON.stringify(row))
        .join('\n');

      chunks.push({
        content: chunkContent,
        chunkType: 'table',
        sourceLineStart: i + 2, // +2 for header and 1-based indexing
        sourceLineEnd: Math.min(i + rowsPerChunk, result.data.length) + 1,
      });
    }

    return {
      content,
      metadata: {
        columns: result.meta.fields,
        rowCount: result.data.length,
      },
      chunks,
    };
  } catch (error) {
    logger.error('CSV parsing failed', { error });
    throw new Error('Failed to parse CSV file');
  }
}

/**
 * Parse JSON file
 */
function parseJSON(content: string): ParsedDocument {
  try {
    const data = JSON.parse(content);
    const formatted = JSON.stringify(data, null, 2);

    // For large JSON, chunk by top-level keys
    const chunks: ParsedChunk[] = [];

    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      for (const [key, value] of Object.entries(data)) {
        const valueStr = JSON.stringify(value, null, 2);
        if (valueStr.length > CHUNK_CONFIG.maxChunkSize) {
          // Large value, chunk it
          const subChunks = chunkText(valueStr, 'text');
          subChunks.forEach((chunk, i) => {
            chunks.push({
              ...chunk,
              metadata: { key, part: i + 1 },
            });
          });
        } else {
          chunks.push({
            content: `"${key}": ${valueStr}`,
            chunkType: 'text',
            metadata: { key },
          });
        }
      }
    } else {
      // Array or primitive, just chunk the whole thing
      chunks.push(...chunkText(formatted, 'text'));
    }

    return {
      content: formatted,
      metadata: {
        type: Array.isArray(data) ? 'array' : typeof data,
        keys: typeof data === 'object' && data !== null ? Object.keys(data) : [],
      },
      chunks,
    };
  } catch (error) {
    logger.error('JSON parsing failed', { error });
    throw new Error('Failed to parse JSON file');
  }
}

/**
 * Parse code file
 */
function parseCode(content: string, fileName: string): ParsedDocument {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const lines = content.split('\n');

  const chunks: ParsedChunk[] = [];
  let currentChunk: string[] = [];
  let chunkStart = 1;

  // Detect function/class boundaries for smarter chunking
  const boundaryPatterns = [
    /^(export\s+)?(async\s+)?function\s+\w+/,          // JS/TS functions
    /^(export\s+)?(class|interface|type|enum)\s+\w+/, // JS/TS classes/types
    /^def\s+\w+/,                                      // Python functions
    /^class\s+\w+/,                                    // Python classes
    /^func\s+\w+/,                                     // Go functions
    /^(pub\s+)?fn\s+\w+/,                              // Rust functions
    /^(public|private|protected)?\s*(static\s+)?[\w<>]+\s+\w+\s*\(/,  // Java methods
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const isNewBlock = boundaryPatterns.some((p) => p.test(line.trim()));

    if (isNewBlock && currentChunk.length >= 5) {
      // Save current chunk and start new one
      chunks.push({
        content: currentChunk.join('\n'),
        chunkType: 'code',
        sourceLineStart: chunkStart,
        sourceLineEnd: i,
      });
      currentChunk = [line];
      chunkStart = i + 1;
    } else if (currentChunk.join('\n').length > CHUNK_CONFIG.codeChunkSize) {
      // Chunk is too big, split it
      chunks.push({
        content: currentChunk.join('\n'),
        chunkType: 'code',
        sourceLineStart: chunkStart,
        sourceLineEnd: i,
      });
      currentChunk = [line];
      chunkStart = i + 1;
    } else {
      currentChunk.push(line);
    }
  }

  // Don't forget the last chunk
  if (currentChunk.length > 0) {
    chunks.push({
      content: currentChunk.join('\n'),
      chunkType: 'code',
      sourceLineStart: chunkStart,
      sourceLineEnd: lines.length,
    });
  }

  return {
    content,
    metadata: {
      language: ext,
      lineCount: lines.length,
      fileName,
    },
    chunks,
  };
}

/**
 * Parse Excel file
 */
async function parseExcel(content: ArrayBuffer): Promise<ParsedDocument> {
  try {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(content, { type: 'array' });

    const chunks: ParsedChunk[] = [];
    const allText: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;
      const csv = XLSX.utils.sheet_to_csv(sheet);
      allText.push(`Sheet: ${sheetName}\n${csv}`);

      // Parse sheet as CSV
      const Papa = (await import('papaparse')).default;
      const result = Papa.parse(csv, {
        header: true,
        skipEmptyLines: true,
      });

      // Add sheet metadata
      chunks.push({
        content: `Sheet "${sheetName}" - Columns: ${result.meta.fields?.join(', ') || 'none'}`,
        chunkType: 'metadata',
        metadata: { sheetName },
      });

      // Chunk rows
      const rowsPerChunk = 20;
      for (let i = 0; i < result.data.length; i += rowsPerChunk) {
        const rowChunk = result.data.slice(i, i + rowsPerChunk) as unknown[];
        chunks.push({
          content: rowChunk.map((row: unknown) => JSON.stringify(row)).join('\n'),
          chunkType: 'table',
          sourceLineStart: i + 2,
          sourceLineEnd: Math.min(i + rowsPerChunk, result.data.length) + 1,
          metadata: { sheetName },
        });
      }
    }

    return {
      content: allText.join('\n\n'),
      metadata: {
        sheetCount: workbook.SheetNames.length,
        sheetNames: workbook.SheetNames,
      },
      chunks,
    };
  } catch (error) {
    logger.error('Excel parsing failed', { error });
    throw new Error('Failed to parse Excel file');
  }
}

/**
 * Chunk text with overlap
 */
function chunkText(text: string, type: ChunkType): ParsedChunk[] {
  const chunks: ParsedChunk[] = [];
  const maxSize = CHUNK_CONFIG.maxChunkSize;
  const overlap = CHUNK_CONFIG.chunkOverlap;

  // Split by paragraphs first
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';

  for (const para of paragraphs) {
    const trimmedPara = para.trim();
    if (!trimmedPara) continue;

    if (currentChunk.length + trimmedPara.length > maxSize) {
      if (currentChunk.length >= CHUNK_CONFIG.minChunkSize) {
        chunks.push({
          content: currentChunk.trim(),
          chunkType: type,
        });
        // Keep overlap from the end
        const words = currentChunk.split(/\s+/);
        const overlapWords = words.slice(-Math.ceil(overlap / 5));
        currentChunk = overlapWords.join(' ') + '\n\n' + trimmedPara;
      } else {
        currentChunk += '\n\n' + trimmedPara;
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + trimmedPara;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length >= CHUNK_CONFIG.minChunkSize) {
    chunks.push({
      content: currentChunk.trim(),
      chunkType: type,
    });
  } else if (currentChunk.trim() && chunks.length > 0) {
    // Append to last chunk if too small
    const lastChunk = chunks[chunks.length - 1];
    if (lastChunk) {
      lastChunk.content += '\n\n' + currentChunk.trim();
    }
  } else if (currentChunk.trim()) {
    // Only chunk, even if small
    chunks.push({
      content: currentChunk.trim(),
      chunkType: type,
    });
  }

  return chunks;
}

/**
 * Estimate token count for a string
 * Rough approximation: ~4 chars per token for English
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
