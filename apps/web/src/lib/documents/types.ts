/**
 * Document Types
 * Type definitions for the document/knowledge base system
 */

export type FileType =
  | 'pdf'
  | 'docx'
  | 'doc'
  | 'txt'
  | 'md'
  | 'csv'
  | 'json'
  | 'xlsx'
  | 'xls'
  | 'code'
  | 'image'
  | 'other';

export type DocumentStatus =
  | 'pending'
  | 'processing'
  | 'ready'
  | 'error'
  | 'archived';

export type DocumentScope = 'conversation' | 'global';

export type ChunkType = 'text' | 'code' | 'table' | 'heading' | 'metadata';

/**
 * Document metadata stored in the database
 */
export interface Document {
  id: string;
  userId: string;
  name: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  storageBucket: string;
  fileType: FileType;
  status: DocumentStatus;
  processingError?: string;
  scope: DocumentScope;
  threadId?: string;
  metadata: Record<string, unknown>;
  chunkCount: number;
  tokenCount: number;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
}

/**
 * Document chunk with embedding
 */
export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  chunkType: ChunkType;
  sourcePage?: number;
  sourceLineStart?: number;
  sourceLineEnd?: number;
  embedding?: number[];
  tokenCount?: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/**
 * Upload request
 */
export interface UploadDocumentRequest {
  file: File;
  scope: DocumentScope;
  threadId?: string;
  name?: string;
}

/**
 * Document with chunks for display
 */
export interface DocumentWithChunks extends Document {
  chunks: DocumentChunk[];
}

/**
 * Search result
 */
export interface DocumentSearchResult {
  chunkId: string;
  documentId: string;
  documentName: string;
  fileType: FileType;
  content: string;
  chunkType: ChunkType;
  sourcePage?: number;
  similarity: number;
  metadata: Record<string, unknown>;
}

/**
 * Conversation context from documents
 */
export interface ConversationContext {
  chunkId: string;
  documentName: string;
  content: string;
  similarity: number;
  cumulativeTokens: number;
}

/**
 * File type detection result
 */
export interface FileTypeInfo {
  fileType: FileType;
  mimeType: string;
  extension: string;
}

/**
 * Parsing result from a document
 */
export interface ParsedDocument {
  content: string;
  metadata: Record<string, unknown>;
  chunks: ParsedChunk[];
}

/**
 * A chunk from parsing
 */
export interface ParsedChunk {
  content: string;
  chunkType: ChunkType;
  sourcePage?: number;
  sourceLineStart?: number;
  sourceLineEnd?: number;
  metadata?: Record<string, unknown>;
}
