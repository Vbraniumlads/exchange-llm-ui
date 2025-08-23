import { apiClient } from '../../../shared/services/api.service';
import type { GitHubRepository, SyncResponse, GitHubIssue, GitHubPullRequest, GitHubComment } from '../types/github.types';

export class GitHubService {
  async getRepositories(): Promise<GitHubRepository[]> {
    return apiClient.get<GitHubRepository[]>('/repositories');
  }

  async syncRepositories(): Promise<SyncResponse> {
    return apiClient.post<SyncResponse>('/repositories/sync');
  }

  async getAllRepositories(): Promise<GitHubRepository[]> {
    return apiClient.get<GitHubRepository[]>('/repositories/available');
  }

  async connectRepositories(repositories: Array<{ owner: string; name: string }>): Promise<SyncResponse> {
    return apiClient.post<SyncResponse>('/repositories/connect', { repositories });
  }

  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    return apiClient.get<GitHubRepository>(`/repositories/${owner}/${repo}`);
  }

  async getRepositoryIssues(owner: string, repo: string, params?: {
    page?: number;
    state?: 'open' | 'closed' | 'all';
  }): Promise<GitHubIssue[]> {
    const queryString = params ? new URLSearchParams(
      Object.entries(params).filter(([_, value]) => value !== undefined)
        .map(([key, value]) => [key, String(value)])
    ).toString() : '';
    const url = `/repositories/${owner}/${repo}/issues${queryString ? `?${queryString}` : ''}`;
    return apiClient.get<GitHubIssue[]>(url);
  }

  async getRepositoryPullRequests(owner: string, repo: string, params?: {
    page?: number;
    state?: 'open' | 'closed' | 'all';
  }): Promise<GitHubPullRequest[]> {
    const queryString = params ? new URLSearchParams(
      Object.entries(params).filter(([_, value]) => value !== undefined)
        .map(([key, value]) => [key, String(value)])
    ).toString() : '';
    const url = `/repositories/${owner}/${repo}/pulls${queryString ? `?${queryString}` : ''}`;
    return apiClient.get<GitHubPullRequest[]>(url);
  }

  async getPullRequestDetail(owner: string, repo: string, pullNumber: number): Promise<GitHubPullRequest> {
    return apiClient.get<GitHubPullRequest>(`/repositories/${owner}/${repo}/pulls/${pullNumber}`);
  }

  async getIssueComments(owner: string, repo: string, issueNumber: number): Promise<GitHubComment[]> {
    return apiClient.get<GitHubComment[]>(`/repositories/${owner}/${repo}/issues/${issueNumber}/comments`);
  }

  async getPullRequestComments(owner: string, repo: string, pullNumber: number): Promise<GitHubComment[]> {
    return apiClient.get<GitHubComment[]>(`/repositories/${owner}/${repo}/pulls/${pullNumber}/comments`);
  }

  async createIssue(owner: string, repo: string, issueData: {
    title: string;
    description: string;
    labels?: string[];
  }): Promise<GitHubIssue> {
    const payload = {
      repository: {
        owner,
        name: repo
      },
      issue: {
        title: issueData.title,
        body: issueData.description,
        labels: issueData.labels || []
      }
    };

    const response = await apiClient.post<{
      success: boolean;
      issue: {
        number: number;
        title: string;
        url: string;
        created_at: string;
      };
      message: string;
    }>('/generate-issue', payload);

    // Transform the response to match GitHubIssue interface
    return {
      id: response.issue.number,
      number: response.issue.number,
      title: response.issue.title,
      body: issueData.description,
      state: 'open' as const,
      html_url: response.issue.url,
      user: {
        login: 'vibe-torch-bot',
        avatar_url: ''
      },
      labels: issueData.labels?.map(name => ({ name, color: 'cta-500' })) || [],
      created_at: response.issue.created_at,
      updated_at: response.issue.created_at
    };
  }

  async dispatchWorkflow(
    owner: string,
    repo: string,
    workflowId: string,
    inputs: Record<string, any> = {},
    ref: string = 'main'
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>(
      '/workflows/dispatch',
      { owner, repo, workflowId, ref, inputs }
    );
  }

  async getAppInstallationStatus(owner: string, repo: string): Promise<{ installed: boolean; installationId?: number }> {
    return apiClient.get<{ installed: boolean; installationId?: number }>(`/workflows/installation-status/${owner}/${repo}`);
  }
}

export const githubService = new GitHubService();