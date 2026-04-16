-- Migration 001: Create core tables for metadata indexing system
-- This creates the foundation schema optimized for DSA-backed search

-- Core file metadata table
CREATE TABLE IF NOT EXISTS files (
    id VARCHAR(36) PRIMARY KEY,
    s3_key VARCHAR(255) NOT NULL UNIQUE,
    bucket VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    size BIGINT NOT NULL,
    mime_type VARCHAR(255),
    owner_id VARCHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Flexible metadata/tags as JSON
CREATE TABLE IF NOT EXISTS file_metadata (
    file_id VARCHAR(36) PRIMARY KEY REFERENCES files(id) ON DELETE CASCADE,
    tags JSON,
    custom JSON
);

-- Users table (for ownership tracking)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraint for owner_id
ALTER TABLE files ADD CONSTRAINT fk_files_owner 
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;

-- MySQL B-Tree indexes as backup (for complex joins)
CREATE INDEX idx_files_name ON files (name(255));
CREATE INDEX idx_files_size ON files (size);
CREATE INDEX idx_files_created ON files (created_at);
CREATE INDEX idx_files_s3_key ON files (s3_key(255));
CREATE INDEX idx_files_owner ON files (owner_id);

-- Note: MySQL does not have GIN indexes for JSON, but we can use JSON functions in queries or create functional indexes if needed in future

-- Audit log table for tracking changes
CREATE TABLE IF NOT EXISTS audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    file_id VARCHAR(36) REFERENCES files(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
    actor_id VARCHAR(36),
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index snapshots table (for B-Tree WAL checkpoints)
CREATE TABLE IF NOT EXISTS index_snapshots (
    id VARCHAR(36) PRIMARY KEY,
    snapshot_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    s3_path VARCHAR(1024),
    checksum VARCHAR(255),
    metadata JSON
);
