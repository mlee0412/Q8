import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  unauthorizedResponse,
} from '@/lib/auth/api-auth';
import {
  createTaskSchema,
  taskQuerySchema,
  validationErrorResponse,
} from '@/lib/validations';
import { supabaseAdmin as supabase } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * GET /api/tasks
 * Fetch tasks for the authenticated user with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user from session
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryResult = taskQuerySchema.safeParse({
      status: searchParams.get('status') ?? undefined,
      priority: searchParams.get('priority') ?? undefined,
      projectId: searchParams.get('projectId') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
    });

    if (!queryResult.success) {
      return validationErrorResponse(queryResult.error);
    }

    const { status, priority, projectId, limit, offset } = queryResult.data;

    // Build query
    let query = supabase
      .from('tasks')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }
    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error, count } = await query;

    if (error) {
      logger.error('Tasks fetch error', { error, userId: user.id });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform snake_case to camelCase for frontend
    const tasks = data?.map((task) => ({
      id: task.id,
      userId: task.user_id,
      title: task.title,
      description: task.description,
      dueDate: task.due_date,
      priority: task.priority,
      status: task.status,
      tags: task.tags,
      projectId: task.project_id,
      parentTaskId: task.parent_task_id,
      completedAt: task.completed_at,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
    })) ?? [];

    return NextResponse.json({
      tasks,
      total: count ?? 0,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Tasks error', { error });
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks
 * Create a new task for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user from session
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const body = await request.json();

    // Validate request body
    const result = createTaskSchema.safeParse(body);
    if (!result.success) {
      return validationErrorResponse(result.error);
    }

    const { title, description, dueDate, priority, status, tags, projectId, parentTaskId } = result.data;

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title,
        description,
        due_date: dueDate,
        priority,
        status,
        tags,
        project_id: projectId,
        parent_task_id: parentTaskId,
      })
      .select()
      .single();

    if (error) {
      logger.error('Task creation error', { error, userId: user.id });
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
    }, { status: 201 });
  } catch (error) {
    logger.error('Create task error', { error });
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
