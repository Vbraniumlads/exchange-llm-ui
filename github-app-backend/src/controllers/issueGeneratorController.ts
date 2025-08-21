import type { Request, Response } from 'express';
import { createRepositoryClient } from '../services/githubAppAuthService.js';

interface IssueGenerationRequest {
  repository: {
    owner: string;
    name: string;
  };
  issue: {
    title: string;
    body: string;
    labels?: string[];
    assignees?: string[];
  };
}

export function issueGeneratorController() {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const payload: IssueGenerationRequest = req.body;

      // Validate required fields
      if (!payload.repository || !payload.issue) {
        res.status(400).json({
          error: 'Missing required fields: repository and issue are required'
        });
        return;
      }

      const { repository, issue } = payload;

      console.log(`🚀 Generating issue: "${issue.title}" in ${repository.owner}/${repository.name}`);
      console.log(`✅ Using GitHub App authentication for GitHub API`);

      // Create repository-specific GitHub client
      const github = await createRepositoryClient(repository.owner, repository.name);

      // Create the issue
      const response = await github.rest.issues.create({
        owner: repository.owner,
        repo: repository.name,
        title: issue.title,
        body: issue.body,
        labels: issue.labels || [],
        assignees: issue.assignees || []
      });

      console.log(`✅ Successfully created issue #${response.data.number}`);
      console.log(`📋 Issue URL: ${response.data.html_url}`);

      res.status(201).json({
        success: true,
        issue: {
          number: response.data.number,
          title: response.data.title,
          url: response.data.html_url,
          created_at: response.data.created_at
        },
        message: 'Issue created successfully'
      });

    } catch (error: any) {
      console.error('❌ Issue generation error:', error);

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
            error: 'Repository not found',
            message: 'Make sure the repository exists and the GitHub App has access to it'
          });
        }
      } else if (error.status === 403) {
        const errorMessage = error.response?.data?.message || error.message;
        res.status(403).json({
          error: 'Permission denied',
          message: errorMessage || 'The GitHub App does not have permission to create issues in this repository',
          fix: 'Make sure the GitHub App has "Issues" write permission'
        });
      } else {
        res.status(500).json({
          error: 'Issue generation failed',
          message: error?.message || 'Unknown error occurred'
        });
      }
    }
  };
}