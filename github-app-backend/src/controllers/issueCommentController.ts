import type { Request, Response } from 'express';
import { createRepositoryClient } from '../services/githubAppAuthService.js';

interface IssueCommentRequest {
  repository: {
    owner: string;
    name: string;
  };
  issue: {
    number: number;
  };
  comment: {
    body: string;
  };
}

export function issueCommentController() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const payload: IssueCommentRequest = req.body;

      // Validate required fields
      if (!payload.repository || !payload.issue || !payload.comment) {
        res.status(400).json({
          error: 'Missing required fields: repository, issue, and comment are required'
        });
        return;
      }

      const { repository, issue, comment } = payload;

      console.log(`💬 Adding comment to issue #${issue.number} in ${repository.owner}/${repository.name}`);
      console.log(`✅ Using GitHub App authentication for GitHub API`);

      // Create repository-specific GitHub client
      const github = await createRepositoryClient(repository.owner, repository.name);

      // Create the comment
      const response = await github.rest.issues.createComment({
        owner: repository.owner,
        repo: repository.name,
        issue_number: issue.number,
        body: comment.body
      });

      console.log(`✅ Successfully created comment #${response.data.id}`);
      console.log(`📋 Comment URL: ${response.data.html_url}`);

      res.status(201).json({
        success: true,
        comment: {
          id: response.data.id,
          body: response.data.body,
          url: response.data.html_url,
          created_at: response.data.created_at,
          user: response.data.user?.login
        },
        message: 'Comment created successfully'
      });

    } catch (error: any) {
      console.error('❌ Comment creation error:', error);

      if (error?.status === 404) {
        const errorMessage = error.response?.data?.message || error.message;
        if (errorMessage?.includes('Not Found') && error.request?.url?.includes('/installation')) {
          res.status(404).json({
            error: 'GitHub App not installed',
            message: 'The GitHub App is not installed on this repository. Please install the GitHub App first.',
            fix: 'Install the GitHub App on the repository or organization'
          });
        } else {
          res.status(404).json({
            error: 'Issue or repository not found',
            message: 'Make sure the issue exists and the GitHub App has access to the repository'
          });
        }
      } else if (error.status === 403) {
        const errorMessage = error.response?.data?.message || error.message;
        res.status(403).json({
          error: 'Permission denied',
          message: errorMessage || 'The GitHub App does not have permission to comment on issues in this repository',
          fix: 'Make sure the GitHub App has "Issues" write permission'
        });
      } else {
        res.status(500).json({
          error: 'Comment creation failed',
          message: error?.message || 'Unknown error occurred'
        });
      }
    }
  };
}