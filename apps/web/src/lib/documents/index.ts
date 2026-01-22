/**
 * Documents Module
 * File upload and knowledge base functionality
 */

// Types
export type {
  FileType,
  DocumentStatus,
  DocumentScope,
  ChunkType,
  Document,
  DocumentChunk,
  DocumentWithChunks,
  DocumentSearchResult,
  ConversationContext,
  UploadDocumentRequest,
  ParsedDocument,
  ParsedChunk,
} from './types';

// Parser
export {
  detectFileType,
  parseDocument,
  estimateTokens,
} from './parser';

// Processor
export {
  uploadDocument,
  processDocument,
  searchDocuments,
  getConversationContext,
  deleteDocument,
  getUserDocuments,
  getDocumentWithChunks,
} from './processor';
