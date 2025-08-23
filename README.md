# VibeTorch 🔥

**AI-Powered Autonomous Code Agent Platform**

VibeTorch is an intelligent development automation platform that provides 24/7 AI agents to enhance your coding workflow. With the tagline "Vibe must flow. Rest easy, AI's got the night shift," VibeTorch offers automated code maintenance, optimization, and feature development when you're not around.

## 🚀 Core Features

### 🤖 **Intelligent Agent Modes**

- **Maintainer Mode**: Focuses on bug fixes, code optimization, and maintenance tasks
- **Pioneer Mode**: Suggests new features, architecture improvements, and innovations
- **Off Mode**: Disable AI agent for all repositories

### 📋 **Task Management System**

- Plan and track work before agent execution
- Interactive task table with status tracking (Pending, In Progress, Completed, Blocked)
- Real-time task editing and status updates
- Task analytics and progress monitoring

### 📊 **Real-time Dashboard**

- Live monitoring of AI agent activities
- Token usage tracking and cost analysis
- Repository status indicators
- Performance metrics and optimization insights

### 🔗 **GitHub Integration**

- **GitHub App**: Secure app-based authentication with installation access tokens
- **Multi-repository Support**: Handle events from all repositories where the app is installed
- **Webhook Processing**: Real-time response to pushes, issues, and pull requests
- **OAuth Authentication**: Seamless user authentication for dashboard access
- **Automatic Code Analysis**: AI-powered suggestions and pull request automation

### 🤖 **Claude Integration**

- **Cloud Run Service**: Scalable Claude Code execution in Google Cloud
- **Auto Pull Requests**: Generate and submit code changes automatically
- **Repository Creation**: Auto-create implementation repositories for complex tasks

## 🏗 System Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[React UI] --> B[VibeTorch Steps]
        B --> C[Task Management]
        B --> D[Agent Dashboard]
        A --> E[Repository Search]
        A --> F[Floating Navigation]
    end

    subgraph "Authentication Layer"
        G[GitHub OAuth] --> H[User Dashboard Access]
        I[GitHub App] --> J[Repository Access]
        I --> K[Webhook Events]
    end

    subgraph "GitHub App Backend"
        L[Express Server] --> M[Webhook Controller]
        L --> N[Issue Generator]
        L --> O[Comment Controllers]
        M --> P[Event Handlers]
        P --> Q[Repository-Specific Auth]
    end

    subgraph "Cloud Run Service"
        R[Claude Code Runner] --> S[Repository Cloning]
        R --> T[Code Generation]
        R --> U[Pull Request Creation]
    end

    subgraph "Agent Core"
        V[Mode Selector] --> W{Agent Type}
        W -->|Maintainer| X[Bug Fixes & Optimization]
        W -->|Pioneer| Y[Feature Development]
        W -->|Off| Z[Disabled]
    end

    subgraph "External Services"
        AA[GitHub API] --> BB[Code Repository]
        CC[Claude API] --> DD[Token Management]
        EE[Cost Tracker] --> FF[Usage Analytics]
    end

    A --> G
    H --> V
    K --> M
    Q --> AA
    N --> AA
    O --> AA
    R --> CC
    T --> U
    U --> AA
    X --> R
    Y --> R
    FF --> D

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style I fill:#bbf,stroke:#333,stroke-width:2px
    style R fill:#bfb,stroke:#333,stroke-width:2px
    style AA fill:#ffb,stroke:#333,stroke-width:2px
```

## 📈 Technical Flow

```mermaid
sequenceDiagram
    participant U as User
    participant UI as VibeTorch UI
    participant OAuth as GitHub OAuth
    participant Backend as GitHub App Backend
    participant Hooks as GitHub Webhooks
    participant CloudRun as Cloud Run Service
    participant Repo as GitHub Repo
    participant Claude as Claude API

    U->>UI: Access Platform
    UI->>OAuth: Initiate OAuth
    OAuth->>U: Authentication Flow
    U->>OAuth: Grant Permissions
    OAuth->>UI: Access Token

    U->>UI: Configure Agent Mode
    UI->>Backend: Update Repository Settings

    Note over Repo: User creates issue with @claude
    Repo->>Hooks: Issue Created Event
    Hooks->>Backend: Webhook Payload
    Backend->>Backend: Create Installation Token
    Backend->>CloudRun: Trigger Claude Code
    CloudRun->>Claude: Generate Code
    Claude->>CloudRun: Code Response
    CloudRun->>Repo: Create Pull Request

    loop Repository Monitoring
        Repo->>Hooks: Push/Issue Events
        Hooks->>Backend: Process Events
        Backend->>UI: Update Dashboard
    end

    UI->>U: Display Results
    U->>UI: Review & Approve
