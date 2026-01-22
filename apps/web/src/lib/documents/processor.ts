/**
 * Document Processor
 * Handles the full pipeline: upload → parse → chunk → embed → store
 */

import { supabaseAdmin } from '@/lib/supabase/server';
import { generateEmbeddingsBatch } from '@/lib/embeddings';
import { parseDocument, detectFileType, estimateTokens } from './parser';
import type {
  Document,
  DocumentChunk,
  FileType,
  DocumentScope,
  ParsedChunk,
} from './types';
import { logger } from '@/lib/logger';

const STORAGE_BUCKET = 'documents';

/**
 * Upload and process a document
 */
export async function uploadDocument(
  file: File,
  userId: string,
  options: {
    scope: DocumentScope;
    threadId?: string;
    name?: string;
  }
): Promise<Document> {
  const { scope, threadId, name } = options;

  // Detect file type
  const fileType = detectFileType(file.type, file.name);
  if (fileType === 'other' || fileType === 'image') {
    throw new Error(`Unsupported file type: ${file.type}`);
  }

  // Generate unique storage path
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `${userId}/${timestamp}_${safeName}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    logger.error('Storage upload failed', { error: uploadError });
    throw new Error(`Failed to upload file: ${uploadError.message}`);
  }

  // Create document record
  const { data: document, error: dbError } = await supabaseAdmin
    .from('documents')
    .insert({
      user_id: userId,
      name: name || file.name,
      original_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      storage_path: storagePath,
      storage_bucket: STORAGE_BUCKET,
      file_type: fileType,
      status: 'pending',
      scope,
      thread_id: threadId,
    })
    .select()
    .single();

  if (dbError || !document) {
    // Clean up storage on failure
    await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([storagePath]);
    throw new Error(`Failed to create document record: ${dbError?.message}`);
  }

  // Start processing in background
  processDocumentAsync(document.id).catch((error) => {
    logger.error('Background processing failed', { documentId: document.id, error });
  });

  return transformDocument(document);
}

/**
 * Process a document (parse, chunk, embed)
 */
export async function processDocument(documentId: string): Promise<void> {
  // Update status to processing
  await supabaseAdmin
    .from('documents')
    .update({ status: 'processing' })
    .eq('id', documentId);

  try {
    // Get document record
    const { data: doc, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (fetchError || !doc) {
      throw new Error(`Document not found: ${documentId}`);
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(doc.storage_bucket)
      .download(doc.storage_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message}`);
    }

    // Parse the document
    let content: ArrayBuffer | string;
    if (['pdf', 'docx', 'doc', 'xlsx', 'xls'].includes(doc.file_type)) {
      content = await fileData.arrayBuffer();
    } else {
      content = await fileData.text();
    }

    const parsed = await parseDocument(content, doc.file_type as FileType, doc.original_name);

    // Generate embeddings for all chunks
    const chunkTexts = parsed.chunks.map((c) => c.content);
    const embeddings = await generateEmbeddingsBatch(chunkTexts, { useCache: false });

    // Prepare chunk records
    const chunkRecords = parsed.chunks.map((chunk, index) => ({
      document_id: documentId,
      content: chunk.content,
      chunk_index: index,
      chunk_type: chunk.chunkType,
      source_page: chunk.sourcePage,
      source_line_start: chunk.sourceLineStart,
      source_line_end: chunk.sourceLineEnd,
      embedding: embeddings[index] ? `[${embeddings[index]!.join(',')}]` : null,
      token_count: estimateTokens(chunk.content),
      metadata: chunk.metadata || {},
    }));

    // Insert chunks in batches
    const batchSize = 50;
    for (let i = 0; i < chunkRecords.length; i += batchSize) {
      const batch = chunkRecords.slice(i, i + batchSize);
      const { error: insertError } = await supabaseAdmin
        .from('document_chunks')
        .insert(batch);

      if (insertError) {
        throw new Error(`Failed to insert chunks: ${insertError.message}`);
      }
    }

    // Calculate total tokens
    const totalTokens = chunkRecords.reduce((sum, c) => sum + (c.token_count || 0), 0);

    // Update document with success status
    await supabaseAdmin
      .from('documents')
      .update({
        status: 'ready',
        metadata: parsed.metadata,
        chunk_count: chunkRecords.length,
        token_count: totalTokens,
        processed_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    logger.info('Document processed successfully', {
      documentId,
      chunks: chunkRecords.length,
      tokens: totalTokens,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Document processing failed', { documentId, error: errorMessage });

    // Update with error status
    await supabaseAdmin
      .from('documents')
      .update({
        status: 'error',
        processing_error: errorMessage,
      })
      .eq('id', documentId);

    throw error;
  }
}

/**
 * Process document asynchronously
 */
async function processDocumentAsync(documentId: string): Promise<void> {
  // Small delay to allow the initial response to complete
  await new Promise((resolve) => setTimeout(resolve, 100));
  await processDocument(documentId);
}

/**
 * Search documents for relevant chunks
 */
export async function searchDocuments(
  userId: string,
  query: string,
  options: {
    limit?: number;
    minSimilarity?: number;
    scope?: DocumentScope;
    threadId?: string;
    fileTypes?: FileType[];
  } = {}
): Promise<DocumentChunk[]> {
  const {
    limit = 10,
    minSimilarity = 0.7,
    scope,
    threadId,
    fileTypes,
  } = options;

  // Generate embedding for query
  const { generateEmbedding } = await import('@/lib/embeddings');
  const embedding = await generateEmbedding(query);

  if (!embedding) {
    logger.warn('Failed to generate embedding for search query');
    return [];
  }

  // Call search function
  const { data, error } = await supabaseAdmin.rpc('search_documents', {
    p_user_id: userId,
    p_query_embedding: `[${embedding.join(',')}]`,
    p_limit: limit,
    p_min_similarity: minSimilarity,
    p_scope: scope || null,
    p_thread_id: threadId || null,
    p_file_types: fileTypes || null,
  });

  if (error) {
    logger.error('Document search failed', { error });
    return [];
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.chunk_id as string,
    documentId: row.document_id as string,
    content: row.content as string,
    chunkIndex: 0,
    chunkType: row.chunk_type as DocumentChunk['chunkType'],
    sourcePage: row.source_page as number | undefined,
    metadata: {
      documentName: row.document_name,
      fileType: row.file_type,
      similarity: row.similarity,
      ...(row.metadata as Record<string, unknown>),
    },
    createdAt: new Date().toISOString(),
  }));
}

