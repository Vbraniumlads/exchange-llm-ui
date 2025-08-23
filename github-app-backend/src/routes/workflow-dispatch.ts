import { Router, Request, Response } from 'express';
import { dispatchWorkflow, isAppInstalledForRepo } from '../services/githubAppAuthService.js';

export const workflowDispatchRouter = Router();

/**
 * POST /api/workflows/dispatch
 * Body: { owner, repo, workflowId, ref?, inputs? }
 * Requires GitHub App to be installed on target repo. Server uses app installation token.
 */
workflowDispatchRouter.post('/dispatch', async (req: Request, res: Response): Promise<void> => {
  try {
    const { owner, repo, workflowId, ref, inputs } = req.body || {};

    if (!owner || !repo || !workflowId) {
      res.status(400).json({ error: 'Missing required fields: owner, repo, workflowId' });
      return;
    }

    // Get user ID from request (in a real app, this would come from JWT token)
    const userId = parseInt(req.query.user_id as string) || parseInt(req.headers['x-user-id'] as string) || 1;

    console.log(`🚀 Workflow dispatch requested by user ${userId}: ${owner}/${repo} (${workflowId})`);

    const result = await dispatchWorkflow({
      owner,
      repo,
      workflowId,
      ref,
      inputs,
      userId
    });

    // Return immediate response with task tracking information
    res.status(202).json({
      success: true,
      message: 'Workflow dispatch task submitted to Cloud Run',
      task_id: result.task_id,
      local_task_id: result.local_task_id,
      status_endpoint: result.status_endpoint,
      tracking: {
        repository: `${owner}/${repo}`,
        workflow: workflowId,
        user_id: userId
      }
    });

  } catch (error: any) {
    console.error('❌ Workflow dispatch error:', error);
    const message = error?.message || 'Unknown error';

    if (message.includes('404') || message.includes('Not Found')) {
      res.status(404).json({
        error: 'Installation not found',
        message: 'Ensure the GitHub App is installed on the repository.'
      });
      return;
    }

    if (message.includes('Missing GitHub App configuration')) {
      res.status(500).json({ error: 'GitHub App not configured', message });
      return;
    }

    if (message.includes('Failed to prepare task tracking')) {
      res.status(500).json({ error: 'Database error', message });
      return;
    }

    res.status(500).json({ error: 'Failed to dispatch workflow', message });
  }
});

/**
 * GET /api/workflows/installation-status/:owner/:repo
 * Returns: { installed: boolean, installationId?: number }
 */
workflowDispatchRouter.get('/installation-status/:owner/:repo', async (req: Request, res: Response): Promise<void> => {
  try {
    const { owner, repo } = req.params;
    if (!owner || !repo) {
      res.status(400).json({ error: 'Missing owner or repo' });
      return;
    }
    const result = await isAppInstalledForRepo(owner, repo);
    res.json(result);
  } catch (error: any) {
    const message = error?.message || 'Unknown error';
    if (message.includes('Missing GitHub App configuration')) {
      res.status(500).json({ error: message });
      return;
    }
    res.status(500).json({ error: 'Failed to check installation', message });
  }
});


