import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Repository, RepositoryCreateInput, RepositoryUpdateInput } from '../db/models/Repository.js';
import type { GitHubRepository, Todo } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class RepositoryService {
  private db: Database.Database;

  constructor() {
    // Use absolute path for database file to ensure it works in both dev and production
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'database.sqlite');
    console.log('🗄️  Database path:', dbPath);
    
    this.db = new Database(dbPath);
    this.initDatabase();
  }

  private initDatabase(): void {
    console.log('🚀 Initializing database...');
    
    // Run migrations - try multiple possible paths
    const migrationFiles = ['001_create_repositories.sql', '002_add_repository_fields.sql'];
    const possibleMigrationDirs = [
      path.join(__dirname, '../db/migrations'),
      path.join(process.cwd(), 'src/db/migrations'),
      path.join(process.cwd(), 'dist/db/migrations'),
    ];
    
    let migrationsExecuted = 0;
    
    for (const migrationFile of migrationFiles) {
      let migrationExecuted = false;
      
      for (const migrationDir of possibleMigrationDirs) {
        const migrationPath = path.join(migrationDir, migrationFile);
        console.log('🔍 Checking migration path:', migrationPath);
        
        if (fs.existsSync(migrationPath)) {
          console.log(`✅ Found migration file ${migrationFile}, executing...`);
          const migration = fs.readFileSync(migrationPath, 'utf8');
          
          try {
            this.db.exec(migration);
            migrationExecuted = true;
            migrationsExecuted++;
            break;
          } catch (error) {
            // Migration might fail if columns already exist (for 002 migration)
            if (migrationFile === '002_add_repository_fields.sql') {
              console.log('⚠️  Migration 002 may have already been applied, continuing...');
              migrationExecuted = true;
              migrationsExecuted++;
              break;
            }
            throw error;
          }
        }
      }
      
      if (!migrationExecuted && migrationFile === '001_create_repositories.sql') {
        // Only fail if the first migration is not found
        break;
      }
    }
    
    if (migrationsExecuted === 0) {
      console.log('⚠️  Migration file not found, creating table manually...');
      // Fallback: create table directly if migration file is not found
      this.db.exec(`
        -- Create repositories table
        CREATE TABLE IF NOT EXISTS repositories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          github_repo_id INTEGER NOT NULL, -- GitHub's repository ID
          repo_name TEXT NOT NULL,
          repo_url TEXT NOT NULL,
          description TEXT,
          last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, github_repo_id) -- Prevent duplicate repos per user
        );

        -- Create index for faster queries
        CREATE INDEX IF NOT EXISTS idx_repositories_user_id ON repositories(user_id);
        CREATE INDEX IF NOT EXISTS idx_repositories_last_synced ON repositories(last_synced_at);
      `);
    }
    
    console.log('✅ Database initialization complete');
  }

  async findByUserId(userId: number): Promise<Repository[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM repositories 
      WHERE user_id = ?
      ORDER BY last_synced_at DESC
    `);
    const rows = stmt.all(userId) as any[];
    return rows.map(row => this.transformDbRow(row));
  }

  async findByUserIdAndGithubId(userId: number, githubRepoId: number): Promise<Repository | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM repositories 
      WHERE user_id = ? AND github_repo_id = ?
    `);
    const result = stmt.get(userId, githubRepoId) as any;
    return result ? this.transformDbRow(result) : null;
  }

  async create(data: any): Promise<Repository> {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO repositories (
        user_id, github_repo_id, repo_name, repo_url, description, 
        owner_login, owner_type, owner_avatar_url,
        is_private, language, stargazers_count, forks_count, permissions,
        last_synced_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.user_id,
      data.github_repo_id,
      data.repo_name,
      data.repo_url,
      data.description || null,
      data.owner?.login || null,
      data.owner?.type || null,
      data.owner?.avatar_url || null,
      data.private ? 1 : 0,
      data.language || null,
      data.stargazers_count || 0,
      data.forks_count || 0,
      data.permissions ? JSON.stringify(data.permissions) : null,
      now,
      now,
      now
    );

    return this.findById(Number(result.lastInsertRowid))!;
  }

  async update(id: number, data: any): Promise<Repository | null> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.repo_name !== undefined) {
      updates.push('repo_name = ?');
      values.push(data.repo_name);
    }
    if (data.repo_url !== undefined) {
      updates.push('repo_url = ?');
      values.push(data.repo_url);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.last_synced_at !== undefined) {
      updates.push('last_synced_at = ?');
      values.push(data.last_synced_at);
    }
    if (data.owner !== undefined) {
      updates.push('owner_login = ?');
      values.push(data.owner?.login || null);
      updates.push('owner_type = ?');
      values.push(data.owner?.type || null);
      updates.push('owner_avatar_url = ?');
      values.push(data.owner?.avatar_url || null);
    }
    if (data.private !== undefined) {
      updates.push('is_private = ?');
      values.push(data.private ? 1 : 0);
    }
    if (data.language !== undefined) {
      updates.push('language = ?');
      values.push(data.language);
    }
    if (data.stargazers_count !== undefined) {
      updates.push('stargazers_count = ?');
      values.push(data.stargazers_count);
    }
    if (data.forks_count !== undefined) {
      updates.push('forks_count = ?');
      values.push(data.forks_count);
    }
    if (data.permissions !== undefined) {
      updates.push('permissions = ?');
      values.push(data.permissions ? JSON.stringify(data.permissions) : null);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE repositories 
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);
    return this.findById(id);
  }

  async upsert(userId: number, githubRepoId: number, data: any): Promise<Repository> {
    const existing = await this.findByUserIdAndGithubId(userId, githubRepoId);

    if (existing) {
      const updated = await this.update(existing.id, {
        ...data,
        last_synced_at: new Date().toISOString()
      });
      if (!updated) {
        throw new Error('Failed to update repository record');
      }
      return updated;
    } else {
      return this.create({
        user_id: userId,
        github_repo_id: githubRepoId,
        ...data
      });
    }
  }

  async deleteByUserId(userId: number): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM repositories WHERE user_id = ?');
    stmt.run(userId);
  }

  private findById(id: number): Repository | null {
    const stmt = this.db.prepare('SELECT * FROM repositories WHERE id = ?');
    const result = stmt.get(id) as any;
    if (!result) return null;
    
    // Transform database row to Repository object
    return this.transformDbRow(result);
  }

  private transformDbRow(row: any): Repository {
    return {
      ...row,
      owner: row.owner_login ? {
        login: row.owner_login,
        type: row.owner_type,
        avatar_url: row.owner_avatar_url
      } : undefined,
      private: row.is_private === 1,
      permissions: row.permissions ? JSON.parse(row.permissions) : undefined
    };
  }

  close(): void {
    this.db.close();
  }

  /**
   * Create an implementation repository based on a parsed todo.
   *
   * NOTE: This is a minimal placeholder to satisfy current webhook flow.
   * It logs intent and can be expanded to actually create a repo, scaffold
   * files, and persist metadata. Keeping the signature stable for callers.
   */
  async createImplementationRepo(
    _github: any,
    sourceRepository: GitHubRepository,
    todo: Todo
  ): Promise<void> {
    const summary = todo.text?.slice(0, 120) || 'implementation task';
    console.log(
      `🧱 [repositoryService] Requested implementation repo for "${summary}" from ${sourceRepository.full_name}`
    );
    // Future: use Octokit to create repo and store record in SQLite
  }
}

export const repositoryService = new RepositoryService();