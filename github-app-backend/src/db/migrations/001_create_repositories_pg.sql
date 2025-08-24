-- PostgreSQL version: Create repositories table
CREATE TABLE IF NOT EXISTS repositories (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  github_repo_id BIGINT NOT NULL, -- GitHub's repository ID (using BIGINT for larger IDs)
  repo_name TEXT NOT NULL,
  repo_url TEXT NOT NULL,
  description TEXT,
  owner_login TEXT,
  owner_type TEXT CHECK(owner_type IN ('User', 'Organization')),
  owner_avatar_url TEXT,
  is_private BOOLEAN DEFAULT FALSE,
  language TEXT,
  stargazers_count INTEGER DEFAULT 0,
  forks_count INTEGER DEFAULT 0,
  permissions JSONB, -- Using JSONB for better JSON handling in PostgreSQL
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, github_repo_id) -- Prevent duplicate repos per user
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_repositories_user_id ON repositories(user_id);
CREATE INDEX IF NOT EXISTS idx_repositories_last_synced ON repositories(last_synced_at);
CREATE INDEX IF NOT EXISTS idx_repositories_owner_login ON repositories(owner_login);
CREATE INDEX IF NOT EXISTS idx_repositories_owner_type ON repositories(owner_type);
CREATE INDEX IF NOT EXISTS idx_repositories_is_private ON repositories(is_private);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_repositories_updated_at BEFORE UPDATE
    ON repositories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();