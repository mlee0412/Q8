'use client';

/**
 * FileUploadZone
 * Drag-and-drop file upload component for chat and knowledge base
 */

import React, { useState, useCallback, useRef } from 'react';
import { Upload, File, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import type { Document, DocumentScope } from '@/lib/documents/types';

interface FileUploadZoneProps {
  /** Upload scope */
  scope: DocumentScope;
  /** Thread ID for conversation-scoped uploads */
  threadId?: string;
  /** Called when upload completes */
  onUploadComplete?: (document: Document) => void;
  /** Called when upload fails */
  onUploadError?: (error: string) => void;
  /** Compact mode for chat input */
  compact?: boolean;
  /** Allowed file types (MIME types) */
  accept?: string;
  /** Max file size in bytes */
  maxSize?: number;
  /** Additional class names */
  className?: string;
  /** Whether uploads are disabled */
  disabled?: boolean;
}

interface UploadingFile {
  id: string;
  file: File;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  document?: Document;
}

const DEFAULT_ACCEPT = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
].join(',');

const DEFAULT_MAX_SIZE = 50 * 1024 * 1024; // 50MB

export function FileUploadZone({
  scope,
  threadId,
  onUploadComplete,
  onUploadError,
  compact = false,
  accept = DEFAULT_ACCEPT,
  maxSize = DEFAULT_MAX_SIZE,
  className = '',
  disabled = false,
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const uploadFile = async (file: File): Promise<void> => {
    const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Validate file size
    if (file.size > maxSize) {
      const error = `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB.`;
      setUploadingFiles((prev) => [
        ...prev,
        { id: uploadId, file, status: 'error', progress: 0, error },
      ]);
      onUploadError?.(error);
      return;
    }

    // Add to uploading list
    setUploadingFiles((prev) => [
      ...prev,
      { id: uploadId, file, status: 'uploading', progress: 0 },
    ]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('scope', scope);
      if (threadId) {
        formData.append('threadId', threadId);
      }

      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      // Update status to success
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === uploadId
            ? { ...f, status: 'success', progress: 100, document: data.document }
            : f
        )
      );

      onUploadComplete?.(data.document);

      // Remove from list after delay
      setTimeout(() => {
        setUploadingFiles((prev) => prev.filter((f) => f.id !== uploadId));
      }, 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';

      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === uploadId
            ? { ...f, status: 'error', error: errorMessage }
            : f
        )
      );

      onUploadError?.(errorMessage);
    }
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      for (const file of files) {
        await uploadFile(file);
      }
    },
    [disabled, scope, threadId, maxSize]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      for (const file of files) {
        await uploadFile(file);
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [scope, threadId, maxSize]
  );

  const removeFile = useCallback((uploadId: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== uploadId));
  }, []);

  const openFileDialog = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  // Compact mode for chat input
  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />
        <button
          type="button"
          onClick={openFileDialog}
          disabled={disabled}
          className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Attach file"
        >
          <Upload className="w-5 h-5" />
        </button>

        {/* Uploading files indicator */}
        {uploadingFiles.length > 0 && (
          <div className="absolute bottom-full left-0 mb-2 w-64 bg-gray-900 border border-white/10 rounded-lg p-2 space-y-2">
            {uploadingFiles.map((upload) => (
              <div
                key={upload.id}
                className="flex items-center gap-2 text-sm"
              >
                <File className="w-4 h-4 text-white/60 flex-shrink-0" />
                <span className="truncate flex-1 text-white/80">
                  {upload.file.name}
                </span>
                {upload.status === 'uploading' && (
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                )}
                {upload.status === 'success' && (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                )}
                {upload.status === 'error' && (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full upload zone
  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={openFileDialog}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all duration-200
          ${isDragging
            ? 'border-blue-400 bg-blue-400/10'
            : 'border-white/20 hover:border-white/40 hover:bg-white/5'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <Upload className="w-10 h-10 mx-auto mb-4 text-white/40" />
        <p className="text-white/80 font-medium">
          {isDragging ? 'Drop files here' : 'Drag & drop files here'}
        </p>
        <p className="text-white/50 text-sm mt-1">
          or click to browse
        </p>
        <p className="text-white/30 text-xs mt-3">
          PDF, DOCX, TXT, CSV, JSON, Code files • Max {Math.round(maxSize / 1024 / 1024)}MB
        </p>
      </div>

      {/* Uploading files list */}
      {uploadingFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {uploadingFiles.map((upload) => (
            <div
              key={upload.id}
              className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10"
            >
              <File className="w-5 h-5 text-white/60 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/80 truncate">
                  {upload.file.name}
                </p>
                {upload.status === 'uploading' && (
                  <p className="text-xs text-white/50">Uploading...</p>
                )}
                {upload.status === 'success' && (
                  <p className="text-xs text-green-400">Uploaded successfully</p>
                )}
                {upload.status === 'error' && (
                  <p className="text-xs text-red-400">{upload.error}</p>
                )}
              </div>
              {upload.status === 'uploading' && (
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              )}
              {upload.status === 'success' && (
                <CheckCircle className="w-5 h-5 text-green-400" />
              )}
              {upload.status === 'error' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(upload.id);
                  }}
                  className="p-1 hover:bg-white/10 rounded"
                >
                  <X className="w-4 h-4 text-white/60" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FileUploadZone;
