# Claude Code Cloud Run Service

This service runs Claude Code in Google Cloud Run to automatically create pull requests based on task prompts. The service is written in TypeScript and can be called directly from your applications instead of using GitHub Actions.

## Architecture

The service receives HTTP POST requests with:

- Repository URL
- Task prompt
- Claude OAuth token
- GitHub App private key
- Installation ID

It then:

1. Clones the repository using GitHub App authentication
2. Runs Claude Code with the task prompt
3. Creates a pull request with the changes

## Project Structure

```
cloud-run/
├── src/
│   ├── server.ts       # Main Cloud Run service
│   ├── client.ts       # Client library for calling the service
│   ├── cli.ts          # CLI tool for triggering tasks
│   └── index.ts        # Module exports
├── Dockerfile          # Multi-stage build for TypeScript
├── package.json        # Server dependencies
├── client-package.json # Client library package
├── tsconfig.json       # TypeScript configuration
└── deploy.sh          # Deployment script
```

## Setup

### Prerequisites

1. Google Cloud Project with Cloud Run enabled
2. GitHub App with necessary permissions
3. Claude Code OAuth token

### Deployment

1. Set your project ID:

```bash
export PROJECT_ID="vibe-torch"
export GITHUB_APP_ID="1734153"
```

2. **Option A: Simple deployment (recommended)**

```bash
cd cloud-run
chmod +x deploy-simple.sh
./deploy-simple.sh
```

3. **Option B: Manual Docker build with Artifact Registry**

```bash
cd cloud-run
chmod +x deploy.sh
./deploy.sh
```

4. **Option C: Cloud Build**

```bash
gcloud builds submit --config cloudbuild.yaml --substitutions=_GITHUB_APP_ID=${GITHUB_APP_ID}
```

**Note**: Google Container Registry (gcr.io) is deprecated. All deployments now use Artifact Registry (\*.pkg.dev).

## Usage

### 1. Direct API Usage

#### Endpoint: POST /run

Request:

```typescript
{
  "repository_url": "https://github.com/owner/repo",
  "task_prompt": "Add error handling to the authentication module",
  "claude_oauth_token": "your-claude-token",
  "github_app_private_key": "-----BEGIN RSA PRIVATE KEY-----...",
  "installation_id": 12345678,
  "base_branch": "main"  // optional, defaults to "main"
}
```

Response:

```typescript
{
  "success": true,
  "pull_request_url": "https://github.com/owner/repo/pull/123",
  "pull_request_number": 123,
  "branch_name": "claude-code-1234567890-abcd",
  "claude_output": "...",
  "execution_time_ms": 45000
}
```

### 2. Using the TypeScript Client Library

```typescript
import { ClaudeCodeRunner, getInstallationId } from "./client";

// Initialize the client
const runner = new ClaudeCodeRunner({
  cloudRunUrl: "https://claude-code-runner-xxxxx-uc.a.run.app",
  claudeOAuthToken: process.env.CLAUDE_OAUTH_TOKEN,
  githubAppPrivateKey: privateKey,
  githubAppId: 1734153,
});

// Get installation ID for a repository
const installationId = await getInstallationId(
  1734153,
  privateKey,
  "owner",
  "repo"
);

// Run a task
const result = await runner.runTask({
  repositoryUrl: "https://github.com/owner/repo",
  taskPrompt: "Add error handling to the authentication module",
  installationId,
  baseBranch: "main",
});

if (result.success && result.pull_request_url) {
  console.log("PR created:", result.pull_request_url);
}
```

### 3. Using the CLI

```bash
# Install the CLI
npm install -g ./cloud-run

# Run a task
claude-runner run \
  --repo https://github.com/owner/repo \
  --task "Add error handling to authentication" \
  --service https://claude-code-runner-xxxxx-uc.a.run.app \
  --config ./config.json

# Check service health
claude-runner health --service https://claude-code-runner-xxxxx-uc.a.run.app
```

### 4. Programmatic Usage from Your App

```typescript
import axios from "axios";

async function triggerClaudeCode() {
  const response = await axios.post("https://your-cloud-run-url/run", {
    repository_url: "https://github.com/your/repo",
    task_prompt: "Implement the new feature",
    claude_oauth_token: process.env.CLAUDE_TOKEN,
    github_app_private_key: process.env.GITHUB_APP_KEY,
    installation_id: 12345678,
  });

  return response.data;
}
```

## Configuration

Create a `config.json` file:

```json
{
  "claudeOAuthToken": "YOUR_CLAUDE_OAUTH_TOKEN",
  "githubAppId": 1734153,
  "githubAppPrivateKeyPath": "/path/to/github-app-private-key.pem",
  "cloudRunServiceUrl": "https://claude-code-runner-xxxxx-uc.a.run.app"
}
```

## Environment Variables

- `PORT`: Server port (default: 8080)
- `GITHUB_APP_ID`: Your GitHub App ID
- `CLAUDE_OAUTH_TOKEN`: Claude OAuth token (for client)
- `GITHUB_APP_PRIVATE_KEY_PATH`: Path to GitHub App private key

## Security Considerations

1. **Authentication**: Enable Cloud Run authentication for production
2. **Secrets Management**: Use Google Secret Manager for sensitive data
3. **Rate Limiting**: Implement rate limiting to prevent abuse
4. **Input Validation**: Validate and sanitize all inputs
5. **Network Security**: Use VPC connectors for private repositories

## Local Development

```bash
cd cloud-run
npm install
npm run dev  # Runs with tsx watch mode
```

## Testing

```bash
# Test the service locally
npm run dev

# In another terminal, test with curl
curl -X POST http://localhost:8080/run \
  -H "Content-Type: application/json" \
  -d @test-request.json
```

## Monitoring

View logs:

```bash
gcloud run services logs read claude-code-runner --region us-central1
```

View metrics:

```bash
gcloud monitoring metrics-descriptors list --filter="metric.type:run.googleapis.com"
```

## Cost Optimization

- **Max Instances**: Set appropriate limits based on usage
- **Memory/CPU**: 2GB RAM and 2 vCPUs recommended for Claude Code
- **Timeout**: Set to 3600s for complex tasks
- **Concurrency**: Limit to 1 request per instance for stability
- **Auto-scaling**: Configure based on CPU utilization

## Troubleshooting

1. **Task Timeout**: Increase Cloud Run timeout if tasks take longer than expected
2. **Memory Issues**: Increase memory allocation for large repositories
3. **Authentication Errors**: Verify GitHub App installation and permissions
4. **Claude Code Errors**: Check Claude OAuth token validity

## API Reference

### Health Check: GET /health

Returns service health status:

```json
{
  "status": "healthy",
  "service": "claude-code-runner",
  "timestamp": "2025-08-20T10:00:00.000Z"
}
```
