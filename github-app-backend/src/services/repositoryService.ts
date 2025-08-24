import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { Repository, RepositoryCreateInput, RepositoryUpdateInput } from '../db/models/Repository.js';
import type { GitHubRepository, Todo } from '../types/index.js';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class RepositoryService {
  private pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    console.log('🗄️  Connecting to PostgreSQL database...');

    this.pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }, // Required for Railway and most cloud PostgreSQL
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    this.initDatabase();
  }

  private async initDatabase(): Promise<void> {
    console.log('🚀 Initializing PostgreSQL database...');

    try {
      // Test connection
      const client = await this.pool.connect();
      console.log('✅ Successfully connected to PostgreSQL');

      // Run migration
      const migrationPath = path.join(__dirname, '../db/migrations/001_create_repositories_pg.sql');

      if (fs.existsSync(migrationPath)) {
        console.log('📦 Running migration:', migrationPath);
        const migration = fs.readFileSync(migrationPath, 'utf8');

        // Execute the entire migration as one statement to handle functions properly
        try {
          await client.query(migration);
          console.log('✅ Migration executed successfully');
        } catch (error: any) {
          if (error.code === '42P07') { // Table already exists
            console.log('⚠️  Table already exists, skipping migration');
          } else if (error.code === '42710') { // Duplicate object
            console.log('⚠️  Objects already exist, skipping migration');
          } else if (error.message.includes('already exists')) {
            console.log('⚠️  Database objects already exist');
          } else {
            console.error('❌ Migration error:', error.message);
          }
        }

        console.log('✅ Migration completed');
      } else {
        console.log('⚠️  Migration file not found, assuming database is already set up');
      }

      client.release();
      console.log('✅ Database initialization complete');
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      throw error;
    }
  }

  async findByUserId(userId: number): Promise<Repository[]> {
    const query = `
      SELECT * FROM repositories 
      WHERE user_id = $1
      ORDER BY last_synced_at DESC
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows.map(row => this.transformDbRow(row));
  }

  async findByUserIdAndGithubId(userId: number, githubRepoId: number): Promise<Repository | null> {
    const query = `
      SELECT * FROM repositories 
      WHERE user_id = $1 AND github_repo_id = $2
    `;
    const result = await this.pool.query(query, [userId, githubRepoId]);
    return result.rows[0] ? this.transformDbRow(result.rows[0]) : null;
  }

  async findByRepositoryId(repositoryId: number): Promise<Repository | null> {
    const query = `
      SELECT * FROM repositories 
      WHERE github_repo_id = $1
    `;
    const result = await this.pool.query(query, [repositoryId]);
    return result.rows[0] ? this.transformDbRow(result.rows[0]) : null;
  }

  async create(data: any): Promise<Repository> {
    const query = `
      INSERT INTO repositories (
        user_id, github_repo_id, repo_name, repo_url, description, 
        owner_login, owner_type, owner_avatar_url,
        is_private, language, stargazers_count, forks_count, permissions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      data.user_id,
      data.github_repo_id,
      data.repo_name,
      data.repo_url,
      data.description || null,
      data.owner?.login || null,
      data.owner?.type || null,
      data.owner?.avatar_url || null,
      data.private || false,
      data.language || null,
      data.stargazers_count || 0,
      data.forks_count || 0,
      data.permissions || null
    ];

    const result = await this.pool.query(query, values);
    return this.transformDbRow(result.rows[0]);
  }

  async update(id: number, data: any): Promise<Repository | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCounter = 1;

    if (data.repo_name !== undefined) {
      updates.push(`repo_name = $${paramCounter++}`);
      values.push(data.repo_name);
    }
    if (data.repo_url !== undefined) {
      updates.push(`repo_url = $${paramCounter++}`);
      values.push(data.repo_url);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramCounter++}`);
      values.push(data.description);
    }
    if (data.last_synced_at !== undefined) {
      updates.push(`last_synced_at = $${paramCounter++}`);
      values.push(data.last_synced_at);
    }
    if (data.owner !== undefined) {
      updates.push(`owner_login = $${paramCounter++}`);
      values.push(data.owner?.login || null);
      updates.push(`owner_type = $${paramCounter++}`);
      values.push(data.owner?.type || null);
      updates.push(`owner_avatar_url = $${paramCounter++}`);
      values.push(data.owner?.avatar_url || null);
    }
    if (data.private !== undefined) {
      updates.push(`is_private = $${paramCounter++}`);
      values.push(data.private);
    }
    if (data.language !== undefined) {
      updates.push(`language = $${paramCounter++}`);
      values.push(data.language);
    }
    if (data.stargazers_count !== undefined) {
      updates.push(`stargazers_count = $${paramCounter++}`);
      values.push(data.stargazers_count);
    }
    if (data.forks_count !== undefined) {
      updates.push(`forks_count = $${paramCounter++}`);
      values.push(data.forks_count);
    }
    if (data.permissions !== undefined) {
      updates.push(`permissions = $${paramCounter++}`);
      values.push(data.permissions);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const query = `
      UPDATE repositories 
      SET ${updates.join(', ')}
      WHERE id = $${paramCounter}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0] ? this.transformDbRow(result.rows[0]) : null;
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
    const query = 'DELETE FROM repositories WHERE user_id = $1';
    await this.pool.query(query, [userId]);
  }

  private async findById(id: number): Promise<Repository | null> {
    const query = 'SELECT * FROM repositories WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows[0] ? this.transformDbRow(result.rows[0]) : null;
  }

  private transformDbRow(row: any): Repository {
    return {
      ...row,
      owner: row.owner_login ? {
        login: row.owner_login,
        type: row.owner_type,
        avatar_url: row.owner_avatar_url
      } : undefined,
      private: row.is_private,
      permissions: row.permissions
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
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
    // Future: use Octokit to create repo and store record in PostgreSQL
  }
}

export const repositoryService = new RepositoryService();