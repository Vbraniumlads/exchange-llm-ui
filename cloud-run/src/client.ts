import axios, { AxiosInstance } from 'axios';

interface ClaudeCodeRunnerConfig {
  cloudRunUrl: string;
  claudeOAuthToken: string;
  githubAppPrivateKey: string;
  githubAppId: number;
}

interface RunTaskOptions {
  repositoryUrl: string;
  taskPrompt: string;
  installationId: number;
  baseBranch?: string;
}

interface RunTaskResponse {
  success: boolean;
  pull_request_url?: string;
  pull_request_number?: number;
  branch_name?: string;
  claude_output: string;
  execution_time_ms: number;
  message?: string;
  error?: string;
}

export class ClaudeCodeRunner {
  private client: AxiosInstance;
  private config: ClaudeCodeRunnerConfig;

  constructor(config: ClaudeCodeRunnerConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.cloudRunUrl,
      timeout: 3600000, // 1 hour timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Run a Claude Code task on a repository
   */
  async runTask(options: RunTaskOptions): Promise<RunTaskResponse> {
    try {
      console.log(`Running Claude Code task on ${options.repositoryUrl}`);
      console.log(`Task: ${options.taskPrompt}`);

      const response = await this.client.post<RunTaskResponse>('/run', {
        repository_url: options.repositoryUrl,
        task_prompt: options.taskPrompt,
        claude_oauth_token: this.config.claudeOAuthToken,
        github_app_private_key: this.config.githubAppPrivateKey,
        installation_id: options.installationId,
        base_branch: options.baseBranch || 'main'
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(`Cloud Run service error: ${error.response.data.error || error.message}`);
      } else if (error.request) {
        throw new Error(`No response from Cloud Run service: ${error.message}`);
      } else {
        throw new Error(`Failed to call Cloud Run service: ${error.message}`);
      }
    }
  }

  /**
   * Check the health of the Cloud Run service
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'healthy';
    } catch {
      return false;
    }
  }
}

/**
 * Helper function to get GitHub App installation ID for a repository
 */
export async function getInstallationId(
  githubAppId: number,
  githubAppPrivateKey: string,
  owner: string,
  repo: string
): Promise<number> {
  const { App } = await import('@octokit/app');
  
  const app = new App({
    appId: githubAppId,
    privateKey: githubAppPrivateKey
  });

  const { data: installation } = await app.octokit.request('GET /repos/{owner}/{repo}/installation', {
    owner,
    repo
  });

  return installation.id;
}


// Export for use as a module
export default ClaudeCodeRunner;