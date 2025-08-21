import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { Octokit } from '@octokit/rest';
import { issueGeneratorController } from './controllers/issueGeneratorController.js';
import { issueCommentController } from './controllers/issueCommentController.js';
import { prCommentController } from './controllers/prCommentController.js';
import { setupRoutes } from './routes/index.js';
import { ensureAppConfig, createAppJwt, createRepositoryClient } from './services/githubAppAuthService.js';

config();

const app = express();
const port = parseInt(process.env.PORT || '3001', 10);

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
setupRoutes(app, null);

app.get('/callback', (_req, res) => {
  res.json({ message: 'GitHub authentication successful!' });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 GitHub API server running on port ${port}`);
  console.log(`📋 Ready to process GitHub API requests!`);
  console.log(`🔗 Health check: http://localhost:${port}/health`);
  console.log(`🔗 Available endpoints:`);
  console.log(`  POST /generate-issue - Create GitHub issues`);
  console.log(`  POST /issue-comment - Comment on issues`);
  console.log(`  POST /pr-comment - Comment on pull requests`);
});