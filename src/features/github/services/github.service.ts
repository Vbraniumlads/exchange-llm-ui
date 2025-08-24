import { apiClient } from '../../../shared/services/api.service';
import { cacheService } from '../../../shared/services/cache.service';
import type { GitHubRepository, SyncResponse, GitHubIssue, GitHubPullRequest, GitHubComment } from '../types/github.types';

export class GitHubService {
  private readonly CACHE_KEYS = {
    REPOSITORIES: 'repositories',
    ALL_REPOSITORIES: 'all_repositories'
  };

  async getRepositories(): Promise<GitHubRepository[]> {
    // Use cache service's withCache helper for cleaner code
    return cacheService.withCache(
      this.CACHE_KEYS.REPOSITORIES,
      () => apiClient.get<GitHubRepository[]>('/repositories')
    );
  }

  async syncRepositories(): Promise<SyncResponse> {
    // Clear repositories cache when syncing
    cacheService.clear('repositories');

    const result = await apiClient.post<SyncResponse>('/repositories/sync');

    // Cache the new repositories data
    if (result.repositories) {
      cacheService.set(this.CACHE_KEYS.REPOSITORIES, result.repositories);
    }

    return result;
  }

  async getAllRepositories(): Promise<GitHubRepository[]> {
    // Cache available repositories with a shorter duration (2 minutes)
    return cacheService.withCache(
      this.CACHE_KEYS.ALL_REPOSITORIES,
      () => apiClient.get<GitHubRepository[]>('/repositories/available'),
      { duration: 2 * 60 * 1000 } // 2 minutes cache
    );
  }

  async connectRepositories(repositories: Array<{ owner: string; name: string }>): Promise<SyncResponse> {
    // Clear repositories cache when connecting new repositories
    cacheService.clear('repositories');

    const result = await apiClient.post<SyncResponse>('/repositories/connect', { repositories });

    // Cache the new repositories data
    if (result.repositories) {
      cacheService.set(this.CACHE_KEYS.REPOSITORIES, result.repositories);
    }

    return result;
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
    repositoryId: number,
    workflowId: string,
    inputs: Record<string, any> = {},
    ref: string = 'main'
  ): Promise<{ success: boolean; message: string }> {
    const payload: any = { owner, repo, repositoryId, workflowId, ref, inputs };

    return apiClient.post<{ success: boolean; message: string }>(
      '/workflows/dispatch',
      payload
    );
  }

  async getAppInstallationStatus(owner: string, repo: string): Promise<{ installed: boolean; installationId?: number }> {
    return apiClient.get<{ installed: boolean; installationId?: number }>(`/workflows/installation-status/${owner}/${repo}`);
  }
}

export const githubService = new GitHubService();