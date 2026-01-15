'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Trash2,
  Search,
  Plus,
  Loader2,
  AlertCircle,
  Tag,
  Clock,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useMemories } from '@/hooks/useMemories';
import type { MemoryType, MemoryImportance, AgentMemory } from '@/lib/supabase/types';

interface MemoriesSettingsProps {
  userId: string;
}

const MEMORY_TYPE_LABELS: Record<MemoryType, { label: string; colorClass: string; icon: typeof Brain }> = {
  fact: { label: 'Fact', colorClass: 'badge-info', icon: Brain },
  preference: { label: 'Preference', colorClass: 'badge-accent', icon: Star },
  task: { label: 'Task', colorClass: 'badge-warning', icon: Clock },
  event: { label: 'Event', colorClass: 'badge-success', icon: Clock },
  relationship: { label: 'Relationship', colorClass: 'badge', icon: Brain },
};

const IMPORTANCE_LABELS: Record<MemoryImportance, { label: string; className: string }> = {
  low: { label: 'Low', className: 'text-text-muted' },
  medium: { label: 'Medium', className: 'text-text-secondary' },
  high: { label: 'High', className: 'text-warning' },
  critical: { label: 'Critical', className: 'text-danger' },
};

/**
 * MemoriesSettings Component
 *
 * Displays and manages user's agent memories with design system styling.
 */
export function MemoriesSettings({ userId }: MemoriesSettingsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<MemoryType | 'all'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMemory, setNewMemory] = useState({
    content: '',
    type: 'fact' as MemoryType,
    importance: 'medium' as MemoryImportance,
    tags: '',
  });

  const {
    memories,
    isLoading,
    error,
    createMemory,
    deleteMemory,
    memoryStats,
  } = useMemories({ userId });

  // Filter memories by search and type
  const filteredMemories = memories.filter((memory) => {
    const matchesSearch = !searchQuery ||
      memory.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      memory.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === 'all' || memory.memory_type === filterType;
    return matchesSearch && matchesType;
  });

  // Handle adding new memory
  const handleAddMemory = async () => {
    if (!newMemory.content.trim()) return;

    const tags = newMemory.tags.split(',').map(t => t.trim()).filter(Boolean);
    await createMemory(newMemory.content, newMemory.type, newMemory.importance, tags);

    setNewMemory({ content: '', type: 'fact', importance: 'medium', tags: '' });
    setShowAddForm(false);
  };

  // Handle delete with confirmation
  const handleDelete = async (memoryId: string) => {
    if (window.confirm('Are you sure you want to delete this memory?')) {
      await deleteMemory(memoryId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-heading">Agent Memories</h3>
          <p className="text-caption mt-1">
            {memoryStats.total} memories stored
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          Add Memory
        </Button>
      </div>

      {/* Add Memory Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-lg bg-surface-3 border border-border-subtle space-y-3">
              <textarea
                value={newMemory.content}
                onChange={(e) => setNewMemory(prev => ({ ...prev, content: e.target.value }))}
                placeholder="What should I remember?"
                className="input-field resize-none"
                rows={3}
              />
              <div className="flex gap-2">
                <select
                  value={newMemory.type}
                  onChange={(e) => setNewMemory(prev => ({ ...prev, type: e.target.value as MemoryType }))}
                  className="input-field flex-1"
                >
                  {Object.entries(MEMORY_TYPE_LABELS).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <select
                  value={newMemory.importance}
                  onChange={(e) => setNewMemory(prev => ({ ...prev, importance: e.target.value as MemoryImportance }))}
                  className="input-field flex-1"
                >
                  {Object.entries(IMPORTANCE_LABELS).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                value={newMemory.tags}
                onChange={(e) => setNewMemory(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="Tags (comma-separated)"
                className="input-field"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
                <Button variant="neon" size="sm" onClick={handleAddMemory}>
                  Save Memory
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search and Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as MemoryType | 'all')}
          className="input-field w-auto"
        >
          <option value="all">All Types</option>
          {Object.entries(MEMORY_TYPE_LABELS).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Memory Type Stats */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(memoryStats.byType).map(([type, count]) => {
          const typeInfo = MEMORY_TYPE_LABELS[type as MemoryType];
          return (
            <span key={type} className={cn('badge', typeInfo.colorClass)}>
              {typeInfo.label}: {count}
            </span>
          );
        })}
      </div>

      {/* Memories List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
        {isLoading ? (
          <div className="empty-state">
            <Loader2 className="empty-state-icon animate-spin" />
            <p className="text-caption">Loading memories...</p>
          </div>
        ) : error ? (
          <div className="empty-state">
            <AlertCircle className="empty-state-icon text-danger" />
            <p className="empty-state-title text-danger">Error loading memories</p>
            <p className="empty-state-description">{error}</p>
          </div>
        ) : filteredMemories.length === 0 ? (
          <div className="empty-state">
            <Brain className="empty-state-icon" />
            <p className="empty-state-title">
              {searchQuery || filterType !== 'all'
                ? 'No memories match your search'
                : 'No memories yet'}
            </p>
            <p className="empty-state-description">
              {searchQuery || filterType !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Add memories to help Q8 remember important information about you'}
            </p>
          </div>
        ) : (
          filteredMemories.map((memory) => (
            <MemoryItem
              key={memory.id}
              memory={memory}
              onDelete={() => handleDelete(memory.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Individual memory item
 */
function MemoryItem({
  memory,
  onDelete,
}: {
  memory: AgentMemory;
  onDelete: () => void;
}) {
  const typeInfo = MEMORY_TYPE_LABELS[memory.memory_type];
  const importanceInfo = IMPORTANCE_LABELS[memory.importance];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-item group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-primary">{memory.content}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={cn('badge', typeInfo.colorClass)}>
              {typeInfo.label}
            </span>
            <span className={cn('text-xs font-medium', importanceInfo.className)}>
              {importanceInfo.label}
            </span>
            {memory.tags && memory.tags.length > 0 && (
              <div className="flex items-center gap-1">
                <Tag className="h-3 w-3 text-text-muted" />
                <span className="text-xs text-text-muted">
                  {memory.tags.slice(0, 3).join(', ')}
                  {memory.tags.length > 3 && ` +${memory.tags.length - 3}`}
                </span>
              </div>
            )}
          </div>
          <p className="text-caption mt-2">
            {new Date(memory.created_at).toLocaleDateString()}
            {memory.access_count > 0 && ` · Used ${memory.access_count} times`}
          </p>
        </div>
        <button
          onClick={onDelete}
          className="btn-icon-sm opacity-0 group-hover:opacity-100 hover:bg-danger/10 transition-all"
          title="Delete memory"
        >
          <Trash2 className="h-4 w-4 text-danger" />
        </button>
      </div>
    </motion.div>
  );
}

MemoriesSettings.displayName = 'MemoriesSettings';
