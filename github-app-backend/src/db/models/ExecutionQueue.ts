export interface ExecutionQueue {
  id: number;
  repository_id: number;
  task_type: string;
  task_data: string; // JSON string
  priority: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  retry_count: number;
  max_retries: number;
  scheduled_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  created_by: string;
  metadata?: string; // JSON string
  created_at: string;
  updated_at: string;
}

export interface ExecutionQueueCreateInput {
  repository_id: number;
  task_type: string;
  task_data: object; // Will be JSON.stringified
  priority?: number;
  status?: ExecutionQueue['status'];
  max_retries?: number;
  scheduled_at?: string;
  created_by: string;
  metadata?: object; // Will be JSON.stringified
}

export interface ExecutionQueueUpdateInput {
  status?: ExecutionQueue['status'];
  retry_count?: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  metadata?: object; // Will be JSON.stringified
}

export interface ExecutionQueueWithTaskData extends Omit<ExecutionQueue, 'task_data' | 'metadata'> {
  task_data: object;
  metadata?: object;
}