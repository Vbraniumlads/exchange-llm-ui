import axios from 'axios';
import jwt from 'jsonwebtoken';

// GitHub API Repository interface
interface GitHubApiRepository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  updated_at: string;
  private: boolean;
  owner: {
    login: string;
    id: number;
    avatar_url: string;
    type: string;
  };
  topics: string[];
  default_branch: string;
  clone_url: string;
  ssh_url: string;
  size: number;
  open_issues_count: number;
  permissions?: {
    admin: boolean;
    maintain?: boolean;
    push: boolean;
    triage?: boolean;
    pull: boolean;
  };
}

// Simplified repository interface for the UI
export interface Repository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
  updated_at: string;
  private: boolean;
  owner: {
    login: string;
    id: number;
    avatar_url: string;
    type: string;
  };
  topics: string[];
  default_branch: string;
  clone_url: string;
  ssh_url: string;
  size: number;
  open_issues: number;
  permissions?: {
    admin: boolean;
    maintain?: boolean;
    push: boolean;
    triage?: boolean;
    pull: boolean;
  } | undefined;
}

export interface RepositoriesResponse {
  repositories: Repository[];
  totalCount: number;
  hasNextPage: boolean;
}

interface JWTPayload {
  userId: number;
  username: string;
  name: string;
  avatar_url: string;
  email: string;
  githubToken: string;
  iat?: number;
  exp?: number;
}

class GitHubRepositoriesService {
  private readonly baseUrl = 'https://api.github.com';

