#!/bin/bash

# Local build script for testing (builds for linux/amd64)

set -e

echo "Building Docker image for linux/amd64 platform (Cloud Run compatible)..."
docker build --platform linux/amd64 -t claude-code-runner:local .

echo "Build complete!"
echo ""
echo "To test locally:"
echo "  docker run --platform linux/amd64 -p 8080:8080 claude-code-runner:local"
echo ""
echo "Note: This image is built for linux/amd64 to match Cloud Run's architecture."