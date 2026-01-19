'use client';

import { motion } from 'framer-motion';
import type { AddTaskInputProps } from '../types';

export function AddTaskInput({ value, onChange, onSubmit, onCancel }: AddTaskInputProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-4"
    >
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit();
            if (e.key === 'Escape') onCancel();
          }}
          placeholder="Enter task..."
          autoFocus
          className="flex-1 px-3 py-2 bg-surface-2 border border-border-subtle rounded-md text-sm text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-neon-primary/50 focus:outline-none"
        />
        <button
          className="px-3 py-1.5 bg-neon-primary text-white text-sm font-medium rounded-md hover:bg-neon-primary/90 transition-colors focus-ring"
          onClick={onSubmit}
        >
          Add
        </button>
      </div>
    </motion.div>
  );
}
