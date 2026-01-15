'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import NextImage from 'next/image';
import {
  Code2,
  Table2,
  BarChart3,
  FileJson,
  FileText,
  Image as ImageIcon,
  Link2,
  Copy,
  Check,
  Download,
  Maximize2,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export type ArtifactType = 
  | 'code'
  | 'table'
  | 'chart'
  | 'json'
  | 'markdown'
  | 'image'
  | 'link'
  | 'file';

interface ArtifactData {
  type: ArtifactType;
  title?: string;
  content: string;
  language?: string;
  metadata?: Record<string, unknown>;
}

interface ArtifactRendererProps {
  artifact: ArtifactData;
  className?: string;
  onExpand?: () => void;
}

/**
 * Get icon for artifact type
 */
function getArtifactIcon(type: ArtifactType) {
  const icons = {
    code: Code2,
    table: Table2,
    chart: BarChart3,
    json: FileJson,
    markdown: FileText,
    image: ImageIcon,
    link: Link2,
    file: FileText,
  };
  return icons[type] || FileText;
}

/**
 * ArtifactRenderer Component
 *
 * Renders different types of artifacts (code, tables, charts, etc.)
 */
export function ArtifactRenderer({ artifact, className, onExpand }: ArtifactRendererProps) {
  const [isCopied, setIsCopied] = useState(false);
  const Icon = getArtifactIcon(artifact.type);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(artifact.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([artifact.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = artifact.title || `artifact.${artifact.language || 'txt'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'surface-matte rounded-xl overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-surface-3/50">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-text-muted" />
          <span className="text-sm font-medium">
            {artifact.title || artifact.type.charAt(0).toUpperCase() + artifact.type.slice(1)}
          </span>
          {artifact.language && (
            <span className="px-2 py-0.5 rounded text-xs bg-neon-primary/20 text-neon-primary">
              {artifact.language}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded hover:bg-surface-3 transition-colors"
            title="Copy"
          >
            {isCopied ? (
              <Check className="h-4 w-4 text-green-400" />
            ) : (
              <Copy className="h-4 w-4 text-text-muted" />
            )}
          </button>

          <button
            onClick={handleDownload}
            className="p-1.5 rounded hover:bg-surface-3 transition-colors"
            title="Download"
          >
            <Download className="h-4 w-4 text-text-muted" />
          </button>

          {onExpand && (
            <button
              onClick={onExpand}
              className="p-1.5 rounded hover:bg-surface-3 transition-colors"
              title="Expand"
            >
              <Maximize2 className="h-4 w-4 text-text-muted" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-h-[400px] overflow-auto">
        {artifact.type === 'code' && (
          <CodeArtifact content={artifact.content} language={artifact.language} />
        )}

        {artifact.type === 'table' && (
          <TableArtifact content={artifact.content} />
        )}

        {artifact.type === 'json' && (
          <JsonArtifact content={artifact.content} />
        )}

        {artifact.type === 'link' && (
          <LinkArtifact content={artifact.content} metadata={artifact.metadata} />
        )}

        {(artifact.type === 'markdown' || artifact.type === 'file') && (
          <div className="p-4 text-sm whitespace-pre-wrap">{artifact.content}</div>
        )}

        {artifact.type === 'image' && (
          <ImageArtifact content={artifact.content} title={artifact.title} />
        )}

        {artifact.type === 'chart' && (
          <ChartArtifact content={artifact.content} />
        )}
      </div>
    </motion.div>
  );
}

/**
 * Code Artifact
 */
function CodeArtifact({ content, language }: { content: string; language?: string }) {
  return (
    <SyntaxHighlighter
      style={vscDarkPlus}
      language={language || 'text'}
      customStyle={{
        margin: 0,
        padding: '1rem',
        background: 'transparent',
        fontSize: '0.875rem',
      }}
    >
      {content}
    </SyntaxHighlighter>
  );
}

/**
 * Table Artifact - parses CSV or markdown tables
 */
function TableArtifact({ content }: { content: string }) {
  const { headers, rows } = useMemo(() => {
    const lines = content.trim().split('\n');
    
    // Try to parse as CSV
    if (lines[0]?.includes(',')) {
      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1).map(line => line.split(',').map(c => c.trim()));
      return { headers, rows };
    }

    // Try to parse as markdown table
    if (lines[0]?.includes('|')) {
      const headers = lines[0].split('|').filter(Boolean).map(h => h.trim());
      const rows = lines.slice(2).map(line => 
        line.split('|').filter(Boolean).map(c => c.trim())
      );
      return { headers, rows };
    }

    // Fallback: treat as space-separated
    const headers = lines[0]?.split(/\s{2,}/).map(h => h.trim()) || [];
    const rows = lines.slice(1).map(line => line.split(/\s{2,}/).map(c => c.trim()));
    return { headers, rows };
  }, [content]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-subtle bg-surface-3/30">
            {headers.map((header, i) => (
              <th key={i} className="px-4 py-2 text-left font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border-subtle/50 hover:bg-surface-3/20">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * JSON Artifact - formatted JSON viewer
 */
function JsonArtifact({ content }: { content: string }) {
  const formatted = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(content), null, 2);
    } catch {
      return content;
    }
  }, [content]);

  return (
    <SyntaxHighlighter
      style={vscDarkPlus}
      language="json"
      customStyle={{
        margin: 0,
        padding: '1rem',
        background: 'transparent',
        fontSize: '0.875rem',
      }}
    >
      {formatted}
    </SyntaxHighlighter>
  );
}

/**
 * Link Artifact - clickable link with preview
 */
function LinkArtifact({ 
  content, 
  metadata 
}: { 
  content: string; 
  metadata?: Record<string, unknown>;
}) {
  return (
    <a
      href={content}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-4 hover:bg-surface-3/50 transition-colors"
    >
      <div className="h-10 w-10 rounded-lg bg-neon-primary/20 flex items-center justify-center">
        <ExternalLink className="h-5 w-5 text-neon-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {(metadata?.title as string) || content}
        </p>
        <p className="text-xs text-text-muted truncate">{content}</p>
      </div>
    </a>
  );
}

/**
 * Image Artifact
 */
function ImageArtifact({ content, title }: { content: string; title?: string }) {
  // For external URLs or data URIs, use unoptimized to avoid Next.js optimization issues
  const isDataUri = content.startsWith('data:');
  const isExternal = content.startsWith('http://') || content.startsWith('https://');
  
  return (
    <div className="p-4">
      {(isDataUri || isExternal) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={content}
          alt={title || 'Image'}
          className="max-w-full h-auto rounded-lg"
        />
      ) : (
        <NextImage
          src={content}
          alt={title || 'Image'}
          width={800}
          height={600}
          className="max-w-full h-auto rounded-lg"
          style={{ width: 'auto', height: 'auto' }}
        />
      )}
    </div>
  );
}

/**
 * Chart Artifact - simple text-based visualization
 * In production, integrate with a charting library like recharts
 */
function ChartArtifact({ content }: { content: string }) {
  // Parse simple data format: "label: value" per line
  const data = useMemo(() => {
    const lines = content.trim().split('\n');
    return lines.map(line => {
      const [label, value] = line.split(':').map(s => s.trim());
      return { label: label || '', value: parseFloat(value || '0') || 0 };
    }).filter(d => d.label);
  }, [content]);

  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="p-4 space-y-2">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs w-20 truncate text-text-muted">
            {item.label}
          </span>
          <div className="flex-1 h-6 bg-surface-3 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / maxValue) * 100}%` }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="h-full bg-gradient-to-r from-neon-primary to-neon-accent rounded-full"
            />
          </div>
          <span className="text-xs w-12 text-right">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

ArtifactRenderer.displayName = 'ArtifactRenderer';
