import type { Express } from 'express';
import type { Webhooks } from '@octokit/webhooks';
import { issueGeneratorController } from '../controllers/issueGeneratorController.js';
import { webhookController } from '../controllers/webhookController.js';
import { prCommentController } from '../controllers/prCommentController.js';
import { authRouter } from './auth.js';
import { repositoriesRouter } from './repositories.js';
import { Octokit } from '@octokit/rest';
import { issueCommentController } from '../controllers/issueCommentController.js';

export function setupRoutes(app: Express, webhooks: Webhooks | null, github: Octokit): void {
  // OAuth authentication routes
  app.use('/api/auth', authRouter);

  // GitHub repositories routes
  app.use('/api/repositories', repositoriesRouter);

  // Issue generation webhook endpoint
  app.post('/generate-issue', issueGeneratorController(github));

  // Issue comment endpoint
  app.post('/issue-comment', issueCommentController(github));

  // Pull request comment endpoint
  app.post('/pr-comment', prCommentController(github));

  // GitHub App routes (only if configured)
  if (webhooks) {
    // Webhook endpoint
    app.post('/webhook', webhookController(github, webhooks));

    // GitHub App installation callback
    app.get('/callback', (_req, res) => {
      res.json({ message: 'GitHub App installation successful!' });
    });
  } else {
    console.log('🔄 GitHub App routes skipped (not configured)');
  }
}