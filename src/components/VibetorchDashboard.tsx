import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import TaskManagement from "./TaskManagement";
import { useAuth } from "@/contexts/AuthContext";
import { GitHubConnectButton } from "./GitHubConnectButton";
import { RepositorySearch } from "./RepositorySearch";
import { ConnectRepositoryModal } from "./ConnectRepositoryModal";
import { toast } from 'sonner';
import { githubService } from "../features/github/services/github.service";
import type { GitHubRepository } from "../features/github/types/github.types";
import { Eye, Building, User, Plus } from 'lucide-react';

const VibetorchDashboard: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [sliderMode, setSliderMode] = useState(0); // 0: Maintainer, 1: Off, 2: Pioneer
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState(50); // Temporary position during drag
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showGlow, setShowGlow] = useState(false);
  const [showFillAnimation, setShowFillAnimation] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  
  const sliderRef = useRef<HTMLDivElement>(null);

  const modes = React.useMemo(() => [
    { name: 'Maintainer', desc: 'Let the AI maintain your repositories', pos: 0 },
    { name: 'Off', desc: 'AI agent is disabled for all repositories', pos: 50 },
    { name: 'Pioneer', desc: 'AI suggests new features, architecture improvements, and innovations', pos: 100 }
  ], []);

  // Fetch repositories on component mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchRepositories();
    }
  }, [isAuthenticated]);

  const fetchRepositories = async () => {
    try {
      setIsLoading(true);
      const repos = await githubService.getRepositories();
      setRepositories(repos);
    } catch (error) {
      console.error('Failed to fetch repositories:', error);
      setRepositories([]);
      if (!error?.message?.includes('Failed to fetch repositories')) {
        toast.error('Failed to load repositories');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const syncRepositories = async () => {
    try {
      setIsLoading(true);
      const result = await githubService.syncRepositories();
      setRepositories(result.repositories);
      toast.success(result.message);
    } catch (error) {
      console.error('Failed to sync repositories:', error);
      toast.error('Failed to sync repositories');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging && sliderRef.current) {
        const rect = sliderRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setDragPosition(percentage);
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDragging && sliderRef.current) {
        let closestIndex = 0;
        let minDistance = Math.abs(dragPosition - modes[0].pos);
        
        modes.forEach((mode, index) => {
          const distance = Math.abs(dragPosition - mode.pos);
          if (distance < minDistance) {
            minDistance = distance;
            closestIndex = index;
          }
        });
        
        updateSliderMode(closestIndex);
        setDragPosition(modes[closestIndex].pos);
      }
      setIsDragging(false);
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (isDragging && sliderRef.current) {
        const rect = sliderRef.current.getBoundingClientRect();
        const x = e.touches[0].clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setDragPosition(percentage);
      }
    };

    const handleGlobalTouchEnd = () => {
      if (isDragging && sliderRef.current) {
        let closestIndex = 0;
        let minDistance = Math.abs(dragPosition - modes[0].pos);
        
        modes.forEach((mode, index) => {
          const distance = Math.abs(dragPosition - mode.pos);
          if (distance < minDistance) {
            minDistance = distance;
            closestIndex = index;
          }
        });
        
        updateSliderMode(closestIndex);
        setDragPosition(modes[closestIndex].pos);
      }
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('touchmove', handleGlobalTouchMove);
      document.addEventListener('touchend', handleGlobalTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isDragging, dragPosition, modes]);

  // Sync dragPosition with sliderMode when not dragging
  useEffect(() => {
    if (!isDragging) {
      setDragPosition(modes[sliderMode].pos);
    }
  }, [sliderMode, isDragging, modes]);

  // Initialize slider position to center (Off mode) on component mount
  useEffect(() => {
    setSliderMode(1); // Set to Off mode (center position)
    setDragPosition(50);
  }, []);

  const updateSliderMode = (index: number) => {
    setSliderMode(index);
    
    // Fire event when slider moves to left (Maintainer) or right (Pioneer)
    if (index === 0) {
      console.log('Slider fired: Moved to LEFT (Maintainer mode)');
      toast.success('Maintainer mode activated!');
    } else if (index === 2) {
      console.log('Slider fired: Moved to RIGHT (Pioneer mode)');
      toast.success('Pioneer mode activated!');
    }
    
    // Show fill animation first, then glow effect
    if (index !== 1) { // Only show animation for non-center positions
      setShowFillAnimation(true);
      setTimeout(() => {
        setShowFillAnimation(false);
      }, 800); // Animation duration
    }
    
    // Add glow effect after 0.5 seconds when positioned at 0, 1, or 2
    setTimeout(() => {
      setShowGlow(true);
      // Remove glow after 1 second
      setTimeout(() => {
        setShowGlow(false);
      }, 1000);
    }, 500);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    if (sliderRef.current) {
      const rect = sliderRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setDragPosition(percentage);
    }
    e.preventDefault();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    if (sliderRef.current) {
      const rect = sliderRef.current.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setDragPosition(percentage);
    }
    e.preventDefault();
  };

  const getLanguageColor = (language: string) => {
    const colors = {
      'TypeScript': 'bg-blue-500',
      'Python': 'bg-green-500', 
      'JavaScript': 'bg-yellow-500',
      'Swift': 'bg-orange-500',
      'Go': 'bg-cyan-500'
    };
    return colors[language as keyof typeof colors] || 'bg-gray-500';
  };

  const getActivityStatus = (lastSynced: string) => {
    const lastSyncedDate = new Date(lastSynced);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - lastSyncedDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'active';
    if (diffInDays <= 7) return 'maintenance';
    return 'archived';
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      'active': 'bg-transparent text-foreground border-foreground',
      'maintenance': 'bg-transparent text-muted-foreground border-muted-foreground',
      'archived': 'bg-transparent text-muted-foreground border-border'
    };
    return badges[status as keyof typeof badges] || badges.active;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    
    if (diffInDays > 30) return `${Math.floor(diffInDays / 30)} month${Math.floor(diffInDays / 30) > 1 ? 's' : ''} ago`;
    if (diffInDays > 0) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    if (diffInHours > 0) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const handleViewDetails = (repo: GitHubRepository) => {
    // Use owner from repository data if available, otherwise extract from URL
    let owner;
    if (repo.owner?.login) {
      owner = repo.owner.login;
    } else {
      const urlParts = repo.repo_url.split('/');
      owner = urlParts[urlParts.length - 2];
    }
    navigate(`/repository/${owner}/${repo.repo_name}`);
  };

  const isOrganizationRepo = (repo: GitHubRepository) => {
    return repo.owner?.type === 'Organization';
  };

  const getPermissionBadge = (repo: GitHubRepository) => {
    if (!repo.permissions) return null;
    
    if (repo.permissions.admin) return 'Admin';
    if (repo.permissions.maintain) return 'Maintain';
    if (repo.permissions.push) return 'Write';
    if (repo.permissions.triage) return 'Triage';
    if (repo.permissions.pull) return 'Read';
    return null;
  };

  const handleRepositoriesConnected = (newRepos: GitHubRepository[]) => {
    setRepositories(prev => [...prev, ...newRepos]);
    setShowConnectModal(false);
  };

  return (
    <div className="h-full font-sans px-4 py-6 sm:p-8 pt-36 sm:pt-20 md:pt-24 space-y-4 sm:space-y-6 md:space-y-8 w-full sm:w-[95%] md:w-[90%] lg:w-[85%] mx-auto">
      {/* Mode description section */}
      <div className="w-full">
                  <div className="rounded-sm p-4 sm:p-6 bg-background text-center w-full sm:w-[90%] md:w-[80%] lg:w-[70%] xl:w-[60%] mx-auto">
            <h1 className="text-lg sm:text-xl md:text-2xl font-sans font-bold mb-2 pb-4 sm:pb-6 text-foreground">
              Torch Mode
            </h1>
            
            <div className="mb-6">
              
              <div className="relative mb-4 w-full max-w-[320px] mx-auto px-4 sm:px-0">
                <div 
                  ref={sliderRef}
                  className="h-1 sm:h-0.5 bg-neu-600 rounded-md relative cursor-pointer shadow-sm w-full"
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleTouchStart}
                >
                {/* End indicators using design system colors */}
                <div className="w-5 h-5 sm:w-4 sm:h-4 bg-neu-700 rounded-full absolute top-[-6px] sm:top-[-4px] left-0 transform -translate-x-1/2 border border-neu-800" />
                <div className="w-5 h-5 sm:w-4 sm:h-4 bg-neu-700 rounded-full absolute top-[-6px] sm:top-[-4px] right-0 transform translate-x-1/2 border border-neu-800" />
                
                {/* Fill from center to slider position with design system gradient */}
                <div 
                  className={`h-full rounded-md absolute top-0 ${
                    showFillAnimation ? 'animate-pulse' : ''
                  } ${
                    sliderMode === 0 ? 'bg-cta-500' : 
                    sliderMode === 2 ? 'bg-acc-500' : 
                    'bg-neu-800'
                  }`}
                  style={{
                    left: sliderMode === 1 ? '50%' : `${Math.min(50, isDragging ? dragPosition : modes[sliderMode].pos)}%`,
                    width: sliderMode === 1 ? '0%' : `${Math.abs((isDragging ? dragPosition : modes[sliderMode].pos) - 50)}%`,
                    transition: isDragging ? 'none' : showFillAnimation ? 'all 0.8s ease-out' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: showFillAnimation ? 'scaleY(1.2)' : 'scaleY(1)',
                    transformOrigin: 'center',
                    boxShadow: showFillAnimation ? '0 2px 8px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.06)'
                  }}
                />
                <div 
                  className={`w-12 h-12 sm:w-10 sm:h-10 border-3 rounded-full absolute top-[-20px] sm:top-[-16px] cursor-grab transform -translate-x-1/2 transition-all duration-300 ${
                    sliderMode === 0 ? 'border-cta-500 bg-cta-50 shadow-lg shadow-cta-500/30' :
                    sliderMode === 2 ? 'border-acc-500 bg-acc-100 shadow-lg shadow-acc-500/30' :
                    'border-neu-800 bg-neu-0 shadow-md'
                  } ${
                    showGlow ? 'animate-pulse-neon' : ''
                  }`}
                  style={{ 
                    left: `${isDragging ? dragPosition : modes[sliderMode].pos}%`,
                    transition: isDragging ? 'none' : 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    borderWidth: '3px'
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setIsDragging(true);
                    setDragPosition(modes[sliderMode].pos);
                    e.preventDefault();
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    setIsDragging(true);
                    setDragPosition(modes[sliderMode].pos);
                    e.preventDefault();
                  }}
                />
              </div>
            </div>
            
            <div className="flex justify-center text-sm sm:text-base mb-4 pt-3 text-muted-foreground">
              <span className={`${sliderMode !== 1 ? 'font-bold' : 'text-muted-foreground'} text-foreground text-xl sm:text-2xl`}>
                {modes[sliderMode].name}
              </span>
            </div>
            
            {/* <div className="text-sm leading-relaxed text-center text-muted-foreground h-12 flex items-center justify-center">
              {modes[sliderMode].desc}
            </div> */}
          </div>
        </div>
      </div>

      {/* Repository Gallery */}
      <div className="w-full">
        <div className="rounded-sm bg-transparent border border-border">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg md:text-xl font-display font-semibold text-foreground">
                  Your Repositories
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {repositories.length} repositories ({repositories.filter(r => isOrganizationRepo(r)).length} organization) • Agent mode: {modes[sliderMode].name}
                </p>
              </div>
              
              {/* Repository Search and Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-1/2 mt-4 sm:mt-0">
                <div className="flex-1">
                  <RepositorySearch repositories={repositories} />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowConnectModal(true)}
                    className="px-4 py-3 sm:py-2 text-sm bg-cta-500 hover:bg-cta-600 text-white rounded-sm transition-colors whitespace-nowrap min-h-[44px] sm:min-h-auto flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Connect
                  </button>
                  <button 
                    onClick={syncRepositories} 
                    disabled={isLoading}
                    className="px-4 py-3 sm:py-2 text-sm bg-muted hover:bg-muted-foreground/20 text-foreground rounded-sm transition-colors whitespace-nowrap min-h-[44px] sm:min-h-auto"
                  >
                    {isLoading ? 'Syncing...' : 'Sync'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cta-500"></div>
                <span className="ml-3 text-muted-foreground">Loading repositories...</span>
              </div>
            ) : repositories.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-12 h-12 mx-auto text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-muted-foreground mb-4">No repositories found</p>
                <button onClick={syncRepositories} className="px-4 py-2 text-sm bg-muted hover:bg-muted-foreground/20 text-foreground rounded-md transition-colors">
                  Sync Repositories
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {repositories.map((repo) => {
                  const activityStatus = getActivityStatus(repo.last_synced_at);
                  return (
                    <Card key={repo.id} className="bg-transparent hover:bg-muted/10 transition-all duration-200 cursor-pointer group border-border rounded-sm">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div 
                              className={`w-3 h-3 rounded-full border ${
                                sliderMode === 0 ? 'border-foreground bg-transparent' : 
                                sliderMode === 1 ? 'border-muted-foreground bg-transparent' : 
                                'border-foreground bg-transparent'
                              }`}
                            />
                            <div className="flex items-center space-x-1">
                              {isOrganizationRepo(repo) ? (
                                <Building className="w-3 h-3 text-foreground" />
                              ) : (
                                <User className="w-3 h-3 text-muted-foreground" />
                              )}
                              <h3 className="font-medium text-foreground group-hover:text-foreground transition-colors text-sm sm:text-base break-all">
                                {repo.owner?.login ? `${repo.owner.login}/` : ''}{repo.repo_name}
                              </h3>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <a 
                              href={repo.repo_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                              </svg>
                            </a>
                          </div>
                        </div>
                        
                        <p className="text-xs sm:text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[2.5rem] sm:min-h-[2.5rem]">
                          {repo.description || 'No description available'}
                        </p>
                        
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            {isOrganizationRepo(repo) && (
                              <span className="text-xs px-2 py-1 bg-transparent text-muted-foreground rounded-sm border border-border">
                                Organization
                              </span>
                            )}
                            {getPermissionBadge(repo) && (
                              <span className="text-xs px-2 py-1 bg-transparent text-foreground rounded-sm border border-foreground">
                                {getPermissionBadge(repo)}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {repo.private ? '🔒' : '🌐'}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className={`text-xs px-2 py-1 rounded-sm border font-medium ${getStatusBadge(activityStatus)}`}>
                            {activityStatus}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(repo.last_synced_at)}
                          </span>
                        </div>
                        
                        {/* Details Button */}
                        <div className="mt-3 pt-3 border-t border-border">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetails(repo)}
                            className="w-full bg-transparent hover:bg-muted/10 text-foreground border-foreground min-h-[44px] rounded-sm"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connect Repository Modal */}
      <ConnectRepositoryModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onConnect={handleRepositoriesConnected}
        existingRepositories={repositories}
      />
    </div>
  );
};

export default VibetorchDashboard;