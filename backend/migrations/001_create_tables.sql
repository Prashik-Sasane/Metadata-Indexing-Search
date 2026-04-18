-- Migration 001: Create core tables for metadata indexing system
-- PostgreSQL / Supabase compatible

-- Core file metadata table
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    s3_key VARCHAR(255) NOT NULL UNIQUE,
    bucket VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    size BIGINT NOT NULL,
    mime_type VARCHAR(255),
    owner_id UUID,   -- FIXED (UUID instead of VARCHAR)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Flexible metadata/tags as JSONB
CREATE TABLE IF NOT EXISTS file_metadata (
    file_id UUID PRIMARY KEY REFERENCES files(id) ON DELETE CASCADE,
    tags JSONB,
    custom JSONB
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraint for owner_id
ALTER TABLE files 
ADD CONSTRAINT fk_files_owner 
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_files_name ON files (name);
CREATE INDEX IF NOT EXISTS idx_files_size ON files (size);
CREATE INDEX IF NOT EXISTS idx_files_created ON files (created_at);
CREATE INDEX IF NOT EXISTS idx_files_s3_key ON files (s3_key);
CREATE INDEX IF NOT EXISTS idx_files_owner ON files (owner_id);

-- JSONB GIN index
CREATE INDEX IF NOT EXISTS idx_file_metadata_tags ON file_metadata USING GIN (tags);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    file_id UUID REFERENCES files(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
    actor_id UUID,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index snapshots
CREATE TABLE IF NOT EXISTS index_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    s3_path VARCHAR(1024),
    checksum VARCHAR(255),
    metadata JSONB
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_files_updated_at
    BEFORE UPDATE ON files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();