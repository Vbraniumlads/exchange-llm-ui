import React, { useState, useEffect } from 'react';
import { X, Search, GitBranch, Lock, Globe, Building, User, Check, Loader2, ChevronDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';
import { githubService } from '../features/github/services/github.service';
import type { GitHubRepository } from '../features/github/types/github.types';

interface ConnectRepositoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (repositories: GitHubRepository[]) => void;
  existingRepositories: GitHubRepository[];
}

interface RepositoryOwner {
  login: string;
  type: 'User' | 'Organization';
  avatar_url?: string;
}

export function ConnectRepositoryModal({ 
  isOpen, 
  onClose, 
  onConnect,
  existingRepositories 
}: ConnectRepositoryModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOwner, setSelectedOwner] = useState<string>('all');
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [owners, setOwners] = useState<RepositoryOwner[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableRepositories();
    }
  }, [isOpen]);

  const fetchAvailableRepositories = async () => {
    try {
      setIsLoading(true);
      // Fetch all repositories from GitHub API
      const response = await githubService.getAllRepositories();
      
      // Filter out already connected repositories
      const connectedRepoIds = new Set(existingRepositories.map(r => r.id));
      const availableRepos = response.filter(repo => !connectedRepoIds.has(repo.id));
      
      setRepositories(availableRepos);
      
      // Extract unique owners
      const uniqueOwners = new Map<string, RepositoryOwner>();
      availableRepos.forEach(repo => {
        if (repo.owner && !uniqueOwners.has(repo.owner.login)) {
          uniqueOwners.set(repo.owner.login, {
            login: repo.owner.login,
            type: repo.owner.type as 'User' | 'Organization',
            avatar_url: repo.owner.avatar_url
          });
        }
      });
      
      setOwners(Array.from(uniqueOwners.values()).sort((a, b) => {
        // Sort organizations first, then users
        if (a.type === 'Organization' && b.type !== 'Organization') return -1;
        if (a.type !== 'Organization' && b.type === 'Organization') return 1;
        return a.login.localeCompare(b.login);
      }));
    } catch (error) {
      console.error('Failed to fetch repositories:', error);
      toast.error('Failed to load available repositories');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRepositories = repositories.filter(repo => {
    const matchesSearch = !searchQuery || 
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesOwner = selectedOwner === 'all' || 
      repo.owner?.login === selectedOwner;
    
    return matchesSearch && matchesOwner;
  });

  const toggleRepoSelection = (repoId: string) => {
    setSelectedRepos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(repoId)) {
        newSet.delete(repoId);
      } else {
        newSet.add(repoId);
      }
      return newSet;
    });
  };

  const handleConnect = async () => {
    if (selectedRepos.size === 0) {
      toast.error('Please select at least one repository');
      return;
    }

    try {
      setIsConnecting(true);
      const reposToConnect = repositories.filter(repo => 
        selectedRepos.has(repo.id.toString())
      );
      
      // Call API to connect repositories
      await githubService.connectRepositories(reposToConnect.map(r => ({
        owner: r.owner?.login || '',
        name: r.name
      })));
      
      onConnect(reposToConnect);
      toast.success(`Connected ${reposToConnect.length} repositories successfully`);
      onClose();
    } catch (error) {
      console.error('Failed to connect repositories:', error);
      toast.error('Failed to connect repositories');
    } finally {
      setIsConnecting(false);
    }
  };

  const getOwnerCount = (owner: string) => {
    return repositories.filter(r => r.owner?.login === owner).length;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Connect Repositories</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Select repositories to connect from your GitHub account and organizations
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-border space-y-4">
          {/* Info message about repository limits */}
          {repositories.length >= 100 && (
            <div className="p-3 bg-muted/50 rounded-md text-sm text-muted-foreground">
              <p>Showing {repositories.length} repositories. If you don't see all your repositories, try using the search or filter by owner.</p>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-transparent border-border"
              />
            </div>

            {/* Owner Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowOwnerDropdown(!showOwnerDropdown)}
                className="px-4 py-2 bg-transparent border border-border rounded-md hover:bg-muted transition-colors flex items-center gap-2 min-w-[200px]"
              >
                {selectedOwner === 'all' ? (
                  <>
                    <GitBranch className="w-4 h-4" />
                    <span>All Owners</span>
                  </>
                ) : (
                  <>
                    {owners.find(o => o.login === selectedOwner)?.type === 'Organization' ? (
                      <Building className="w-4 h-4" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                    <span className="truncate">{selectedOwner}</span>
                  </>
                )}
                <ChevronDown className="w-4 h-4 ml-auto" />
              </button>

              {showOwnerDropdown && (
                <div className="absolute top-full mt-2 w-full bg-background border border-border rounded-md shadow-lg z-10 max-h-64 overflow-y-auto">
                  <button
                    onClick={() => {
                      setSelectedOwner('all');
                      setShowOwnerDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-muted transition-colors flex items-center gap-2"
                  >
                    <GitBranch className="w-4 h-4" />
                    <span>All Owners</span>
                    <span className="ml-auto text-sm text-muted-foreground">
                      {repositories.length}
                    </span>
                  </button>
                  {owners.map(owner => (
                    <button
                      key={owner.login}
                      onClick={() => {
                        setSelectedOwner(owner.login);
                        setShowOwnerDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-muted transition-colors flex items-center gap-2"
                    >
                      {owner.type === 'Organization' ? (
                        <Building className="w-4 h-4 text-blue-500" />
                      ) : (
                        <User className="w-4 h-4 text-gray-500" />
                      )}
                      <span className="truncate">{owner.login}</span>
                      <span className="ml-auto text-sm text-muted-foreground">
                        {getOwnerCount(owner.login)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Selection Summary */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {filteredRepositories.length} repositories available
            </span>
            {selectedRepos.size > 0 && (
              <span className="text-foreground font-medium">
                {selectedRepos.size} selected
              </span>
            )}
          </div>
        </div>

        {/* Repository List */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Loading repositories...</span>
            </div>
          ) : filteredRepositories.length === 0 ? (
            <div className="text-center py-12">
              <GitBranch className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No repositories found</p>
              {searchQuery && (
                <p className="text-sm text-muted-foreground mt-2">
                  Try adjusting your search criteria
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRepositories.map((repo) => (
                <Card
                  key={repo.id}
                  onClick={() => toggleRepoSelection(repo.id.toString())}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedRepos.has(repo.id.toString())
                      ? 'border-cta-500 bg-cta-50/5'
                      : 'border-border hover:border-foreground/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {repo.owner?.type === 'Organization' ? (
                          <Building className="w-4 h-4 text-blue-500" />
                        ) : (
                          <User className="w-4 h-4 text-gray-500" />
                        )}
                        <h4 className="font-medium text-foreground truncate">
                          {repo.owner?.login}/{repo.name}
                        </h4>
                        {repo.private ? (
                          <Lock className="w-3 h-3 text-muted-foreground" />
                        ) : (
                          <Globe className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {repo.description || 'No description'}
                      </p>
                      {repo.language && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="w-2 h-2 rounded-full bg-cta-500" />
                          <span className="text-xs text-muted-foreground">
                            {repo.language}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      selectedRepos.has(repo.id.toString())
                        ? 'border-cta-500 bg-cta-500'
                        : 'border-border'
                    }`}>
                      {selectedRepos.has(repo.id.toString()) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isConnecting}
            className="bg-transparent border-border"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConnect}
            disabled={selectedRepos.size === 0 || isConnecting}
            className="bg-cta-500 hover:bg-cta-600 text-white"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                Connect {selectedRepos.size > 0 && `(${selectedRepos.size})`}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}