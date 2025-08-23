export interface GitHubRepository {
  id: number;
  user_id?: number;
  name?: string;  // Used by GitHub API response
  repo_name: string;  // Used by database
  repo_url?: string;
  html_url?: string;  // GitHub API field
  description?: string;
  last_synced_at?: string;
  created_at: string;
  owner?: {
    login: string;
    id?: number;
    avatar_url?: string;
    type?: string;
  };
  permissions?: {
    admin: boolean;
    maintain?: boolean;
    push: boolean;
    triage?: boolean;
    pull: boolean;
  };
  full_name?: string;
  private?: boolean;
  language?: string | null;
  stars?: number;
  stargazers_count?: number;
  forks?: number;
  forks_count?: number;
  updated_at?: string;
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