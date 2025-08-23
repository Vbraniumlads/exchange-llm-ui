-- Add new columns to repositories table for better GitHub integration
-- These columns store additional metadata from GitHub API

-- Add owner information
ALTER TABLE repositories ADD COLUMN owner_login TEXT;
ALTER TABLE repositories ADD COLUMN owner_type TEXT CHECK(owner_type IN ('User', 'Organization'));
ALTER TABLE repositories ADD COLUMN owner_avatar_url TEXT;

-- Add repository metadata
ALTER TABLE repositories ADD COLUMN is_private INTEGER DEFAULT 0;
ALTER TABLE repositories ADD COLUMN language TEXT;
ALTER TABLE repositories ADD COLUMN stargazers_count INTEGER DEFAULT 0;
ALTER TABLE repositories ADD COLUMN forks_count INTEGER DEFAULT 0;

-- Add permissions (stored as JSON string)
ALTER TABLE repositories ADD COLUMN permissions TEXT;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_repositories_owner_login ON repositories(owner_login);
CREATE INDEX IF NOT EXISTS idx_repositories_owner_type ON repositories(owner_type);
CREATE INDEX IF NOT EXISTS idx_repositories_is_private ON repositories(is_private);