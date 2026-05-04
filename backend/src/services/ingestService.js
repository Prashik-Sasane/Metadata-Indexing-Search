/**
 * Ingest Service - Handles file metadata ingestion
 * Stores data in both PostgreSQL (persistent) and DSA indexes (fast search)
 */

const { query } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');
const { ParseService } = require('./parseService');

class IngestService {
  constructor(indexManager) {
    this.indexManager = indexManager;
    this.parseService = new ParseService();
  }

  /**
   * Create file metadata, parse content, and update all indexes
   * @param {Object} fileData - File metadata
   * @param {Buffer} [fileBuffer] - Raw file buffer for content parsing
   * @returns {Object} Created file record
   */
  async createFile(fileData, fileBuffer = null) {
    const {
      s3_key,
      bucket,
      name,
      size,
      mime_type,
      owner_id,
      tags = {},
      custom = {},
    } = fileData;

    const file_id = uuidv4();
    let parsedContent = { content: '', wordCount: 0, extractedMetadata: {} };

    // Parse file content if buffer is provided
    if (fileBuffer) {
      parsedContent = await this.parseService.parse(fileBuffer, name, mime_type);
      console.log(`[IngestService] Parsed ${name}: ${parsedContent.wordCount} words`);
    }

    try {
      // 1. Insert into PostgreSQL (source of truth)
      try {
        await query(
          `INSERT INTO files (id, s3_key, bucket, name, size, mime_type, owner_id) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [file_id, s3_key, bucket, name, size, mime_type, owner_id || null]
        );

        await query(
          `INSERT INTO file_metadata (file_id, tags, custom) 
           VALUES ($1, $2, $3)`,
          [file_id, JSON.stringify(tags), JSON.stringify({
            ...custom,
            parsedContent: parsedContent.extractedMetadata,
            wordCount: parsedContent.wordCount,
          })]
        );
      } catch (dbError) {
        // If DB is not available, continue with DSA-only storage
        console.warn('[IngestService] DB insert failed (continuing with DSA):', dbError.message);
      }

      // 2. Update in-memory DSA indexes (always succeeds)
      await this.indexManager.insertFile({
        id: file_id,
        s3_key,
        bucket: bucket || process.env.S3_BUCKET || 'metadata-search-files',
        name,
        size,
        mime_type,
        owner_id,
        created_at: new Date().toISOString(),
        tags,
        custom: {
          ...custom,
          parsedContent: parsedContent.extractedMetadata,
        },
        content: parsedContent.content,
      });

      console.log(`[IngestService] File ingested: ${name} (${file_id})`);

      return {
        id: file_id,
        s3_key,
        bucket: bucket || process.env.S3_BUCKET || 'metadata-search-files',
        name,
        size,
        mime_type,
        owner_id,
        tags,
        content: parsedContent.content ? parsedContent.content.substring(0, 200) + '...' : '',
        wordCount: parsedContent.wordCount,
        extractedMetadata: parsedContent.extractedMetadata,
        created_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[IngestService] Error creating file:', error.message);
      throw error;
    }
  }

  /**
   * Delete file from database and indexes
   * @param {string} fileId - File UUID
   */
  async deleteFile(fileId) {
    try {
      // Get metadata from DSA store
      const file = this.indexManager.getFile(fileId);

      // Try to soft delete in PostgreSQL
      try {
        await query(
          `UPDATE files SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1`,
          [fileId]
        );
      } catch (dbError) {
        console.warn('[IngestService] DB delete failed (continuing with DSA):', dbError.message);
      }

      // Remove from DSA indexes
      await this.indexManager.deleteFile(fileId, file);

      console.log(`[IngestService] File deleted: ${fileId}`);
    } catch (error) {
      console.error('[IngestService] Error deleting file:', error.message);
      throw error;
    }
  }

  /**
   * Infer MIME type from file extension
   */
  getMimeType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      txt: 'text/plain',
      csv: 'text/csv',
      json: 'application/json',
      xml: 'application/xml',
      html: 'text/html',
      md: 'text/markdown',
      zip: 'application/zip',
      mp4: 'video/mp4',
      mp3: 'audio/mpeg',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
}

module.exports = { IngestService };
