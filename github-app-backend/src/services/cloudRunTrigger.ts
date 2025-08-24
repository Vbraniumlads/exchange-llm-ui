import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();


interface CloudRunTaskRequest {
  repository_id: number;
  task_data: object;
  priority?: number;
  metadata?: object;
}

interface CloudRunTask {
  id: number;
  repository_id: number;
  status: string;
  created_at: string;
}

/**
 * Service for GitHub App to trigger Cloud Run tasks and poll for results
 */
class CloudRunTrigger {
  private cloudRunUrl: string;

  constructor() {
    this.cloudRunUrl = process.env.CLAUDE_CLOUD_RUN_URL || '';
  }

  /**
   * Trigger a Cloud Run task and start polling for results
   */
  async triggerAndPoll(taskRequest: CloudRunTaskRequest): Promise<{ taskId: number; localTaskId: number }> {
    try {
      // For Cloud Run /run endpoint, we send the task_data directly
      const cloudRunPayload = {
        ...taskRequest.task_data,
        repository_id: taskRequest.repository_id,
        priority: taskRequest.priority || 1,
        local_task_id: 1
      };

      const response = await axios.post(`${this.cloudRunUrl}/run`, cloudRunPayload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 3600 * 1000, // 1 hour timeout
      });

      // The /run endpoint returns different response format
      const cloudRunResponse = response.data;
      const cloudRunTask: CloudRunTask = {
        id: 1,
        repository_id: taskRequest.repository_id,
        status: 'running',
        created_at: new Date().toISOString()
      };

      console.log('cloudRunResponse', cloudRunResponse);

      return {
        taskId: cloudRunTask.id,
        localTaskId: 1
      };

    } catch (error) {
      console.error('Failed to trigger Cloud Run task:', error);
      throw error;
    }
  }

  /**
   * Trigger workflow dispatch via Cloud Run
   */
  async triggerWorkflowDispatch(repositoryId: number, workflowData: {
    repository_url: string;
    task_prompt: string;
    claude_oauth_token: string;
    github_app_private_key: string;
    installation_id: number;
    base_branch: string;
    workflow_id: string;
    owner: string;
    repo: string;
    action_type: string;
  }): Promise<{ taskId: number; localTaskId: number }> {
    return this.triggerAndPoll({
      repository_id: repositoryId,
      task_data: workflowData,
      priority: 1
    });
  }
}

export const cloudRunTrigger = new CloudRunTrigger();
