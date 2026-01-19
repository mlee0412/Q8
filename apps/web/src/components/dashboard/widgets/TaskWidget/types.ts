/**
 * TaskWidget Types - Enhanced for Kanban Board
 */

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskViewMode = 'kanban' | 'list' | 'calendar';

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  tags?: string[];
  projectId?: string;
  parentTaskId?: string;
  sortOrder: number;
  estimatedMinutes?: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  tags?: string[];
  projectId?: string;
  search?: string;
  dueDateRange?: {
    start?: string;
    end?: string;
  };
  showSubtasks?: boolean;
}

export interface TaskWidgetProps {
  maxItems?: number;
  showCompleted?: boolean;
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2 | 3 | 4;
  className?: string;
}

export interface TaskItemProps {
  task: Task;
  index: number;
  onToggle: (task: Task) => Promise<void>;
  onDelete: (taskId: string) => void;
  onClick?: (task: Task) => void;
  isDragging?: boolean;
}

export interface AddTaskInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  status?: TaskStatus;
  priority?: TaskPriority;
}

export interface TaskCardProps {
  task: Task;
  onClick?: (task: Task) => void;
  onStatusChange?: (task: Task, newStatus: TaskStatus) => void;
  onDelete?: (taskId: string) => void;
  isDragging?: boolean;
  isOverlay?: boolean;
}

export interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onAddTask?: (status: TaskStatus) => void;
  onTaskMove?: (taskId: string, newStatus: TaskStatus, newIndex: number) => void;
  isOver?: boolean;
}

export interface TaskCommandCenterProps {
  onClose: () => void;
  initialViewMode?: TaskViewMode;
}

export interface TaskDetailPanelProps {
  taskId: string;
  onClose: () => void;
  onUpdate?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
}

export interface TaskFormProps {
  task?: Partial<Task>;
  onSubmit: (task: Partial<Task>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface SubtaskListProps {
  parentTaskId: string;
  subtasks: Task[];
  onAddSubtask?: (title: string) => void;
  onToggleSubtask?: (subtask: Task) => void;
  onDeleteSubtask?: (subtaskId: string) => void;
}

export interface TaskQuickFiltersProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  taskCounts: {
    all: number;
    today: number;
    overdue: number;
    thisWeek: number;
  };
}
