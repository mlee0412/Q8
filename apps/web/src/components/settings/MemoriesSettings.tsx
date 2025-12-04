'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Trash2,
  Search,
  Filter,
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

const MEMORY_TYPE_LABELS: Record<MemoryType, { label: string; color: string; icon: typeof Brain }> = {
  fact: { label: 'Fact', color: 'text-blue-400', icon: Brain },
  preference: { label: 'Preference', color: 'text-purple-400', icon: Star },
  task: { label: 'Task', color: 'text-yellow-400', icon: Clock },
  event: { label: 'Event', color: 'text-green-400', icon: Clock },
  relationship: { label: 'Relationship', color: 'text-pink-400', icon: Brain },
};

const IMPORTANCE_LABELS: Record<MemoryImportance, { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-gray-400' },
  medium: { label: 'Medium', color: 'text-blue-400' },
  high: { label: 'High', color: 'text-yellow-400' },
  critical: { label: 'Critical', color: 'text-red-400' },
};

/**
 * MemoriesSettings Component
 * 
 * Displays and manages user's agent memories
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
          <h3 className="text-sm font-medium">Agent Memories</h3>
          <p className="text-xs text-muted-foreground mt-1">
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
            <div className="p-4 rounded-lg bg-glass-bg border border-glass-border space-y-3">
              <textarea
                value={newMemory.content}
                onChange={(e) => setNewMemory(prev => ({ ...prev, content: e.target.value }))}
                placeholder="What should I remember?"
                className="w-full px-3 py-2 text-sm rounded-lg bg-glass-bg border border-glass-border focus:border-neon-primary/50 focus:outline-none resize-none"
                rows={3}
              />
              <div className="flex gap-2">
                <select
                  value={newMemory.type}
                  onChange={(e) => setNewMemory(prev => ({ ...prev, type: e.target.value as MemoryType }))}
                  className="flex-1 px-3 py-2 text-sm rounded-lg bg-glass-bg border border-glass-border focus:border-neon-primary/50 focus:outline-none"
                >
                  {Object.entries(MEMORY_TYPE_LABELS).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <select
                  value={newMemory.importance}
                  onChange={(e) => setNewMemory(prev => ({ ...prev, importance: e.target.value as MemoryImportance }))}
                  className="flex-1 px-3 py-2 text-sm rounded-lg bg-glass-bg border border-glass-border focus:border-neon-primary/50 focus:outline-none"
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
                className="w-full px-3 py-2 text-sm rounded-lg bg-glass-bg border border-glass-border focus:border-neon-primary/50 focus:outline-none"
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-glass-bg border border-glass-border focus:border-neon-primary/50 focus:outline-none"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as MemoryType | 'all')}
          className="px-3 py-2 text-sm rounded-lg bg-glass-bg border border-glass-border focus:border-neon-primary/50 focus:outline-none"
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
            <div
              key={type}
              className={cn(
                'px-2 py-1 rounded-full text-xs flex items-center gap-1',
                'bg-glass-bg border border-glass-border'
              )}
            >
              <span className={typeInfo.color}>{typeInfo.label}</span>
              <span className="text-muted-foreground">{count}</span>
            </div>
          );
        })}
      </div>

      {/* Memories List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center gap-2 py-8 text-red-400">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{error}</span>
          </div>
        ) : filteredMemories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {searchQuery || filterType !== 'all' 
                ? 'No memories match your search' 
                : 'No memories yet'}
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
      className="p-3 rounded-lg bg-glass-bg border border-glass-border group hover:border-glass-border/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm">{memory.content}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={cn('text-xs px-2 py-0.5 rounded-full bg-glass-bg', typeInfo.color)}>
              {typeInfo.label}
            </span>
            <span className={cn('text-xs', importanceInfo.color)}>
              {importanceInfo.label}
            </span>
            {memory.tags && memory.tags.length > 0 && (
              <div className="flex items-center gap-1">
                <Tag className="h-3 w-3 text-muted-foreground" />
                {memory.tags.slice(0, 3).map((tag, i) => (
                  <span key={i} className="text-xs text-muted-foreground">
                    {tag}{i < Math.min(memory.tags.length, 3) - 1 ? ',' : ''}
                  </span>
                ))}
                {memory.tags.length > 3 && (
                  <span className="text-xs text-muted-foreground">+{memory.tags.length - 3}</span>
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(memory.created_at).toLocaleDateString()}
            {memory.access_count > 0 && ` · Used ${memory.access_count} times`}
          </p>
        </div>
        <button
          onClick={onDelete}
          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-glass-bg transition-all"
          title="Delete memory"
        >
          <Trash2 className="h-4 w-4 text-red-400" />
        </button>
      </div>
    </motion.div>
  );
}

MemoriesSettings.displayName = 'MemoriesSettings';
