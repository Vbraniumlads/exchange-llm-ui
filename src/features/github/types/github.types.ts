export interface GitHubRepository {
  // Core identifiers
  id: number;
  repo_name: string;  // From database
  name?: string;      // From GitHub API
  full_name?: string;

  // URLs
  repo_url: string;   // From database
  html_url?: string;  // From GitHub API

  // Repository metadata
  description?: string;
  private?: boolean;
  language?: string | null;

  // Statistics
  stargazers_count?: number;
  forks_count?: number;
  stars?: number;  // From GitHub API transformed response
  forks?: number;  // From GitHub API transformed response

  // Owner information
  owner?: {
    login: string;
    id?: number;
    avatar_url?: string;
    type?: 'User' | 'Organization';
  };

  // Permissions
  permissions?: {
    admin: boolean;
    maintain?: boolean;
    push: boolean;
    triage?: boolean;
    pull: boolean;
  };

  // Timestamps
  created_at: string;
  updated_at?: string;

  // Database-specific fields
  user_id?: number;
  last_synced_at?: string;
}

export interface SyncResponse {
  message: string;
  repositories: GitHubRepository[];
}

export interface RepositoryFilters {
  search?: string;
  sortBy?: 'name' | 'updated' | 'created';
  sortOrder?: 'asc' | 'desc';
}

export interface RepositoryState {
  repositories: GitHubRepository[];
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  filters: RepositoryFilters;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  html_url: string;
  user: {
    login: string;
    avatar_url: string;
  };
  labels: Array<{
    name: string;
    color: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed' | 'merged';
  html_url: string;
  user: {
    login: string;
    avatar_url: string;
  };
  head: {
    ref: string;
    sha: string;
    repo?: {
      name: string;
      full_name: string;
    };
  };
  base: {
    ref: string;
    sha: string;
    repo: {
      name: string;
      full_name: string;
    };
  };
  created_at: string;
  updated_at: string;
  merged_at?: string;
  closed_at?: string;
  draft?: boolean;
  mergeable?: boolean | null;
  mergeable_state?: string;
  merged?: boolean;
  merged_by?: {
    login: string;
    avatar_url: string;
  };
  additions?: number;
  deletions?: number;
  changed_files?: number;
  commits?: number;
  review_comments?: number;
  comments?: number;
}

export interface GitHubComment {
  id: number;
  user: {
    login: string;
    avatar_url: string;
  };
  body: string;
  created_at: string;
  updated_at: string;
  html_url: string;
  author_association: string;
}