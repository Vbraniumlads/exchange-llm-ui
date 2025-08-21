import express, { Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { App } from '@octokit/app';

const execAsync = promisify(exec);
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;

interface RunRequest {
  repository_url: string;
  task_prompt: string;
  claude_oauth_token: string;
  github_app_private_key: string;
  installation_id: number;
  base_branch?: string;
}

interface ClaudeResult {
  stdout: string;
  stderr: string;
}

interface RepoInfo {
  owner: string;
  repo: string;
  token: string;
}

async function runClaudeCode(
  taskPrompt: string,
  claudeToken: string,
  workDir: string
): Promise<ClaudeResult> {
  // Set up environment with OAuth token
  const env = {
    ...process.env,
    CLAUDE_CODE_OAUTH_TOKEN: claudeToken,
    CLAUDE_NON_INTERACTIVE: 'true',
    HOME: '/tmp',  // Ensure HOME is set for Claude config
    CI: 'true',  // Indicate CI environment
    NO_COLOR: '1'  // Disable color output
  };

  // Create .claude directory and config file for non-interactive auth
  const claudeConfigDir = '/tmp/.claude';
  const claudeConfigFile = path.join(claudeConfigDir, 'config.json');

  try {
    await fs.mkdir(claudeConfigDir, { recursive: true });

    // Write OAuth token to config file
    const config = {
      oauth_token: claudeToken,
      auth_type: 'oauth',
      non_interactive: true
    };

    await fs.writeFile(claudeConfigFile, JSON.stringify(config, null, 2));
    console.log('Created Claude config file with OAuth token');
  } catch (error) {
    console.error('Error creating Claude config:', error);
  }

  // First, test if claude is available and authenticated
  console.log('Testing Claude CLI with OAuth token...');
  try {
    const { stdout: authTest } = await execAsync('claude --version', {
      env,
      timeout: 5000
    });
    console.log('Claude version:', authTest.trim());
  } catch (error: any) {
    console.error('Claude CLI version check failed:', error.message);
  }

  // Run Claude Code with the task
  console.log(`Running Claude Code in ${workDir}`);
  console.log(`Task prompt: ${taskPrompt}`);

  // Use print mode (-p) for non-interactive execution
  // Escape the prompt properly for shell
  const escapedPrompt = taskPrompt.replace(/'/g, "'\\''");

  // Use echo to pipe the prompt to claude to avoid any interactive issues
  const command = `echo '${escapedPrompt}' | claude -p '${escapedPrompt}' --dangerously-skip-permissions`;

  console.log(`Command: ${command}`);

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: workDir,
      env,
      maxBuffer: 50 * 1024 * 1024,
      timeout: 300000 // 5 minute timeout
    });

    console.log('Claude Code completed successfully');
    if (stderr) {
      console.error('Claude Code stderr:', stderr);
    }

    return { stdout, stderr };
  } catch (error: any) {
    console.error('Claude Code execution error:', error);

    // If the command fails, try with explicit non-interactive mode
    if (error.code === 1 || error.message.includes('authentication')) {
      console.log('Trying with explicit non-interactive flags...');

      const altCommand = `CLAUDE_CODE_NON_INTERACTIVE=true claude -p '${escapedPrompt}'`;

      try {
        const { stdout, stderr } = await execAsync(altCommand, {
          cwd: workDir,
          env: {
            ...env,
            CLAUDE_CODE_NON_INTERACTIVE: 'true'
          },
          maxBuffer: 50 * 1024 * 1024,
          timeout: 300000
        });

        console.log('Alternative command succeeded');
        return { stdout, stderr };
      } catch (altError: any) {
        console.error('Alternative approach also failed:', altError.message);
      }
    }

    throw new Error(`Claude Code failed: ${error.message}`);
  }
}

async function cloneRepository(
  repoUrl: string,
  workDir: string,
  githubApp: App,
  installationId: number
): Promise<RepoInfo> {
  // Parse repo owner and name from URL
  const match = repoUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
  if (!match) {
    throw new Error('Invalid GitHub repository URL');
  }
  const [, owner, repo] = match;

  try {
    // Get installation access token
    const octokit = await githubApp.getInstallationOctokit(installationId);
    const { data: { token } } = await octokit.request('POST /app/installations/{installation_id}/access_tokens', {
      installation_id: installationId
    });

    // Clone with token
    const cloneUrl = `https://x-access-token:${token}@github.com/${owner}/${repo}.git`;
    await execAsync(`git clone ${cloneUrl} .`, { cwd: workDir });

    // Configure git
    await execAsync('git config user.email "claude-code@anthropic.com"', { cwd: workDir });
    await execAsync('git config user.name "Vibe Torch Bot"', { cwd: workDir });

    return { owner, repo, token };
  } catch (error: any) {
    if (error.status === 404 || error.message?.includes('Not Found')) {
      throw new Error(`GitHub App is not installed on repository ${owner}/${repo}. Please install the GitHub App first.`);
    }
    throw error;
  }
}

