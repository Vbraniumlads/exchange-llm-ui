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

    const result = await dispatchWorkflow({ owner, repo, workflowId, ref, inputs });

    // If Cloud Run was used and returned a response, include it
    if (result && 'success' in result) {
      res.status(202).json({
        success: true,
        message: 'Claude Code executed via Cloud Run',
        cloudRunResponse: result
      });
    } else {
      res.status(202).json({ success: true, message: 'Workflow dispatch requested' });
    }
  } catch (error: any) {
    const message = error?.message || 'Unknown error';
    if (message.includes('404') || message.includes('Not Found')) {
      res.status(404).json({ error: 'Installation not found. Ensure the GitHub App is installed on the repository.' });
      return;
    }
    if (message.includes('Missing GitHub App configuration')) {
      res.status(500).json({ error: message });
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


