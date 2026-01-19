/**
 * TaskWidget Types
 */

export interface Task {
  id: string;
  userId: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  created_at: string;
  updatedAt: string;
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
  onToggle: () => void;
  onDelete: () => void;
}

export interface AddTaskInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}