/*
async function createPullRequest(
  workDir: string,
  owner: string,
  repo: string,
  branchName: string,
  taskPrompt: string,
  token: string,
  baseBranch: string = 'main'
): Promise<any> {
  // Check if there are changes
  const { stdout: statusOutput } = await execAsync('git status --porcelain', { cwd: workDir });

  if (!statusOutput.trim()) {
    console.log('No changes detected');
    return null;
  }

  // Create and push branch
  await execAsync(`git checkout -b ${branchName}`, { cwd: workDir });
  await execAsync('git add -A', { cwd: workDir });

  const commitMessage = `Claude Code: ${taskPrompt.substring(0, 50)}${taskPrompt.length > 50 ? '...' : ''}`;
  await execAsync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, { cwd: workDir });

  await execAsync(`git push origin ${branchName}`, { cwd: workDir });

  // Create PR using GitHub API
  const octokit = new Octokit({ auth: token });

  try {
    const { data: pr } = await octokit.pulls.create({
      owner,
      repo,
      title: `Claude Code: ${taskPrompt.substring(0, 80)}`,
      body: `## Summary\n\nThis PR was automatically generated by Claude Code.\n\n### Task\n${taskPrompt}\n\n### Changes\nPlease review the changes made by Claude Code.\n\n---\n*Generated by Claude Code Cloud Run Service*`,
      head: branchName,
      base: baseBranch
    });

    return pr;
  } catch (error: any) {
    console.error('Failed to create PR:', error);
    throw new Error(`Failed to create pull request: ${error.message}`);
  }
}
*/

app.post('/run', async (req: Request<{}, {}, RunRequest>, res: Response): Promise<void> => {
  const {
    repository_url,
    task_prompt,
    claude_oauth_token,
    github_app_private_key,
    installation_id,
    base_branch = 'main'
  } = req.body;

  // Validate required parameters
  if (!repository_url || !task_prompt || !claude_oauth_token || !github_app_private_key || !installation_id) {
    res.status(400).json({
      error: 'Missing required parameters',
      required: ['repository_url', 'task_prompt', 'claude_oauth_token', 'github_app_private_key', 'installation_id']
    });
    return;
  }

  const workDir = path.join('/workspace', crypto.randomBytes(16).toString('hex'));
  const startTime = Date.now();

  try {
    // Create working directory
    await fs.mkdir(workDir, { recursive: true });

    // Initialize GitHub App
    const appId = parseInt(process.env.GITHUB_APP_ID || '1734153');
    console.log(`Using GitHub App ID: ${appId}`);

    const githubApp = new App({
      appId,
      privateKey: github_app_private_key
    });

    // Clone repository
    console.log('Cloning repository...');
    await cloneRepository(
      repository_url,
      workDir,
      githubApp,
      installation_id
    );

    // Checkout base branch
    await execAsync(`git checkout ${base_branch}`, { cwd: workDir });

    const improved_task_prompt = `
    You are a senior software engineer. You are given a task to improve the code in the repository.
    Create a pull request with the changes.
    Task: ${task_prompt}
    `

    // Run Claude Code
    console.log('Running Claude Code...');
    const { stdout } = await runClaudeCode(
      improved_task_prompt,
      claude_oauth_token,
      workDir
    );

    /*
    // Create pull request
    console.log('Creating pull request...');
    const branchName = `claude-code-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const pr = await createPullRequest(
      workDir,
      owner,
      repo,
      branchName,
      task_prompt,
      token,
      base_branch
    );
    */

    const executionTime = Date.now() - startTime;

    res.json({
      success: true,
      message: 'Task completed',
      claude_output: stdout,
      execution_time_ms: executionTime
    });
    return;
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({
      error: error.message,
      details: error.stack,
      execution_time_ms: Date.now() - startTime
    });
  } finally {
    // Cleanup
    try {
      await fs.rm(workDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }
  }
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'claude-code-runner',
    timestamp: new Date().toISOString()
  });
});

