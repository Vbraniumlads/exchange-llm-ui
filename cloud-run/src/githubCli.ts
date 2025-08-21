import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export async function configureGitHubCliAuth(
  githubToken: string,
  workDir: string,
  env: Record<string, string | undefined>
): Promise<void> {
  try {
    const ghConfigDir = '/tmp/.config/gh';
    await fs.mkdir(ghConfigDir, { recursive: true });

    const ghConfigFile = path.join(ghConfigDir, 'config.yml');
    const ghConfigYaml = `hosts:
  github.com:
    oauth_token: ${githubToken}
    user: vibe-torch-bot
    git_protocol: https
`;

    await fs.writeFile(ghConfigFile, ghConfigYaml);
    console.log('Created GitHub CLI config file');

    await execAsync(`echo "${githubToken}" | gh auth login --with-token`, {
      env,
      cwd: workDir,
      timeout: 5000
    }).catch(err => {
      console.log('gh auth login failed (may already be authenticated):', err.message);
    });
  } catch (error) {
    console.error('Error setting up GitHub CLI:', error);
  }
}


