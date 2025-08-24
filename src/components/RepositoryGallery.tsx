import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, GitBranch, Star, Eye, Clock, Folder, ExternalLink } from 'lucide-react';
import { useAuth } from "@/contexts/AuthContext";
import { githubService } from '../features/github/services/github.service';
import type { GitHubRepository } from '../features/github/types/github.types';
import { toast } from 'sonner';

interface RepositoryGalleryProps {
  onRepositorySelect?: (repo: GitHubRepository) => void;
}

export function RepositoryGallery({ onRepositorySelect }: RepositoryGalleryProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<GitHubRepository[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRepositories = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const repos = await githubService.getRepositories();
        setRepositories(repos);
        setFilteredRepos(repos);
      } catch (err) {
        console.error('Error fetching repositories:', err);
        setRepositories([]);
        setFilteredRepos([]);
        if (!err?.message?.includes('Failed to fetch repositories')) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to fetch repositories';
          setError(errorMessage);
          toast.error(errorMessage);
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchRepositories();
    }
  }, [user]);

  // Filter repositories based on search query
  useEffect(() => {
    const filtered = repositories.filter(repo =>
      repo.repo_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.owner?.login?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredRepos(filtered);
  }, [searchQuery, repositories]);

  const handleViewDetails = (repo: GitHubRepository) => {
    // Extract owner from repo_url
    const urlParts = repo.repo_url.split('/');
    const owner = urlParts[urlParts.length - 2];
    navigate(`/repository/${owner}/${repo.repo_name}`);
  };

  const getLanguageColor = (language: string) => {
    const colors: Record<string, string> = {
      'TypeScript': 'bg-blue-500',
      'JavaScript': 'bg-yellow-500',
      'Python': 'bg-green-500',
      'React': 'bg-cyan-500',
      'React Native': 'bg-purple-500',
      'Java': 'bg-orange-500',
      'Go': 'bg-indigo-500',
    };
    return colors[language] || 'bg-gray-500';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `${Math.ceil(diffDays / 30)} months ago`;
  };

  const handleSyncRepositories = async () => {
    try {
      setIsLoading(true);
      await githubService.syncRepositories();
      const repos = await githubService.getRepositories();
      setRepositories(repos);
      setFilteredRepos(repos);
      toast.success('Repositories synced successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync repositories';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cta-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Your Repositories
            </h1>
            <p className="text-muted-foreground">
              View repository details, manage issues, and create tasks
            </p>
          </div>
          <Button
            onClick={handleSyncRepositories}
            disabled={isLoading}
            className="bg-cta-500 hover:bg-cta-600 text-white"
          >
            {isLoading ? 'Syncing...' : 'Sync Repositories'}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <input
          type="text"
          placeholder="Search repositories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-cta-500 focus:border-transparent"
        />
      </div>

      {/* Repository Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRepos.map((repo) => (
          <Card 
            key={repo.id}
            className="hover:shadow-lg transition-all duration-200 border-border/50 hover:border-cta-500/50 group"
          >
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Folder className="w-5 h-5 text-cta-600" />
                  <h3 className="font-semibold text-foreground group-hover:text-cta-600 transition-colors truncate">
                    {repo.repo_name}
                  </h3>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2 h-10">
                {repo.description || 'No description available'}
              </p>

              {/* Updated */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
                <Clock className="w-3 h-3" />
                <span>Updated {formatDate(repo.last_synced_at)}</span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleViewDetails(repo)}
                  className="flex-1 bg-cta-500 hover:bg-cta-600 text-white"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Details
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                >
                  <a
                    href={repo.repo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No results */}
      {filteredRepos.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Folder className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No repositories found</p>
        </div>
      )}
      </div>
    </div>
  );
}