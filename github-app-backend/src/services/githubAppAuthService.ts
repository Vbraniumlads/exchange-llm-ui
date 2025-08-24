import axios from 'axios';
import jwt from 'jsonwebtoken';
import { Octokit } from '@octokit/rest';
import { repositoryService } from './repositoryService.js';
import { cloudRunTrigger } from './cloudRunTrigger.js';

export interface WorkflowDispatchParams {
  owner: string;
  repo: string;
  workflowId: string; // e.g. 'claude.yml'
  ref?: string; // e.g. 'main'
  inputs?: Record<string, any>;
}

export interface CloudRunResponse {
  success: boolean;
  pull_request_url?: string;
  pull_request_number?: number;
  branch_name?: string;
  claude_output?: string;
  execution_time_ms?: number;
  message?: string;
}

export function ensureAppConfig(): { appId: number; privateKey: string } {
  const appIdRaw = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY || '';

  if (!appIdRaw || !privateKey) {
    throw new Error('Missing GitHub App configuration: set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY');
  }

  const appId = parseInt(appIdRaw, 10);
  if (Number.isNaN(appId)) {
    throw new Error('Invalid GITHUB_APP_ID. It must be a number.');
  }

  return { appId, privateKey };
}

export function normalizePrivateKey(raw: string): string {
  if (raw.includes('\\n')) {
    return raw.replace(/\\n/g, '\n');
  }
  return raw;
}

export function createAppJwt(appId: number, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60,
    exp: now + 600,
    iss: appId,
  };
  return jwt.sign(payload, normalizePrivateKey(privateKey), { algorithm: 'RS256' });
}

export async function getInstallationIdForRepo(owner: string, repo: string, jwtToken: string): Promise<number> {
  const url = `https://api.github.com/repos/${owner}/${repo}/installation`;
  const { data } = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      Accept: 'application/vnd.github+json',
    },
  });
  return data.id as number;
}

export async function createInstallationAccessToken(installationId: number, jwtToken: string): Promise<string> {
  const url = `https://api.github.com/app/installations/${installationId}/access_tokens`;
  const { data } = await axios.post(url, {}, {
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      Accept: 'application/vnd.github+json',
    },
  });
  return data.token as string;
}

export async function createRepositoryClient(owner: string, repo: string): Promise<Octokit> {
  const { appId, privateKey } = ensureAppConfig();
  const appJwt = createAppJwt(appId, privateKey);
  const installationId = await getInstallationIdForRepo(owner, repo, appJwt);
  const installationToken = await createInstallationAccessToken(installationId, appJwt);

  return new Octokit({
    auth: installationToken,
  });
}

export async function dispatchWorkflow(params: WorkflowDispatchParams & { userId?: number }): Promise<{
  success: boolean;
  message: string;
  task_id: number;
  local_task_id: number;
  status_endpoint: string;
}> {
  const { owner, repo, workflowId, ref = 'main', inputs = {}, userId = 1 } = params;

  // Only handle Claude workflows
  if (workflowId !== 'claude.yml' || !inputs.context) {
    throw new Error('Only Claude workflows are supported. Please use claude.yml with a context input.');
  }

  // Get or create repository record
  let repositoryId: number;
  try {
    const repos = await repositoryService.findByUserId(userId);
    let repo_record = repos.find(r => r.repo_name === `${owner}/${repo}`);

    if (!repo_record) {
      throw new Error('Repository not found');
    }

    repositoryId = repo_record.id;
  } catch (error) {
    console.error('Failed to get/create repository record:', error);
    throw new Error('Failed to prepare task tracking');
  }

  // Get GitHub App configuration for Cloud Run
  const { appId, privateKey } = ensureAppConfig();
  const appJwt = createAppJwt(appId, privateKey);
  const installationId = await getInstallationIdForRepo(owner, repo, appJwt);

  // Prepare task data for Cloud Run
  const taskData = {
    repository_url: `https://github.com/${owner}/${repo}`,
    task_prompt: inputs.context,
    claude_oauth_token: process.env.CLAUDE_CODE_OAUTH_TOKEN,
    github_app_private_key: privateKey,
    installation_id: installationId,
    base_branch: ref,
    workflow_id: workflowId,
    owner,
    repo,
    action_type: inputs.action_type || 'create-pr'
  };

  // TODO: Step 1: Add task to queue

  console.log(`📋 Task added to queue`);

  // Step 2: Return 202 immediately (task will be processed async)
  const response = {
    success: true,
    message: 'Workflow dispatch task queued successfully',
    task_id: 1,
    local_task_id: 1,
    status_endpoint: `/api/results/task/1`
  };

  // Step 3: Trigger Cloud Run asynchronously (don't await)
  cloudRunTrigger.triggerAndPoll({
    repository_id: repositoryId,
    task_data: taskData,
    priority: 1
  });

  return response;
}

export async function isAppInstalledForRepo(
  owner: string,
  repo: string
): Promise<{ installed: boolean; installationId?: number }> {
  try {
    const { appId, privateKey } = ensureAppConfig();
    const appJwt = createAppJwt(appId, privateKey);
    const installationId = await getInstallationIdForRepo(owner, repo, appJwt);
    return { installed: true, installationId };
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return { installed: false };
    }
    const message = error?.message || 'Unknown error';
    throw new Error(`Failed to check installation: ${message}`);
  }
}