app.get('/test-claude', async (_req: Request, res: Response): Promise<void> => {
  try {
    // Test if Claude CLI is available
    const tests: any = {};

    // Test 1: Check if claude command exists
    try {
      const { stdout } = await execAsync('which claude', { timeout: 5000 });
      tests.claude_path = stdout.trim();
    } catch (error) {
      tests.claude_path = 'Not found';
    }

    // Test 2: Check claude version/help
    try {
      const { stdout } = await execAsync('claude --help', { timeout: 5000 });
      tests.claude_help = stdout.substring(0, 200) + '...';
    } catch (error: any) {
      tests.claude_help = `Error: ${error.message}`;
    }

    // Test 3: Check environment
    tests.env = {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      GITHUB_APP_ID: process.env.GITHUB_APP_ID,
      HAS_CLAUDE_TOKEN: !!process.env.CLAUDE_CODE_OAUTH_TOKEN
    };

    // Test 4: Try a simple claude command with timeout
    try {
      const testPrompt = 'What is 2+2?';
      const { stdout } = await execAsync(`echo "${testPrompt}" | timeout 5 claude -p "${testPrompt}"`, {
        timeout: 10000,
        env: {
          ...process.env,
          CLAUDE_CODE_OAUTH_TOKEN: 'test-token'
        }
      });
      tests.simple_test = stdout.substring(0, 100);
    } catch (error: any) {
      tests.simple_test = `Error: ${error.message}`;
    }

    res.json({
      status: 'ok',
      tests
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

app.post('/check-installation', async (req: Request, res: Response): Promise<void> => {
  const { repository_url, github_app_private_key } = req.body;

  if (!repository_url || !github_app_private_key) {
    res.status(400).json({ error: 'Missing repository_url or github_app_private_key' });
    return;
  }

  try {
    const match = repository_url.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    if (!match) {
      res.status(400).json({ error: 'Invalid GitHub repository URL' });
      return;
    }
    const [, owner, repo] = match;

    const appId = parseInt(process.env.GITHUB_APP_ID || '1734153');
    const githubApp = new App({
      appId,
      privateKey: github_app_private_key
    });

    // Try to get the installation for this repository
    const appOctokit = githubApp.octokit;
    const { data: installation } = await appOctokit.request('GET /repos/{owner}/{repo}/installation', {
      owner,
      repo
    });

    res.json({
      installed: true,
      installation_id: installation.id,
      app_id: installation.app_id,
      repository: `${owner}/${repo}`
    });
  } catch (error: any) {
    if (error.status === 404) {
      res.json({
        installed: false,
        message: `GitHub App is not installed on this repository. Please install it at https://github.com/apps/YOUR_APP_NAME`,
        error: error.message
      });
    } else {
      res.status(500).json({
        error: error.message,
        details: error.stack
      });
    }
  }
});

app.post('/test-auth', async (req: Request, res: Response): Promise<void> => {
  const { claude_oauth_token } = req.body;

  if (!claude_oauth_token) {
    res.status(400).json({ error: 'Missing claude_oauth_token' });
    return;
  }

  try {
    // Test authentication with Claude
    const env = {
      ...process.env,
      CLAUDE_CODE_OAUTH_TOKEN: claude_oauth_token,
      CLAUDE_NON_INTERACTIVE: 'true',
      HOME: '/tmp',
      CI: 'true',
      NO_COLOR: '1'
    };

    // Try various authentication methods
    const tests: any = {};

    // Test 1: Simple version check
    try {
      const { stdout } = await execAsync('claude --version', { env, timeout: 5000 });
      tests.version = stdout.trim();
    } catch (error: any) {
      tests.version = `Error: ${error.message}`;
    }

    // Test 2: Try to run a simple command with -p flag
    try {
      const { stdout } = await execAsync(`echo 'What is 2+2?' | claude -p 'What is 2+2?'`, {
        env,
        timeout: 10000
      });
      tests.simple_command = stdout.substring(0, 200);
    } catch (error: any) {
      tests.simple_command = `Error: ${error.message}`;
    }

    // Test 3: Check authentication status
    try {
      const { stdout } = await execAsync('claude auth status', { env, timeout: 5000 });
      tests.auth_status = stdout.trim();
    } catch (error: any) {
      tests.auth_status = `Error: ${error.message}`;
    }

    res.json({
      status: 'ok',
      tests
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});


app.listen(PORT, () => {
  console.log(`Claude Code Cloud Run Service running on port ${PORT}`);
  console.log(`GitHub App ID: ${process.env.GITHUB_APP_ID || '1734153'}`);
});