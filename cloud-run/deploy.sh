#!/bin/bash

# Cloud Run deployment script for Claude Code runner

set -e

# Configuration
PROJECT_ID=${PROJECT_ID:-"vibe-torch"}
REGION=${REGION:-"us-central1"}
SERVICE_NAME="claude-code-runner"
GITHUB_APP_ID=${GITHUB_APP_ID:-"1734153"}
ARTIFACT_REGISTRY_REPO="cloud-run-source-deploy"

# Ensure Artifact Registry is set up
echo "Setting up Artifact Registry..."
gcloud artifacts repositories create ${ARTIFACT_REGISTRY_REPO} \
  --repository-format=docker \
  --location=${REGION} \
  --description="Docker repository for Cloud Run deployments" \
  2>/dev/null || echo "Repository already exists, continuing..."

# Configure Docker to use Artifact Registry
echo "Configuring Docker authentication..."
gcloud auth configure-docker ${REGION}-docker.pkg.dev

echo "Building Docker image for linux/amd64 platform..."
docker build --platform linux/amd64 -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REGISTRY_REPO}/${SERVICE_NAME}:latest .

echo "Pushing image to Artifact Registry..."
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REGISTRY_REPO}/${SERVICE_NAME}:latest

echo "Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REGISTRY_REPO}/${SERVICE_NAME}:latest \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 3600 \
  --max-instances 10 \
  --set-env-vars GITHUB_APP_ID=${GITHUB_APP_ID}

echo "Deployment complete!"
echo "Service URL:"
gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format 'value(status.url)'