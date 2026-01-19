'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { motion } from 'framer-motion';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { KANBAN_COLUMNS } from '../constants';
import { useTaskMutations } from '../hooks';
import type { Task, TaskStatus } from '../types';

interface KanbanBoardProps {
  tasksByStatus: Record<TaskStatus, Task[]>;
  onTaskClick?: (task: Task) => void;
  onAddTask?: (status: TaskStatus) => void;
}

export function KanbanBoard({
  tasksByStatus,
  onTaskClick,
  onAddTask,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const { moveTask } = useTaskMutations();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findTaskById = useCallback(
    (id: string): Task | undefined => {
      for (const status of Object.keys(tasksByStatus) as TaskStatus[]) {
        const task = tasksByStatus[status].find((t) => t.id === id);
        if (task) return task;
      }
      return undefined;
    },
    [tasksByStatus]
  );

  const findColumnByTaskId = useCallback(
    (taskId: string): TaskStatus | undefined => {
      for (const status of Object.keys(tasksByStatus) as TaskStatus[]) {
        if (tasksByStatus[status].some((t) => t.id === taskId)) {
          return status;
        }
      }
      return undefined;
    },
    [tasksByStatus]
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const task = findTaskById(active.id as string);
      if (task) {
        setActiveTask(task);
      }
    },
    [findTaskById]
  );

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id as string | null);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);
      setOverId(null);

      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      const activeColumn = findColumnByTaskId(activeId);
      if (!activeColumn) return;

      let targetColumn: TaskStatus;
      let targetIndex: number;

      if (KANBAN_COLUMNS.some((c) => c.id === overId)) {
        targetColumn = overId as TaskStatus;
        targetIndex = tasksByStatus[targetColumn].length;
      } else {
        const overColumn = findColumnByTaskId(overId);
        if (!overColumn) return;
        targetColumn = overColumn;
        targetIndex = tasksByStatus[targetColumn].findIndex(
          (t) => t.id === overId
        );
        if (targetIndex === -1) targetIndex = tasksByStatus[targetColumn].length;
      }

      if (activeColumn === targetColumn) {
        const currentIndex = tasksByStatus[activeColumn].findIndex(
          (t) => t.id === activeId
        );
        if (currentIndex === targetIndex) return;
      }

      const tasksInTargetColumn = tasksByStatus[targetColumn].filter(
        (t) => t.id !== activeId
      );

      await moveTask(activeId, targetColumn, targetIndex, tasksInTargetColumn);
    },
    [findColumnByTaskId, tasksByStatus, moveTask]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex gap-4 overflow-x-auto pb-4 px-1"
      >
        {KANBAN_COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            status={column.id}
            tasks={tasksByStatus[column.id] || []}
            onTaskClick={onTaskClick}
            onAddTask={onAddTask}
            isOver={overId === column.id}
          />
        ))}
      </motion.div>

      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} isOverlay />}
      </DragOverlay>
    </DndContext>
  );
}

KanbanBoard.displayName = 'KanbanBoard';
