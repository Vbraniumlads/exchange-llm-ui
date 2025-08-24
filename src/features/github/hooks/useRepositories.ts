import { useState, useEffect, useCallback, useMemo } from 'react';
import { githubService } from '../services/github.service';
import { toast } from 'sonner';
import type { GitHubRepository, RepositoryState, RepositoryFilters } from '../types/github.types';

export function useRepositories() {
  const [state, setState] = useState<RepositoryState>({
    repositories: [],
    isLoading: true,
    isSyncing: false,
    error: null,
    filters: {
      search: '',
      sortBy: 'updated',
      sortOrder: 'desc',
    },
  });

  const fetchRepositories = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const repos = await githubService.getRepositories();
      setState(prev => ({
        ...prev,
        repositories: repos,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Failed to fetch repositories:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load repositories';
      setState(prev => ({
        ...prev,
        repositories: [],
        error: null,
        isLoading: false,
      }));
      if (!error?.message?.includes('Failed to fetch repositories')) {
        toast.error('Failed to load repositories');
      }
    }
  }, []);

  const syncRepositories = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isSyncing: true, error: null }));
      const result = await githubService.syncRepositories();
      setState(prev => ({
        ...prev,
        repositories: result.repositories,
        isSyncing: false,
      }));
      toast.success(result.message);
    } catch (error) {
      console.error('Failed to sync repositories:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync repositories';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isSyncing: false,
      }));
      toast.error('Failed to sync repositories');
    }
  }, []);

  const updateFilters = useCallback((filters: Partial<RepositoryFilters>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...filters },
    }));
  }, []);

  const filteredRepositories = useMemo(() => {
    let filtered = [...state.repositories];

    // Search filter
    if (state.filters.search) {
      const searchTerm = state.filters.search.toLowerCase();
      filtered = filtered.filter(repo =>
        repo.repo_name.toLowerCase().includes(searchTerm) ||
        repo.description?.toLowerCase().includes(searchTerm) ||
        repo.owner?.login?.toLowerCase().includes(searchTerm)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const { sortBy, sortOrder } = state.filters;
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.repo_name.localeCompare(b.repo_name);
          break;
        case 'updated':
          comparison = new Date(a.last_synced_at).getTime() - new Date(b.last_synced_at).getTime();
          break;
        case 'created':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [state.repositories, state.filters]);

  useEffect(() => {
    fetchRepositories();
  }, [fetchRepositories]);

  return {
    repositories: filteredRepositories,
    isLoading: state.isLoading,
    isSyncing: state.isSyncing,
    error: state.error,
    filters: state.filters,
    fetchRepositories,
    syncRepositories,
    updateFilters,
  };
}