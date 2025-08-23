# VibeTorch 🔥

**AI-Powered Autonomous Code Agent Platform**

VibeTorch provides 24/7 AI agents for automated code maintenance, optimization, and feature development. *Vibe must flow. Rest easy, AI's got the night shift.*

## ✨ Features

- **🤖 Agent Modes**: Maintainer (bug fixes), Pioneer (new features), or Off
- **📋 Task Management**: Interactive task tracking with real-time status updates
- **📊 Dashboard**: Live monitoring, token usage tracking, and performance metrics
- **🔗 GitHub Integration**: OAuth authentication, webhooks, auto pull requests
- **🤖 Claude Integration**: Cloud Run service for scalable code execution

## 🏗 Architecture

**Frontend** (React + TypeScript) → **GitHub App Backend** (Node.js + Express) → **Cloud Run Service** (Claude Code) → **GitHub API**

### Flow
1. User authenticates via GitHub OAuth
2. Configure agent mode (Maintainer/Pioneer/Off)
3. AI monitors repositories via webhooks
4. Creates pull requests automatically via Cloud Run

## 🛠 Project Structure

```
vibe-torch/
├── src/                     # React Frontend  
├── github-app-backend/      # GitHub App Backend
├── cloud-run/              # Claude Code Service
└── public/                 # Static assets
```

## 🚀 Quick Start

1. **Setup**
   ```bash
   git clone <repository-url>
   npm install
   ```

2. **Configure Environment**
   - Create GitHub App and OAuth App
   - Set environment variables (see setup guides)

3. **Run Services**
   ```bash
   npm run dev                    # Frontend
   cd github-app-backend && npm run dev  # Backend
   cd cloud-run && npm run dev    # Cloud service
   ```

4. **Usage**
   - Visit app and authenticate with GitHub
   - Install GitHub App on repositories
   - Mention `@claude` in issues for automatic assistance

## 🔧 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, shadcn/ui
- **Backend**: Node.js, Express, TypeScript, PostgreSQL  
- **Services**: Google Cloud Run, Claude API, GitHub API
- **Deploy**: Netlify (frontend), Railway (backend)

## 📚 Documentation

- [GitHub OAuth Setup](./GITHUB_OAUTH_SETUP.md) - Complete OAuth configuration guide
- [Integration Summary](./INTEGRATION_SUMMARY.md) - Detailed implementation overview
- [Cloud Run Service](./cloud-run/README.md) - Claude Code service documentation
- [GitHub App Backend](./github-app-backend/README.md) - Backend service details

## 📊 Features

- **Token Tracking**: Monitor Claude API usage and costs
- **Task Analytics**: Success rates and completion times  
- **Repository Health**: Code quality improvements
- **Webhook Events**: Real-time processing statistics

---

_VibeTorch - Where AI meets productivity. Let your code vibe while you rest._ 🌙✨
