import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, GitBranch, GitPullRequest, AlertCircle, Plus, ExternalLink, Calendar, User, GitCommit, MessageSquare, FileText, ChevronDown, ChevronRight, Play, Plug } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { githubService } from '../features/github/services/github.service';
import type { GitHubRepository, GitHubIssue, GitHubPullRequest, GitHubComment } from '../features/github/types/github.types';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { GitHubLoginButton } from '../features/auth/components/GitHubLoginButton';

export default function RepositoryDetail() {
  const { owner, repo } = useParams<Record<string, string | undefined>>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  
  const [repository, setRepository] = useState<GitHubRepository | null>(null);
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [pullRequests, setPullRequests] = useState<GitHubPullRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appInstalled, setAppInstalled] = useState<boolean | null>(null);
  
  const [isCreateIssueOpen, setIsCreateIssueOpen] = useState(false);
  const [newIssue, setNewIssue] = useState({
    title: '',
    description: '',
    labels: ''
  });
  const [isCreatingIssue, setIsCreatingIssue] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);

  // Comments state
  const [expandedIssues, setExpandedIssues] = useState<Set<number>>(new Set());
  const [expandedPRs, setExpandedPRs] = useState<Set<number>>(new Set());
  const [issueComments, setIssueComments] = useState<Record<number, GitHubComment[]>>({});
  const [prComments, setPrComments] = useState<Record<number, GitHubComment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Set<number>>(new Set());
  const [dispatchingIssues, setDispatchingIssues] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      if (!owner || !repo) return;
      
      setIsLoading(true);
      try {
        const installation = await githubService.getAppInstallationStatus(owner, repo);
        setAppInstalled(installation.installed);
        const promises: Promise<any>[] = [];
        if (isAuthenticated) {
          promises.push(
            githubService.getRepository(owner, repo),
            githubService.getRepositoryIssues(owner, repo),
            githubService.getRepositoryPullRequests(owner, repo)
          );
        }
        const [repoData, issuesData, prsData] = promises.length ? await Promise.all(promises) : [null, [], []];
        
        if (repoData) setRepository(repoData);
        if (issuesData) setIssues(issuesData);
        if (prsData) setPullRequests(prsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load repository data');
        toast.error('Failed to load repository data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [owner, repo, isAuthenticated]);

  const toggleIssueComments = async (issueNumber: number) => {
    if (expandedIssues.has(issueNumber)) {
      setExpandedIssues(prev => {
        const newSet = new Set(prev);
        newSet.delete(issueNumber);
        return newSet;
      });
      return;
    }

    setExpandedIssues(prev => new Set(prev).add(issueNumber));

    if (!issueComments[issueNumber] && !loadingComments.has(issueNumber)) {
      setLoadingComments(prev => new Set(prev).add(issueNumber));
      try {
        const comments = await githubService.getIssueComments(owner!, repo!, issueNumber);
        setIssueComments(prev => ({ ...prev, [issueNumber]: comments }));
      } catch (err) {
        toast.error('Failed to load issue comments');
        console.error('Error loading issue comments:', err);
      } finally {
        setLoadingComments(prev => {
          const newSet = new Set(prev);
          newSet.delete(issueNumber);
          return newSet;
        });
      }
    }
  };

  const handleRunWorkflowForIssue = async (issueNumber: number) => {
    if (!owner || !repo) return;
    setDispatchingIssues(prev => new Set(prev).add(issueNumber));
    try {
      await githubService.dispatchWorkflow(owner, repo, 'claude.yml', {
        action_type: 'create-pr',
        context: issues.find(i => i.number === issueNumber)?.body || '',
      });
      toast.success(`Workflow dispatched for issue #${issueNumber}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to dispatch workflow';
      toast.error(message);
    } finally {
      setDispatchingIssues(prev => {
        const newSet = new Set(prev);
        newSet.delete(issueNumber);
        return newSet;
      });
    }
  };

  const togglePRComments = async (prNumber: number) => {
    if (expandedPRs.has(prNumber)) {
      setExpandedPRs(prev => {
        const newSet = new Set(prev);
        newSet.delete(prNumber);
        return newSet;
      });
      return;
    }

    setExpandedPRs(prev => new Set(prev).add(prNumber));

    if (!prComments[prNumber] && !loadingComments.has(prNumber)) {
      setLoadingComments(prev => new Set(prev).add(prNumber));
      try {
        const comments = await githubService.getPullRequestComments(owner!, repo!, prNumber);
        setPrComments(prev => ({ ...prev, [prNumber]: comments }));
      } catch (err) {
        toast.error('Failed to load PR comments');
        console.error('Error loading PR comments:', err);
      } finally {
        setLoadingComments(prev => {
          const newSet = new Set(prev);
          newSet.delete(prNumber);
          return newSet;
        });
      }
    }
  };

  const renderComments = (comments: GitHubComment[]) => (
    <div className="mt-3 pt-3 border-t border-border space-y-3">
      {comments.map(comment => (
        <div key={comment.id} className="bg-transparent border border-border rounded-md p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 bg-muted rounded-full flex items-center justify-center">
              <User className="w-3 h-3 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground">{comment.user.login}</span>
            <Badge 
              variant="outline" 
              className="text-xs border-border text-muted-foreground"
            >
              {comment.author_association.toLowerCase()}
            </Badge>
            <span className="text-xs text-muted-foreground ml-auto">
              {new Date(comment.created_at).toLocaleDateString()}
            </span>
          </div>
          <div className="text-sm text-foreground prose prose-sm max-w-none prose-neu">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Custom styling for markdown elements
                h1: ({ node, ...props }) => <h1 className="text-lg font-bold text-foreground mb-2" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-base font-bold text-foreground mb-2" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-sm font-bold text-foreground mb-1" {...props} />,
                p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
                li: ({ node, ...props }) => <li className="text-sm" {...props} />,
                blockquote: ({ node, ...props }) => (
                  <blockquote className="border-l-4 border-border pl-3 italic text-muted-foreground mb-2" {...props} />
                ),
                code: ({ node, ...props }) => {
                  const isInline = !String(props.children).includes('\n');
                  return isInline ? (
                    <code className="bg-muted/50 text-foreground px-1 py-0.5 rounded text-xs font-mono" {...props} />
                  ) : (
                    <code className="block bg-muted/50 text-foreground p-2 rounded text-xs font-mono overflow-x-auto mb-2" {...props} />
                  );
                },
                pre: ({ node, ...props }) => (
                  <pre className="bg-muted/50 text-foreground p-3 rounded text-xs font-mono overflow-x-auto mb-2" {...props} />
                ),
                a: ({ node, ...props }) => (
                  <a className="text-cta-600 hover:text-cta-700 underline" target="_blank" rel="noopener noreferrer" {...props} />
                ),
                table: ({ node, ...props }) => (
                  <table className="w-full border border-border rounded mb-2" {...props} />
                ),
                th: ({ node, ...props }) => (
                  <th className="border border-border bg-muted/50 px-2 py-1 text-left text-xs font-medium" {...props} />
                ),
                td: ({ node, ...props }) => (
                  <td className="border border-border px-2 py-1 text-xs" {...props} />
                ),
                hr: ({ node, ...props }) => <hr className="border-border my-3" {...props} />,
                img: ({ node, ...props }) => (
                  <img className="max-w-full h-auto rounded mb-2" {...props} />
                ),
                // Task lists (GitHub-flavored markdown)
                input: ({ node, ...props }) => 
                  props.type === 'checkbox' ? (
                    <input className="mr-2" disabled {...props} />
                  ) : (
                    <input {...props} />
                  )
              }}
            >
              {comment.body}
            </ReactMarkdown>
          </div>
        </div>
      ))}
      {comments.length === 0 && (
        <p className="text-sm text-muted-foreground italic">No comments yet</p>
      )}
    </div>
  );

  const handleCreateIssue = async () => {
    if (!owner || !repo || !newIssue.title.trim() || !newIssue.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsCreatingIssue(true);
    try {
      const labels = newIssue.labels ? newIssue.labels.split(',').map(l => l.trim()).filter(Boolean) : [];
      const createdIssue = await githubService.createIssue(owner, repo, {
        title: newIssue.title,
        description: newIssue.description,
        labels
      });
      
      setIssues(prev => [createdIssue, ...prev]);
      setNewIssue({ title: '', description: '', labels: '' });
      setIsCreateIssueOpen(false);
      toast.success('Issue created successfully by vibe-torch bot!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create issue';
      toast.error(errorMessage);
    } finally {
      setIsCreatingIssue(false);
    }
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted/50 rounded w-1/4"></div>
            <div className="h-32 bg-muted/50 rounded"></div>
            <div className="h-64 bg-muted/50 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-transparent border border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Sign in to view repository details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Connect your GitHub account to load issues and pull requests for this repository.</p>
              <div className="w-64">
                <GitHubLoginButton />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !repository) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <Card className="bg-status-error/10 border-status-error">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-status-error">
                <AlertCircle className="w-6 h-6" />
                <span className="text-lg font-medium">{error || 'Repository not found'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:p-6 font-sans-pro">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-4 w-full">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="p-2 flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold text-foreground truncate">
              {owner}/{repo}
            </h1>
            {/* Left-side status removed to move indicator to top-right */}
            {repository.description && (
              <p className="text-sm sm:text-base text-muted-foreground mt-1 truncate">{repository.description}</p>
            )}
          </div>
          {appInstalled === false ? (
            <Button
              variant="default"
              onClick={() => {
                const appSlug = (import.meta as any).env?.VITE_GITHUB_APP_SLUG as string | undefined;
                if (!appSlug) {
                  toast.error('GitHub App slug not configured');
                  return;
                }
                const url = `https://github.com/apps/${appSlug}/installations/new`;
                window.open(url, '_blank');
              }}
              className="flex flex-shrink-0 ml-auto bg-cta-600 hover:bg-cta-700 text-white"
            >
              <Plug className="w-4 h-4 mr-2" />
              Connect GitHub App
            </Button>
          ) : appInstalled === true ? (
            <div className="flex flex-shrink-0 ml-auto">
              <span className="inline-flex items-center rounded-sm bg-status-success/20 text-status-success px-2 py-1 text-xs border border-status-success/40">
                <Plug className="w-3 h-3 mr-1" />
                App Connected
              </span>
            </div>
          ) : null}
          <Button
            variant="outline"
            onClick={() => {
              const direct = (owner && repo) ? `https://github.com/${owner}/${repo}` : '';
              const fallbackFullName = (repository as any).full_name ? `https://github.com/${(repository as any).full_name}` : '';
              const fallbackRepoUrl = (repository as any).repo_url || '';
              const url = direct || fallbackFullName || fallbackRepoUrl;
              if (url) {
                window.open(url, '_blank');
              } else {
                toast.error('Could not determine GitHub URL');
              }
            }}
            className={`flex flex-shrink-0 ${appInstalled === null ? 'ml-auto' : 'ml-2'}`}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View on GitHub
          </Button>
        </div>

        {/* Stats Card */}
        <Card className="bg-transparent border border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{issues.length} Issues</span>
                </div>
                <div className="flex items-center gap-2">
                  <GitPullRequest className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{pullRequests.length} Pull Requests</span>
                </div>
              </div>
              
              <Dialog open={isCreateIssueOpen} onOpenChange={setIsCreateIssueOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="text-foreground border-border hover:bg-muted/50">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Task
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-background border-border">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Create New Task</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title" className="text-foreground">Title *</Label>
                      <Input
                        id="title"
                        value={newIssue.title}
                        onChange={(e) => setNewIssue(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Enter task title..."
                        className="border-border focus:border-foreground rounded-sm"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="description" className="text-foreground">Description *</Label>
                      <Textarea
                        id="description"
                        value={newIssue.description}
                        onChange={(e) => setNewIssue(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe the task... vibe-torch bot will generate a GitHub issue"
                        rows={4}
                        className="border-border focus:border-foreground rounded-sm"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="labels" className="text-foreground">Labels (optional)</Label>
                      <Input
                        id="labels"
                        value={newIssue.labels}
                        onChange={(e) => setNewIssue(prev => ({ ...prev, labels: e.target.value }))}
                        placeholder="bug, enhancement, feature (comma-separated)"
                        className="border-border focus:border-foreground rounded-sm"
                      />
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setIsCreateIssueOpen(false)}
                        disabled={isCreatingIssue}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateIssue}
                        disabled={isCreatingIssue || !newIssue.title.trim() || !newIssue.description.trim()}
                        className="bg-foreground hover:bg-foreground/90 text-background"
                      >
                        {isCreatingIssue ? 'Creating...' : 'Create Issue'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Issues and PRs */}
        <Tabs defaultValue="issues" className="w-full">
          <TabsList className="bg-transparent border border-border h-9">
            <TabsTrigger value="issues" className="data-[state=active]:bg-foreground data-[state=active]:text-background text-sm">
              Issues ({issues.length})
            </TabsTrigger>
            <TabsTrigger value="pulls" className="data-[state=active]:bg-foreground data-[state=active]:text-background text-sm">
              Pull Requests ({pullRequests.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="issues" className="space-y-4">
            {issues.length === 0 ? (
              <Card className="bg-transparent border border-border">
                <CardContent className="p-6 text-center">
                  <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No issues found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {issues.map(issue => (
                  <Card key={issue.id} className="bg-transparent border border-border hover:bg-muted/20 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-foreground hover:text-cta-600">
                              <a href={issue.html_url} target="_blank" rel="noopener noreferrer">
                                #{issue.number} {issue.title}
                              </a>
                            </h3>
                            <Badge 
                              variant={issue.state === 'open' ? 'default' : 'secondary'}
                              className={issue.state === 'open' ? 'bg-status-success text-white' : 'bg-muted text-background'}
                            >
                              {issue.state}
                            </Badge>
                          </div>
                          
                          {issue.labels.length > 0 && (
                            <div className="flex gap-2 mb-2">
                              {issue.labels.map(label => (
                                <Badge 
                                  key={label.name}
                                  variant="outline"
                                  style={{ backgroundColor: `#${label.color}20`, borderColor: `#${label.color}` }}
                                  className="text-xs"
                                >
                                  {label.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>opened by {issue.user.login}</span>
                            <span>•</span>
                            <span>{new Date(issue.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          {/* Ad-hoc button to trigger the workflow. The trigger will be automated by the github app in the near future. */}
                          <Button
                            variant="default"
                            onClick={() => handleRunWorkflowForIssue(issue.number)}
                            disabled={dispatchingIssues.has(issue.number)}
                            className="p-2 bg-cta-500 hover:bg-cta-600 text-white"
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => toggleIssueComments(issue.number)}
                            className="p-2"
                          >
                            {expandedIssues.has(issue.number) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => window.open(issue.html_url, '_blank')}
                            className="p-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Comments Section */}
                      {expandedIssues.has(issue.number) && (
                        <div className="px-4 pb-4">
                          {loadingComments.has(issue.number) ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3 pt-3 border-t border-border">
                              <div className="w-4 h-4 border-2 border-border border-t-transparent rounded-full animate-spin"></div>
                              Loading comments...
                            </div>
                          ) : issueComments[issue.number] ? (
                            renderComments(issueComments[issue.number])
                          ) : null}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="pulls" className="space-y-4">
            {pullRequests.length === 0 ? (
              <Card className="bg-transparent border border-border">
                <CardContent className="p-6 text-center">
                  <GitPullRequest className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No pull requests found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {pullRequests.map(pr => (
                  <Card key={pr.id} className="bg-transparent border border-border hover:bg-muted/20 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-foreground hover:text-acc-600">
                              <a href={pr.html_url} target="_blank" rel="noopener noreferrer">
                                #{pr.number} {pr.title}
                              </a>
                            </h3>
                            <div className="flex gap-2">
                              {pr.draft && (
                                <Badge variant="outline" className="text-xs border-border text-muted-foreground">
                                  Draft
                                </Badge>
                              )}
                              <Badge 
                                variant={pr.state === 'open' ? 'default' : 'secondary'}
                                className={
                                  pr.state === 'open' ? 'bg-status-success text-white' :
                                  pr.merged ? 'bg-acc-500 text-white' :
                                  'bg-muted text-background'
                                }
                              >
                                {pr.merged ? 'merged' : pr.state}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* PR Description Preview */}
                          {pr.body && (
                            <div className="text-sm text-muted-foreground mb-3 line-clamp-2 prose prose-sm max-w-none">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  p: ({ node, ...props }) => <p className="inline" {...props} />,
                                  code: ({ node, ...props }) => 
                                    <code className="bg-muted/50 text-foreground px-1 rounded text-xs" {...props} />,
                                  a: ({ node, ...props }) => 
                                    <a className="text-cta-600 hover:text-cta-700" {...props} />
                                }}
                              >
                                {pr.body.length > 150 ? `${pr.body.substring(0, 150)}...` : pr.body}
                              </ReactMarkdown>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <GitBranch className="w-4 h-4" />
                            <span>{pr.head.ref} → {pr.base.ref}</span>
                          </div>
                          
                          {/* PR Stats */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                            {pr.commits !== undefined && (
                              <div className="flex items-center gap-1">
                                <GitCommit className="w-3 h-3" />
                                <span>{pr.commits} commits</span>
                              </div>
                            )}
                            {pr.changed_files !== undefined && (
                              <div className="flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                <span>{pr.changed_files} files</span>
                              </div>
                            )}
                            {pr.comments !== undefined && pr.comments > 0 && (
                              <div className="flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                <span>{pr.comments} comments</span>
                              </div>
                            )}
                          </div>

                          {/* Code Changes */}
                          {(pr.additions !== undefined || pr.deletions !== undefined) && (
                            <div className="flex items-center gap-3 text-xs mb-2">
                              {pr.additions !== undefined && (
                                <span className="text-status-success">+{pr.additions}</span>
                              )}
                              {pr.deletions !== undefined && (
                                <span className="text-status-error">-{pr.deletions}</span>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="w-3 h-3" />
                            <span>opened by {pr.user.login}</span>
                            <span>•</span>
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(pr.created_at).toLocaleDateString()}</span>
                            {pr.merged_at && (
                              <>
                                <span>•</span>
                                <span>merged {new Date(pr.merged_at).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            onClick={() => togglePRComments(pr.number)}
                            className="p-2"
                          >
                            {expandedPRs.has(pr.number) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => window.open(pr.html_url, '_blank')}
                            className="p-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Mergeable Status */}
                      {pr.mergeable !== undefined && pr.state === 'open' && (
                        <div className="pt-3 border-t border-border">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              pr.mergeable === true ? 'bg-status-success' : 
                              pr.mergeable === false ? 'bg-status-error' : 
                              'bg-status-warning'
                            }`} />
                            <span className="text-xs text-muted-foreground">
                              {pr.mergeable === true ? 'Ready to merge' : 
                               pr.mergeable === false ? 'Merge conflicts' : 
                               'Checking merge status...'}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* Comments Section */}
                      {expandedPRs.has(pr.number) && (
                        <div className="px-4 pb-4">
                          {loadingComments.has(pr.number) ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3 pt-3 border-t border-border">
                              <div className="w-4 h-4 border-2 border-border border-t-transparent rounded-full animate-spin"></div>
                              Loading comments...
                            </div>
                          ) : prComments[pr.number] ? (
                            renderComments(prComments[pr.number])
                          ) : null}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}