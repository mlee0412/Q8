import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/auth/api-auth';
import { updateTaskSchema, validationErrorResponse } from '@/lib/validations';
import { supabaseAdmin as supabase } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/tasks/[id]
 * Fetch a single task (must belong to authenticated user)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Authenticate user from session
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
      logger.error('Task fetch error', { error, taskId: id });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Verify ownership
    if (data.user_id !== user.id) {
      return forbiddenResponse('Not authorized to view this task');
    }

    return NextResponse.json({
      id: data.id,
      userId: data.user_id,
      title: data.title,
      description: data.description,
      dueDate: data.due_date,
      priority: data.priority,
      status: data.status,
      tags: data.tags,
      projectId: data.project_id,
      parentTaskId: data.parent_task_id,
      completedAt: data.completed_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  } catch (error) {
    logger.error('Get task error', { error });
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tasks/[id]
 * Update a task (must belong to authenticated user)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Authenticate user from session
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    // First verify the task exists and belongs to user
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
      logger.error('Task fetch error', { error: fetchError, taskId: id });
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (existingTask.user_id !== user.id) {
      return forbiddenResponse('Not authorized to update this task');
    }

    const body = await request.json();

    // Validate request body
    const result = updateTaskSchema.safeParse(body);
    if (!result.success) {
      return validationErrorResponse(result.error);
    }

    const updates = result.data;

    // Build update object with snake_case keys
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.status !== undefined) {
      updateData.status = updates.status;
      // Auto-set completedAt when marking as done
      if (updates.status === 'done' && !updates.completedAt) {
        updateData.completed_at = new Date().toISOString();
      }
    }
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.projectId !== undefined) updateData.project_id = updates.projectId;
    if (updates.parentTaskId !== undefined) updateData.parent_task_id = updates.parentTaskId;
    if (updates.completedAt !== undefined) updateData.completed_at = updates.completedAt;

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Task update error', { error, taskId: id });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      userId: data.user_id,
      title: data.title,
      description: data.description,
      dueDate: data.due_date,
      priority: data.priority,
      status: data.status,
      tags: data.tags,
      projectId: data.project_id,
      parentTaskId: data.parent_task_id,
      completedAt: data.completed_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  } catch (error) {
    logger.error('Update task error', { error });
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tasks/[id]
 * Delete a task (must belong to authenticated user)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Authenticate user from session
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    // First verify the task exists and belongs to user
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
      logger.error('Task fetch error', { error: fetchError, taskId: id });
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (existingTask.user_id !== user.id) {
      return forbiddenResponse('Not authorized to delete this task');
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Task delete error', { error, taskId: id });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: id });
  } catch (error) {
    logger.error('Delete task error', { error });
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
