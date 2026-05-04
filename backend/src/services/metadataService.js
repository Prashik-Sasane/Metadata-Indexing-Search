/**
 * Metadata Service - CRUD operations for file metadata
 * Uses both PostgreSQL (persistent) and DSA indexes (fast lookup)
 */
const { query } = require('../../config/db');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

class MetadataService {
  constructor(indexManager) {
    this.indexManager = indexManager;

    // Initialize S3 client
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    this.bucketName = process.env.S3_BUCKET || 'metadata-search-files';
  }

  /**
   * Get single file metadata by ID
   * Tries DSA HashMap first (O(1)), falls back to PostgreSQL
   */
  async getFile(fileId) {
    // Fast path: DSA HashMap — O(1)
    const dsaFile = this.indexManager.getFile(fileId);
    if (dsaFile) return dsaFile;

    // Fallback: PostgreSQL
    try {
      const result = await query(
        `SELECT f.*, fm.tags, fm.custom
         FROM files f
         LEFT JOIN file_metadata fm ON f.id = fm.file_id
         WHERE f.id = $1 AND f.is_deleted = FALSE`,
        [fileId]
      );

      if (result.rows.length === 0) return null;

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
      console.warn('[MetadataService] DB fallback failed:', error.message);
      return null;
    }
  }

  /**
   * Update file tags (triggers index update)
   */
  async updateTags(fileId, newTags) {
    const currentFile = this.indexManager.getFile(fileId);
    if (!currentFile) {
      throw new Error('File not found');
    }

    // Update in PostgreSQL
    try {
      await query(
        `UPDATE file_metadata SET tags = $1 WHERE file_id = $2`,
        [JSON.stringify(newTags), fileId]
      );
    } catch (dbError) {
      console.warn('[MetadataService] DB update failed:', dbError.message);
    }

    // Update AVL Tree index — remove old tags, add new
    if (currentFile.tags) {
      for (const tag of Object.keys(currentFile.tags)) {
        this.indexManager.avlTreeTags.delete(tag.toLowerCase(), fileId);
      }
    }
    for (const tag of Object.keys(newTags)) {
      this.indexManager.avlTreeTags.insert(tag.toLowerCase(), fileId);
    }

    // Update HashMap
    currentFile.tags = newTags;
    currentFile.updated_at = new Date().toISOString();
    this.indexManager.fileStore.put(fileId, currentFile);

    return this.indexManager.getFile(fileId);
  }

  /**
   * Delete file (removes from indexes + soft delete in DB)
   */
  async deleteFile(fileId) {
    const file = this.indexManager.getFile(fileId);
    if (!file) {
      throw new Error('File not found');
    }

    // Soft delete in PostgreSQL
    try {
      await query(
        `UPDATE files SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1`,
        [fileId]
      );
    } catch (dbError) {
      console.warn('[MetadataService] DB delete failed:', dbError.message);
    }

    // Remove from all DSA indexes
    await this.indexManager.deleteFile(fileId);

    console.log(`[MetadataService] File deleted: ${fileId}`);
  }

  /**
   * List files with pagination — uses DSA HashMap
   */
  async listFiles(params = {}) {
    return this.indexManager.listFiles(params);
  }

  /**
   * Upload file to S3
   */
  async uploadToS3(fileBuffer, s3Key, mimeType) {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS credentials not configured');
    }

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: mimeType,
    });

    await this.s3Client.send(command);
    return { bucket: this.bucketName, s3Key };
  }

  /**
   * Generate presigned URL for file upload
   */
  async getPresignedUploadUrl(fileName, mimeType, expiresIn = 3600) {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env');
    }

    const s3Key = `uploads/${Date.now()}-${fileName}`;
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
      ContentType: mimeType,
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn });
    return { uploadUrl: url, bucket: this.bucketName, s3Key, expiresIn };
  }

  /**
   * Generate presigned URL for file download
   */
  async getPresignedDownloadUrl(s3Key, expiresIn = 3600) {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS credentials not configured');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn });
    return url;
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

module.exports = { MetadataService };
