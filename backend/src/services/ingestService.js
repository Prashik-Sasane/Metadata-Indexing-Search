/**
 * Ingest Service - Handles file metadata ingestion
 * Listens to S3 events (via Kafka) and updates PostgreSQL + DSA indexes
 */

const { query } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class IngestService {
  constructor(indexManager) {
    this.indexManager = indexManager;
  }

  /**
   * Create file metadata and update all indexes
   * @param {Object} fileData - File metadata
   * @returns {Object} Created file record
   */
  async createFile(fileData) {
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

    try {
      // 1. Insert into PostgreSQL (source of truth)
      await query(
        `INSERT INTO files (id, s3_key, bucket, name, size, mime_type, owner_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [file_id, s3_key, bucket, name, size, mime_type, owner_id]
      );

      await query(
        `INSERT INTO file_metadata (file_id, tags, custom) 
         VALUES ($1, $2, $3)`,
        [file_id, JSON.stringify(tags), JSON.stringify(custom)]
      );

      // 2. Update in-memory DSA indexes
      await this.indexManager.insertFile({
        id: file_id,
        s3_key,
        name,
        size,
        mime_type,
        owner_id,
        created_at: new Date().toISOString(),
        tags,
      });

      // 3. Log the action
      await this.logAudit(file_id, 'CREATE', { s3_key, name });

      console.log(`[IngestService] File ingested: ${name} (${file_id})`);

      return {
        id: file_id,
        s3_key,
        bucket,
        name,
        size,
        mime_type,
        owner_id,
        tags,
        created_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[IngestService] Error creating file:', error.message);
      throw error;
    }
  }

  /**
   * Process S3 event from Kafka
   * @param {Object} s3Event - S3 event notification
   */
  async processS3Event(s3Event) {
    try {
      const { Records } = s3Event;

      for (const record of Records) {
        const {
          s3: { bucket, object },
          eventName,
        } = record;

        // Handle different S3 events
        if (eventName === 'ObjectCreated:Put' || eventName === 'ObjectCreated:Post') {
          await this.createFile({
            s3_key: object.key,
            bucket: bucket.name,
            name: object.key.split('/').pop(),
            size: object.size,
            mime_type: this.getMimeType(object.key),
            tags: {},
          });
        } else if (eventName === 'ObjectRemoved:Delete') {
          await this.deleteFile(object.key);
        }
      }
    } catch (error) {
      console.error('[IngestService] Error processing S3 event:', error.message);
      throw error;
    }
  }

  /**
   * Delete file from database and indexes
   * @param {string} s3_key - S3 object key
   */
  async deleteFile(s3_key) {
    try {
      // 1. Get file metadata before deletion
      const result = await query(
        `SELECT f.*, fm.tags 
         FROM files f 
         LEFT JOIN file_metadata fm ON f.id = fm.file_id 
         WHERE f.s3_key = $1`,
        [s3_key]
      );

      if (result.rows.length === 0) {
        console.warn(`[IngestService] File not found: ${s3_key}`);
        return;
      }

      const file = result.rows[0];

      // 2. Soft delete in PostgreSQL
      await query(
        `UPDATE files SET is_deleted = TRUE, updated_at = NOW() WHERE s3_key = $1`,
        [s3_key]
      );

      // 3. Remove from DSA indexes
      await this.indexManager.deleteFile(file.id, {
        s3_key: file.s3_key,
        name: file.name,
        size: file.size,
        mime_type: file.mime_type,
        owner_id: file.owner_id,
        created_at: file.created_at,
        tags: file.tags || {},
      });

      // 4. Log the action
      await this.logAudit(file.id, 'DELETE', { s3_key });

      console.log(`[IngestService] File deleted: ${s3_key}`);
    } catch (error) {
      console.error('[IngestService] Error deleting file:', error.message);
      throw error;
    }
  }

  /**
   * Log audit trail
   */
  async logAudit(fileId, action, metadata) {
    try {
      await query(
        `INSERT INTO audit_log (file_id, action, metadata) 
         VALUES ($1, $2, $3)`,
        [fileId, action, JSON.stringify(metadata)]
      );
    } catch (error) {
      console.error('[IngestService] Error logging audit:', error.message);
      // Don't throw - audit logging failure shouldn't break main operation
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
      zip: 'application/zip',
      mp4: 'video/mp4',
      mp3: 'audio/mpeg',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Start listening to Kafka for S3 events
   */
  async startKafkaConsumer(kafkaConsumer) {
    try {
      await kafkaConsumer.connect();
      await kafkaConsumer.subscribe({ topic: 's3.events.created', fromBeginning: true });

      await kafkaConsumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          const s3Event = JSON.parse(message.value.toString());
          await this.processS3Event(s3Event);
        },
      });

      console.log('[IngestService] Kafka consumer started');
    } catch (error) {
      console.error('[IngestService] Error starting Kafka consumer:', error.message);
      throw error;
    }
  }
}

module.exports = { IngestService };
