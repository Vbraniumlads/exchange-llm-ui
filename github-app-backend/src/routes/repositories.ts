import { Router, Request, Response } from 'express';
import { githubRepositoriesService } from '../services/githubRepositoriesService.js';
import { repositoryService } from '../services/repositoryService.js';
import jwt from 'jsonwebtoken';

const router = Router();

// Get user repositories from database
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization header is required' });
      return;
    }

    // Extract JWT token and get user ID
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret') as any;
    const userId = decoded.userId;

    if (!userId) {
      res.status(401).json({ error: 'Invalid token: user ID not found' });
      return;
    }

    // Get repositories from database
    const repositories = await repositoryService.findByUserId(userId);

    res.json(repositories);

  } catch (error) {
    console.error('❌ Error in repositories endpoint:', error);

    if (error instanceof Error) {
      if (error.message.includes('jwt')) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
      }

      res.status(500).json({
        error: 'Failed to fetch repositories',
        message: error.message
      });
      return;
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sync repositories from GitHub API to database
router.post('/sync', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization header is required' });
      return;
    }

    // Extract JWT token and get user ID
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret') as any;
    const userId = decoded.userId;

    if (!userId) {
      res.status(401).json({ error: 'Invalid token: user ID not found' });
      return;
    }

    // Fetch both personal and organization repositories where user has push access
    // Get multiple pages to fetch more than 100 repositories
    const fetchAllRepositories = async (type: 'owner' | 'member') => {
      let allRepos: any[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore && page <= 5) { // Limit to 5 pages (500 repos max)
        const response = await githubRepositoriesService.fetchRepositories(authHeader, {
          per_page: 100,
          page,
          type,
          sort: 'updated',
          direction: 'desc'
        });

        allRepos = allRepos.concat(response.repositories);
        hasMore = response.hasNextPage;
        page++;
      }

      return { repositories: allRepos };
    };

    const [ownedRepos, memberRepos] = await Promise.all([
      fetchAllRepositories('owner'),
      fetchAllRepositories('member')
    ]);

    // Combine both sets of repositories
    const allRepos = [...ownedRepos.repositories, ...memberRepos.repositories];

    // Filter organization repos to only include those where user has push/maintain access
    const filteredRepos = [];
    for (const repo of allRepos) {
      // For owned repos, always include
      if (ownedRepos.repositories.includes(repo)) {
        filteredRepos.push(repo);
      } else {
        // For organization repos, check permissions
        try {
          const repoDetails = await githubRepositoriesService.fetchRepository(authHeader, repo.owner.login, repo.name);
          // Include if user has push access (maintainer/admin permissions)
          if (repoDetails.permissions?.push || repoDetails.permissions?.maintain || repoDetails.permissions?.admin) {
            filteredRepos.push(repo);
          }
        } catch (error) {
          console.log(`⚠️ Could not check permissions for ${repo.owner.login}/${repo.name}, skipping`);
        }
      }
    }

    const githubRepos = { repositories: filteredRepos };

    // Sync each repository to database
    const syncedRepos = [];
    for (const githubRepo of githubRepos.repositories) {
      const syncedRepo = await repositoryService.upsert(userId, githubRepo.id, {
        repo_name: githubRepo.name,
        repo_url: githubRepo.html_url,
        description: githubRepo.description || '',
        owner: githubRepo.owner,
        private: githubRepo.private,
        language: githubRepo.language,
        stargazers_count: githubRepo.stars,
        forks_count: githubRepo.forks,
        permissions: githubRepo.permissions
      });
      syncedRepos.push(syncedRepo);
    }

    res.json({
      message: `Successfully synced ${syncedRepos.length} repositories`,
      repositories: syncedRepos
    });

  } catch (error) {
    console.error('❌ Error in repository sync endpoint:', error);

    if (error instanceof Error) {
      if (error.message.includes('jwt')) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
      }
      if (error.message.includes('authentication failed')) {
        res.status(401).json({ error: 'GitHub authentication failed. Please re-authenticate.' });
        return;
      }
      if (error.message.includes('rate limit')) {
        res.status(429).json({ error: 'GitHub API rate limit exceeded. Please try again later.' });
        return;
      }

      res.status(500).json({
        error: 'Failed to sync repositories',
        message: error.message
      });
      return;
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific repository
router.get('/:owner/:repo', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const { owner, repo } = req.params;

    if (!owner || !repo) {
      res.status(400).json({ error: 'Owner and repository name are required' });
      return;
    }

    const repository = await githubRepositoriesService.fetchRepository(authHeader, owner, repo);

    res.json(repository);

  } catch (error) {
    console.error(`❌ Error fetching repository ${req.params.owner}/${req.params.repo}:`, error);

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error.message.includes('authentication failed')) {
        res.status(401).json({ error: 'GitHub authentication failed. Please re-authenticate.' });
        return;
      }
      if (error.message.includes('Insufficient permissions')) {
        res.status(403).json({ error: error.message });
        return;
      }

      res.status(500).json({
        error: 'Failed to fetch repository',
        message: error.message
      });
      return;
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get issue comments
router.get('/:owner/:repo/issues/:issueNumber/comments', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const { owner, repo, issueNumber } = req.params;

    if (!owner || !repo || !issueNumber) {
      res.status(400).json({ error: 'Owner, repository name, and issue number are required' });
      return;
    }

    const comments = await githubRepositoriesService.fetchIssueComments(authHeader, owner, repo, parseInt(issueNumber));

    res.json(comments);

  } catch (error) {
    console.error(`❌ Error fetching comments for issue #${req.params.issueNumber} in ${req.params.owner}/${req.params.repo}:`, error);

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error.message.includes('authentication failed')) {
        res.status(401).json({ error: 'GitHub authentication failed. Please re-authenticate.' });
        return;
      }

      res.status(500).json({
        error: 'Failed to fetch issue comments',
        message: error.message
      });
      return;
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pull request comments
router.get('/:owner/:repo/pulls/:pullNumber/comments', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const { owner, repo, pullNumber } = req.params;

    if (!owner || !repo || !pullNumber) {
      res.status(400).json({ error: 'Owner, repository name, and pull request number are required' });
      return;
    }

    const comments = await githubRepositoriesService.fetchPullRequestComments(authHeader, owner, repo, parseInt(pullNumber));

    res.json(comments);

  } catch (error) {
    console.error(`❌ Error fetching comments for pull request #${req.params.pullNumber} in ${req.params.owner}/${req.params.repo}:`, error);

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error.message.includes('authentication failed')) {
        res.status(401).json({ error: 'GitHub authentication failed. Please re-authenticate.' });
        return;
      }

      res.status(500).json({
        error: 'Failed to fetch pull request comments',
        message: error.message
      });
      return;
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get repository issues and pull requests
router.get('/:owner/:repo/issues', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const { owner, repo } = req.params;

    if (!owner || !repo) {
      res.status(400).json({ error: 'Owner and repository name are required' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const state = (req.query.state as 'open' | 'closed' | 'all') || 'open';

    const issues = await githubRepositoriesService.fetchIssues(authHeader, owner, repo, {
      page,
      state,
      per_page: 30
    });

    res.json(issues);

  } catch (error) {
    console.error(`❌ Error fetching issues for ${req.params.owner}/${req.params.repo}:`, error);

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error.message.includes('authentication failed')) {
        res.status(401).json({ error: 'GitHub authentication failed. Please re-authenticate.' });
        return;
      }

      res.status(500).json({
        error: 'Failed to fetch issues',
        message: error.message
      });
      return;
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific pull request details
router.get('/:owner/:repo/pulls/:pullNumber', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const { owner, repo, pullNumber } = req.params;

    if (!owner || !repo || !pullNumber) {
      res.status(400).json({ error: 'Owner, repository name, and pull request number are required' });
      return;
    }

    const pull = await githubRepositoriesService.fetchPullRequestDetail(authHeader, owner, repo, parseInt(pullNumber));

    res.json(pull);

  } catch (error) {
    console.error(`❌ Error fetching pull request #${req.params.pullNumber} for ${req.params.owner}/${req.params.repo}:`, error);

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error.message.includes('authentication failed')) {
        res.status(401).json({ error: 'GitHub authentication failed. Please re-authenticate.' });
        return;
      }

      res.status(500).json({
        error: 'Failed to fetch pull request details',
        message: error.message
      });
      return;
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get repository pull requests
router.get('/:owner/:repo/pulls', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const { owner, repo } = req.params;

    if (!owner || !repo) {
      res.status(400).json({ error: 'Owner and repository name are required' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const state = (req.query.state as 'open' | 'closed' | 'all') || 'open';

    const pulls = await githubRepositoriesService.fetchPullRequests(authHeader, owner, repo, {
      page,
      state,
      per_page: 30
    });

    res.json(pulls);

  } catch (error) {
    console.error(`❌ Error fetching pull requests for ${req.params.owner}/${req.params.repo}:`, error);

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error.message.includes('authentication failed')) {
        res.status(401).json({ error: 'GitHub authentication failed. Please re-authenticate.' });
        return;
      }

      res.status(500).json({
        error: 'Failed to fetch pull requests',
        message: error.message
      });
      return;
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});


// Get all available repositories (not yet connected)
router.get('/available', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization header is required' });
      return;
    }

    // Extract JWT token and get user ID
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret') as any;
    const userId = decoded.userId;

    if (!userId) {
      res.status(401).json({ error: 'Invalid token: user ID not found' });
      return;
    }

    // Fetch all repositories from GitHub (personal and organizations)
    const fetchAllRepositories = async (type: 'owner' | 'member') => {
      let allRepos: any[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore && page <= 10) { // Fetch up to 10 pages (1000 repos)
        const response = await githubRepositoriesService.fetchRepositories(authHeader, {
          per_page: 100,
          page,
          type,
          sort: 'updated',
          direction: 'desc'
        });

        allRepos = allRepos.concat(response.repositories);
        hasMore = response.hasNextPage;
        page++;
      }

      return { repositories: allRepos };
    };

    // Fetch both owned and member repositories
    const [ownedRepos, memberRepos] = await Promise.all([
      fetchAllRepositories('owner'),
      fetchAllRepositories('member')
    ]);

    // Combine all repositories
    const allRepos = [...ownedRepos.repositories, ...memberRepos.repositories];
    
    // Remove duplicates based on repo ID
    const uniqueRepos = Array.from(
      new Map(allRepos.map(repo => [repo.id, repo])).values()
    );

    // Add detailed permissions for organization repos
    const reposWithPermissions = await Promise.all(
      uniqueRepos.map(async (repo) => {
        try {
          // For organization repos, fetch detailed permissions
          if (repo.owner.type === 'Organization') {
            const repoDetails = await githubRepositoriesService.fetchRepository(authHeader, repo.owner.login, repo.name);
            return {
              ...repo,
              permissions: repoDetails.permissions,
              owner: {
                ...repo.owner,
                type: 'Organization'
              }
            };
          }
          return {
            ...repo,
            owner: {
              ...repo.owner,
              type: 'User'
            }
          };
        } catch (error) {
          console.log(`⚠️ Could not fetch details for ${repo.owner.login}/${repo.name}`);
          return repo;
        }
      })
    );

    res.json(reposWithPermissions);

  } catch (error) {
    console.error('❌ Error fetching available repositories:', error);

    if (error instanceof Error) {
      if (error.message.includes('jwt')) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
      }
      if (error.message.includes('authentication failed')) {
        res.status(401).json({ error: 'GitHub authentication failed. Please re-authenticate.' });
        return;
      }
      if (error.message.includes('rate limit')) {
        res.status(429).json({ error: 'GitHub API rate limit exceeded. Please try again later.' });
        return;
      }

      res.status(500).json({
        error: 'Failed to fetch available repositories',
        message: error.message
      });
      return;
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// Connect selected repositories
router.post('/connect', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const { repositories } = req.body;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization header is required' });
      return;
    }

    if (!repositories || !Array.isArray(repositories)) {
      res.status(400).json({ error: 'repositories array is required' });
      return;
    }

    // Extract JWT token and get user ID
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret') as any;
    const userId = decoded.userId;

    if (!userId) {
      res.status(401).json({ error: 'Invalid token: user ID not found' });
      return;
    }

    // Connect each repository to the database
    const connectedRepos = [];
    for (const repo of repositories) {
      try {
        // Fetch repository details from GitHub
        const repoDetails = await githubRepositoriesService.fetchRepository(authHeader, repo.owner, repo.name);
        
        // Save to database
        const savedRepo = await repositoryService.upsert(userId, repoDetails.id, {
          repo_name: repoDetails.name,
          repo_url: repoDetails.html_url,
          description: repoDetails.description || '',
          owner: repoDetails.owner,
          private: repoDetails.private,
          language: repoDetails.language,
          stargazers_count: repoDetails.stars,
          forks_count: repoDetails.forks,
          permissions: repoDetails.permissions
        });
        
        connectedRepos.push(savedRepo);
      } catch (error) {
        console.error(`Failed to connect repository ${repo.owner}/${repo.name}:`, error);
      }
    }

    res.json({
      message: `Successfully connected ${connectedRepos.length} repositories`,
      repositories: connectedRepos
    });

  } catch (error) {
    console.error('❌ Error connecting repositories:', error);

    if (error instanceof Error) {
      if (error.message.includes('jwt')) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
      }

      res.status(500).json({
        error: 'Failed to connect repositories',
        message: error.message
      });
      return;
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search repositories
router.get('/search/:query', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const { query } = req.params;

    if (!query || query.trim().length === 0) {
      res.status(400).json({ error: 'Search query is required' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const per_page = Math.min(parseInt(req.query.per_page as string) || 30, 100);
    const sort = (req.query.sort as 'stars' | 'forks' | 'help-wanted-issues' | 'updated') || 'updated';
    const order = (req.query.order as 'asc' | 'desc') || 'desc';

    const result = await githubRepositoriesService.searchRepositories(authHeader, query, {
      page,
      per_page,
      sort,
      order,
    });

    res.json(result);

  } catch (error) {
    console.error('❌ Error in repository search endpoint:', error);

    if (error instanceof Error) {
      if (error.message.includes('Invalid search query')) {
        res.status(422).json({ error: 'Invalid search query' });
        return;
      }
      if (error.message.includes('authentication failed')) {
        res.status(401).json({ error: 'GitHub authentication failed. Please re-authenticate.' });
        return;
      }
      if (error.message.includes('rate limit')) {
        res.status(429).json({ error: 'GitHub API rate limit exceeded. Please try again later.' });
        return;
      }

      res.status(500).json({
        error: 'Failed to search repositories',
        message: error.message
      });
      return;
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as repositoriesRouter };