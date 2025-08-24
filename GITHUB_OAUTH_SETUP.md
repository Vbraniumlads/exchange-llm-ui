# 🔐 GitHub OAuth Setup Guide

Quick setup guide for GitHub OAuth authentication in VibeTorch.

## 1. Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers) → OAuth Apps → New OAuth App
2. Configure:
   - **Name**: `VibeTorch`
   - **Homepage URL**: `http://localhost:5173` (dev) / `https://yourdomain.com` (prod)
   - **Description**: `AI-powered code assistant and automation platform`
   - **Callback URL**: Same as homepage URL
3. Copy **Client ID** and generate/copy **Client Secret**

## 2. Environment Variables

**Frontend (.env)**
```bash
VITE_GITHUB_CLIENT_ID=your_client_id_here
VITE_API_URL=http://localhost:3001/api
```

**Backend (github-app-backend/.env)**
```bash
DATABASE_URL=postgresql://username:password@localhost:5432/vibetorch
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
GITHUB_APP_ID=1734153
GITHUB_PRIVATE_KEY_PATH=./vibe-torch.2025-08-05.private-key.pem
GITHUB_WEBHOOK_SECRET=torchtorch
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173
CLAUDE_API_KEY=your_claude_api_key_here
```

## 3. Testing

1. Start services:
   ```bash
   cd github-app-backend && npm run dev
   npm run dev  # In root for frontend
   ```
2. Visit `http://localhost:5173`
3. Click "Connect GitHub" and authorize

## 4. Production Deployment

1. Update OAuth app URLs for production domain
2. Set production environment variables in Railway
3. Deploy services

## 5. Common Issues

- **"Client ID not configured"**: Check `VITE_GITHUB_CLIENT_ID` and restart dev server
- **"OAuth callback URL mismatch"**: Ensure URLs match exactly
- **CORS errors**: Verify `FRONTEND_URL` in backend matches frontend URL

## 6. Security Checklist

- [ ] Use HTTPS for production
- [ ] Keep Client Secret secure  
- [ ] Use strong database passwords
- [ ] Monitor authentication logs

OAuth enables repository access, user dashboards, billing management, and persistent sessions. 🚀