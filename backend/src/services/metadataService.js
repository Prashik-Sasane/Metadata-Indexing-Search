/**
 * Metadata Service - CRUD operations for file metadata
 * Manages file metadata in PostgreSQL and updates DSA indexes
 */
const { query } = require('../../config/db');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

class MetadataService {
  constructor(indexManager) {
    this.indexManager = indexManager;
    
    // Validate AWS configuration
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.warn('[MetadataService] AWS credentials not configured');
    }
    
    // Initialize S3 client
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
    
    this.bucketName = process.env.S3_BUCKET || 'metadata-search-files';
  }

  /**
   * Get single file metadata by ID
   * @param {string} fileId - File UUID
   * @returns {Object} File metadata
   */
  async getFile(fileId) {
    try {
      const result = await query(
      `SELECT f.*, fm.tags, fm.custom
      FROM files f
      LEFT JOIN file_metadata fm ON f.id = fm.file_id
      WHERE f.id = $1 AND f.is_deleted = FALSE`,
      [fileId]
    );

      if (result.rows.length === 0) {
        return null;
      }

      const file = result.rows[0];
      return {
        id: file.id,
        s3_key: file.s3_key,
        bucket: file.bucket,
        name: file.name,
        size: file.size,
        mime_type: file.mime_type,
        owner_id: file.owner_id,
        created_at: file.created_at,
        updated_at: file.updated_at,
        tags: file.tags || {},
        custom: file.custom || {},
        sizeFormatted: this.formatFileSize(file.size),
      };
    } catch (error) {
      console.error('[MetadataService] Get file error:', error.message);
      throw error;
    }
  }

  /**
   * Update file tags (triggers index update)
   * @param {string} fileId - File UUID
   * @param {Object} newTags - New tags object
   * @returns {Object} Updated file metadata
   */
  async updateTags(fileId, newTags) {
    try {
      // 1. Get current file metadata
      const currentFile = await this.getFile(fileId);
      if (!currentFile) {
        throw new Error('File not found');
      }

      // 2. Update tags in PostgreSQL
      await query(
        `UPDATE file_metadata 
          SET tags = $1, custom = COALESCE(custom, '{}')
          WHERE file_id = $2`,
        [JSON.stringify(newTags), fileId]
      );

      // 3. Update AVL Tree index
      // Remove old tags
      if (currentFile.tags) {
        for (const tag of Object.keys(currentFile.tags)) {
          this.indexManager.avlTreeTags.delete(tag.toLowerCase(), fileId);
        }
      }

      // Add new tags
      for (const tag of Object.keys(newTags)) {
        this.indexManager.avlTreeTags.insert(tag.toLowerCase(), fileId);
      }

      // 4. Log the action
      await this.logAudit(fileId, 'UPDATE_TAGS', { 
        oldTags: currentFile.tags, 
        newTags 
      });

      console.log(`[MetadataService] Tags updated for file: ${fileId}`);

      return await this.getFile(fileId);
    } catch (error) {
      console.error('[MetadataService] Update tags error:', error.message);
      throw error;
    }
  }

  /**
   * Delete file (soft delete)
   * @param {string} fileId - File UUID
   */
  async deleteFile(fileId) {
    try {
      // 1. Get file metadata before deletion
      const file = await this.getFile(fileId);
      if (!file) {
        throw new Error('File not found');
      }

      // 2. Soft delete in PostgreSQL
      await query(
        `UPDATE files 
         SET is_deleted = TRUE, updated_at = NOW() 
         WHERE id = $1`,
        [fileId]
      );

      // 3. Remove from all DSA indexes
      await this.indexManager.deleteFile(fileId, {
        s3_key: file.s3_key,
        name: file.name,
        size: file.size,
        mime_type: file.mime_type,
        owner_id: file.owner_id,
        created_at: file.created_at,
        tags: file.tags || {},
      });

      // 4. Log the action
      await this.logAudit(fileId, 'DELETE', { s3_key: file.s3_key });

      console.log(`[MetadataService] File deleted: ${fileId}`);
    } catch (error) {
      console.error('[MetadataService] Delete file error:', error.message);
      throw error;
    }
  }

  /**
   * List files with pagination
   * @param {Object} params - Query parameters
   * @returns {Object} Paginated file list
   */
  async listFiles(params = {}) {
  const { page = 1, limit = 50, owner_id, mime_type } = params;

  const limitValue = parseInt(limit);
  const offsetValue = (parseInt(page) - 1) * limitValue;

  try {
    let whereClause = 'WHERE f.is_deleted = FALSE';
    const queryParams = [];

    // Dynamic WHERE conditions
    if (owner_id) {
      queryParams.push(owner_id);
      whereClause += ` AND f.owner_id = $${queryParams.length}`;
    }

    if (mime_type) {
      queryParams.push(mime_type);
      whereClause += ` AND f.mime_type = $${queryParams.length}`;
    }

    // Count query
    const countSql = `
      SELECT COUNT(*) AS count
      FROM files f
      ${whereClause}
    `;
    const countResult = await query(countSql, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Add LIMIT and OFFSET as parameters
    queryParams.push(limitValue);  // now becomes $N+1
    queryParams.push(offsetValue); // becomes $N+2

    const limitIndex = queryParams.length - 1;  // $N+1
    const offsetIndex = queryParams.length;    // $N+2

    const sql = `
      SELECT 
        f.id, f.s3_key, f.bucket, f.name, f.size,
        f.mime_type, f.owner_id, f.created_at, f.updated_at,
        fm.tags
      FROM files f
      LEFT JOIN file_metadata fm ON f.id = fm.file_id
      ${whereClause}
      ORDER BY f.created_at DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `;

    const result = await query(sql, queryParams);

    const files = result.rows.map(file => ({
      ...file,
      tags: file.tags || {},
      sizeFormatted: this.formatFileSize(file.size),
    }));

    return {
      files,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limitValue),
      },
    };
  } catch (error) {
    console.error('[MetadataService] List files error:', error.message);
    throw error;
  }
}

  /**
   * Generate presigned URL for file upload
   * @param {string} fileName - File name
   * @param {string} mimeType - MIME type
   * @param {number} expiresIn - URL expiration in seconds
   * @returns {Object} Upload URL and file key
   */
  async getPresignedUploadUrl(fileName, mimeType, expiresIn = 3600) {
    try {
      if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        throw new Error('AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env');
      }

      const s3Key = `uploads/${Date.now()}-${fileName}`;
      
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        ContentType: mimeType,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      
      return {
        uploadUrl: url,
        bucket: this.bucketName,
        s3Key,
        expiresIn,
      };
    } catch (error) {
      console.error('[MetadataService] Get presigned upload URL error:', error.message);
      throw new Error(`Failed to generate upload URL: ${error.message}`);
    }
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Log audit trail
   */
  async logAudit(fileId, action, metadata) {
    try {
      await query(
        `INSERT INTO audit_log (file_id, action, metadata) 
         VALUES (?, ?, ?)`,
        [fileId, action, JSON.stringify(metadata)]
      );
    } catch (error) {
      console.error('[MetadataService] Error logging audit:', error.message);
    }
  }
}

module.exports = { MetadataService };
