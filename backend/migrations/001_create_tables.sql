-- Migration 001: Create core tables for metadata indexing system
-- This creates the foundation schema optimized for DSA-backed search

-- Core file metadata table
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    s3_key TEXT NOT NULL UNIQUE,
    bucket TEXT NOT NULL,
    name TEXT NOT NULL,
    size BIGINT NOT NULL,
    mime_type TEXT,
    owner_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Flexible metadata/tags as JSONB
CREATE TABLE IF NOT EXISTS file_metadata (
    file_id UUID PRIMARY KEY REFERENCES files(id) ON DELETE CASCADE,
    tags JSONB DEFAULT '{}',
    custom JSONB DEFAULT '{}'
);

-- Users table (for ownership tracking)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint for owner_id
ALTER TABLE files ADD CONSTRAINT fk_files_owner 
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;

-- Postgres B-Tree indexes as backup (for complex joins)
CREATE INDEX IF NOT EXISTS idx_files_name ON files USING btree(name);
CREATE INDEX IF NOT EXISTS idx_files_size ON files USING btree(size);
CREATE INDEX IF NOT EXISTS idx_files_created ON files USING btree(created_at);
CREATE INDEX IF NOT EXISTS idx_files_s3_key ON files USING btree(s3_key);
CREATE INDEX IF NOT EXISTS idx_files_owner ON files USING btree(owner_id);

-- GIN index for JSONB tags (powerful for tag-based queries)
CREATE INDEX IF NOT EXISTS idx_tags ON file_metadata USING gin(tags);

-- Audit log table for tracking changes
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES files(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
    actor_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index snapshots table (for B-Tree WAL checkpoints)
CREATE TABLE IF NOT EXISTS index_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_at TIMESTAMPTZ DEFAULT NOW(),
    s3_path TEXT,
    checksum TEXT,
    metadata JSONB
);
