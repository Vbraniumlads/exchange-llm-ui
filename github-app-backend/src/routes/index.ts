import type { Express } from 'express';
import type { Webhooks } from '@octokit/webhooks';
import { issueGeneratorController } from '../controllers/issueGeneratorController.js';
import { webhookController } from '../controllers/webhookController.js';
import { prCommentController } from '../controllers/prCommentController.js';
import { authRouter } from './auth.js';
import { repositoriesRouter } from './repositories.js';
import { Octokit } from '@octokit/rest';
import { issueCommentController } from '../controllers/issueCommentController.js';
import { workflowDispatchRouter } from './workflow-dispatch.js';

export function setupRoutes(app: Express, webhooks: Webhooks | null): void {
  // OAuth authentication routes
  app.use('/api/auth', authRouter);

  // GitHub repositories routes
  app.use('/api/repositories', repositoriesRouter);

  // Workflow dispatch via GitHub App (server-triggered)
  app.use('/api/workflows', workflowDispatchRouter);

  // Issue generation webhook endpoint
  app.post('/api/generate-issue', issueGeneratorController());

  // Issue comment endpoint
  app.post('/api/issue-comment', issueCommentController());

  // Pull request comment endpoint
  app.post('/api/pr-comment', prCommentController());

  // GitHub App routes (only if configured)
  if (webhooks) {
    // Webhook endpoint
    app.post('/webhook', webhookController(webhooks));

    // GitHub App installation callback
    app.get('/callback', (_req, res) => {
      res.json({ message: 'GitHub App installation successful!' });
    });
  } else {
    console.log('🔄 GitHub App routes skipped (not configured)');
  }
}