  /**
   * Extract GitHub token from JWT authorization header
   */
  private extractGitHubToken(authorizationHeader: string | undefined): string {
    if (!authorizationHeader) {
      throw new Error('Authorization header is required');
    }

    const token = authorizationHeader.replace('Bearer ', '');
    if (!token) {
      throw new Error('No token provided');
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your-jwt-secret'
      ) as JWTPayload;

      if (!decoded.githubToken) {
        throw new Error('GitHub token not found in JWT');
      }

      return decoded.githubToken;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid JWT token');
      }
      throw error;
    }
  }

  /**
   * Transform GitHub API repository to our simplified format
   */
  private transformRepository(repo: GitHubApiRepository): Repository {
    return {
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      html_url: repo.html_url,
      description: repo.description,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language,
      updated_at: repo.updated_at,
      private: repo.private,
      owner: {
        login: repo.owner.login,
        id: repo.owner.id,
        avatar_url: repo.owner.avatar_url,
        type: repo.owner.type,
      },
      topics: repo.topics || [],
      default_branch: repo.default_branch,
      clone_url: repo.clone_url,
      ssh_url: repo.ssh_url,
      size: repo.size,
      open_issues: repo.open_issues_count,
      permissions: repo.permissions,
    };
  }

  /**
   * Fetch user repositories from GitHub API
   */
  async fetchRepositories(
    authorizationHeader: string | undefined,
    options: {
      page?: number;
      per_page?: number;
      sort?: 'created' | 'updated' | 'pushed' | 'full_name';
      direction?: 'asc' | 'desc';
      type?: 'all' | 'owner' | 'member';
      visibility?: 'all' | 'public' | 'private';
    } = {}
  ): Promise<RepositoriesResponse> {
    try {
      const githubToken = this.extractGitHubToken(authorizationHeader);

      const {
        page = 1,
        per_page = 30,
        sort = 'updated',
        direction = 'desc',
        type,
        visibility
      } = options;

      const response = await axios.get<GitHubApiRepository[]>(
        `${this.baseUrl}/user/repos`,
        {
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Claude-Todo-GitHub-App',
          },
          params: {
            page,
            per_page,
            sort,
            direction,
            ...(type && { type }),
            ...(visibility && { visibility }),
          },
        }
      );

      const repositories = response.data.map(repo => this.transformRepository(repo));

      // Check if there are more pages by looking at Link header
      const linkHeader = response.headers.link;
      const hasNextPage = linkHeader ? linkHeader.includes('rel="next"') : false;

      return {
        repositories,
        totalCount: repositories.length, // Note: GitHub doesn't provide total count in this endpoint
        hasNextPage,
      };

    } catch (error) {
      console.error('❌ Error fetching repositories:', error);

      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 401) {
          throw new Error('GitHub authentication failed. Please re-authenticate.');
        }
        if (status === 403) {
          throw new Error('GitHub API rate limit exceeded or insufficient permissions.');
        }
        if (typeof status === 'number' && status >= 500) {
          throw new Error('GitHub API is currently unavailable. Please try again later.');
        }

        throw new Error(
          `GitHub API error: ${error.response?.data?.message || error.message}`
        );
      }

      throw error;
    }
  }

  /**
   * Fetch a specific repository by owner and name
   */
  async fetchRepository(
    authorizationHeader: string | undefined,
    owner: string,
    repo: string
  ): Promise<Repository> {
    try {
      const githubToken = this.extractGitHubToken(authorizationHeader);

      const response = await axios.get<GitHubApiRepository>(
        `${this.baseUrl}/repos/${owner}/${repo}`,
        {
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Claude-Todo-GitHub-App',
          },
        }
      );

      return this.transformRepository(response.data);

    } catch (error) {
      console.error(`❌ Error fetching repository ${owner}/${repo}:`, error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`Repository ${owner}/${repo} not found or not accessible.`);
        }
        if (error.response?.status === 401) {
          throw new Error('GitHub authentication failed. Please re-authenticate.');
        }
        if (error.response?.status === 403) {
          throw new Error('Insufficient permissions to access this repository.');
        }

        throw new Error(
          `GitHub API error: ${error.response?.data?.message || error.message}`
        );
      }

      throw error;
    }
  }

  /**
   * Search repositories for the authenticated user
   */
  async searchRepositories(
    authorizationHeader: string | undefined,
    query: string,
    options: {
      page?: number;
      per_page?: number;
      sort?: 'stars' | 'forks' | 'help-wanted-issues' | 'updated';
      order?: 'asc' | 'desc';
    } = {}
  ): Promise<RepositoriesResponse> {
    try {
      const githubToken = this.extractGitHubToken(authorizationHeader);

      const {
        page = 1,
        per_page = 30,
        sort = 'updated',
        order = 'desc'
      } = options;

      // Get the authenticated user first to filter by user
      const userResponse = await axios.get(
        `${this.baseUrl}/user`,
        {
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Claude-Todo-GitHub-App',
          },
        }
      );

      const username = userResponse.data.login;
      const searchQuery = `${query} user:${username}`;

      const response = await axios.get(
        `${this.baseUrl}/search/repositories`,
        {
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Claude-Todo-GitHub-App',
          },
          params: {
            q: searchQuery,
            page,
            per_page,
            sort,
            order,
          },
        }
      );

      const repositories = response.data.items.map((repo: GitHubApiRepository) =>
        this.transformRepository(repo)
      );

      return {
        repositories,
        totalCount: response.data.total_count,
        hasNextPage: repositories.length === per_page && page * per_page < response.data.total_count,
      };

    } catch (error) {
      console.error('❌ Error searching repositories:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('GitHub authentication failed. Please re-authenticate.');
        }
        if (error.response?.status === 403) {
          throw new Error('GitHub API rate limit exceeded.');
        }
        if (error.response?.status === 422) {
          throw new Error('Invalid search query.');
        }

        throw new Error(
          `GitHub API error: ${error.response?.data?.message || error.message}`
        );
      }

      throw error;
    }
  }

  /**
   * Fetch issues for a repository
   */
  async fetchIssues(
    authorizationHeader: string | undefined,
    owner: string,
    repo: string,
    options: {
      page?: number;
      per_page?: number;
      state?: 'open' | 'closed' | 'all';
    } = {}
  ) {
    try {
      const githubToken = this.extractGitHubToken(authorizationHeader);

      const {
        page = 1,
        per_page = 30,
        state = 'open'
      } = options;

      const response = await axios.get(
        `${this.baseUrl}/repos/${owner}/${repo}/issues`,
        {
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Claude-Todo-GitHub-App',
          },
          params: {
            page,
            per_page,
            state,
          },
        }
      );

      // Filter out pull requests - they have a pull_request property
      const issues = response.data.filter((item: any) => !item.pull_request);
      
      return issues;

    } catch (error) {
      console.error('❌ Error fetching issues:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('GitHub authentication failed. Please re-authenticate.');
        }
        if (error.response?.status === 404) {
          throw new Error('Repository not found.');
        }
        if (error.response?.status === 403) {
          throw new Error('GitHub API rate limit exceeded or insufficient permissions.');
        }

        throw new Error(
          `GitHub API error: ${error.response?.data?.message || error.message}`
        );
      }

      throw error;
    }
  }

  /**
   * Fetch a specific pull request by number
   */
  async fetchPullRequestDetail(
    authorizationHeader: string | undefined,
    owner: string,
    repo: string,
    pullNumber: number
  ) {
    try {
      const githubToken = this.extractGitHubToken(authorizationHeader);

      const response = await axios.get(
        `${this.baseUrl}/repos/${owner}/${repo}/pulls/${pullNumber}`,
        {
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Claude-Todo-GitHub-App',
          },
        }
      );

      return response.data;

    } catch (error) {
      console.error('❌ Error fetching pull request details:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('GitHub authentication failed. Please re-authenticate.');
        }
        if (error.response?.status === 404) {
          throw new Error('Pull request not found.');
        }
        if (error.response?.status === 403) {
          throw new Error('GitHub API rate limit exceeded or insufficient permissions.');
        }

        throw new Error(
          `GitHub API error: ${error.response?.data?.message || error.message}`
        );
      }

      throw error;
    }
  }

  /**
   * Fetch comments for an issue
   */
  async fetchIssueComments(
    authorizationHeader: string | undefined,
    owner: string,
    repo: string,
    issueNumber: number
  ) {
    try {
      const githubToken = this.extractGitHubToken(authorizationHeader);

      const response = await axios.get(
        `${this.baseUrl}/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
        {
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Claude-Todo-GitHub-App',
          },
        }
      );

      return response.data;

    } catch (error) {
      console.error('❌ Error fetching issue comments:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('GitHub authentication failed. Please re-authenticate.');
        }
        if (error.response?.status === 404) {
          throw new Error('Issue not found.');
        }
        if (error.response?.status === 403) {
          throw new Error('GitHub API rate limit exceeded or insufficient permissions.');
        }

        throw new Error(
          `GitHub API error: ${error.response?.data?.message || error.message}`
        );
      }

      throw error;
    }
  }

  /**
   * Fetch comments for a pull request
   */
  async fetchPullRequestComments(
    authorizationHeader: string | undefined,
    owner: string,
    repo: string,
    pullNumber: number
  ) {
    try {
      const githubToken = this.extractGitHubToken(authorizationHeader);

      const response = await axios.get(
        `${this.baseUrl}/repos/${owner}/${repo}/issues/${pullNumber}/comments`,
        {
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Claude-Todo-GitHub-App',
          },
        }
      );

      return response.data;

    } catch (error) {
      console.error('❌ Error fetching pull request comments:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('GitHub authentication failed. Please re-authenticate.');
        }
        if (error.response?.status === 404) {
          throw new Error('Pull request not found.');
        }
        if (error.response?.status === 403) {
          throw new Error('GitHub API rate limit exceeded or insufficient permissions.');
        }

        throw new Error(
          `GitHub API error: ${error.response?.data?.message || error.message}`
        );
      }

      throw error;
    }
  }

  /**
   * Fetch pull requests for a repository
   */
  async fetchPullRequests(
    authorizationHeader: string | undefined,
    owner: string,
    repo: string,
    options: {
      page?: number;
      per_page?: number;
      state?: 'open' | 'closed' | 'all';
    } = {}
  ) {
    try {
      const githubToken = this.extractGitHubToken(authorizationHeader);

      const {
        page = 1,
        per_page = 30,
        state = 'open'
      } = options;

      const response = await axios.get(
        `${this.baseUrl}/repos/${owner}/${repo}/pulls`,
        {
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Claude-Todo-GitHub-App',
          },
          params: {
            page,
            per_page,
            state,
          },
        }
      );

      return response.data;

    } catch (error) {
      console.error('❌ Error fetching pull requests:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('GitHub authentication failed. Please re-authenticate.');
        }
        if (error.response?.status === 404) {
          throw new Error('Repository not found.');
        }
        if (error.response?.status === 403) {
          throw new Error('GitHub API rate limit exceeded or insufficient permissions.');
        }

        throw new Error(
          `GitHub API error: ${error.response?.data?.message || error.message}`
        );
      }

      throw error;
    }
  }
}

export const githubRepositoriesService = new GitHubRepositoriesService();