```

## 🛠 Project Structure

```
vibe-torch/
├── src/                          # React Frontend
│   ├── components/               # UI Components
│   │   ├── VibetorchSteps.tsx   # Main onboarding flow
│   │   ├── VibetorchDashboard.tsx # Repository dashboard
│   │   ├── TaskManagement.tsx   # Task tracking interface
│   │   └── ui/                  # shadcn/ui components
│   ├── features/                # Feature modules
│   │   ├── auth/                # Authentication system
│   │   ├── github/              # GitHub integration
│   │   └── navigation/          # Navigation components
│   ├── pages/                   # Route pages
│   └── contexts/                # React contexts
│
├── github-app-backend/          # GitHub App Backend
│   ├── src/
│   │   ├── controllers/         # Request handlers
│   │   │   ├── issueGeneratorController.ts
│   │   │   ├── issueCommentController.ts
│   │   │   ├── prCommentController.ts
│   │   │   └── webhookController.ts
│   │   ├── services/            # Business logic
│   │   │   ├── githubAppAuthService.ts
│   │   │   ├── claudeService.ts
│   │   │   └── repositoryService.ts
│   │   ├── routes/              # API routes
│   │   └── types/               # TypeScript types
│   └── README.md
│
├── cloud-run/                   # Claude Code Cloud Run Service
│   ├── src/
│   │   ├── server.ts            # Main Cloud Run service
│   │   ├── client.ts            # Client library
│   │   └── cli.ts               # CLI tool
│   ├── Dockerfile
│   └── README.md
│
└── public/                      # Static assets
```

## 🛠 User Flow

### 1. **Authentication & Setup**

```
User visits VibeTorch → GitHub OAuth → Repository Access Granted
```

### 2. **GitHub App Installation**

```
Install GitHub App → Grant Repository Permissions → Webhook Events Active
```

### 3. **Agent Configuration**

```
Select Agent Mode → Configure Activity Level → Connect Repositories
```

### 4. **Task Planning**

```
Create Tasks → Set Priorities → Define Success Criteria
```

### 5. **Autonomous Execution**

```
@claude Mention → Webhook Event → Cloud Run Service → Pull Request Created
```

### 6. **Monitoring & Review**

```
Real-time Dashboard → Review Changes → Approve/Reject → Iterate
```

## 🎯 Key Benefits

- **24/7 Automation**: AI works while you sleep
- **Multi-Repository Support**: Handle events from all installed repositories
- **Smart Task Management**: Organized workflow with status tracking
- **Cost Transparency**: Real-time token usage and cost monitoring
- **Flexible Modes**: Customize AI behavior to your needs
- **Scalable Architecture**: Cloud Run service handles high-volume requests

## 🔧 Tech Stack

### **Frontend**

- **Framework**: React 18, TypeScript, Vite
- **UI Components**: shadcn/ui, Tailwind CSS
- **State Management**: React Hooks, Context API
- **Authentication**: GitHub OAuth

### **Backend Services**

- **GitHub App Backend**: Node.js, Express, TypeScript
- **Cloud Run Service**: TypeScript, Google Cloud Run
- **Authentication**: GitHub App installation tokens
- **Database**: Better SQLite3 (development), PostgreSQL (production)

### **External Integrations**

- **AI Provider**: Claude API (Anthropic)
- **Version Control**: GitHub API, GitHub Apps
- **Deployment**: Netlify (frontend), Railway (backend), Google Cloud Run

### **Development Tools**

- **Build Tools**: Vite, TypeScript
- **Package Manager**: npm
- **Code Quality**: ESLint, Prettier
- **Styling**: Tailwind CSS with custom design system

## 🚦 Getting Started

### **1. Clone and Install**

```bash
git clone <repository-url>
cd vibe-torch
npm install
```

### **2. GitHub App Setup**

1. Create a GitHub App in your GitHub settings
2. Set webhook URL to your backend service
3. Enable required permissions: Issues, Pull Requests, Contents
4. Install the app on your repositories

### **3. Environment Configuration**

**Frontend (.env)**

```bash
VITE_GITHUB_CLIENT_ID=your_oauth_client_id
VITE_API_URL=http://localhost:3001/api
```

**GitHub App Backend (.env)**

```bash
GITHUB_APP_ID=your_github_app_id
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
GITHUB_CLIENT_ID=your_oauth_client_id
GITHUB_CLIENT_SECRET=your_oauth_client_secret
JWT_SECRET=your_jwt_secret
PORT=3001
CLAUDE_CODE_OAUTH_TOKEN=your_claude_oauth_token
CLAUDE_CLOUD_RUN_URL=https://your-cloud-run-url
```

### **4. Development Servers**

**Frontend:**

```bash
npm run dev
# Visit http://localhost:5173
```

**GitHub App Backend:**

```bash
cd github-app-backend
npm install
npm run dev
# Runs on http://localhost:3001
```

**Cloud Run Service:**

```bash
cd cloud-run
npm install
npm run dev
# Runs on http://localhost:8080
```

### **5. Production Deployment**

**Frontend (Netlify):**

```bash
npm run build
# Deploy dist/ folder to Netlify
```

**Backend (Railway):**

```bash
# Push to Railway with environment variables configured
```

**Cloud Run:**

```bash
cd cloud-run
./deploy.sh
```

## 📊 Usage Metrics

- **Token Tracking**: Monitor Claude API usage across all operations
- **Cost Analysis**: Real-time spending insights with detailed breakdowns
- **Task Analytics**: Success rates and completion times
- **Repository Health**: Code quality improvements and automation metrics
- **Webhook Events**: Real-time processing statistics

## 🔍 CCUsage API

Real-time Claude usage monitoring API.

### Setup

```bash
npm run ccusage:install  # Install dependencies
npm run ccusage:dev      # Start development server (port 8001)
npm run ccusage:test     # Run tests
```

### Endpoints

**GET /status?plan=Pro**
```json
{
  "plan": "Pro",
  "models": ["claude-sonnet-4-20250514"],
  "cost": {"used": 7.14, "limit": 18.0, "percent": 39.7},
  "tokens": {"used": 16701.286, "limit": 19000, "percent": 87.9},
  "messages": {"used": 201, "limit": 250, "percent": 80.4}
}
```

**GET /health**
```json
{"status": "healthy"}
```

### Plans
- **Pro**: 19K tokens, $18, 250 messages
- **Max5**: 88K tokens, $35, 1K messages  
- **Max20**: 220K tokens, $140, 2K messages

---

_VibeTorch - Where AI meets productivity. Let your code vibe while you rest._ 🌙✨