/**
 * Get conversation context from documents
 */
export async function getConversationContext(
  userId: string,
  threadId: string,
  query: string,
  maxTokens: number = 4000
): Promise<{ content: string; sources: Array<{ name: string; similarity: number }> }> {
  const { generateEmbedding } = await import('@/lib/embeddings');
  const embedding = await generateEmbedding(query);

  if (!embedding) {
    return { content: '', sources: [] };
  }

  const { data, error } = await supabaseAdmin.rpc('get_conversation_context', {
    p_user_id: userId,
    p_thread_id: threadId,
    p_query_embedding: `[${embedding.join(',')}]`,
    p_max_tokens: maxTokens,
    p_min_similarity: 0.6,
  });

  if (error || !data || data.length === 0) {
    return { content: '', sources: [] };
  }

  const sources = data.map((row: Record<string, unknown>) => ({
    name: row.document_name as string,
    similarity: row.similarity as number,
  }));

  const content = data
    .map((row: Record<string, unknown>) => `[From ${row.document_name}]\n${row.content}`)
    .join('\n\n---\n\n');

  return { content, sources };
}

/**
 * Delete a document and its chunks
 */
export async function deleteDocument(documentId: string, userId: string): Promise<void> {
  // Get document to verify ownership and get storage path
  const { data: doc, error: fetchError } = await supabaseAdmin
    .from('documents')
    .select('storage_path, storage_bucket, user_id')
    .eq('id', documentId)
    .single();

  if (fetchError || !doc) {
    throw new Error('Document not found');
  }

  if (doc.user_id !== userId) {
    throw new Error('Unauthorized');
  }

  // Delete from storage
  await supabaseAdmin.storage
    .from(doc.storage_bucket)
    .remove([doc.storage_path]);

  // Delete document (chunks are deleted via CASCADE)
  const { error: deleteError } = await supabaseAdmin
    .from('documents')
    .delete()
    .eq('id', documentId);

  if (deleteError) {
    throw new Error(`Failed to delete document: ${deleteError.message}`);
  }
}

/**
 * Get user's documents
 */
export async function getUserDocuments(
  userId: string,
  options: {
    scope?: DocumentScope;
    threadId?: string;
    status?: Document['status'];
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ documents: Document[]; total: number }> {
  const { scope, threadId, status, limit = 50, offset = 0 } = options;

  let query = supabaseAdmin
    .from('documents')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .neq('status', 'archived')
    .order('created_at', { ascending: false });

  if (scope) {
    query = query.eq('scope', scope);
  }
  if (threadId) {
    query = query.eq('thread_id', threadId);
  }
  if (status) {
    query = query.eq('status', status);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch documents: ${error.message}`);
  }

  return {
    documents: (data || []).map(transformDocument),
    total: count || 0,
  };
}

/**
 * Get a single document with its chunks
 */
export async function getDocumentWithChunks(
  documentId: string,
  userId: string
): Promise<Document & { chunks: DocumentChunk[] }> {
  const { data: doc, error: docError } = await supabaseAdmin
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .eq('user_id', userId)
    .single();

  if (docError || !doc) {
    throw new Error('Document not found');
  }

  const { data: chunks, error: chunksError } = await supabaseAdmin
    .from('document_chunks')
    .select('*')
    .eq('document_id', documentId)
    .order('chunk_index');

  if (chunksError) {
    throw new Error(`Failed to fetch chunks: ${chunksError.message}`);
  }

  return {
    ...transformDocument(doc),
    chunks: (chunks || []).map(transformChunk),
  };
}

/**
 * Transform database row to Document type
 */
function transformDocument(row: Record<string, unknown>): Document {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    originalName: row.original_name as string,
    mimeType: row.mime_type as string,
    sizeBytes: row.size_bytes as number,
    storagePath: row.storage_path as string,
    storageBucket: row.storage_bucket as string,
    fileType: row.file_type as FileType,
    status: row.status as Document['status'],
    processingError: row.processing_error as string | undefined,
    scope: row.scope as DocumentScope,
    threadId: row.thread_id as string | undefined,
    metadata: (row.metadata as Record<string, unknown>) || {},
    chunkCount: row.chunk_count as number,
    tokenCount: row.token_count as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    processedAt: row.processed_at as string | undefined,
  };
}

/**
 * Transform database row to DocumentChunk type
 */
function transformChunk(row: Record<string, unknown>): DocumentChunk {
  return {
    id: row.id as string,
    documentId: row.document_id as string,
    content: row.content as string,
    chunkIndex: row.chunk_index as number,
    chunkType: row.chunk_type as DocumentChunk['chunkType'],
    sourcePage: row.source_page as number | undefined,
    sourceLineStart: row.source_line_start as number | undefined,
    sourceLineEnd: row.source_line_end as number | undefined,
    tokenCount: row.token_count as number | undefined,
    metadata: (row.metadata as Record<string, unknown>) || {},
    createdAt: row.created_at as string,
  };
}
