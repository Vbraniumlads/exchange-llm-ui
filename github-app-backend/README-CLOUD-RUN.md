# Cloud Run Integration for Claude Code

This backend now **exclusively** uses Google Cloud Run to execute Claude Code tasks. GitHub Actions workflow dispatch has been replaced with direct Cloud Run API calls.

## Overview

The `dispatchWorkflow` function now **only** supports Claude workflows via Cloud Run. This provides:

- Faster execution (no GitHub Actions queue)
- Better resource control
- Direct API responses with PR URLs
- More reliable execution
- Immediate feedback with execution metrics

## Required Configuration

Add these **required** environment variables to your `.env` file:

```env
# Claude Code Cloud Run Configuration (REQUIRED)
CLAUDE_CLOUD_RUN_URL=https://your-claude-runner.run.app
CLAUDE_CODE_OAUTH_TOKEN=your_claude_oauth_token_here

# GitHub App Configuration (required)
GITHUB_APP_ID=your_github_app_id
GITHUB_APP_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----
your_private_key_here
-----END RSA PRIVATE KEY-----
```

## How It Works

1. **Request Flow**:
   - Client calls `/api/workflows/dispatch` with `claude.yml`
   - Backend sends request directly to Cloud Run service

2. **Cloud Run Service**:
   - Receives task prompt and repository info
   - Clones repository using GitHub App authentication
   - Runs Claude Code with the task
   - Creates and pushes PR automatically
   - Returns PR URL directly in response

3. **Response**:
   - Immediate feedback with PR URL
   - Execution time metrics
   - Success/failure status

## API Usage

```typescript
// Trigger Claude via Cloud Run
await fetch('/api/workflows/dispatch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    owner: 'your-org',
    repo: 'your-repo',
    workflowId: 'claude.yml',
    ref: 'main',
    inputs: {
      action_type: 'create-pr',
      context: 'Fix the authentication bug and add error handling'
    }
  })
});
```

## Deployment Steps

1. **Deploy Cloud Run Service**:
   ```bash
   cd cloud-run
   gcloud run deploy claude-code-runner \
     --source . \
     --region us-central1
   ```

2. **Get Service URL**:
   ```bash
   gcloud run services describe claude-code-runner \
     --region us-central1 \
     --format 'value(status.url)'
   ```

3. **Update Backend Environment**:
   - Set `CLAUDE_CLOUD_RUN_URL` to the service URL
   - Set `CLAUDE_CODE_OAUTH_TOKEN` to your Claude OAuth token
   - Restart the backend service

## Benefits of Cloud Run

| Feature | Description |
|---------|-------------|
| Execution Time | 30-60 seconds average |
| Queue Wait | None - immediate execution |
| Direct Response | Returns PR URL and metrics |
| Resource Control | Full control over CPU/Memory |
| Cost | Pay per request, not per minute |
| Scalability | Auto-scales based on demand |

## Error Handling

The service includes comprehensive error handling:

- Missing environment variables → Clear error message
- Cloud Run timeout → Detailed error response  
- GitHub API errors → Detailed error response
- Claude failures → Error message with details

## Monitoring

View Cloud Run logs:
```bash
gcloud run services logs read claude-code-runner --region us-central1
```

Check service health:
```bash
curl https://your-service.run.app/health
```


## Security Considerations

1. **Authentication**: Cloud Run service should use authentication in production
2. **Secrets**: Store sensitive data in Google Secret Manager
3. **Network**: Use VPC connector for private repositories
4. **Rate Limiting**: Implement rate limiting on both backend and Cloud Run

## Troubleshooting

### Common Issues

1. **"CLAUDE_CLOUD_RUN_URL not set"**
   - Add the Cloud Run URL to your environment variables

2. **"Failed to run Claude Code"**
   - Check Cloud Run logs for detailed error
   - Verify Claude OAuth token is valid
   - Ensure GitHub App has correct permissions

3. **Timeout errors**
   - Increase Cloud Run timeout setting
   - Check if repository is too large
   - Verify network connectivity

## Testing

Test the integration:
```bash
# Health check
curl http://localhost:3001/api/workflows/installation-status/owner/repo

# Trigger Claude via Cloud Run
curl -X POST http://localhost:3001/api/workflows/dispatch \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "test-org",
    "repo": "test-repo",
    "workflowId": "claude.yml",
    "inputs": {
      "action_type": "create-pr",
      "context": "Add a hello world function"
    }
  }'
```