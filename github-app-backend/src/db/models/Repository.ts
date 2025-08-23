export interface Repository {
  id: number;
  user_id: number;
  github_repo_id: number;
  repo_name: string;
  repo_url: string;
  description?: string;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
  owner?: {
    login: string;
    type: 'User' | 'Organization';
    avatar_url?: string;
  };
  private?: boolean;
  language?: string;
  stargazers_count?: number;
  forks_count?: number;
  permissions?: {
    admin: boolean;
    maintain: boolean;
    push: boolean;
    triage: boolean;
    pull: boolean;
  };
}

export interface GitHubRepositoryData {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  private: boolean;
  updated_at: string;
  created_at: string;
  owner?: {
    login: string;
    type: 'User' | 'Organization';
    avatar_url?: string;
  };
  language?: string;
  stargazers_count?: number;
  forks_count?: number;
  permissions?: {
    admin: boolean;
    maintain: boolean;
    push: boolean;
    triage: boolean;
    pull: boolean;
  };
}

export interface RepositoryCreateInput {
  user_id: number;
  github_repo_id: number;
  repo_name: string;
  repo_url: string;
  description?: string;
}

export interface RepositoryUpdateInput {
  repo_name?: string;
  repo_url?: string;
  description?: string;
  last_synced_at?: string;
}