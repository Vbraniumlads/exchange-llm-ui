#!/usr/bin/env node

import { Command } from 'commander';
import { ClaudeCodeRunner, getInstallationId } from './client';
import fs from 'fs/promises';
import path from 'path';

const program = new Command();

program
  .name('claude-runner')
  .description('CLI to trigger Claude Code tasks via Cloud Run')
  .version('1.0.0');

program
  .command('run')
  .description('Run a Claude Code task on a repository')
  .requiredOption('-r, --repo <url>', 'GitHub repository URL')
  .requiredOption('-t, --task <prompt>', 'Task prompt for Claude Code')
  .requiredOption('-s, --service <url>', 'Cloud Run service URL')
  .option('-b, --branch <name>', 'Base branch (default: main)', 'main')
  .option('-c, --config <path>', 'Path to config file with credentials')
  .action(async (options) => {
    try {
      let config: any = {};

      // Load config file if provided
      if (options.config) {
        const configPath = path.resolve(options.config);
        const configContent = await fs.readFile(configPath, 'utf-8');
        config = JSON.parse(configContent);
      }

      // Override with environment variables
      const claudeToken = process.env.CLAUDE_OAUTH_TOKEN || config.claudeOAuthToken;
      const githubAppId = parseInt(process.env.GITHUB_APP_ID || config.githubAppId || '1734153');
      const privateKeyPath = process.env.GITHUB_APP_PRIVATE_KEY_PATH || config.githubAppPrivateKeyPath;

      if (!claudeToken) {
        throw new Error('Claude OAuth token not provided. Set CLAUDE_OAUTH_TOKEN or use config file');
      }

      if (!privateKeyPath) {
        throw new Error('GitHub App private key path not provided. Set GITHUB_APP_PRIVATE_KEY_PATH or use config file');
      }

      const privateKey = await fs.readFile(privateKeyPath, 'utf-8');

      // Parse repository URL
      const match = options.repo.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
      if (!match) {
        throw new Error('Invalid GitHub repository URL');
      }
      const [, owner, repo] = match;

      // Get installation ID
      console.log('Getting GitHub App installation ID...');
      const installationId = await getInstallationId(githubAppId, privateKey, owner, repo);

      // Create runner
      const runner = new ClaudeCodeRunner({
        cloudRunUrl: options.service,
        claudeOAuthToken: claudeToken,
        githubAppPrivateKey: privateKey,
        githubAppId
      });

      // Check service health
      console.log('Checking Cloud Run service health...');
      const isHealthy = await runner.checkHealth();
      if (!isHealthy) {
        console.warn('Warning: Service health check failed, proceeding anyway...');
      }

      // Run task
      console.log(`Running task: "${options.task}"`);
      const result = await runner.runTask({
        repositoryUrl: options.repo,
        taskPrompt: options.task,
        installationId,
        baseBranch: options.branch
      });

      if (result.success) {
        if (result.pull_request_url) {
          console.log('✅ Pull request created successfully!');
          console.log(`   URL: ${result.pull_request_url}`);
          console.log(`   Branch: ${result.branch_name}`);
          console.log(`   PR #${result.pull_request_number}`);
        } else {
          console.log('✅ Task completed but no changes were made');
        }
        console.log(`   Execution time: ${result.execution_time_ms}ms`);
      } else {
        console.error('❌ Task failed:', result.error || 'Unknown error');
      }

    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program
  .command('health')
  .description('Check Cloud Run service health')
  .requiredOption('-s, --service <url>', 'Cloud Run service URL')
  .action(async (options) => {
    try {
      const runner = new ClaudeCodeRunner({
        cloudRunUrl: options.service,
        claudeOAuthToken: 'dummy', // Not needed for health check
        githubAppPrivateKey: 'dummy',
        githubAppId: 0
      });

      const isHealthy = await runner.checkHealth();
      if (isHealthy) {
        console.log('✅ Service is healthy');
      } else {
        console.log('❌ Service is not responding');
        process.exit(1);
      }
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program.parse(process.argv);