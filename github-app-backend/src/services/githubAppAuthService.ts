import axios from 'axios';
import jwt from 'jsonwebtoken';

export interface WorkflowDispatchParams {
  owner: string;
  repo: string;
  workflowId: string; // e.g. 'claude.yml'
  ref?: string; // e.g. 'main'
  inputs?: Record<string, any>;
}

function ensureAppConfig(): { appId: number; privateKey: string } {
  const appIdRaw = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY || '';

  if (!appIdRaw || !privateKey) {
    throw new Error('Missing GitHub App configuration: set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY');
  }

  const appId = parseInt(appIdRaw, 10);
  if (Number.isNaN(appId)) {
    throw new Error('Invalid GITHUB_APP_ID. It must be a number.');
  }

  return { appId, privateKey };
}

function normalizePrivateKey(raw: string): string {
  if (raw.includes('\\n')) {
    return raw.replace(/\\n/g, '\n');
  }
  return raw;
}

function createAppJwt(appId: number, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60,
    exp: now + 600,
    iss: appId,
  };
  return jwt.sign(payload, normalizePrivateKey(privateKey), { algorithm: 'RS256' });
}

async function getInstallationIdForRepo(owner: string, repo: string, jwtToken: string): Promise<number> {
  const url = `https://api.github.com/repos/${owner}/${repo}/installation`;
  const { data } = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      Accept: 'application/vnd.github+json',
    },
  });
  return data.id as number;
}

async function createInstallationAccessToken(installationId: number, jwtToken: string): Promise<string> {
  const url = `https://api.github.com/app/installations/${installationId}/access_tokens`;
  const { data } = await axios.post(url, {}, {
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      Accept: 'application/vnd.github+json',
    },
  });
  return data.token as string;
}

export async function dispatchWorkflow(params: WorkflowDispatchParams): Promise<void> {
  const { owner, repo, workflowId, ref = 'main', inputs = {} } = params;
  const { appId, privateKey } = ensureAppConfig();
  const appJwt = createAppJwt(appId, privateKey);
  const installationId = await getInstallationIdForRepo(owner, repo, appJwt);
  const installationToken = await createInstallationAccessToken(installationId, appJwt);

  const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(workflowId)}/dispatches`;
  await axios.post(
    url,
    { ref, inputs },
    {
      headers: {
        Authorization: `token ${installationToken}`,
        Accept: 'application/vnd.github+json',
      },
    }
  );
}


