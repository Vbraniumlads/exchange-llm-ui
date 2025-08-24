import React, { useState, useMemo } from 'react';
import { Search, ExternalLink, Star, GitFork, Eye, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { GitHubRepository } from '../features/github/types/github.types';
import { useNavigate } from 'react-router-dom';

interface RepositorySearchProps {
  repositories: GitHubRepository[];
  className?: string;
}

export function RepositorySearch({ repositories, className = '' }: RepositorySearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  // Filter repositories based on search query
  const filteredResults = useMemo(() => {
    if (!query.trim()) return [];
    
    const searchTerm = query.trim().toLowerCase();
    return repositories.filter(repo =>
      repo.repo_name.toLowerCase().includes(searchTerm) ||
      repo.description?.toLowerCase().includes(searchTerm) ||
      repo.owner?.login?.toLowerCase().includes(searchTerm)
    );
  }, [repositories, query]);

  const clearSearch = () => {
    setQuery('');
  };

  const handleViewDetails = (repo: GitHubRepository) => {
    // Extract owner from URL or use owner object
    let owner;
    if (repo.owner?.login) {
      owner = repo.owner.login;
    } else {
      const urlParts = repo.repo_url.split('/');
      owner = urlParts[urlParts.length - 2];
    }
    navigate(`/repository/${owner}/${repo.repo_name}`);
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

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="Search by name, description, or owner..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 min-h-[44px] rounded-sm text-sm sm:text-base bg-transparent border-border focus:border-foreground"
          />
        </div>
        {query && (
          <Button
            onClick={clearSearch}
            variant="outline"
            className="px-4 py-3 sm:py-2 min-h-[44px] sm:min-h-auto rounded-sm whitespace-nowrap bg-transparent border-border hover:bg-muted/10 text-foreground"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Results Overlay - Mobile optimized */}
      {query.trim() && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-background border border-border rounded-sm shadow-lg max-w-full overflow-hidden sm:rounded-lg">
          <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 max-h-[70vh] sm:max-h-96 overflow-y-auto">
          {/* Results Header */}
          {filteredResults.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Found {filteredResults.length} of {repositories.length} repositories
              </p>
            </div>
          )}

          {/* Results List */}
          {filteredResults.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {filteredResults.map((repo) => (
                <Card 
                  key={repo.id}
                  className="bg-transparent hover:bg-muted/10 transition-all duration-200 border-border hover:border-foreground group rounded-sm"
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0">
                      <div className="flex-1 min-w-0">
                        {/* Repository Name */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
                          <h4 className="font-semibold text-foreground group-hover:text-foreground transition-colors truncate text-sm sm:text-base">
                            {repo.repo_name}
                          </h4>
                          {repo.private && (
                            <span className="inline-flex items-center px-2 py-1 rounded-sm text-xs font-medium bg-transparent text-muted-foreground border border-border self-start">
                              Private
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 line-clamp-2">
                          {repo.description || 'No description available'}
                        </p>

                        {/* Metadata - Stack on mobile */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-3 sm:gap-4">
                            {repo.language && (
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full border border-foreground bg-transparent"></div>
                                <span>{repo.language}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              <span>{repo.stargazers_count || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <GitFork className="w-3 h-3" />
                              <span>{repo.forks_count || 0}</span>
                            </div>
                          </div>
                          <span className="sm:ml-auto">Updated {formatDate(repo.updated_at)}</span>
                        </div>
                      </div>

                      {/* Action Buttons - Full width on mobile */}
                      <div className="flex gap-2 sm:ml-4 w-full sm:w-auto">
                        <Button
                          size="sm"
                          onClick={() => handleViewDetails(repo)}
                          className="bg-transparent border-foreground hover:bg-muted/10 text-foreground flex-1 sm:flex-none min-h-[44px] sm:min-h-auto rounded-sm"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="min-h-[44px] sm:min-h-auto rounded-sm bg-transparent border-border hover:bg-muted/10"
                          asChild
                        >
                          <a
                            href={repo.repo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center justify-center"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-transparent border-dashed border-border rounded-sm">
              <CardContent className="p-4 sm:p-8 text-center">
                <AlertCircle className="w-8 h-8 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                <h4 className="text-base sm:text-lg font-medium text-foreground mb-2">No repositories found</h4>
                <p className="text-sm text-muted-foreground">
                  Try a different search term or check your spelling
                </p>
              </CardContent>
            </Card>
          )}
          </div>
        </div>
      )}
    </div>
  );
}
