# 🚀 VibeTorch Quick Start Guide

Complete setup guide for VibeTorch AI-powered code agent platform.

## ✅ Features

- **Real GitHub OAuth Integration** with secure token management
- **Floating Navigation Bar** with responsive design
- **Enhanced Authentication System** with proper TypeScript types
- **Claude Integration** for automated code generation

## 🏗 System Architecture

**Frontend** → **GitHub App Backend** → **Cloud Run Service** → **GitHub API** → **Claude API**

## 🚀 Setup Instructions

### 1. Prerequisites
- Node.js 18+
- PostgreSQL database
- GitHub App and OAuth App
- Claude API access
- Google Cloud project (for Cloud Run)

### 2. Installation
```bash
git clone <repository-url>
cd vibe-torch
npm install
cd github-app-backend && npm install
cd ../cloud-run && npm install
```

### 3. Configuration

**Frontend (.env)**
```bash
VITE_GITHUB_CLIENT_ID=your_oauth_client_id
VITE_API_URL=http://localhost:3001/api
```

**Backend (.env)**
```bash
DATABASE_URL=postgresql://localhost:5432/vibetorch
GITHUB_CLIENT_ID=your_oauth_client_id
GITHUB_CLIENT_SECRET=your_oauth_client_secret
GITHUB_APP_ID=1734153
GITHUB_PRIVATE_KEY_PATH=./private-key.pem
GITHUB_WEBHOOK_SECRET=webhook_secret
CLAUDE_API_KEY=your_claude_api_key
FRONTEND_URL=http://localhost:5173
PORT=3001
```

### 4. Development
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend  
cd github-app-backend && npm run dev

# Terminal 3: Cloud service
cd cloud-run && npm run dev
```

## 🎯 Usage Flow

1. **Authentication**: User visits app and connects GitHub account
2. **Installation**: Install GitHub App on repositories  
3. **Configuration**: Select agent mode (Maintainer/Pioneer/Off)
4. **Automation**: Mention `@claude` in issues for automatic assistance
5. **Review**: AI creates pull requests for review and approval

## 📋 GitHub Apps Setup

### OAuth App
1. Go to [GitHub Settings > Developer settings > OAuth Apps](https://github.com/settings/developers)
2. Create new OAuth App with:
   - Name: `VibeTorch`
   - Homepage URL: Your domain
   - Callback URL: Same as homepage URL

### GitHub App  
1. Create GitHub App with webhook permissions
2. Enable permissions: Issues, Pull Requests, Contents
3. Install on target repositories

## 🚀 Production Deployment

### Netlify (Frontend)
```bash
npm run build
# Deploy dist/ folder
```

### Railway (Backend)
```bash
# Push with environment variables configured
```

### Google Cloud Run (Claude Service)
```bash
cd cloud-run
./deploy.sh
```

## 🔧 Key Features

- **Real-time Dashboard**: Monitor AI agent activities
- **Token Tracking**: Monitor Claude API usage and costs
- **Task Management**: Interactive task tracking
- **Multi-repository Support**: Handle events from all installed repositories
- **Secure Authentication**: OAuth-based GitHub integration

✅ Ready for enterprise-level automation with professional UI and secure authentication! 🎯